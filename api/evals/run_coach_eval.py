"""Explicit paid semantic checks; no expected labels enter model context."""

import json
import time

from app.core.config import Settings
from app.services.coach_reasoning import analyse
from app.services.coach_state import (
    Analysis,
    Candidate,
    Turn,
    append_turn,
    apply_analysis,
    new_state,
)

CASES = [
    ("rep", "How much have you allocated for the project?", "asked"),
    ("rep", "What sort of budget are we working with?", "asked"),
    ("prospect", "We have set aside forty thousand dollars for it.", "answered"),
    ("rep", "I will not ask what budget you have set aside yet.", "shown"),
    ("rep", 'Another rep asked me, "What budget have you set aside?" yesterday.', "shown"),
    ("rep", "If I asked what your budget was, would that be too early?", "shown"),
    ("rep", "What budget have you… actually, let us discuss the renewal first.", "shown"),
    ("unknown", "What budget have you set aside?", "shown"),
    ("prospect", "Would you like to know our budget?", "shown"),
    ("prospect", "The insurer will halve our premium, right?", "shown"),
]


def run():
    settings = Settings()
    cases = []
    for role, text, expected in CASES:
        sources = [{"id": "customer", "kind": "customer", "text": "A customer reviewing IT costs."}]
        state = new_state()
        apply_analysis(
            state,
            Analysis(
                candidates=[
                    Candidate(
                        intent="budget_range",
                        kind="ask",
                        text="What budget have you set aside?",
                        reason="Understand budget",
                        evidence_ids=["customer"],
                        priority=80,
                    )
                ]
            ),
            0,
            sources,
        )
        append_turn(state, Turn(sequence=0, role=role, text=text, start_ms=0, end_ms=2000))
        row = {"state": state, "context": {"customer": {"name": "Alex"}, "sources": sources}}
        started = time.monotonic()
        analysis, model = analyse(settings, row)
        apply_analysis(state, analysis, state["control_revision"], sources)
        actual = state["suggestions"][0]["status"]
        cases.append(
            {
                "role": role,
                "text": text,
                "expected": expected,
                "actual": actual,
                "pass": actual == expected,
                "model": model,
                "latency_ms": round((time.monotonic() - started) * 1000),
            }
        )
    positives = {"asked", "answered"}
    tp = sum(c["actual"] in positives and c["expected"] in positives for c in cases)
    fp = sum(c["actual"] in positives and c["expected"] not in positives for c in cases)
    fn = sum(c["actual"] not in positives and c["expected"] in positives for c in cases)
    print(
        json.dumps(
            {
                "cases": cases,
                "precision": tp / (tp + fp) if tp + fp else None,
                "recall": tp / (tp + fn) if tp + fn else None,
            },
            indent=2,
        )
    )
    return all(c["pass"] for c in cases)


if __name__ == "__main__":
    raise SystemExit(0 if run() else 1)
