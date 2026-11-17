import pytest
from fastapi.testclient import TestClient

from app import models as m
from app.config import Settings, get_settings
from app.gemini import GeminiError
from app.main import create_app
from app.routes import _hits, get_gemini


def persona_draft(i=0, visual="a smiling 30 year old"):
    return m.PersonaDraft(
        name=f"Persona {i}", role="Marketer", age="30", quote="Hello", micro_segmentation="Seg",
        demographics=["Urban"], psychographics=["Curious"], behaviors=["Scrolls"],
        digital_journey=["TikTok"], offline_journey=["Mall"], media_habits=["Video"],
        pain_points=["Price"], drivers=["Status"], brand_affinity=["Nike"],
        visual_description=visual,
    )


def moment(i=0, score=50):
    return m.Moment(
        title=f"Moment {i}", month="January", date="Jan 1", type="Cultural", relevance_score=score,
        description="d", activation_idea=f"idea {i}", content_focus="c", branding_idea="b",
    )


def big_idea(i=0):
    return m.BigIdea(
        title=f"Idea {i}", tagline="Tag", hook="Hook", rationale="Why", cultural_fit="Fit",
        acronym=m.Acronym(word="GO", meaning="Great Offer"),
        funnel_strategy=[m.FunnelStage(role="Awareness", strategy="S", touchpoints=["TV", "OOH"])],
    )


def strategy():
    return m.MediaStrategyResult(
        persona_strategies=[m.PersonaMediaStrategy(
            persona_name="Persona 0", overview="Over", matched_big_idea="Idea 0", matched_moments=["Moment 0"],
            funnel_breakdown=[m.MediaFunnelStage(
                stage="Awareness", objective="Reach", kpi="CPM",
                channel_strategies=[m.ChannelCategoryStrategy(
                    category="Digital", strategy="S", approach="A", explanation="E", tactics=["t"])])],
            programmatic_ideas=[m.ProgrammaticIdea(
                concept_name="Rain", data_triggers="Weather", moment_connection="mc",
                creative_execution="ce", real_life_application="rla")])],
        budget_allocation=[m.BudgetAllocation(channel="TV", percentage=40, rationale="Reach")],
        tactical_blueprint=[m.MediaChannelTactic(
            channel="TV", role="Awareness", tactic_description="td", content_themes=["x"], formats=["30s"],
            best_practices="bp", targeting=m.Targeting(demographics="18-34", affinities=["Sports"]))],
        local_nuances=[m.LocalNuance(aspect="Lang", insight="Bahasa")],
        flight_plan=m.FlightPlan(
            phases=[m.CampaignPhase(name="Tease", timing="W1-2", objective="Buzz")],
            channels=[m.ChannelFlight(channel="TV", activities=[
                m.ChannelActivity(phase_name="Tease", action="Teaser", intensity="High")])]),
    )


class FakeGemini:
    """Stands in for GeminiService; records what the routes asked for."""

    def __init__(self):
        self.calls = []
        self.image_fail = set()
        self.raise_error: GeminiError | None = None

    async def generate_json(self, contents, schema, *, max_output_tokens=8192):
        self.calls.append(("json", contents, schema))
        if self.raise_error:
            raise self.raise_error
        if schema is m.BriefAnalysis:
            return m.BriefAnalysis(brand_name="Acme", industry="Retail", product="Shoes", budget="$1M",
                                   full_summary="# Acme Strategic Brief", suggestions=["Q1?", "Q2?"])
        if schema is m.MarketDashboard:
            return m.MarketDashboard(sentiment=72, growth="+5% CAGR", key_insights=["a", "b", "c"],
                                     channel_mix=["TikTok"], benchmarking=[m.Benchmark(name="Rival")],
                                     swot=m.Swot(strengths=["s"]), trends=[m.Trend(title="t", description="d")])
        if schema == list[m.PersonaDraft]:
            return [persona_draft(0), persona_draft(1), persona_draft(2, visual="")]
        if schema == list[m.Moment]:
            return [moment(0, 10), moment(1, 90)]
        if schema == list[m.BigIdea]:
            return [big_idea(0)]
        if schema is m.MediaStrategyResult:
            return strategy()
        raise AssertionError(f"unexpected schema {schema}")

    async def generate_text(self, contents, *, grounded=False, empty_fallback=""):
        self.calls.append(("text", contents, grounded))
        if self.raise_error:
            raise self.raise_error
        return "# Market Intelligence Report"

    async def generate_image_data_uri(self, prompt):
        self.calls.append(("image", prompt))
        if any(k in prompt for k in self.image_fail):
            raise GeminiError("image blocked", 502)
        return "data:image/png;base64,AAAA"


@pytest.fixture
def fake():
    return FakeGemini()


@pytest.fixture
def client(fake):
    _hits.clear()
    app = create_app()
    app.dependency_overrides[get_gemini] = lambda: fake
    return TestClient(app)


@pytest.fixture
def make_client(fake):
    """Client with custom settings (e.g. a tiny rate limit)."""
    def _make(**overrides):
        _hits.clear()
        settings = Settings(**overrides)
        app = create_app(settings)
        app.dependency_overrides[get_gemini] = lambda: fake
        app.dependency_overrides[get_settings] = lambda: settings
        return TestClient(app)
    return _make
