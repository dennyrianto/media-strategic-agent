"""Tests for the real GeminiService with a stubbed SDK client (no network)."""
import asyncio
import json
from types import SimpleNamespace

import pytest
from google import genai
from google.genai import _transformers as t
from pydantic import ValidationError

from app import models as m
from app.config import Settings
from app.gemini import GeminiError, GeminiService, _parse_json, gather_limited


# ---- schema conversion regression (additionalProperties problem) ----------
@pytest.mark.parametrize("schema", [
    m.BriefAnalysis, m.MarketDashboard, list[m.PersonaDraft], list[m.Moment],
    list[m.BigIdea], m.MediaStrategyResult,
])
def test_models_convert_to_gemini_schema(schema):
    client = genai.Client(api_key="dummy")
    s = t.t_schema(client._api_client, schema)  # raises ValueError if unsupported keywords sneak in
    dumped = json.dumps(s.model_dump(exclude_none=True))
    assert "additionalProperties" not in dumped and "$ref" not in dumped


def test_persona_schema_has_no_image_field_and_keeps_required():
    client = genai.Client(api_key="dummy")
    s = t.t_schema(client._api_client, list[m.PersonaDraft]).model_dump(exclude_none=True)
    props = s["items"]["properties"]
    assert "imageUrl" not in props and "microSegmentation" in props
    assert {"name", "role", "age", "quote", "drivers"} <= set(s["items"]["required"])


def test_moment_enum_preserved():
    client = genai.Client(api_key="dummy")
    s = t.t_schema(client._api_client, list[m.Moment]).model_dump(exclude_none=True)
    assert set(s["items"]["properties"]["type"]["enum"]) == {
        "Cultural", "Seasonal", "Industry", "Sporting", "Trend", "Other"}


# ---- _parse_json ------------------------------------------------------------
GOOD = {"word": "GO", "meaning": "Great"}


def test_parse_strips_code_fences():
    assert _parse_json('```json\n{"word":"GO","meaning":"Great"}\n```', m.Acronym).word == "GO"


def test_parse_recovers_truncated_array():
    full = json.dumps([GOOD, GOOD, GOOD])
    cut = full[: full.rindex("{") + 12]  # chop inside the 3rd object
    out = _parse_json(cut, list[m.Acronym])
    assert len(out) == 2


def test_parse_recovers_truncated_nested_array():
    ideas = [m.BigIdea.model_validate({
        "title": "T", "tagline": "t", "hook": "h", "rationale": "r", "culturalFit": "c",
        "acronym": GOOD, "funnelStrategy": [{"role": "Trial", "strategy": "s", "touchpoints": ["a"]}]
    }).model_dump(by_alias=True) for _ in range(3)]
    full = json.dumps(ideas)
    out = _parse_json(full[:-40], list[m.BigIdea])
    assert 1 <= len(out) < 3


def test_parse_rejects_garbage():
    with pytest.raises((ValidationError, ValueError)):
        _parse_json("I'm sorry, I can't do that", list[m.Acronym])


# ---- generate_json retry / error mapping -----------------------------------
class StubModels:
    def __init__(self, replies):
        self.replies, self.calls = list(replies), 0

    async def generate_content(self, **kwargs):
        self.calls += 1
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return SimpleNamespace(text=r, candidates=[SimpleNamespace(finish_reason="STOP", content=None)])


def service_with(replies):
    svc = GeminiService(Settings(gemini_api_key="k"))
    stub = StubModels(replies)
    svc._client = SimpleNamespace(aio=SimpleNamespace(models=stub))
    return svc, stub


def test_generate_json_retries_once_then_succeeds():
    svc, stub = service_with(["not json", json.dumps(GOOD)])
    out = asyncio.run(svc.generate_json("p", m.Acronym))
    assert out.word == "GO" and stub.calls == 2


def test_generate_json_gives_clear_error_after_two_failures():
    svc, stub = service_with(["nope", "still nope"])
    with pytest.raises(GeminiError) as e:
        asyncio.run(svc.generate_json("p", m.Acronym))
    assert "after 2 attempts" in e.value.message and stub.calls == 2


def test_sdk_errors_are_wrapped():
    svc, _ = service_with([RuntimeError("boom")])
    with pytest.raises(GeminiError) as e:
        asyncio.run(svc.generate_text("p"))
    assert "boom" in e.value.message and e.value.status == 502


def test_missing_api_key_is_503():
    svc = GeminiService(Settings(gemini_api_key=None))
    with pytest.raises(GeminiError) as e:
        _ = svc.client
    assert e.value.status == 503


# ---- concurrency cap --------------------------------------------------------
def test_gather_limited_caps_concurrency():
    running = peak = 0

    async def job():
        nonlocal running, peak
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.01)
        running -= 1
        return 1

    async def go():
        return await gather_limited([job() for _ in range(10)], 3)

    assert sum(asyncio.run(go())) == 10
    assert peak == 3
