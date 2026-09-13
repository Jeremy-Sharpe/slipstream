from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

from app.core.llm import create_reasoning_client, structured
from app.services.coach_state import Analysis

PROMPT = Path(__file__).resolve().parents[1] / "prompts" / "coach-session-v2.md"
# Measured gpt-5.4 analyses took 2.2 to 6.1 s. Results arrive asynchronously and a stale one is
# discarded by revision, so a longer ceiling costs nothing but a slower card on a slow call.
TIMEOUT_SECONDS = 10


def analyse(settings, row: dict) -> tuple[Analysis, str]:
    reasoning = create_reasoning_client(settings)
    reasoning = replace(
        reasoning, client=reasoning.client.with_options(timeout=TIMEOUT_SECONDS, max_retries=0)
    )
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
        timeout=TIMEOUT_SECONDS,
    )
    return result.output, result.model
