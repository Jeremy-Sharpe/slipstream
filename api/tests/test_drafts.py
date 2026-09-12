import json
from typing import Any

from fastapi.testclient import TestClient

from app.core.llm import ReasoningResult
from app.services.draft import FollowUpDraftContent, draft_follow_up


def _pipeline(client: TestClient) -> tuple[dict, dict]:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    extraction = client.post(f"/api/v1/calls/{call['id']}/extract")
    assert extraction.status_code == 200
    draft = client.post(f"/api/v1/drafts/from-call/{call['id']}")
    assert draft.status_code == 200
    return call, draft.json()


def test_follow_up_is_grounded_and_idempotent(client: TestClient) -> None:
    call, draft = _pipeline(client)
    repeated = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert repeated.json() == draft
    assert draft["recipient_name"] == "Donnie Azoff"
    assert draft["recipient_email"] == "donnie@marlowefinch.example"
    assert draft["subject"] == "Next steps — Marlowe & Finch Accounting"
    assert "proposal and 30-seat agreement" in draft["body"]
    assert "halve the premium" not in draft["body"]
    assert draft["status"] == "draft"
    assert draft["source"] == "deterministic"
    assert draft["prompt_version"] == "grounded-template-v1"


def test_approval_marks_sent_without_delivering_and_is_idempotent(client: TestClient) -> None:
    _, draft = _pipeline(client)

    approved = client.post(
        f"/api/v1/drafts/{draft['id']}/approve",
        json={"approved_by": "Jordan Lee"},
    )
    repeated = client.post(
        f"/api/v1/drafts/{draft['id']}/approve",
        json={"approved_by": "Someone Else"},
    )

    assert approved.status_code == 200
    assert approved.json()["status"] == "sent"
    assert approved.json()["approved_by"] == "Jordan Lee"
    assert approved.json()["approved_at"] == approved.json()["sent_at"]
    assert repeated.json() == approved.json()
    assert (
        client.app.state.activity_store[f"draft-approved:{draft['id']}"]["delivery"] == "simulated"
    )


def test_draft_requires_extraction(client: TestClient) -> None:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 409


def _ingest_and_extract(client: TestClient) -> tuple[dict[str, Any], dict[str, Any]]:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    extraction = client.post(f"/api/v1/calls/{call['id']}/extract")
    assert extraction.status_code == 200
    return call, extraction.json()


def test_follow_up_can_be_drafted_by_model(client: TestClient, monkeypatch) -> None:
    captured: dict[str, str] = {}

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        captured["system"] = system
        captured["user"] = user
        assert schema is FollowUpDraftContent
        assert max_tokens == 1200
        assert timeout is None
        return ReasoningResult(
            output=FollowUpDraftContent(
                subject="Following up on Marlowe & Finch",
                body="Hi Donnie,\n\nThanks for your time.\n\nBest,\nJordan Belfort",
            ),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, extraction = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 200
    draft = response.json()
    template = draft_follow_up(client.app.state.extraction_store[call["id"]])
    assert draft["source"] == "model"
    assert draft["model"] == "fake/model"
    assert draft["prompt_version"] == "follow-up-v1"
    assert draft["subject"] == "Following up on Marlowe & Finch"
    assert draft["body"] == "Hi Donnie,\n\nThanks for your time.\n\nBest,\nJordan Belfort"
    assert draft["id"] == str(template.id)
    assert draft["recipient_name"] == extraction["contact"]["name"]["value"]
    assert draft["recipient_email"] == extraction["contact"]["email"]["value"]

    payload = json.loads(captured["user"])
    assert payload["contact"]["name"] == "Donnie Azoff"
    assert payload["next_step"]["description"] in captured["user"]
    assert payload["promises"]
    assert any("proposal and 30-seat agreement" in promise for promise in payload["promises"])
    assert payload["transcript"]
    assert payload["transcript"][0]["speaker"]
    assert payload["transcript"][0]["body"]
    assert payload["rep_name"] == payload["next_step"]["owner"]


def test_model_draft_is_idempotent(client: TestClient, monkeypatch) -> None:
    calls = 0

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        nonlocal calls
        calls += 1
        return ReasoningResult(
            output=FollowUpDraftContent(subject="Model subject", body="Model body"),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    first = client.post(f"/api/v1/drafts/from-call/{call['id']}")
    second = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == first.json()
    assert calls == 1


def test_model_provider_failure_returns_502(client: TestClient, monkeypatch) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 502


def test_runaway_model_body_returns_502(client: TestClient, monkeypatch) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return ReasoningResult(
            output=FollowUpDraftContent(subject="Too long", body=" ".join(["word"] * 300)),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 502


def test_approval_works_for_model_draft(client: TestClient, monkeypatch) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return ReasoningResult(
            output=FollowUpDraftContent(subject="Model subject", body="Model body"),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)
    draft = client.post(f"/api/v1/drafts/from-call/{call['id']}").json()

    approved = client.post(
        f"/api/v1/drafts/{draft['id']}/approve",
        json={"approved_by": "Jordan Lee"},
    )

    assert approved.status_code == 200
    assert approved.json()["status"] == "sent"
    assert approved.json()["source"] == "model"
    assert (
        client.app.state.activity_store[f"draft-approved:{draft['id']}"]["delivery"] == "simulated"
    )
