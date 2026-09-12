from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.llm import create_reasoning_client, structured

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "coach-v1.md"


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


def suggest_next_move(
    settings: Settings,
    turns: list[CoachingTurn],
    deal_context: str | None = None,
) -> CoachingSuggestion:
    prospect_turns = [turn for turn in turns if turn.role == "prospect"]
    anchor = prospect_turns[-1] if prospect_turns else turns[-1]
    fallback = deterministic_suggestion(anchor)
    try:
        reasoning = create_reasoning_client(settings)
        bounded_client = reasoning.client.with_options(timeout=5.0, max_retries=0)
        reasoning = replace(reasoning, client=bounded_client)
        prompt = PROMPT_PATH.read_text(encoding="utf-8")
        payload = {
            "deal_context": deal_context,
            "transcript_turns": [turn.model_dump() for turn in turns[-12:]],
            "allowed_evidence_sequences": [
                turn.sequence for turn in turns[-12:] if turn.role == "prospect"
            ],
        }
        result = structured(
            reasoning,
            system=prompt,
            user=json.dumps(payload),
            schema=CoachingSuggestion,
            max_tokens=300,
            timeout=5.0,
        )
        suggestion = result.output
        if suggestion.evidence_sequence not in payload["allowed_evidence_sequences"]:
            return fallback
        return suggestion.model_copy(update={"source": "model", "model": result.model})
    except Exception:  # Provider failures must not interrupt a live call.
        return fallback
