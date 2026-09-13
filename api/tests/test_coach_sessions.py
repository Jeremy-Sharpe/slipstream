import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.services.coach_context import customers, load_context
from app.services.coach_state import (
    Analysis,
    Candidate,
    Transition,
    Turn,
    append_turn,
    apply_analysis,
    manual_action,
    new_state,
)
from app.services.coach_store import CoachStore

SOURCES = [{"id": "customer", "kind": "customer", "text": "A practice reviewing IT"}]


def seed():
    state = new_state()
    result = Analysis(
        candidates=[
            Candidate(
                intent="budget_range",
                kind="ask",
                text="What budget have you set aside?",
                reason="Understand the available budget.",
                evidence_ids=["customer"],
                priority=80,
            ),
            Candidate(
                intent="decision_owner",
                kind="ask",
                text="Who else will help make the decision?",
                reason="Identify stakeholders.",
                evidence_ids=["customer"],
                priority=70,
            ),
        ]
    )
    assert apply_analysis(state, result, 0, SOURCES)
    return state


def turn(state, role="rep", text="How much have you allocated for this?"):
    item = Turn(sequence=len(state["turns"]), role=role, text=text, start_ms=0, end_ms=1200)
    append_turn(state, item)
    return item


def change(state, status="asked", role="rep", confidence=0.98):
    item = turn(state, role)
    return Analysis(
        transitions=[
            Transition(
                suggestion_id=state["suggestions"][0]["id"],
                status=status,
                sequence=item.sequence,
                quote=item.text,
                confidence=confidence,
            )
        ]
    )


def test_asked_advances_before_answer():
    state = seed()
    analysis = change(state)
    assert apply_analysis(state, analysis, state["control_revision"], SOURCES)
    assert [s["status"] for s in state["suggestions"]] == ["asked", "shown"]
    analysis = change(state, "answered", "prospect")
    apply_analysis(state, analysis, state["control_revision"], SOURCES)
    assert state["suggestions"][0]["status"] == "answered"


@pytest.mark.parametrize("role,confidence", [("unknown", 0.99), ("prospect", 0.99), ("rep", 0.5)])
def test_uncertain_completion_does_not_retire_card(role, confidence):
    state = seed()
    analysis = change(state, role=role, confidence=confidence)
    apply_analysis(state, analysis, state["control_revision"], SOURCES)
    assert state["suggestions"][0]["status"] == "shown"


def test_volunteered_answer_skips_question():
    state = seed()
    analysis = change(state, "answered", "prospect")
    apply_analysis(state, analysis, state["control_revision"], SOURCES)
    assert state["suggestions"][0]["status"] == "answered"
    assert state["suggestions"][1]["status"] == "shown"


def test_late_model_result_cannot_undo_skip():
    state = seed()
    analysis = change(state)
    revision = state["control_revision"]
    manual_action(state, str(uuid4()), "skip", state["suggestions"][0]["id"])
    assert not apply_analysis(state, analysis, revision, SOURCES)
    assert state["suggestions"][0]["status"] == "dismissed"


def test_new_turns_during_analysis_do_not_discard_advice():
    state = seed()
    analysis = change(state)
    revision = state["control_revision"]
    turn(state, "prospect", "We are also opening a second office.")
    assert apply_analysis(state, analysis, revision, SOURCES)
    assert state["suggestions"][0]["status"] == "asked"


def test_manual_actions_idempotent_and_undo_explicit():
    state = seed()
    key = str(uuid4())
    first = state["suggestions"][0]["id"]
    assert manual_action(state, key, "done", first)
    assert not manual_action(state, key, "done", first)
    manual_action(state, str(uuid4()), "undo", None)
    assert state["suggestions"][0]["status"] == "shown"
    assert state["suggestions"][1]["status"] == "queued"


def test_duplicate_intents_do_not_return_after_completion():
    state = seed()
    manual_action(state, str(uuid4()), "skip", state["suggestions"][0]["id"])
    candidate = Candidate(
        intent="budget-range",
        kind="ask",
        text="What could you spend?",
        reason="Budget",
        evidence_ids=["customer"],
        priority=100,
    )
    apply_analysis(state, Analysis(candidates=[candidate]), state["control_revision"], SOURCES)
    assert len(state["suggestions"]) == 2


def test_replayed_transcript_and_overlapping_channels():
    state = seed()
    first = turn(state)
    assert not append_turn(state, first)
    turn(state, "prospect")  # Both channels may overlap in real time.
    with pytest.raises(ValueError):
        append_turn(state, first.model_copy(update={"text": "Different text"}))
    with pytest.raises(ValueError):
        append_turn(state, first.model_copy(update={"sequence": 5}))


def test_fabricated_evidence_and_unsupported_claims_rejected():
    state = new_state()
    candidates = [
        Candidate(
            intent="bad",
            kind="mention",
            text="We halve your premium.",
            reason="Historical win",
            evidence_ids=["customer"],
            priority=99,
        ),
        Candidate(
            intent="bad2",
            kind="ask",
            text="What matters?",
            reason="No source",
            evidence_ids=["missing"],
            priority=10,
        ),
    ]
    apply_analysis(state, Analysis(candidates=candidates), 0, SOURCES)
    assert not state["suggestions"]


def test_approved_mention_requires_exact_approved_source():
    state = new_state()
    approved = {
        "id": "product",
        "kind": "approved",
        "text": "Support is available Monday to Friday.",
    }
    candidate = Candidate(
        intent="support",
        kind="mention",
        text=approved["text"],
        reason="Scope",
        evidence_ids=["product"],
        priority=90,
    )
    apply_analysis(state, Analysis(candidates=[candidate]), 0, [approved])
    assert state["suggestions"][0]["kind"] == "mention"


def test_context_excludes_active_fixture_future_answers_and_demo_peer():
    options = customers(None)
    demo = next(c for c in options if c["company"] == "Marlowe & Finch Accounting")
    context = load_context(
        None, demo["contact_id"], demo["deal_id"], None, datetime(2026, 9, 12, tzinfo=UTC)
    )
    text = str(context)
    assert "48,600" not in text and "signed 30-seat" not in text
    assert all("marlowe" not in s["id"] for s in context["sources"])
    assert any(s["kind"] == "peer" for s in context["sources"])
    with pytest.raises(ValueError):
        load_context(None, options[0]["contact_id"], options[1]["deal_id"], None, datetime.now(UTC))


def test_store_returns_copies_and_rejects_old_versions():
    async def scenario():
        store = CoachStore(None)
        row = {"id": str(uuid4()), "state": new_state(), "status": "ready"}
        await store.save(row, "created")
        a = await store.read(row["id"])
        b = await store.read(row["id"])
        a["state"]["revision"] = 3
        assert (await store.read(row["id"]))["state"]["revision"] == 0
        await store.save(a, "changed")
        with pytest.raises(ValueError):
            await store.save(b, "stale")

    asyncio.run(scenario())


def create(client):
    response = client.post(
        "/api/v1/coach/sessions",
        json={
            "new_customer": {
                "name": "Alex",
                "company": "Example",
                "context": "A renewal next month.",
            },
            "audio_mode": "both",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    key = str(uuid4())
    session_id = payload["session"]["id"]
    auth = {"token": payload["handoff_token"], "access_token": key}
    assert client.post(f"/api/v1/coach/sessions/{session_id}/redeem", json=auth).status_code == 200
    return session_id, key, auth


def receive(ws, kind):
    for _ in range(15):
        event = ws.receive_json()
        if event["type"] == kind:
            return event
    raise AssertionError("Expected " + kind)


def test_single_use_handoff_and_scoped_tokens(client):
    session_id, key, auth = create(client)
    endpoint = f"/api/v1/coach/sessions/{session_id}"
    assert client.post(endpoint + "/redeem", json=auth).status_code == 200
    assert (
        client.post(endpoint + "/redeem", json={**auth, "access_token": str(uuid4())}).status_code
        == 401
    )
    assert client.post(endpoint + "/finish").status_code == 401
    row = client.get(endpoint).json()
    assert "access_hash" not in row and "handoff_hash" not in row


def test_websocket_resume_and_idempotent_finish(client):
    session_id, key, _ = create(client)
    route = f"/api/v1/coach/sessions/{session_id}"
    event = {
        "type": "transcript",
        "turn": {
            "sequence": 0,
            "role": "rep",
            "text": "What is your target date?",
            "start_ms": 0,
            "end_ms": 1200,
        },
    }
    with client.websocket_connect(route + "/live") as ws:
        ws.send_json({"token": key})
        assert receive(ws, "snapshot")["resume_from_sequence"] == 0
        ws.send_json({"type": "start"})
        receive(ws, "snapshot")
        ws.send_json(event)
        assert receive(ws, "committed")["sequence"] == 0
    with client.websocket_connect(route + "/live") as ws:
        ws.send_json({"token": key})
        assert receive(ws, "snapshot")["resume_from_sequence"] == 1
        ws.send_json(event)
        assert receive(ws, "committed")["sequence"] == 0
    response = client.post(route + "/finish", headers={"Authorization": "Bearer " + key})
    assert response.status_code == 200, response.text
    first = response.json()
    second = client.post(route + "/finish", headers={"Authorization": "Bearer " + key}).json()
    assert first["conversation_id"] == second["conversation_id"]
    assert len(client.app.state.call_store) == 1
    assert first["state"]["turns"][0]["text"] == event["turn"]["text"]


def test_empty_session_ends_without_fabricated_call(client):
    session_id, key, _ = create(client)
    result = client.post(
        f"/api/v1/coach/sessions/{session_id}/finish", headers={"Authorization": "Bearer " + key}
    )
    assert result.json()["status"] == "ended"
    assert result.json()["conversation_id"] is None


def test_expired_handoff(client):
    result = client.post(
        "/api/v1/coach/sessions", json={"new_customer": {"name": "A", "company": "B"}}
    ).json()
    row = client.app.state.coach_store.rows[result["session"]["id"]]
    row["handoff_expires"] = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
    response = client.post(
        f"/api/v1/coach/sessions/{row['id']}/redeem",
        json={"token": result["handoff_token"], "access_token": str(uuid4())},
    )
    assert response.status_code == 401


def test_approved_source_survives_new_customer_and_large_context():
    from app.services.coach_context import finalise_context

    context = load_context(
        None, None, None, {"name": "New", "company": "Example"}, datetime.now(UTC)
    )
    assert context["sources"][0]["kind"] == "approved"
    large = finalise_context({}, [{"id": str(i), "kind": "history"} for i in range(50)], "History")
    assert len(large["sources"]) == 40
    assert large["sources"][0]["id"] == "approved:seller"


def test_disconnected_model_retains_slot_and_counts_failed_attempt(client, monkeypatch):
    import threading

    from app.services import coach_reasoning

    entered = threading.Event()
    release = threading.Event()

    def slow_failure(*_):
        entered.set()
        assert release.wait(8)
        raise RuntimeError("Provider unavailable")

    monkeypatch.setattr(coach_reasoning, "analyse", slow_failure)
    session_id, key, _ = create(client)
    try:
        with client.websocket_connect(f"/api/v1/coach/sessions/{session_id}/live") as ws:
            ws.send_json({"token": key})
            receive(ws, "snapshot")
            ws.send_json({"type": "start"})
            receive(ws, "snapshot")
            assert entered.wait(3)
            assert client.app.state.coach_store.rows[session_id]["state"]["analysis_count"] == 1
        assert client.app.state.coach_reasoning_slots._value == 1
        assert session_id in client.app.state.coach_store.model_tasks
    finally:
        release.set()


def test_recent_sessions_never_expose_capability_hashes(client):
    session_id, _, _ = create(client)
    response = client.get("/api/v1/coach/sessions")
    assert response.status_code == 200
    assert response.json()[0]["id"] == session_id
    assert "hash" not in response.text


def test_advice_lands_while_the_call_keeps_talking(client, monkeypatch):
    import threading

    from app.services import coach_reasoning

    entered = threading.Event()
    release = threading.Event()

    def slow_analysis(*_):
        entered.set()
        assert release.wait(5)
        candidate = Candidate(
            intent="renewal_date",
            kind="ask",
            text="When is the renewal due?",
            reason="The customer mentioned a renewal.",
            evidence_ids=["customer"],
            priority=80,
        )
        return Analysis(candidates=[candidate]), "stub-model"

    monkeypatch.setattr(coach_reasoning, "analyse", slow_analysis)
    session_id, key, _ = create(client)
    turn_event = {
        "type": "transcript",
        "turn": {
            "sequence": 0,
            "role": "prospect",
            "text": "Our renewal is soon.",
            "start_ms": 0,
            "end_ms": 900,
        },
    }
    with client.websocket_connect(f"/api/v1/coach/sessions/{session_id}/live") as ws:
        ws.send_json({"token": key})
        receive(ws, "snapshot")
        ws.send_json({"type": "start"})
        receive(ws, "snapshot")
        assert entered.wait(3)
        ws.send_json(turn_event)
        assert receive(ws, "committed")["sequence"] == 0
        release.set()
        suggestions = receive(ws, "snapshot")["session"]["state"]["suggestions"]
    assert [s["text"] for s in suggestions] == ["When is the renewal due?"]
    assert suggestions[0]["status"] == "shown"


def test_question_asked_while_the_model_thinks_can_still_retire_its_card():
    state = new_state()
    turn(state, "prospect", "Our renewal is in October.")
    seen = len(state["turns"]) - 1
    candidate = Candidate(
        intent="decision_owner",
        kind="ask",
        text="Who else will help make the decision?",
        reason="Identify the decision group.",
        evidence_ids=["customer"],
        priority=80,
    )
    asked = turn(state, "rep", "Who else is involved in deciding?")
    assert apply_analysis(state, Analysis(candidates=[candidate]), 0, SOURCES, seen_sequence=seen)
    follow_up = Analysis(
        transitions=[
            Transition(
                suggestion_id=state["suggestions"][0]["id"],
                status="asked",
                sequence=asked.sequence,
                quote=asked.text,
                confidence=0.97,
            )
        ]
    )
    assert apply_analysis(state, follow_up, state["control_revision"], SOURCES)
    assert state["suggestions"][0]["status"] == "asked"


def test_repeated_action_on_a_finished_card_keeps_the_call_connected(client):
    session_id, key, _ = create(client)
    seeded = seed()
    client.app.state.coach_store.rows[session_id]["state"]["suggestions"] = seeded["suggestions"]
    first = seeded["suggestions"][0]["id"]
    with client.websocket_connect(f"/api/v1/coach/sessions/{session_id}/live") as ws:
        ws.send_json({"token": key})
        receive(ws, "snapshot")
        for _ in range(2):
            action_id = str(uuid4())
            ws.send_json(
                {"type": "action", "action_id": action_id, "action": "done", "suggestion_id": first}
            )
            assert receive(ws, "action_ack")["action_id"] == action_id
        ws.send_json({"type": "ping"})
        receive(ws, "pong")
    saved = client.app.state.coach_store.rows[session_id]["state"]["suggestions"]
    assert [s["status"] for s in saved] == ["done", "shown"]


def test_recording_can_be_retried_after_a_failed_finish(client):
    session_id, key, _ = create(client)
    client.app.state.coach_store.rows[session_id]["finalizing"] = True
    response = client.post(
        f"/api/v1/coach/sessions/{session_id}/recording",
        content=b"RIFF0000WAVEfmt ",
        headers={"Authorization": "Bearer " + key, "Content-Type": "audio/wav"},
    )
    # Reaches batch transcription (unconfigured in tests) instead of being refused as finalising.
    assert response.status_code == 503, response.text
