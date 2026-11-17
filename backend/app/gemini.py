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


class GeminiError(Exception):
    """Raised for any Gemini-side problem; `status` is the HTTP code to return."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.message = message
        self.status = status


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
            status = 429 if code == 429 else 502
            return GeminiError(f"Gemini API error ({code}): {exc.message}", status)
        return GeminiError(f"Gemini request failed: {exc}", 502)

    # -- text -------------------------------------------------------------
    async def generate_text(
        self, contents: Any, *, grounded: bool = False, empty_fallback: str = ""
    ) -> str:
        config = types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())] if grounded else None
        )
        try:
            resp = await self.client.aio.models.generate_content(
                model=self.settings.gemini_model_text, contents=contents, config=config
            )
        except GeminiError:
            raise
        except Exception as exc:  # SDK / network errors
            raise self._wrap(exc) from exc
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
            try:
                resp = await self.client.aio.models.generate_content(
                    model=self.settings.gemini_model_text,
                    contents=contents,
                    config=config,
                )
            except GeminiError:
                raise
            except Exception as exc:
                raise self._wrap(exc) from exc

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
