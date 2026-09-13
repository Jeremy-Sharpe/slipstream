from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

from app.core.llm import create_reasoning_client, structured
from app.services.coach_state import Analysis

PROMPT = Path(__file__).resolve().parents[1] / "prompts" / "coach-session-v1.md"


def analyse(settings, row: dict) -> tuple[Analysis, str]:
    reasoning = create_reasoning_client(settings)
    reasoning = replace(reasoning, client=reasoning.client.with_options(timeout=5, max_retries=0))
    state = row["state"]
    payload = {
        "context": row["context"],
        "recent_turns": state["turns"][-24:],
        "suggestions": state["suggestions"],
        "facts": state["facts"],
        "commitments": state["commitments"],
    }
    result = structured(
        reasoning,
        system=PROMPT.read_text(),
        user=json.dumps(payload),
        schema=Analysis,
        max_tokens=1600,
        timeout=5,
    )
    return result.output, result.model
