"""HTTP routes. Paths and JSON shapes match the original Express server so the
React UI (frontend/services/geminiService.ts) works without changes."""
from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from functools import lru_cache

from fastapi import APIRouter, Depends, Request

from . import markdown_render as md
from . import prompts
from .config import Settings, get_settings
from .gemini import GeminiError, GeminiService, gather_limited
from .models import (
    AnalyzeBriefRequest,
    AnalyzeBriefResponse,
    BigIdea,
    BigIdeasRequest,
    BigIdeasResponse,
    BriefAnalysis,
    MarketDashboard,
    MarketDashboardRequest,
    MediaStrategyRequest,
    MediaStrategyResponse,
    MediaStrategyResult,
    Moment,
    MomentsRequest,
    MomentsResponse,
    PersonaDraft,
    PersonaProfile,
    PersonasRequest,
    PersonasResponse,
    StepContentRequest,
    StepContentResponse,
)

log = logging.getLogger("routes")


# --- dependencies ---------------------------------------------------------
@lru_cache
def _gemini_singleton() -> GeminiService:
    return GeminiService(get_settings())


def get_gemini() -> GeminiService:
    """Overridden in tests with a fake (app.dependency_overrides)."""
    return _gemini_singleton()


_hits: dict[str, deque[float]] = defaultdict(deque)


async def rate_limit(request: Request, settings: Settings = Depends(get_settings)) -> None:
    """Simple in-memory per-IP sliding window. Fine for one process; use Redis
    (or your reverse proxy) if you scale out."""
    limit = settings.rate_limit_per_minute
    if limit <= 0:
        return
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _hits[ip]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= limit:
        raise GeminiError("Too many requests. Please wait a minute and try again.", 429)
    window.append(now)


router = APIRouter(prefix="/api", dependencies=[Depends(rate_limit)])


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict:
    return {"status": "ok", "geminiKeyConfigured": bool(settings.gemini_api_key)}


# --- 1. analyze brief -----------------------------------------------------
@router.post("/gemini/analyze-brief", response_model=AnalyzeBriefResponse, response_model_by_alias=True)
async def analyze_brief(body: AnalyzeBriefRequest, gemini: GeminiService = Depends(get_gemini)):
    contents = prompts.analyze_brief_contents(body.text, body.file_base64, body.mime_type)
    data: BriefAnalysis = await gemini.generate_json(contents, BriefAnalysis)
    return AnalyzeBriefResponse(
        summary=data.full_summary or "Could not generate summary.",
        structured={
            "brandName": data.brand_name,
            "industry": data.industry,
            "product": data.product,
            "targetAudience": data.target_audience,
            "objectives": data.objectives,
            "budget": data.budget,
            "timeline": data.timeline,
        },
        suggestions=data.suggestions,
    )


# --- 2. market dashboard --------------------------------------------------
@router.post("/gemini/market-dashboard", response_model=MarketDashboard, response_model_by_alias=True)
async def market_dashboard(body: MarketDashboardRequest, gemini: GeminiService = Depends(get_gemini)):
    return await gemini.generate_json(
        prompts.market_dashboard_prompt(body.raw_intel), MarketDashboard, max_output_tokens=None
    )


# --- 3. step content (search-grounded market intelligence) ---------------
NOTE_QUOTA = (
    "> **Note:** Live Google Search was unavailable for this run (Google returned a quota error - "
    "search is usually not included with free-tier API keys, and paid keys have a monthly cap). "
    "This report is based on the AI model's general knowledge; figures are approximate and "
    "unverified. See the README troubleshooting section to enable search.\n\n"
)
NOTE_OFF = (
    "> **Note:** Live Google Search is turned off (`SEARCH_GROUNDING=off`), so this report is "
    "based on the AI model's general knowledge. Figures are approximate and unverified.\n\n"
)


@router.post("/gemini/step-content", response_model=StepContentResponse, response_model_by_alias=True)
async def step_content(
    body: StepContentRequest,
    gemini: GeminiService = Depends(get_gemini),
    settings: Settings = Depends(get_settings),
):
    mode = settings.search_grounding
    args = (body.step, body.brief, body.previous_results)
    prompt, wants_search = prompts.step_content_prompt(*args, search=(mode != "off"))
    fallback = "No analysis generated."
    is_market_step = body.step == prompts.STEP_MARKET_INTELLIGENCE

    try:
        text = await gemini.generate_text(
            prompt,
            grounded=wants_search,
            model=settings.gemini_model_search if wants_search else None,
            empty_fallback=fallback,
        )
    except GeminiError as exc:
        # Search grounding has its own quota. If only that is exhausted, still give
        # the user a report - clearly labelled - instead of blocking the whole workflow.
        if not (wants_search and mode == "auto" and exc.status == 429):
            raise
        log.warning(
            "Google rejected search grounding for model %s: %s - falling back to a no-search report.",
            settings.gemini_model_search or settings.gemini_model_text,
            exc.message,
        )
        prompt, _ = prompts.step_content_prompt(*args, search=False)
        text = await gemini.generate_text(prompt, grounded=False, empty_fallback=fallback)
        return StepContentResponse(text=NOTE_QUOTA + text)

    if is_market_step and mode == "off":
        text = NOTE_OFF + text
    return StepContentResponse(text=text)


# --- 4. personas (+ portraits) --------------------------------------------
@router.post(
    "/gemini/personas",
    response_model=PersonasResponse,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
async def personas(
    body: PersonasRequest,
    gemini: GeminiService = Depends(get_gemini),
    settings: Settings = Depends(get_settings),
):
    drafts: list[PersonaDraft] = await gemini.generate_json(
        prompts.persona_contents(body), list[PersonaDraft]
    )

    async def build(i: int, draft: PersonaDraft) -> PersonaProfile:
        profile = PersonaProfile.model_validate(draft.model_dump())
        profile.id = draft.id or f"persona-{i}"
        if draft.visual_description:
            try:
                profile.image_url = await gemini.generate_image_data_uri(
                    prompts.persona_image_prompt(draft.visual_description, body.brief)
                )
            except GeminiError as exc:
                # Same behaviour as the original: a failed portrait never fails the step.
                log.warning("Portrait skipped for %s: %s", draft.name, exc.message)
        return profile

    profiles = await gather_limited(
        [build(i, d) for i, d in enumerate(drafts)], settings.image_concurrency
    )
    return PersonasResponse(text=md.personas_markdown(profiles), personas=profiles)


# --- 5. moments -----------------------------------------------------------
@router.post("/gemini/moments", response_model=MomentsResponse, response_model_by_alias=True)
async def moments(body: MomentsRequest, gemini: GeminiService = Depends(get_gemini)):
    items: list[Moment] = await gemini.generate_json(prompts.moments_prompt(body), list[Moment])
    return MomentsResponse(text=md.moments_markdown(items), moments=items)


# --- 6. big ideas ---------------------------------------------------------
@router.post("/gemini/big-ideas", response_model=BigIdeasResponse, response_model_by_alias=True)
async def big_ideas(body: BigIdeasRequest, gemini: GeminiService = Depends(get_gemini)):
    ideas: list[BigIdea] = await gemini.generate_json(prompts.big_ideas_prompt(body), list[BigIdea])
    return BigIdeasResponse(text=md.big_ideas_markdown(ideas), ideas=ideas)


# --- 7. media strategy ----------------------------------------------------
@router.post("/gemini/media-strategy", response_model=MediaStrategyResponse, response_model_by_alias=True)
async def media_strategy(body: MediaStrategyRequest, gemini: GeminiService = Depends(get_gemini)):
    # Larger output than the other steps (it now includes Content Insight), and a
    # truncated nested object cannot be recovered, so allow extra headroom.
    strategy: MediaStrategyResult = await gemini.generate_json(
        prompts.media_strategy_prompt(body), MediaStrategyResult, max_output_tokens=16384
    )
    return MediaStrategyResponse(text=md.media_strategy_markdown(strategy), strategy=strategy)
