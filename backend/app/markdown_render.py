"""Builds the `text` (markdown) field returned alongside each structured result.

The UI stores this as `rawText` and reuses it for exports and as context for
later steps, so the format is kept identical to the original server.ts.
"""
from __future__ import annotations

from .models import BigIdea, MediaStrategyResult, Moment, PersonaProfile


def _bullets(items: list[str], empty: str = "") -> str:
    return "\n".join(f"- {i}" for i in items) if items else empty


def personas_markdown(personas: list[PersonaProfile]) -> str:
    blocks = []
    for p in personas:
        blocks.append(f"""
## {p.name}
**{p.role} | {p.age}**
*{p.micro_segmentation or 'Segment'}*

> "{p.quote}"

### Demographics
{_bullets(p.demographics)}

### Psychographics
{_bullets(p.psychographics)}

### Behaviors & Journey
**Digital:**
{_bullets(p.digital_journey, 'N/A')}

**Offline:**
{_bullets(p.offline_journey, 'N/A')}

### Media Habits
{_bullets(p.media_habits)}

### Drivers & Affinity
**Drivers:**
{_bullets(p.drivers)}

**Brand Affinity:**
{_bullets(p.brand_affinity, 'N/A')}
""")
    return "\n# Audience Personas\n\n" + "\n\n".join(blocks) + "\n    "


def moments_markdown(moments: list[Moment]) -> str:
    blocks = [
        f"""
## {m.title} ({m.date})
**Type**: {m.type} | **Relevance**: {m.relevance_score:g}/100

{m.description}

**Campaign Idea**: {m.activation_idea}
**Content Focus**: {m.content_focus}
**Branding Idea**: {m.branding_idea}
"""
        for m in moments
    ]
    return "\n# Moment Activation Calendar\n\n" + "\n---\n".join(blocks) + "\n    "


def big_ideas_markdown(ideas: list[BigIdea]) -> str:
    blocks = []
    for idea in ideas:
        funnel = "\n".join(
            f"""
**{s.role}**
- Strategy: {s.strategy}
- Touchpoints: {', '.join(s.touchpoints)}
"""
            for s in idea.funnel_strategy
        )
        blocks.append(f"""
## {idea.title}
**Tagline**: "{idea.tagline}"
**Acronym**: {idea.acronym.word} - {idea.acronym.meaning}

**The Hook**: {idea.hook}

### Strategic Rationale
{idea.rationale}

### Funnel Strategy
{funnel}

### Cultural Fit
{idea.cultural_fit}
""")
    return "\n# Strategic Creative Concepts (Big Ideas)\n\n" + "\n---\n".join(blocks) + "\n    "


def media_strategy_markdown(s: MediaStrategyResult) -> str:
    persona_blocks = []
    for p in s.persona_strategies:
        funnel_parts = []
        for f in p.funnel_breakdown:
            channels = "\n".join(
                f"- **{cs.category}**: {cs.strategy}" for cs in f.channel_strategies
            )
            funnel_parts.append(f"\n**{f.stage}** ({f.objective})\n{channels}\n")
        funnel = "\n".join(funnel_parts)
        programmatic = "\n".join(
            f"- {g.concept_name}: {g.data_triggers} -> {g.real_life_application}"
            for g in p.programmatic_ideas
        )
        persona_blocks.append(f"""
### {p.persona_name}
{p.overview}
**Leveraging**: {p.matched_big_idea}
**Key Moments**: {', '.join(p.matched_moments)}

**Funnel Strategy**:
{funnel}

**Programmatic Ideas**:
{programmatic}
""")

    persona_section = "\n\n---\n\n".join(persona_blocks)
    budget = "\n".join(
        f"- **{b.channel} ({b.percentage:g}%)**: {b.rationale}" for b in s.budget_allocation
    )
    blueprint = "\n".join(
        f"### {t.channel}\nRole: {t.role}\nFormats: {', '.join(t.formats)}"
        for t in s.tactical_blueprint
    )
    targeting = "\n".join(
        f"**{t.channel}**: {t.targeting.demographics} | {', '.join(t.targeting.affinities)}"
        for t in s.tactical_blueprint
    )

    return f"""
# Media Strategy & Approach

## Persona Strategies
{persona_section}

## Media Mix & Budget
{budget}

## Tactical Blueprint
{blueprint}

## Media Targeting
{targeting}
    """
