import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.factory import create_app
from app.routers import calls
from app.services.transcribe import Transcript, TranscriptSegment

DEMO_CALL_ID = "call-13-marlowe-finch-demo"
DEMO_SCRIPT = json.loads(
    (Path(__file__).resolve().parents[2] / "fixtures" / "calls" / DEMO_CALL_ID / "script.json")
    .read_text(encoding="utf-8")
)
DEMO_DURATION_SECONDS = round(
    DEMO_SCRIPT.get("audio_seconds") or DEMO_SCRIPT["duration_target_seconds"]
)


def test_fixture_catalog_lists_all_labelled_calls(client: TestClient) -> None:
    response = client.get("/api/v1/calls/fixtures")

    assert response.status_code == 200
    fixtures = response.json()
    assert len(fixtures) == 13
    demo = next(item for item in fixtures if item["demo"])
    assert demo["call_id"] == DEMO_CALL_ID
    assert demo["company"] == DEMO_SCRIPT["company"]["name"]


def test_fixture_ingest_is_immediately_retrievable(client: TestClient) -> None:
    first = client.post(f"/api/v1/calls/fixtures/{DEMO_CALL_ID}/ingest")
    second = client.post(f"/api/v1/calls/fixtures/{DEMO_CALL_ID}/ingest")

    assert first.status_code == 200
    assert second.status_code == 200
    record = first.json()
    assert second.json()["id"] == record["id"]
    assert record["provider"] == "fixture"
    assert record["fixture"] is True
    assert record["duration_seconds"] == DEMO_DURATION_SECONDS
    assert len(record["segments"]) == len(DEMO_SCRIPT["turns"])
    assert record["segments"][0]["speaker"] == DEMO_SCRIPT["turns"][0]["name"]
    assert f"{DEMO_SCRIPT['prospect']['name']}:" in record["transcript"]

    fetched = client.get(f"/api/v1/calls/{record['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == record


def test_call_idempotency_compares_metadata_and_structured_segments() -> None:
    transcript = Transcript(
        text="Buyer: Same words",
        language_code="en",
        segments=[
            TranscriptSegment(
                sequence=0,
                speaker="Buyer",
                body="Same words",
                start_ms=0,
                end_ms=900,
            )
        ],
        provider="realtime_client",
    )
    original = calls._record(
        source_external_id="same-source",
        subject="Original",
        occurred_at=datetime(2026, 9, 12, tzinfo=UTC),
        transcript=transcript,
        fixture=False,
    )
    changed_subject = original.model_copy(update={"subject": "Different"})
    changed_timing = original.model_copy(
        update={"segments": [original.segments[0].model_copy(update={"end_ms": 1200})]}
    )

    assert calls._same_call(original, original.model_copy())
    assert not calls._same_call(original, changed_subject)
    assert not calls._same_call(original, changed_timing)


def test_unknown_or_malformed_fixture_is_not_exposed(client: TestClient) -> None:
    assert client.post("/api/v1/calls/fixtures/call-nope/ingest").status_code == 404
    assert client.post("/api/v1/calls/fixtures/../PROJECT/ingest").status_code == 404


def test_audio_requires_supported_media_and_provider_key(client: TestClient) -> None:
    unsupported = client.post(
        "/api/v1/calls/transcribe",
        data={"subject": "Demo"},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    missing_key = client.post(
        "/api/v1/calls/transcribe",
        data={"subject": "Demo"},
        files={"file": ("demo.wav", b"RIFF-not-really-a-wave", "audio/wav")},
    )

    assert unsupported.status_code == 415
    assert missing_key.status_code == 503
    assert "fixture" in missing_key.json()["detail"]


def test_declared_oversized_request_is_rejected_before_parsing(client: TestClient) -> None:
    response = client.post(
        "/api/v1/calls/transcribe",
        content=b"small",
        headers={"Content-Length": str(calls.MAX_UPLOAD_REQUEST_BYTES + 1)},
    )

    assert response.status_code == 413


@pytest.mark.asyncio
async def test_chunked_oversized_request_is_stopped_while_streaming() -> None:
    received_messages = iter(
        [
            {"type": "http.request", "body": b"1234", "more_body": True},
            {"type": "http.request", "body": b"5678", "more_body": False},
        ]
    )

    async def receive():
        return next(received_messages)

    async def downstream(_scope, downstream_receive, _send):
        await downstream_receive()
        await downstream_receive()

    async def send(_message):
        raise AssertionError("No response should be emitted by the downstream app")

    middleware = calls.UploadSizeLimitMiddleware(downstream, max_bytes=5)
    scope = {"type": "http", "path": "/api/v1/calls/transcribe", "headers": []}

    with pytest.raises(HTTPException) as error:
        await middleware(scope, receive, send)

    assert error.value.status_code == 413


def test_paid_transcription_requires_token_and_is_idempotent(monkeypatch) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        elevenlabs_api_key="provider-key",
        ingest_token="ingest-key",
    )
    provider_calls = 0

    async def fake_transcribe_audio(**_):
        nonlocal provider_calls
        provider_calls += 1
        return Transcript(
            text="Hello Dev",
            language_code="en",
            segments=[
                TranscriptSegment(
                    sequence=0,
                    speaker="speaker_0",
                    body="Hello Dev",
                    start_ms=0,
                    end_ms=900,
                )
            ],
        )

    monkeypatch.setattr(calls, "transcribe_audio", fake_transcribe_audio)
    with TestClient(create_app(settings)) as protected_client:
        request = {
            "data": {
                "subject": "Demo call",
                "occurred_at": datetime.now(UTC).isoformat(),
            },
            "files": {"file": ("demo.wav", b"same-audio", "audio/wav")},
        }
        denied = protected_client.post("/api/v1/calls/transcribe", **request)
        first = protected_client.post(
            "/api/v1/calls/transcribe",
            headers={"X-Slipstream-Ingest-Token": "ingest-key"},
            **request,
        )
        second = protected_client.post(
            "/api/v1/calls/transcribe",
            headers={"X-Slipstream-Ingest-Token": "ingest-key"},
            **request,
        )

    assert denied.status_code == 401
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert provider_calls == 1
