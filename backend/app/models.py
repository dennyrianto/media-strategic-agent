"""Pydantic models.

These replace both `types.ts` (the contract with the React UI) and the
hand-written `responseSchema` blocks that used to live in `server.ts`.
The same class is used to:

  1. validate incoming requests,
  2. tell Gemini what JSON shape to produce (response_schema),
  3. validate Gemini's answer before it reaches the UI,
  4. generate the OpenAPI schema at /docs.

JSON is camelCase on the wire so the existing React UI works unchanged;
Python code uses snake_case.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        # "ignore" (not "allow") on purpose: these classes are also sent to
        # Gemini as response schemas, and the Gemini Developer API rejects
        # schemas containing `additionalProperties`. Unknown fields the UI
        # sends back (e.g. a persona's base64 imageUrl) are simply dropped,
        # which the endpoints don't need anyway.
        extra="ignore",
    )


# --------------------------------------------------------------------------
# Brief (step 1)
# --------------------------------------------------------------------------
class MediaBrief(CamelModel):
    brand_name: str = ""
    industry: str = ""
    product: str = ""
    target_audience: str = ""
    objectives: str = ""
    budget: str = ""
    timeline: str = ""
    additional_notes: str = ""
    summary: str | None = None
    is_confirmed: bool | None = None
    suggestions: list[str] | None = None


class BriefAnalysis(CamelModel):
    """Gemini output for /analyze-brief (internal; flattened for the UI)."""

    brand_name: str
    industry: str
    product: str = ""
    target_audience: str = ""
    objectives: str = ""
    budget: str = ""
    timeline: str = ""
    full_summary: str = Field(
        description=(
            "The detailed professional Markdown briefing document. Must include "
            "specific objectives, audience details, timeline, budget, brand "
            "identity, and campaign tasks."
        )
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="A list of 3-5 strategic suggestions or missing info alerts.",
    )


# --------------------------------------------------------------------------
# Market dashboard (step 2)
# --------------------------------------------------------------------------
class Benchmark(CamelModel):
    name: str = ""
    market_share: str = ""
    media_spend: str = ""
    digital_maturity: str = ""
    sentiment: str = ""


class Swot(CamelModel):
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    threats: list[str] = Field(default_factory=list)


class Trend(CamelModel):
    title: str = ""
    description: str = ""


class MarketDashboard(CamelModel):
    sentiment: float = Field(default=0, description="Score 0-100")
    growth: str = Field(default="", description="e.g. +5.4% CAGR")
    key_insights: list[str] = Field(
        default_factory=list, description="3 strategic bullet points summary"
    )
    channel_mix: list[str] = Field(
        default_factory=list, description="Top 3 media channels (e.g. TikTok, CTV)"
    )
    audience_segments: list[str] = Field(
        default_factory=list,
        description="Top 3 audience micro-segments (e.g. 'Eco-conscious Gen Z')",
    )
    geo_focus: list[str] = Field(
        default_factory=list,
        description="Key geographic markets (e.g. 'Urban Centers', 'South America')",
    )
    benchmarking: list[Benchmark] = Field(default_factory=list)
    swot: Swot = Field(default_factory=Swot)
    trends: list[Trend] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Personas (step 3)
# --------------------------------------------------------------------------
class PersonaDraft(CamelModel):
    """What Gemini is asked to produce (no image - that is generated separately)."""

    id: str = ""
    name: str
    role: str
    age: str
    quote: str
    micro_segmentation: str
    demographics: list[str] = Field(default_factory=list)
    psychographics: list[str]
    behaviors: list[str] = Field(default_factory=list)
    digital_journey: list[str]
    offline_journey: list[str] = Field(default_factory=list)
    media_habits: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    drivers: list[str]
    brand_affinity: list[str]
    visual_description: str = ""


class PersonaProfile(PersonaDraft):
    """Draft + the portrait data-URI added by the server."""

    image_url: str | None = None


# --------------------------------------------------------------------------
# Moments (step 4)
# --------------------------------------------------------------------------
MomentType = Literal["Cultural", "Seasonal", "Industry", "Sporting", "Trend", "Other"]


class Moment(CamelModel):
    id: str = ""
    month: str = Field(description="Just the month name (e.g. 'January')")
    title: str = Field(description="The Occasion/Theme (e.g. 'Chinese New Year')")
    date: str = Field(description="Specific tentative date (e.g. 'Feb 17')")
    type: MomentType
    relevance_score: float = Field(description="0 to 100")
    description: str
    activation_idea: str = Field(description="The Campaign Idea for this moment")
    content_focus: str = Field(description="Key themes or types of content to produce")
    branding_idea: str = Field(
        description="A specific branding angle or tagline direction"
    )


# --------------------------------------------------------------------------
# Big ideas (step 5)
# --------------------------------------------------------------------------
FunnelRole = Literal["Awareness", "Consideration", "Trial", "Conversion"]


class Acronym(CamelModel):
    word: str
    meaning: str


class FunnelStage(CamelModel):
    role: FunnelRole
    strategy: str
    touchpoints: list[str]


class BigIdea(CamelModel):
    title: str
    tagline: str
    hook: str
    rationale: str
    cultural_fit: str
    acronym: Acronym
    funnel_strategy: list[FunnelStage]


# --------------------------------------------------------------------------
# Media strategy (step 6)
# --------------------------------------------------------------------------
class ChannelCategoryStrategy(CamelModel):
    category: Literal["Conventional", "Digital", "Activation"]
    strategy: str
    approach: str
    explanation: str
    tactics: list[str]


class MediaFunnelStage(CamelModel):
    stage: FunnelRole
    objective: str
    kpi: str
    channel_strategies: list[ChannelCategoryStrategy]


class ProgrammaticIdea(CamelModel):
    concept_name: str
    data_triggers: str
    moment_connection: str
    creative_execution: str
    real_life_application: str


class PersonaMediaStrategy(CamelModel):
    persona_name: str
    overview: str
    matched_big_idea: str
    matched_moments: list[str]
    funnel_breakdown: list[MediaFunnelStage]
    programmatic_ideas: list[ProgrammaticIdea]


class BudgetAllocation(CamelModel):
    channel: str
    percentage: float
    rationale: str


class Targeting(CamelModel):
    demographics: str
    affinities: list[str]


class MediaChannelTactic(CamelModel):
    channel: str
    role: str
    tactic_description: str
    content_themes: list[str]
    formats: list[str]
    best_practices: str
    targeting: Targeting


class LocalNuance(CamelModel):
    aspect: str
    insight: str


class CampaignPhase(CamelModel):
    name: str
    timing: str
    objective: str


class ChannelActivity(CamelModel):
    phase_name: str
    action: str
    intensity: Literal["High", "Medium", "Low", "None"]


class ChannelFlight(CamelModel):
    channel: str
    activities: list[ChannelActivity]


class FlightPlan(CamelModel):
    phases: list[CampaignPhase]
    channels: list[ChannelFlight]


class MediaStrategyResult(CamelModel):
    persona_strategies: list[PersonaMediaStrategy]
    budget_allocation: list[BudgetAllocation]
    tactical_blueprint: list[MediaChannelTactic]
    local_nuances: list[LocalNuance]
    flight_plan: FlightPlan


# --------------------------------------------------------------------------
# Request / response envelopes (the HTTP contract the UI relies on)
# --------------------------------------------------------------------------
class AnalyzeBriefRequest(CamelModel):
    text: str | None = None
    file_base64: str | None = None
    mime_type: str | None = None


class AnalyzeBriefResponse(CamelModel):
    summary: str
    structured: dict[str, str]
    suggestions: list[str]


class MarketDashboardRequest(CamelModel):
    raw_intel: str = ""


class UploadedFile(CamelModel):
    name: str = ""
    base64: str = ""
    mime_type: str = ""


class PersonasRequest(CamelModel):
    brief: MediaBrief = Field(default_factory=MediaBrief)
    market_intelligence: str = ""
    additional_files: list[UploadedFile] = Field(default_factory=list)
    refinement_query: str | None = None


class PersonasResponse(CamelModel):
    text: str
    personas: list[PersonaProfile]


class MomentsRequest(CamelModel):
    brief: MediaBrief = Field(default_factory=MediaBrief)
    market_intelligence: str = ""
    persona_summary: str = ""


class MomentsResponse(CamelModel):
    text: str
    moments: list[Moment]


class BigIdeasRequest(CamelModel):
    brief: MediaBrief = Field(default_factory=MediaBrief)
    market_intelligence: str = ""
    personas: list[PersonaProfile] = Field(default_factory=list)
    moments: list[Moment] = Field(default_factory=list)


class BigIdeasResponse(CamelModel):
    text: str
    ideas: list[BigIdea]


class MediaStrategyRequest(CamelModel):
    brief: MediaBrief = Field(default_factory=MediaBrief)
    personas: list[PersonaProfile] = Field(default_factory=list)
    market_intel: str = ""
    moments: list[Moment] = Field(default_factory=list)
    big_ideas: list[BigIdea] = Field(default_factory=list)


class MediaStrategyResponse(CamelModel):
    text: str
    strategy: MediaStrategyResult


class StepContentRequest(CamelModel):
    step: int
    brief: MediaBrief = Field(default_factory=MediaBrief)
    # {"2": {"rawText": "..."}, ...} - JSON object keys are strings
    previous_results: dict[str, dict] = Field(default_factory=dict)


class StepContentResponse(CamelModel):
    text: str
