import json
from typing import Any

import pytest
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


def test_approval_stays_unsent_and_is_idempotent(client: TestClient) -> None:
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
    assert approved.json()["status"] == "approved"
    assert approved.json()["approved_by"] == "Jordan Lee"
    assert approved.json()["approved_at"] is not None
    assert approved.json()["sent_at"] is None
    assert repeated.json() == approved.json()
    assert (
        client.app.state.activity_store[f"draft-approved:{draft['id']}"]["delivery"] == "not_sent"
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


@pytest.mark.parametrize(
    "claim",
    [
        "I can guarantee Essential Eight compliance inside a week.",
        "We are guaranteeing full compliance within a week.",
        "We are making guarantees of full compliance within a week.",
        "Our platform is completely breach-proof.",
        "Our platform is completely secure.",
        "Your insurance premiums will fall by 50%.",
        "Your insurance premiums will be reduced by 50%.",
        "Your insurer will\nreduce the annual premium after our report.",
        "The incumbent is not certified.",
        "Your incumbent is not ISO 27001 certified.",
        "We cannot promise a timeline, but we guarantee your insurance premiums will fall by 50%.",
    ],
)
def test_risky_model_claim_returns_502(
    client: TestClient, monkeypatch, claim: str
) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return ReasoningResult(
            output=FollowUpDraftContent(
                subject="Proposal follow-up",
                body=claim,
            ),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 502


def test_risky_model_claim_gets_one_transcript_free_regeneration(
    client: TestClient, monkeypatch
) -> None:
    payloads: list[dict[str, object]] = []

    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        payloads.append(json.loads(user))
        body = (
            "I guarantee Essential Eight compliance inside a week."
            if len(payloads) == 1
            else "Thanks for your time. I will send the proposal for review."
        )
        return ReasoningResult(
            output=FollowUpDraftContent(subject="Proposal follow-up", body=body),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 200
    assert len(payloads[0]["transcript"]) > 0
    assert payloads[1]["transcript"] == []


@pytest.mark.parametrize(
    "body",
    [
        "We cannot promise a specific insurance saving.",
        "We cannot guarantee a specific insurance saving.",
        "Removing unused seats reduces the subscription price.",
        "We will document your current security controls without making guarantees.",
        "We will send the report to your insurer.",
        (
            "Removing unused seats reduces the subscription price, "
            "and we will send the report to your insurer."
        ),
    ],
)
def test_safe_model_qualification_is_allowed(
    client: TestClient, monkeypatch, body: str
) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return ReasoningResult(
            output=FollowUpDraftContent(subject="Proposal follow-up", body=body),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 200


def test_safety_validation_keeps_subject_and_body_independent(
    client: TestClient, monkeypatch
) -> None:
    def fake(reasoning, *, system, user, schema, max_tokens=4000, timeout=None):
        return ReasoningResult(
            output=FollowUpDraftContent(
                subject="Lower subscription costs",
                body="We will send the report to your insurer.",
            ),
            model="fake/model",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.draft.structured", fake)
    call, _ = _ingest_and_extract(client)

    response = client.post(f"/api/v1/drafts/from-call/{call['id']}")

    assert response.status_code == 200


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
    assert approved.json()["status"] == "approved"
    assert approved.json()["source"] == "model"
    assert (
        client.app.state.activity_store[f"draft-approved:{draft['id']}"]["delivery"] == "not_sent"
    )
