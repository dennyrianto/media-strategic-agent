"""All prompt text, ported from server.ts.

Edit wording here without touching routes. The truncation limits below were
hard-coded in the original server; they are named so they are easy to tune
(for example, raise STEP_CONTEXT_CHARS so later steps see more of earlier ones).
"""
from __future__ import annotations

import base64
import binascii
import logging

from google.genai import types

from .gemini import bytes_part, text_part
from .models import (
    BigIdeasRequest,
    MediaBrief,
    MediaStrategyRequest,
    MomentsRequest,
    PersonasRequest,
)

log = logging.getLogger("prompts")

# --- truncation limits (characters) ---------------------------------------
STEP_CONTEXT_CHARS = 800  # earlier-step summary passed into /step-content
DASHBOARD_INTEL_CHARS = 15000
PERSONA_INTEL_CHARS = 1500
PERSONA_UPLOAD_CHARS = 25000
MOMENTS_INTEL_CHARS = 1000
MOMENTS_PERSONA_CHARS = 1000
BIGIDEA_INTEL_CHARS = 500
STRATEGY_INTEL_CHARS = 300

# AppStep numbers (see frontend/types.ts)
STEP_MARKET_INTELLIGENCE = 2
STEP_AUDIENCE_PERSONA = 3
STEP_BIG_IDEA = 5

PERSONA_SYSTEM_TEXT_MIME_HINTS = ("csv", "xml", "javascript")


# ---------------------------------------------------------------------------
# 1. Analyze brief
# ---------------------------------------------------------------------------
ANALYZE_BRIEF_PROMPT = """
    You are Stratagem AI, an elite media strategy director.
    Your task is to deeply analyze the provided media brief (document) and generate a **highly detailed, professional Strategic Briefing Document**.
    
    **CRITICAL INSTRUCTIONS FOR QUALITY & CONSISTENCY**:
    1. **Exhaustive Detail**: Do not summarize into brevity. Extract every available specific detail. If the source mentions "Q4 launch", specify "October - December". If it mentions "Gen Z", expand to "Gen Z (Ages 12-27)".
    2. **Consistency**: Ensure the Budget and Timeline mentioned in the Key Parameters match exactly with the details in the Scope & Execution section.
    3. **Professional Expansion**: If the input is sparse in certain areas, use your strategic expertise to flesh out the implied requirements standard for a top-tier media agency brief, clearly marking inferred strategic value.
    4. **Structure**: Follow the required Markdown structure strictly.

    1. **Data Extraction**: Extract specific fields for the JSON structure (Brand, Budget, etc.).
    
    2. **Strategic Briefing Document Generation (Markdown in 'fullSummary')**:
       
       **FORMATTING RULES**:
       - Use standard Markdown headers (#, ##).
       - Use bullet points for readability.
       - **Bold** key metrics and terms.

       **REQUIRED DOCUMENT CONTENT**:
       
       # [Brand Name] Strategic Brief
       
       ## 1. Executive Summary
       [A comprehensive executive summary synthesizing the campaign's background, core challenge, and ultimate goal. Write this as a narrative paragraph.]

       ## 2. Key Campaign Constraints
       - **Brand**: [Brand Name]
       - **Total Budget**: [Amount - Ensure currency is consistent]
       - **Flight Dates**: [Start Date - End Date]
       - **Primary Market**: [Geo target]
       
       ## 3. Strategic Objectives & KPIs
       - **Business Goals**: [Revenue, Volume, Market Share]
       - **Marketing Goals**: [Penetration, Retention, Loyalty]
       - **Media KPIs**: [Reach, Impressions, CTR, CPA, ROAS]
       
       ## 4. Target Audience Deep Dive
       - **Demographic Profile**: [Age, Gender, Location, Income]
       - **Psychographic Profile**: [Interests, Values, Lifestyle]
       - **Consumer Insight**: [The "Why" behind their behavior - The deep human truth]
       - **Behavioral Context**: [Current habits vs Desired habits]
       
       ## 5. Brand & Product Positioning
       - **Product Truth**: [Key features and functional benefits]
       - **Emotional Benefit**: [How it makes the user feel]
       - **Brand Tone**: [Personality keywords]
       - **Competitive Landscape**: [Key competitors and relative standing]

       ## 6. Campaign Scope, Phases & Deliverables
       - **Phasing Strategy**: [Pre-launch, Launch, Sustain, Pulse details]
       - **Channel Requirements**: [TV, Digital, Social, OOH, etc.]
       - **Asset Checklist**: [Video lengths, Banner sizes, etc.]
       - **Mandatories**: [Legal disclaimers, Brand safety, Exclusions]

    3. **Gap Analysis**: Populate the 'suggestions' array with 3-5 critical strategic questions or missing data points needed to perfect the strategy.
    
    Return the result as a JSON object.
    """


def analyze_brief_contents(
    text: str | None, file_base64: str | None, mime_type: str | None
) -> list[types.Part]:
    contents: list[types.Part] = []
    if file_base64 and mime_type:
        contents.append(bytes_part(file_base64, mime_type))
    if text:
        contents.append(text_part(text))
    contents.append(text_part(ANALYZE_BRIEF_PROMPT))
    return contents


# ---------------------------------------------------------------------------
# 2. Market dashboard
# ---------------------------------------------------------------------------
def market_dashboard_prompt(raw_intel: str) -> str:
    return f"""
    Based on the following Market Intelligence Report, extract and structure data for an Executive Dashboard.
    
    Data to Extract:
    1. Market Sentiment (0-100 score).
    2. Market Growth Potential (Short string).
    3. Competitor Benchmarking (At least 3 competitors).
    4. SWOT Analysis.
    5. Top 3 Strategic Trends.
    6. Key Insights: 3 critical strategic takeaways in one sentence each.
    7. Channel Mix: Top 3 recommended media channels based on current trends.
    8. Audience Segments: Top 3 key consumer micro-segments identified.
    9. Geographic Focus: Key regions or markets mentioned or relevant.

    Report Text:
    {(raw_intel or '')[:DASHBOARD_INTEL_CHARS]}
    """


# ---------------------------------------------------------------------------
# 3. Step content (market intelligence, search-grounded)
# ---------------------------------------------------------------------------
def _brief_context(brief: MediaBrief) -> str:
    if brief.summary:
        return f"Validated Brief Summary:\n{brief.summary}"
    return f"""Brand: {brief.brand_name}
         Industry: {brief.industry}
         Product: {brief.product}
         Audience: {brief.target_audience}
         Objectives: {brief.objectives}
         Budget: {brief.budget}
         Timeline: {brief.timeline}"""


def _prior_text(previous: dict[str, dict], step: int) -> str | None:
    entry = previous.get(str(step)) or {}
    raw = entry.get("rawText")
    return raw[:STEP_CONTEXT_CHARS] if isinstance(raw, str) and raw else None


def step_content_prompt(
    step: int, brief: MediaBrief, previous: dict[str, dict], *, search: bool = True
) -> tuple[str, bool]:
    """Returns (full prompt, use_google_search).

    search=False builds the no-live-search variant of the market intelligence
    prompt (used when search quota is exhausted or search is switched off).
    It forbids invented statistics and citations, which the search-grounded
    wording would otherwise encourage.
    """
    context = f"""
      You are Stratagem AI, an elite media strategy director. 
      Current Context:
      {_brief_context(brief)}
    """
    if step > STEP_MARKET_INTELLIGENCE and (t := _prior_text(previous, STEP_MARKET_INTELLIGENCE)):
        context += f"\n\nMarket Intelligence Summary: {t}..."
    if step > STEP_AUDIENCE_PERSONA and (t := _prior_text(previous, STEP_AUDIENCE_PERSONA)):
        context += f"\n\nTarget Personas: {t}..."
    if step > STEP_BIG_IDEA and (t := _prior_text(previous, STEP_BIG_IDEA)):
        context += f"\n\nBig Idea: {t}..."

    if step == STEP_MARKET_INTELLIGENCE:
        if search:
            search_line = "Use Real-Time Google Search to synthesize the latest data, trends, and reports."
            source_block = """**MANDATORY SOURCE INTEGRATION**:
        - You MUST incorporate data and insights from reliable industry sources such as **Kantar, Nielsen, Statista, Gartner, Mintel, Euromonitor, or regional equivalents**.
        - **Explicitly cite the source names** within the analysis text."""
            sources_line = "(List the key sources used)."
        else:
            search_line = "Live Google Search is NOT available for this run. Work only from your background knowledge."
            source_block = """**SOURCE INTEGRITY (no live search available)**:
        - Do NOT invent statistics, quotes, report titles or source citations.
        - Name industry sources (Kantar, Nielsen, Statista, etc.) only as general places to look, never as the origin of a specific number you cannot verify.
        - Where reliable data is missing, say so, and label every figure as an approximate estimate."""
            sources_line = "(State that no live sources were consulted. List only general industry references worth checking.)"
        task = f"""
        Perform a **Deep Market & Competitive Intelligence Analysis** for **{brief.brand_name}** in the **{brief.industry}** sector.
        {search_line}

        {source_block}

        **CRITICAL OUTPUT REQUIREMENT**:
        - Return the result ONLY as a clean, professionally formatted **MARKDOWN** document.
        - **DO NOT** output JSON, raw object data, or messy internal thoughts.
        - Ensure Headers (H1, H2, H3) are used correctly.

        **Required Report Structure (Strict Markdown)**:

        # Market Intelligence Report: {brief.industry}

        ## 1. Executive Summary
        (A high-level synthesis of the current market state and immediate opportunities for {brief.brand_name}.)

        ## 2. Market Dynamics & Trends
        - **Market Size & Growth**: Current valuation, growth drivers.
        - **Consumer Spending & Culture**: Evolving spending habits.
        - **Emerging Trends**: Top 3 shifts (e.g., sustainability, digital-first).

        ## 3. Competitive Landscape
        *(Analyze top 3 competitors)*
        ### Competitor A: [Name]
        - **Strategy**: Media focus and positioning.
        - **Strength**: What they do best.
        - **Weakness**: Where they are vulnerable.

        ### Competitor B: [Name]
        - **Strategy**: ...
        - **Strength**: ...
        - **Weakness**: ...

        ## 4. Audience Demographics & Psychographics (New)
        - **Key Segments**: Detailed breakdown of who is buying.
        - **Behavioral Drivers**: Why they buy.
        
        ## 5. Geographic Focus (New)
        - **Key Regions**: Where the demand is highest.
        - **Growth Markets**: Emerging areas to watch.

        ## 6. Brand Opportunity (SWOT Synthesis)
        - **Strengths**: Internal advantages.
        - **Weaknesses**: Internal limitations.
        - **Opportunities**: External possibilities (White Spaces).
        - **Threats**: External risks.

        ## 7. Strategic Comparison Matrix
        (Create a Markdown Table comparing {brief.brand_name} vs Competitors on Market Position, Audience, and Digital Maturity).
        
        ## 8. Data Sources
        {sources_line}
        """
        return f"{context}\n\nTask: {task}", search

    return f"{context}\n\nTask: Analyze the brief and provide strategic insights.", False


# ---------------------------------------------------------------------------
# 4. Personas
# ---------------------------------------------------------------------------
def _is_text_mime(mime: str) -> bool:
    return (
        mime.startswith("text/")
        or mime == "application/json"
        or any(hint in mime for hint in PERSONA_SYSTEM_TEXT_MIME_HINTS)
    )


def persona_contents(req: PersonasRequest) -> list[types.Part]:
    contents: list[types.Part] = []

    for f in req.additional_files:
        if not f.base64:
            continue
        try:
            if _is_text_mime(f.mime_type):
                raw = base64.b64decode(f.base64).decode("utf-8", errors="replace")
                if len(raw) > PERSONA_UPLOAD_CHARS:
                    raw = raw[:PERSONA_UPLOAD_CHARS] + "\n...[Data Truncated for Analysis]..."
                contents.append(text_part(f"[Uploaded Data: {f.name}]\n{raw}"))
            elif f.mime_type == "application/pdf" or f.mime_type.startswith("image/"):
                contents.append(bytes_part(f.base64, f.mime_type))
        except (binascii.Error, ValueError):
            log.warning("Skipping undecodable upload: %s", f.name)

    brief = req.brief
    prompt = f"""
      You are an expert Strategic Planner and Behavioral Psychologist.
      Based on the following media brief and market intelligence, develop a suite of **3-5 highly detailed, multi-faceted target audience personas**.

      **Brief Context:**
      Brand: {brief.brand_name}
      Industry: {brief.industry}
      Objectives: {brief.objectives}
      Audience: {brief.target_audience}

      **Market Intelligence:** 
      {(req.market_intelligence or '')[:PERSONA_INTEL_CHARS]}
      
      **TASK: Multi-Dimensional Target Audience Persona & Behavioral Modeling**
      1. Enriched Persona Generation: Integrate available insights to create lifelike profiles.
      2. Predictive Behavioral Insights: Model comprehensive audience behavior (journeys, psychographics, brand affinity, micro-segmentation).
      3. Persona Visualization: Short, descriptive visual prompt for the image generator.

      **JSON OUTPUT REQUIREMENTS**:
      Return a JSON array where each object matches this structure strictly:
      - id, name, role, age, quote, microSegmentation
      - demographics, psychographics, behaviors, digitalJourney, offlineJourney, mediaHabits, painPoints, drivers, brandAffinity
      - visualDescription
    """
    if req.refinement_query:
        prompt += f"\n\n**CRITICAL REFINEMENT INSTRUCTION**: {req.refinement_query}"

    contents.append(text_part(prompt))
    return contents


def persona_image_prompt(visual_description: str, brief: MediaBrief) -> str:
    return (
        f"A photorealistic portrait of {visual_description}. "
        f"Context: {brief.brand_name} ({brief.industry}). "
        "High quality, professional photography style, centered composition, soft lighting."
    )


# ---------------------------------------------------------------------------
# 5. Moments
# ---------------------------------------------------------------------------
def moments_prompt(req: MomentsRequest) -> str:
    b = req.brief
    return f"""
      Generate a **Comprehensive Moment Activation Calendar** for the brand **{b.brand_name}**.
      Focus on the campaign timeline: **{b.timeline}**. If the timeline is vague, assume the next 12 months.

      **Goal**: Identify pivotal cultural, seasonal, industry, and market-specific moments that the brand can leverage.
      
      **Inputs to Consider**:
      - **Industry**: {b.industry}
      - **Target Audience**: {b.target_audience}
      - **Market Intelligence**: {(req.market_intelligence or '')[:MOMENTS_INTEL_CHARS]}
      - **Audience Insights**: {(req.persona_summary or '')[:MOMENTS_PERSONA_CHARS]}

      Return a valid JSON array of objects matching the Moment schema.
    """


# ---------------------------------------------------------------------------
# 6. Big ideas
# ---------------------------------------------------------------------------
def big_ideas_prompt(req: BigIdeasRequest) -> str:
    b = req.brief
    if req.personas:
        persona_context = "; ".join(
            f"Name: {p.name}, Role: {p.role}, Motivation: {', '.join(p.drivers)}, "
            f"Pain Point: {p.pain_points[0] if p.pain_points else ''}"
            for p in req.personas
        )
    else:
        persona_context = b.target_audience

    top_moments = "; ".join(
        f"{m.title} ({m.activation_idea})"
        for m in sorted(req.moments, key=lambda m: m.relevance_score or 0, reverse=True)[:5]
    )

    return f"""
      You are a world-class Creative Director. 
      Your task is to develop **5-7 distinct, high-impact "Big Idea" creative concepts** for the brand **{b.brand_name}**.

      **STRATEGIC CONTEXT**:
      - **Industry**: {b.industry}
      - **Core Product**: {b.product}
      - **Campaign Objectives**: {b.objectives}
      - **Market Context**: {(req.market_intelligence or '')[:BIGIDEA_INTEL_CHARS]}...
      
      **AUDIENCE INSIGHTS (Target Personas)**:
      {persona_context}

      **KEY MOMENT OPPORTUNITIES**:
      {top_moments}

      Return a valid JSON array of Big Ideas.
    """


# ---------------------------------------------------------------------------
# 7. Media strategy
# ---------------------------------------------------------------------------
def media_strategy_prompt(req: MediaStrategyRequest) -> str:
    b = req.brief
    personas = "\n".join(f"- {p.name} ({p.role})" for p in req.personas)
    big_ideas = "; ".join(f"{i.title}: {i.hook}" for i in req.big_ideas)
    moments = "; ".join(f"{m.title} ({m.month})" for m in req.moments[:5])
    return f"""
      You are an expert Media Planner and Strategy Director.
      Create a highly detailed, **executable Media Strategy & Approach** document for real-life media planning.
      
      **Brand**: {b.brand_name}
      **Objectives**: {b.objectives}
      **Budget**: {b.budget}
      **Timeline**: {b.timeline}
      **Market Context**: {(req.market_intel or '')[:STRATEGY_INTEL_CHARS]}

      **Target Personas**:
      {personas}

      **Available Assets**:
      - **Big Ideas**: {big_ideas}
      - **Activation Moments**: {moments}

    #   Recommended media KPI by funnel
    
      Return strictly JSON matching the required schema. Ensure flightPlan and targeting are fully populated.
    """
