"""Validated, replayable suggestion lifecycle, independent of transport and providers."""

from __future__ import annotations

import re
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

TERMINAL = {"asked", "answered", "mentioned", "done", "dismissed", "superseded"}
TRAILING_OFF = re.compile(r"…|\.\.\.")
RISKY = re.compile(
    r"guarantee|halve.*premium|never.*breach|lose.*certification|price.*gone|sign today", re.I
)


class Turn(BaseModel):
    sequence: int = Field(ge=0)
    role: Literal["rep", "prospect", "unknown"]
    text: str = Field(min_length=1, max_length=4000)
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)


class Transition(BaseModel):
    suggestion_id: str
    status: Literal["asked", "answered", "mentioned", "superseded"]
    sequence: int
    quote: str
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)


class Candidate(BaseModel):
    intent: str = Field(min_length=1, max_length=100)
    kind: Literal["ask", "mention"]
    text: str = Field(min_length=1, max_length=220)
    reason: str = Field(min_length=1, max_length=300)
    evidence_ids: list[str]
    priority: int = Field(ge=0, le=100)


class Fact(BaseModel):
    topic: str = Field(max_length=100)
    text: str = Field(max_length=400)
    sequence: int
    quote: str


class Analysis(BaseModel):
    transitions: list[Transition] = Field(default_factory=list, max_length=12)
    candidates: list[Candidate] = Field(default_factory=list, max_length=3)
    facts: list[Fact] = Field(default_factory=list, max_length=10)
    commitments: list[Fact] = Field(default_factory=list, max_length=5)


def new_state() -> dict:
    return {
        "revision": 0,
        # Bumped only by rep and lifecycle actions. Model results computed before one of
        # these are discarded; new transcript turns alone must not discard advice, or a
        # continuously talking call would never see a suggestion land.
        "control_revision": 0,
        "turns": [],
        "suggestions": [],
        "facts": [],
        "commitments": [],
        "actions": [],
        "undo": [],
        "analysis_status": "waiting",
        "analysis_count": 0,
    }


def intent_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def append_turn(state: dict, turn: Turn) -> bool:
    if turn.end_ms < turn.start_ms or not turn.text.strip():
        raise ValueError("Invalid transcript timing or empty text")
    turns = state["turns"]
    if turn.sequence < len(turns):
        if turns[turn.sequence] == turn.model_dump():
            return False
        raise ValueError("Sequence already contains different text")
    if turn.sequence != len(turns):
        raise ValueError("Transcript sequence gap; resend from the acknowledged cursor")
    if len(turns) >= 2000 or sum(len(t["text"]) for t in turns) + len(turn.text) > 400_000:
        raise ValueError("Call transcript limit reached; end this session")
    turns.append(turn.model_dump())
    state["revision"] += 1
    return True


def promote(state: dict) -> None:
    if any(s["status"] == "shown" for s in state["suggestions"]):
        return
    queued = [s for s in state["suggestions"] if s["status"] == "queued"]
    if queued:
        max(queued, key=lambda s: s["priority"])["status"] = "shown"


def manual_action(state: dict, action_id: str, action: str, suggestion_id: str | None) -> bool:
    if action_id in state["actions"]:
        return False
    if action == "undo":
        if not state["undo"]:
            return False
        previous = state["undo"].pop()
        for item in state["suggestions"]:
            if item["status"] == "shown":
                item["status"] = "queued"
            if item["id"] == previous["id"]:
                item["status"] = "shown"
    else:
        item = next((s for s in state["suggestions"] if s["id"] == suggestion_id), None)
        if item is None or item["status"] not in {"shown", "queued"}:
            raise ValueError("Suggestion is no longer actionable")
        if action not in {"done", "skip"}:
            raise ValueError("Unknown action")
        state["undo"] = (state["undo"] + [{"id": item["id"], "status": item["status"]}])[-20:]
        item["status"] = "done" if action == "done" else "dismissed"
    state["actions"] = (state["actions"] + [action_id])[-1000:]
    bump_control(state)
    promote(state)
    return True


def bump_control(state: dict) -> None:
    state["revision"] += 1
    state["control_revision"] = state.get("control_revision", 0) + 1


def apply_analysis(
    state: dict,
    analysis: Analysis,
    control_revision: int,
    sources: list[dict],
    seen_sequence: int | None = None,
) -> bool:
    if state.get("control_revision", 0) != control_revision:
        return False
    turns = {t["sequence"]: t for t in state["turns"]}
    evidence = {s["id"]: s for s in sources}
    evidence.update(
        {f"turn:{t['sequence']}": {"text": t["text"], "kind": "live"} for t in state["turns"]}
    )
    for change in analysis.transitions:
        item = next((s for s in state["suggestions"] if s["id"] == change.suggestion_id), None)
        turn = turns.get(change.sequence)
        if not item or not turn or change.confidence < 0.9:
            continue
        if not change.quote.strip() or change.quote.casefold() not in turn["text"].casefold():
            continue
        # Speech that trails off ("What budget have you… actually") never completes a card.
        if TRAILING_OFF.search(change.quote):
            continue
        if change.sequence < item["created_sequence"]:
            continue
        if item["status"] in {"done", "dismissed", "answered", "mentioned", "superseded"}:
            continue
        if item["status"] == "asked" and change.status != "answered":
            continue
        if change.status in {"asked", "mentioned"} and turn["role"] != "rep":
            continue
        if change.status == "answered" and turn["role"] != "prospect":
            continue
        # Evidence phrased as a question ("Would you like to know our budget?") offers, not
        # answers. Only the quoted span counts, so "Forty thousand, does that work?" can still
        # be cited as "Forty thousand".
        if change.status == "answered" and change.quote.rstrip().endswith("?"):
            continue
        if change.status == "asked" and item["kind"] != "ask":
            continue
        if change.status == "mentioned" and item["kind"] != "mention":
            continue
        item.update(status=change.status, completed_sequence=change.sequence, quote=change.quote)
    for key in ("facts", "commitments"):
        for fact in getattr(analysis, key):
            turn = turns.get(fact.sequence)
            if turn and fact.quote.strip() and fact.quote.casefold() in turn["text"].casefold():
                existing = [f for f in state[key] if f["topic"] != fact.topic]
                state[key] = (existing + [fact.model_dump()])[-100:]
    intents = {intent_key(s["intent"]) for s in state["suggestions"]}
    texts = {intent_key(s["text"]) for s in state["suggestions"]}
    active_count = sum(s["status"] in {"shown", "queued"} for s in state["suggestions"])
    for candidate in analysis.candidates:
        if active_count >= 3 or len(state["suggestions"]) >= 300:
            break
        if intent_key(candidate.intent) in intents or intent_key(candidate.text) in texts:
            continue
        if RISKY.search(candidate.text) or not candidate.evidence_ids:
            continue
        if any(source_id not in evidence for source_id in candidate.evidence_ids):
            continue
        # Customer history is context, not approval to make a product promise.
        if candidate.kind == "mention" and not any(
            evidence[sid].get("kind") == "approved"
            and candidate.text.casefold() in evidence[sid]["text"].casefold()
            for sid in candidate.evidence_ids
        ):
            continue
        item = candidate.model_dump()
        # Anchor new cards to the transcript the model saw, so a turn spoken while it was
        # thinking can still complete the card on the next analysis.
        created = len(state["turns"]) - 1 if seen_sequence is None else seen_sequence
        item.update(id=str(uuid4()), status="queued", created_sequence=created)
        state["suggestions"].append(item)
        intents.add(intent_key(candidate.intent))
        texts.add(intent_key(candidate.text))
        active_count += 1
    promote(state)
    state["revision"] += 1
    state["analysis_status"] = "ready"
    return True
