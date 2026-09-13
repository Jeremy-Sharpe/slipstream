from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import create_reasoning_client, structured

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "coach-v1.md"

RiskFlag = Literal["pressure", "overclaim", "unverifiable"]

PRESSURE_PHRASES: tuple[str, ...] = (
    "already signed",
    "gone friday",
    "price is gone",
    "offer expires",
    "expires friday",
    "today only",
    "last chance",
    "sign today",
    "don't need a committee",
    "no need for a committee",
)

OVERCLAIM_PHRASES: tuple[str, ...] = (
    "guarantee",
    "never hallucinate",
    "never fail",
    "never wrong",
    "never get it wrong",
    "never gets it wrong",
    "never make a mistake",
    "never makes a mistake",
    "always accurate",
    "always correct",
    "always right",
    "always works",
    "100% accurate",
    "zero errors",
    "halve",
    "double your",
    "triple your",
)

UNVERIFIABLE_PHRASES: tuple[str, ...] = (
    "none of our clients",
    "not one of our clients",
    "no client of ours",
    "your incumbent",
    "about to lose",
    "about to go under",
    "we are the only",
    "nobody else can",
)

# First match wins, so the kinds are ordered by how badly they damage the call.
_RISK_RULES: tuple[tuple[RiskFlag, tuple[str, ...], str, str], ...] = (
    (
        "pressure",
        PRESSURE_PHRASES,
        "Drop the fake urgency",
        "Manufactured deadlines cost trust: take the scarcity back and ask what their own "
        "timing and approval steps actually are.",
    ),
    (
        "overclaim",
        OVERCLAIM_PHRASES,
        "Soften the absolute",
        "Replace the guarantee with what you can evidence: name the review gates and say "
        "plainly where a human still signs off.",
    ),
    (
        "unverifiable",
        UNVERIFIABLE_PHRASES,
        "Ground or drop the claim",
        "You cannot stand that up live: stick to what you can show in writing and leave "
        "other clients and the competitor out of it.",
    ),
)


class CoachingTurn(BaseModel):
    sequence: int = Field(ge=0)
    speaker: str = Field(min_length=1, max_length=80)
    role: Literal["rep", "prospect", "unknown"]
    text: str = Field(min_length=1, max_length=4000)


class CoachingSuggestion(BaseModel):
    category: Literal["discovery", "objection", "risk", "next_step"]
    title: str = Field(min_length=1, max_length=40)
    message: str = Field(min_length=1, max_length=180)
    evidence_sequence: int = Field(ge=0)
    source: Literal["deterministic", "model"] = "deterministic"
    model: str = "coach-rules-v1"
    flag: RiskFlag | None = None


def deterministic_suggestion(turn: CoachingTurn) -> CoachingSuggestion:
    lowered = turn.text.lower()
    if any(word in lowered for word in ("price", "cost", "budget", "expensive")):
        category, title = "objection", "Understand the budget"
        message = "Ask what budget range they planned for and what outcome would justify it."
    elif any(word in lowered for word in ("security", "risk", "concern", "worried")):
        category, title = "risk", "Explore the concern"
        message = (
            "Acknowledge the concern, then ask what must be true for them to feel comfortable."
        )
    elif any(word in lowered for word in ("problem", "struggle", "manual", "hours")):
        category, title = "discovery", "Quantify the impact"
        message = "Ask how often this happens and what it costs the team when it does."
    elif any(word in lowered for word in ("timeline", "quarter", "month", "week", "date")):
        category, title = "next_step", "Make timing concrete"
        message = (
            "Ask for the target date, decision owner, and the step that needs to happen first."
        )
    else:
        category, title = "discovery", "Go one level deeper"
        message = "Ask for a recent example and why solving it matters now."
    return CoachingSuggestion(
        category=category,
        title=title,
        message=message,
        evidence_sequence=turn.sequence,
    )


def rep_risk_flag(turn: CoachingTurn) -> CoachingSuggestion | None:
    if turn.role != "rep":
        return None
    lowered = turn.text.lower().replace("’", "'")
    for flag, phrases, title, message in _RISK_RULES:
        if any(phrase in lowered for phrase in phrases):
            return CoachingSuggestion(
                category="risk",
                title=title,
                message=message,
                evidence_sequence=turn.sequence,
                flag=flag,
                model="coach-risk-rules-v1",
            )
    return None


def _bounded_structured(
    settings: Settings,
    payload: dict[str, object],
) -> tuple[CoachingSuggestion, str]:
    reasoning = create_reasoning_client(settings)
    bounded_client = reasoning.client.with_options(timeout=5.0, max_retries=0)
    reasoning = replace(reasoning, client=bounded_client)
    result = structured(
        reasoning,
        system=PROMPT_PATH.read_text(encoding="utf-8"),
        user=json.dumps(payload),
        schema=CoachingSuggestion,
        max_tokens=300,
        timeout=5.0,
    )
    return result.output, result.model


def suggest_next_move(
    settings: Settings,
    turns: list[CoachingTurn],
    deal_context: str | None = None,
) -> CoachingSuggestion:
    prospect_turns = [turn for turn in turns if turn.role == "prospect"]
    anchor = prospect_turns[-1] if prospect_turns else turns[-1]
    fallback = deterministic_suggestion(anchor)
    try:
        allowed = [turn.sequence for turn in turns[-12:] if turn.role == "prospect"]
        suggestion, model = _bounded_structured(
            settings,
            {
                "task": "next_move",
                "deal_context": deal_context,
                "transcript_turns": [turn.model_dump() for turn in turns[-12:]],
                "allowed_evidence_sequences": allowed,
            },
        )
        if suggestion.evidence_sequence not in allowed:
            return fallback
        return suggestion.model_copy(update={"source": "model", "model": model, "flag": None})
    except Exception:  # Provider failures must not interrupt a live call.
        return fallback


def flag_rep_risk(
    settings: Settings,
    turns: list[CoachingTurn],
    deal_context: str | None = None,
) -> CoachingSuggestion | None:
    if not turns:
        return None
    anchor = turns[-1]
    fallback = rep_risk_flag(anchor)
    if fallback is None:
        return None
    try:
        suggestion, model = _bounded_structured(
            settings,
            {
                "task": "risk_flag",
                "deal_context": deal_context,
                "transcript_turns": [turn.model_dump() for turn in turns[-6:]],
                "allowed_evidence_sequences": [anchor.sequence],
                "deterministic_flag": fallback.flag,
            },
        )
        if (
            suggestion.category != "risk"
            or suggestion.flag is None
            or suggestion.evidence_sequence != anchor.sequence
        ):
            return fallback
        return suggestion.model_copy(update={"source": "model", "model": model})
    except Exception:  # Provider failures must not interrupt a live call.
        return fallback
