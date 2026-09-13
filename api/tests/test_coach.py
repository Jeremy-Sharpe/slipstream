import asyncio
import hashlib
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession

from app.core.config import Settings
from app.factory import create_app
from app.services.coach import (
    CoachingSuggestion,
    CoachingTurn,
    deterministic_suggestion,
    flag_rep_risk,
    rep_risk_flag,
    suggest_next_move,
)
from app.services.transcribe import Transcript, TranscriptSegment
from app.ws.coach import MAX_RISK_FLAGS

DEMO_SCRIPT = json.loads(
    (
        Path(__file__).resolve().parents[2]
        / "fixtures"
        / "calls"
        / "call-13-marlowe-finch-demo"
        / "script.json"
    ).read_text(encoding="utf-8")
)


def _start(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "type": "start",
        "source_external_id": "live-demo-1",
        "subject": "Acme discovery",
        "occurred_at": "2026-09-12T10:00:00Z",
        "rep_name": "Jordan",
        "deal_context": "Accounting firm evaluating workflow automation",
    }
    payload.update(overrides)
    return payload


def _turn(sequence: int, role: str, text: str, start_ms: int) -> dict[str, object]:
    return {
        "type": "transcript",
        "sequence": sequence,
        "speaker": "Prospect" if role == "prospect" else "Rep",
        "role": role,
        "text": text,
        "start_ms": start_ms,
        "end_ms": start_ms + 900,
    }


def _demo_turn(index: int) -> dict[str, object]:
    turn = DEMO_SCRIPT["turns"][index]
    return {
        "type": "transcript",
        "sequence": index,
        "speaker": turn["name"],
        "role": turn["speaker"],
        "text": turn["text"],
        "start_ms": index * 1000,
        "end_ms": index * 1000 + 900,
    }


def _risky_settings() -> Settings:
    return Settings(_env_file=None, reasoning_model="gpt-5.4", openai_api_key="key")


def _demo_risk_turns() -> list[CoachingTurn]:
    """The demo call's hallucination guarantee, with the prospect turn that precedes it."""
    return [
        CoachingTurn(
            sequence=0,
            speaker="Donnie Azoff",
            role="prospect",
            text=DEMO_SCRIPT["turns"][3]["text"],
        ),
        CoachingTurn(
            sequence=1,
            speaker="Jordan Belfort",
            role="rep",
            text=DEMO_SCRIPT["turns"][4]["text"],
        ),
    ]


def _collect_until(
    websocket: WebSocketTestSession,
    terminator: str,
    sequence: int | None = None,
) -> list[dict[str, object]]:
    """Return the suggestions that arrive before the expected terminating message."""
    suggestions: list[dict[str, object]] = []
    while True:
        message = websocket.receive_json()
        if message["type"] == "suggestion":
            suggestions.append(message)
            continue
        assert message["type"] == terminator, message
        if sequence is not None:
            assert message["sequence"] == sequence
        return suggestions


def test_live_coach_suggests_and_persists_completed_call(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start())
        ready = websocket.receive_json()
        assert ready["type"] == "ready"

        websocket.send_json(_turn(0, "rep", "What is slowing the team down?", 0))
        assert websocket.receive_json() == {"type": "committed", "sequence": 0}

        websocket.send_json(
            _turn(1, "prospect", "The manual work takes us twelve hours a week.", 1000)
        )
        assert websocket.receive_json() == {"type": "committed", "sequence": 1}
        suggestion = websocket.receive_json()
        assert suggestion["type"] == "suggestion"
        assert suggestion["category"] == "discovery"
        assert suggestion["evidence_sequence"] == 1
        assert suggestion["source"] == "deterministic"

        websocket.send_json({"type": "stop"})
        completed = websocket.receive_json()

    assert completed["type"] == "completed"
    call = completed["call"]
    assert call["source_external_id"] == "live-demo-1"
    assert call["provider"] == "realtime_client"
    assert len(call["segments"]) == 2
    response = client.get(f"/api/v1/calls/{call['id']}")
    assert response.status_code == 200
    assert response.json()["transcript"].endswith(
        "Prospect: The manual work takes us twelve hours a week."
    )


def test_live_coach_rejects_bad_auth_and_out_of_order_events() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        ingest_token="secret",
    )
    with TestClient(create_app(settings)) as protected_client:
        with protected_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start(ingest_token="wrong"))
            assert websocket.receive_json()["code"] == "unauthorized"

        with protected_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start(ingest_token="secret"))
            assert websocket.receive_json()["type"] == "ready"
            websocket.send_json(_turn(1, "rep", "First", 1000))
            assert websocket.receive_json()["type"] == "committed"
            websocket.send_json(_turn(1, "prospect", "Duplicate", 2000))
            assert websocket.receive_json()["code"] == "out_of_order"


def test_busy_source_connection_does_not_release_the_owner_lock(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as owner:
        owner.send_json(_start(source_external_id="live-locked"))
        assert owner.receive_json()["type"] == "ready"
        with client.websocket_connect("/api/v1/coach/live") as contender:
            contender.send_json(_start(source_external_id="live-locked"))
            assert contender.receive_json()["code"] == "source_busy"
        owner.send_json(_turn(0, "rep", "Still connected", 0))
        assert owner.receive_json()["type"] == "committed"
        owner.send_json({"type": "stop"})
        assert owner.receive_json()["type"] == "completed"


def test_distinct_sources_can_share_an_ingest_lock_stripe(client: TestClient) -> None:
    by_stripe: dict[int, str] = {}
    first = second = ""
    for index in range(100):
        candidate = f"collision-{index}"
        stripe = hashlib.sha256(candidate.encode()).digest()[0] % 32
        if stripe in by_stripe:
            first, second = by_stripe[stripe], candidate
            break
        by_stripe[stripe] = candidate
    assert first and second

    with client.websocket_connect("/api/v1/coach/live") as left:
        left.send_json(_start(source_external_id=first))
        assert left.receive_json()["type"] == "ready"
        with client.websocket_connect("/api/v1/coach/live") as right:
            right.send_json(_start(source_external_id=second))
            assert right.receive_json()["type"] == "ready"
            right.send_json(_turn(0, "rep", "Right", 0))
            assert right.receive_json()["type"] == "committed"
            right.send_json({"type": "stop"})
            assert right.receive_json()["type"] == "completed"
        left.send_json(_turn(0, "rep", "Left", 0))
        assert left.receive_json()["type"] == "committed"
        left.send_json({"type": "stop"})
        assert left.receive_json()["type"] == "completed"


def test_empty_disconnected_session_does_not_consume_checkpoint_capacity() -> None:
    app = create_app(Settings(_env_file=None, environment="test"))
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start(source_external_id="empty-session"))
            assert websocket.receive_json()["type"] == "ready"
        assert "empty-session" not in app.state.coach_checkpoints


def test_active_resumed_checkpoint_is_not_expired(monkeypatch) -> None:
    from app.ws import coach

    monkeypatch.setattr(coach, "MAX_CHECKPOINT_AGE_SECONDS", 1)
    app = create_app(Settings(_env_file=None, environment="test"))
    with TestClient(app) as test_client:
        with test_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start(source_external_id="aged-session"))
            assert websocket.receive_json()["type"] == "ready"
            websocket.send_json(_turn(0, "rep", "Keep this", 0))
            assert websocket.receive_json()["type"] == "committed"
        app.state.coach_checkpoints["aged-session"]["updated_at"] = time.monotonic() - 2

        with test_client.websocket_connect("/api/v1/coach/live") as resumed:
            resumed.send_json(_start(source_external_id="aged-session"))
            assert resumed.receive_json()["resume_from_sequence"] == 1
            app.state.coach_checkpoints["aged-session"]["updated_at"] = time.monotonic() - 2
            with test_client.websocket_connect("/api/v1/coach/live") as other:
                other.send_json(_start(source_external_id="new-session"))
                assert other.receive_json()["type"] == "ready"
                assert "aged-session" in app.state.coach_checkpoints
            resumed.send_json({"type": "stop"})
            assert resumed.receive_json()["type"] == "completed"


@pytest.mark.asyncio
async def test_cancelled_socket_wait_keeps_persistence_lock_until_worker_finishes(
    monkeypatch,
) -> None:
    from app.ws import coach

    started = asyncio.Event()
    finish = asyncio.Event()

    async def slow_persist(*_args, **_kwargs):
        started.set()
        await finish.wait()
        return SimpleNamespace(model_dump=lambda **_: {"id": "saved"})

    monkeypatch.setattr(coach, "persist_realtime_call", slow_persist)
    app = create_app(Settings(_env_file=None, environment="test"))
    websocket = SimpleNamespace(app=app)
    checkpoint = {
        "subject": "Subject",
        "occurred_at": datetime(2026, 9, 12, tzinfo=UTC),
        "updated_at": time.monotonic(),
        "persistence_task": None,
    }
    transcript = Transcript(
        text="Rep: Hello",
        language_code="en",
        segments=[TranscriptSegment(0, "Rep", "Hello", 0, 100)],
        provider="realtime_client",
    )
    worker = asyncio.create_task(
        coach._persist_completed_call(
            websocket,
            source_external_id="slow-source",
            checkpoint=checkpoint,
            transcript=transcript,
        )
    )

    async def socket_waiter() -> None:
        await asyncio.shield(worker)

    waiter = asyncio.create_task(socket_waiter())
    await started.wait()
    locked = next(lock for lock in app.state.ingest_locks if lock.locked())
    waiter.cancel()
    with pytest.raises(asyncio.CancelledError):
        await waiter
    assert locked.locked()
    finish.set()
    await worker
    assert not locked.locked()


def test_non_ascii_token_is_a_normal_auth_failure() -> None:
    settings = Settings(_env_file=None, environment="test", ingest_token="secret")
    with TestClient(create_app(settings)) as protected_client:
        with protected_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start(ingest_token="🔑"))
            assert websocket.receive_json()["code"] == "unauthorized"


def test_live_coach_requires_a_transcript_before_stop(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start())
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["code"] == "empty_call"


def test_live_coach_throttles_suggestions(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-throttle"))
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json(_turn(0, "prospect", "The price is difficult", 0))
        assert websocket.receive_json()["type"] == "committed"
        assert websocket.receive_json()["type"] == "suggestion"
        websocket.send_json(_turn(1, "prospect", "The budget is fixed", 1_000_000))
        assert websocket.receive_json()["type"] == "committed"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"


def test_live_coach_resumes_checkpoint_after_disconnect(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-resume"))
        assert websocket.receive_json()["resume_from_sequence"] == 0
        websocket.send_json(_turn(0, "rep", "Tell me what is happening", 0))
        assert websocket.receive_json()["type"] == "committed"

    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-resume"))
        assert websocket.receive_json()["resume_from_sequence"] == 1
        websocket.send_json(_turn(1, "prospect", "It is all manual", 1000))
        assert websocket.receive_json()["type"] == "committed"
        assert websocket.receive_json()["type"] == "suggestion"
        websocket.send_json({"type": "stop"})
        completed = websocket.receive_json()

    assert len(completed["call"]["segments"]) == 2


def test_live_coach_reports_persistence_failure_and_allows_retry(
    client: TestClient, monkeypatch
) -> None:
    from app.ws import coach

    real_persist = coach.persist_realtime_call
    attempts = 0

    async def flaky_persist(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("store unavailable")
        return await real_persist(*args, **kwargs)

    monkeypatch.setattr(coach, "persist_realtime_call", flaky_persist)
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-retry"))
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json(_turn(0, "rep", "Hello", 0))
        assert websocket.receive_json()["type"] == "committed"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["code"] == "persistence_failed"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"


def test_live_coach_replays_completion_for_an_existing_source_id(
    client: TestClient,
) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-conflict"))
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json(_turn(0, "rep", "Original", 0))
        assert websocket.receive_json()["type"] == "committed"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"

    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-conflict"))
        assert websocket.receive_json()["resume_from_sequence"] == 1
        assert websocket.receive_json()["type"] == "completed"

    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(
            _start(
                source_external_id="live-conflict",
                occurred_at="2026-09-13T10:00:00Z",
            )
        )
        assert websocket.receive_json()["code"] == "source_conflict"


def test_live_coach_rejects_conflicting_resume_context(client: TestClient) -> None:
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-context"))
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json(_turn(0, "rep", "Checkpoint this", 0))
        assert websocket.receive_json()["type"] == "committed"

    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(
            _start(source_external_id="live-context", deal_context="Different account")
        )
        assert websocket.receive_json()["code"] == "source_conflict"


def test_paid_coach_refuses_to_run_without_server_authentication() -> None:
    settings = Settings(_env_file=None, environment="test", openai_api_key="paid-key")
    with TestClient(create_app(settings)) as paid_client:
        with paid_client.websocket_connect("/api/v1/coach/live") as websocket:
            websocket.send_json(_start())
            assert websocket.receive_json()["code"] == "configuration_error"


def test_scribe_token_fails_closed_without_provider_key(client: TestClient) -> None:
    response = client.post("/api/v1/coach/scribe-token")
    assert response.status_code == 503


def test_scribe_token_is_protected_and_provider_response_is_validated() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        elevenlabs_api_key="provider-key",
        ingest_token="secret",
    )

    async def provider_response(request: httpx.Request) -> httpx.Response:
        assert request.headers["xi-api-key"] == "provider-key"
        return httpx.Response(200, json={"token": "single-use-token"})

    app = create_app(settings)
    with TestClient(app) as protected_client:
        old_client = app.state.transcription_client
        app.state.transcription_client = httpx.AsyncClient(
            transport=httpx.MockTransport(provider_response)
        )
        denied = protected_client.post("/api/v1/coach/scribe-token")
        issued = protected_client.post(
            "/api/v1/coach/scribe-token",
            headers={"X-Slipstream-Ingest-Token": "secret"},
        )
        app.state.transcription_client = old_client

    assert denied.status_code == 401
    assert issued.status_code == 200
    assert issued.json() == {
        "token": "single-use-token",
        "websocket_url": "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
        "model_id": "scribe_v2_realtime",
    }


def test_scribe_token_rejects_a_non_object_provider_response() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        elevenlabs_api_key="provider-key",
        ingest_token="secret",
    )

    async def malformed_response(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[])

    app = create_app(settings)
    with TestClient(app) as protected_client:
        old_client = app.state.transcription_client
        app.state.transcription_client = httpx.AsyncClient(
            transport=httpx.MockTransport(malformed_response)
        )
        response = protected_client.post(
            "/api/v1/coach/scribe-token",
            headers={"X-Slipstream-Ingest-Token": "secret"},
        )
        app.state.transcription_client = old_client

    assert response.status_code == 502


def test_deterministic_coaching_categories_are_grounded() -> None:
    cases = {
        "This price is above our budget": "objection",
        "Security is my biggest concern": "risk",
        "We need this next quarter": "next_step",
        "This manual process takes hours": "discovery",
    }
    for sequence, (text, category) in enumerate(cases.items()):
        suggestion = deterministic_suggestion(
            CoachingTurn(sequence=sequence, speaker="Buyer", role="prospect", text=text)
        )
        assert suggestion.category == category
        assert suggestion.evidence_sequence == sequence


def test_model_must_cite_a_prospect_turn(monkeypatch) -> None:
    from app.services import coach

    def fake_structured(*_args, **_kwargs):
        return SimpleNamespace(
            model="fake-model",
            output=CoachingSuggestion(
                category="discovery",
                title="Bad citation",
                message="This cites the representative.",
                evidence_sequence=0,
            ),
        )

    monkeypatch.setattr(coach, "structured", fake_structured)
    suggestion = suggest_next_move(
        Settings(_env_file=None, reasoning_model="gpt-5.4", openai_api_key="key"),
        [
            CoachingTurn(sequence=0, speaker="Rep", role="rep", text="What is wrong?"),
            CoachingTurn(
                sequence=1,
                speaker="Buyer",
                role="prospect",
                text="The workflow is manual.",
            ),
        ],
    )

    assert suggestion.source == "deterministic"
    assert suggestion.evidence_sequence == 1
    assert suggestion.flag is None


def test_demo_call_flags_the_reps_own_risky_claims(client: TestClient) -> None:
    collected: list[dict[str, object]] = []
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-demo-risk"))
        assert websocket.receive_json()["type"] == "ready"
        for index in range(10):
            websocket.send_json(_demo_turn(index))
            collected += _collect_until(websocket, "committed", index)
        websocket.send_json({"type": "stop"})
        collected += _collect_until(websocket, "completed")

    risks = [item for item in collected if item["flag"] is not None]
    assert [(item["evidence_sequence"], item["flag"]) for item in risks] == [
        (2, "pressure"),
        (4, "overclaim"),
        (8, "overclaim"),
    ]
    assert all(item["category"] == "risk" for item in risks)
    assert all(item["source"] == "deterministic" for item in risks)
    assert "the pilot price is gone Friday" in DEMO_SCRIPT["turns"][2]["text"]
    assert "I can guarantee the agents never hallucinate" in DEMO_SCRIPT["turns"][4]["text"]


def test_risk_flags_bypass_the_interval_and_stop_at_the_cap(client: TestClient) -> None:
    claim = "I guarantee the agents never fail."
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-risk-cap"))
        assert websocket.receive_json()["type"] == "ready"
        for index in range(MAX_RISK_FLAGS):
            websocket.send_json(_turn(index, "rep", claim, index * 1000))
            assert websocket.receive_json() == {"type": "committed", "sequence": index}
            flagged = websocket.receive_json()
            assert flagged["type"] == "suggestion"
            assert flagged["flag"] == "overclaim"
            assert flagged["evidence_sequence"] == index
        websocket.send_json(_turn(MAX_RISK_FLAGS, "rep", claim, MAX_RISK_FLAGS * 1000))
        assert websocket.receive_json() == {
            "type": "committed",
            "sequence": MAX_RISK_FLAGS,
        }
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"


def test_risk_flags_count_against_the_session_suggestion_budget(
    client: TestClient, monkeypatch
) -> None:
    from app.ws import coach

    monkeypatch.setattr(coach, "MAX_SUGGESTIONS", 1)
    claim = "I guarantee the agents never fail."
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-risk-budget"))
        assert websocket.receive_json()["type"] == "ready"
        websocket.send_json(_turn(0, "rep", claim, 0))
        assert websocket.receive_json() == {"type": "committed", "sequence": 0}
        assert websocket.receive_json()["flag"] == "overclaim"
        websocket.send_json(_turn(1, "rep", claim, 1000))
        assert websocket.receive_json() == {"type": "committed", "sequence": 1}
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"


def test_resumed_session_keeps_the_risk_flag_cap(client: TestClient) -> None:
    claim = "I guarantee the agents never fail."
    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-risk-resume"))
        assert websocket.receive_json()["type"] == "ready"
        for index in range(MAX_RISK_FLAGS):
            websocket.send_json(_turn(index, "rep", claim, index * 1000))
            assert websocket.receive_json()["type"] == "committed"
            assert websocket.receive_json()["flag"] == "overclaim"

    with client.websocket_connect("/api/v1/coach/live") as websocket:
        websocket.send_json(_start(source_external_id="live-risk-resume"))
        assert websocket.receive_json()["resume_from_sequence"] == MAX_RISK_FLAGS
        websocket.send_json(_turn(MAX_RISK_FLAGS, "rep", claim, MAX_RISK_FLAGS * 1000))
        assert websocket.receive_json()["type"] == "committed"
        websocket.send_json({"type": "stop"})
        assert websocket.receive_json()["type"] == "completed"


def test_model_risk_flag_must_cite_the_rep_turn(monkeypatch) -> None:
    from app.services import coach

    def fake_structured(*_args, **_kwargs):
        return SimpleNamespace(
            model="fake-model",
            output=CoachingSuggestion(
                category="risk",
                title="Cites the buyer",
                message="This cites the prospect rather than the claim the rep just made.",
                evidence_sequence=0,
                flag="overclaim",
            ),
        )

    monkeypatch.setattr(coach, "structured", fake_structured)
    suggestion = flag_rep_risk(_risky_settings(), _demo_risk_turns())

    assert suggestion is not None
    assert suggestion.source == "deterministic"
    assert suggestion.evidence_sequence == 1
    assert suggestion.flag == "overclaim"


def test_model_may_refine_a_risk_flag_on_the_rep_turn(monkeypatch) -> None:
    from app.services import coach

    def fake_structured(*_args, **_kwargs):
        return SimpleNamespace(
            model="fake-model",
            output=CoachingSuggestion(
                category="risk",
                title="Name the review gate",
                message="Say which step a human checks instead of promising the agents never err.",
                evidence_sequence=1,
                flag="unverifiable",
            ),
        )

    monkeypatch.setattr(coach, "structured", fake_structured)
    suggestion = flag_rep_risk(_risky_settings(), _demo_risk_turns())

    assert suggestion is not None
    assert suggestion.source == "model"
    assert suggestion.model == "fake-model"
    assert suggestion.evidence_sequence == 1
    assert suggestion.flag == "unverifiable"


def test_a_clean_rep_turn_produces_no_risk_flag(monkeypatch) -> None:
    from app.services import coach

    def fail_structured(*_args, **_kwargs):
        raise AssertionError("A clean rep turn must never reach the model")

    monkeypatch.setattr(coach, "structured", fail_structured)
    turn = CoachingTurn(
        sequence=3,
        speaker="Rep",
        role="rep",
        text="Thanks, that helps. Who else needs to be comfortable before you commit?",
    )

    assert rep_risk_flag(turn) is None
    assert flag_rep_risk(_risky_settings(), [turn]) is None


def test_prospect_turns_are_never_risk_flagged() -> None:
    echo = CoachingTurn(
        sequence=15,
        speaker="Donnie Azoff",
        role="prospect",
        text=DEMO_SCRIPT["turns"][15]["text"],
    )

    assert "About to lose certification?" in echo.text
    assert rep_risk_flag(echo) is None
