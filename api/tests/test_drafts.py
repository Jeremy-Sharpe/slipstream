from fastapi.testclient import TestClient


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
    assert draft["recipient_name"] == "Dev Patel"
    assert draft["recipient_email"] == "dev@marlowefinch.example"
    assert draft["subject"] == "Next steps — Marlowe & Finch Accounting"
    assert "proposal and 30-seat agreement" in draft["body"]
    assert "halve the premium" not in draft["body"]
    assert draft["status"] == "draft"


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
