"""Thin wrapper around the google-genai SDK.

Everything that talks to Gemini goes through `GeminiService`, so the routes
stay free of SDK details and tests can swap in a fake.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import TypeAdapter, ValidationError

from .config import Settings

log = logging.getLogger("gemini")

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


TRANSIENT_CODES = {500, 503, 504}


class GeminiError(Exception):
    """Raised for any Gemini-side problem; `status` is the HTTP code to return.

    `transient` marks temporary Google-side failures that are worth retrying.
    """

    def __init__(self, message: str, status: int = 502, transient: bool = False):
        super().__init__(message)
        self.message = message
        self.status = status
        self.transient = transient


def text_part(text: str) -> types.Part:
    return types.Part.from_text(text=text)


def bytes_part(b64: str, mime_type: str) -> types.Part:
    return types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime_type)


def _parse_json(raw: str, schema: Any) -> Any:
    """Validate model output against `schema` (a Pydantic model or list[Model]).

    If the output was cut off mid-array (token limit), keep every complete
    item we can recover instead of failing - but only if at least one survives.
    """
    adapter = TypeAdapter(schema)
    text = _FENCE_RE.sub("", raw.strip()).strip()
    try:
        return adapter.validate_json(text)
    except (ValidationError, ValueError):
        if text.startswith("["):
            closes = [m.start() for m in re.finditer(r"\}", text)]
            for pos in reversed(closes[-60:]):
                try:
                    recovered = adapter.validate_json(text[: pos + 1] + "]")
                except (ValidationError, ValueError):
                    continue
                if recovered:
                    log.warning(
                        "Model output was truncated; recovered %d item(s).", len(recovered)
                    )
                    return recovered
        raise


class GeminiService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client: genai.Client | None = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            if not self.settings.gemini_api_key:
                raise GeminiError(
                    "GEMINI_API_KEY is not set. Add it to backend/.env and restart.",
                    status=503,
                )
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    # -- helpers ----------------------------------------------------------
    @staticmethod
    def _wrap(exc: Exception) -> GeminiError:
        if isinstance(exc, genai_errors.APIError):
            code = getattr(exc, "code", None)
            detail = exc.message
            if code == 429:
                return GeminiError(
                    f"Gemini quota or rate limit reached (429). {detail}", status=429
                )
            if code in TRANSIENT_CODES:
                return GeminiError(
                    f"Google's Gemini service is temporarily unavailable ({code}). "
                    f"This is usually short-lived - please try again in a moment. {detail}",
                    status=503,
                    transient=True,
                )
            return GeminiError(f"Gemini API error ({code}): {detail}", 502)
        return GeminiError(f"Gemini request failed: {exc}", 502)

    async def _generate(self, **kwargs: Any):
        """generate_content with retry/backoff for temporary Google-side errors."""
        attempts = max(1, self.settings.gemini_max_attempts)
        for attempt in range(1, attempts + 1):
            try:
                return await self.client.aio.models.generate_content(**kwargs)
            except GeminiError:
                raise
            except Exception as exc:
                err = self._wrap(exc)
                if err.transient and attempt < attempts:
                    delay = self.settings.gemini_retry_base_delay * 2 ** (attempt - 1)
                    log.warning(
                        "Gemini temporarily unavailable (attempt %d/%d); retrying in %.1fs",
                        attempt, attempts, delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise err from exc
        raise AssertionError("unreachable")  # pragma: no cover

    # -- text -------------------------------------------------------------
    async def generate_text(
        self, contents: Any, *, grounded: bool = False, empty_fallback: str = ""
    ) -> str:
        config = types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())] if grounded else None
        )
        resp = await self._generate(
            model=self.settings.gemini_model_text, contents=contents, config=config
        )
        return resp.text or empty_fallback

    # -- structured JSON --------------------------------------------------
    async def generate_json(
        self, contents: Any, schema: Any, *, max_output_tokens: int | None = 8192
    ) -> Any:
        """Ask for JSON matching `schema`; validate; retry once on bad output."""
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            max_output_tokens=max_output_tokens,
        )
        last_problem = ""
        for attempt in (1, 2):
            resp = await self._generate(
                model=self.settings.gemini_model_text, contents=contents, config=config
            )

            try:
                return _parse_json(resp.text or "", schema)
            except (ValidationError, ValueError, json.JSONDecodeError) as exc:
                finish = None
                if resp.candidates:
                    finish = resp.candidates[0].finish_reason
                last_problem = f"{type(exc).__name__}"
                if finish is not None and "MAX_TOKENS" in str(finish):
                    last_problem += " (output hit the token limit)"
                log.warning("Bad JSON from model (attempt %d): %s", attempt, last_problem)

        raise GeminiError(
            f"The model returned output that did not match the expected format "
            f"after 2 attempts: {last_problem}. Try again."
        )

    # -- images -----------------------------------------------------------
    async def generate_image_data_uri(self, prompt: str) -> str | None:
        """Returns a data: URI, or None if no image came back."""
        try:
            resp = await self.client.aio.models.generate_content(
                model=self.settings.gemini_model_image,
                contents=prompt,
                config=types.GenerateContentConfig(
                    image_config=types.ImageConfig(aspect_ratio="1:1")
                ),
            )
        except GeminiError:
            raise
        except Exception as exc:
            raise self._wrap(exc) from exc

        for cand in resp.candidates or []:
            for part in (cand.content.parts if cand.content else None) or []:
                blob = part.inline_data
                if blob and blob.data:
                    b64 = base64.b64encode(blob.data).decode("ascii")
                    return f"data:{blob.mime_type or 'image/png'};base64,{b64}"
        return None


async def gather_limited(coros: list, limit: int) -> list:
    """asyncio.gather with a concurrency cap (replaces the unbounded Promise.all)."""
    sem = asyncio.Semaphore(max(1, limit))

    async def run(c):
        async with sem:
            return await c

    return await asyncio.gather(*(run(c) for c in coros))
