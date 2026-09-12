from fastapi.testclient import TestClient

from app.core.config import Settings
from app.factory import create_app


def _email(source: str, direction: str, sender: str, recipient: str, body: str) -> dict:
    return {
        "source_external_id": source,
        "thread_external_id": "thread-1",
        "direction": direction,
        "sender": {"name": "Buyer" if direction == "inbound" else "Rep", "email": sender},
        "recipients": [{"name": "Rep" if direction == "inbound" else "Buyer", "email": recipient}],
        "subject": "Re: Workflow review" if source != "email-1" else "Workflow review",
        "body": body,
        "occurred_at": "2026-09-12T10:00:00Z" if source == "email-1" else "2026-09-12T11:00:00Z",
    }


def test_email_thread_ingests_idempotently_and_drafts_reply(client: TestClient) -> None:
    inbound = _email(
        "email-1",
        "inbound",
        "buyer@acme.example",
        "rep@slipstream.example",
        "Can we review timing?",
    )
    outbound = _email(
        "email-2",
        "outbound",
        "rep@slipstream.example",
        "buyer@acme.example",
        "Yes, tomorrow works.",
    )

    first = client.post("/api/v1/emails", json=inbound)
    repeated = client.post("/api/v1/emails", json=inbound)
    second = client.post("/api/v1/emails", json=outbound)

    assert first.status_code == repeated.status_code == second.status_code == 200
    assert first.json()["id"] == repeated.json()["id"]
    thread = client.get("/api/v1/emails/threads/thread-1").json()
    assert [message["source_external_id"] for message in thread] == ["email-1", "email-2"]
    assert all(message["contact_email"] == "buyer@acme.example" for message in thread)

    response = client.post("/api/v1/emails/threads/thread-1/draft-reply")
    assert response.status_code == 200
    draft = response.json()
    assert draft["recipient_email"] == "buyer@acme.example"
    assert draft["subject"] == "Re: Workflow review"
    assert "Can we review timing?" in draft["body"]

    approved = client.post(f"/api/v1/drafts/{draft['id']}/approve", json={"approved_by": "Jeremy"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "sent"


def test_email_source_collision_is_rejected(client: TestClient) -> None:
    message = _email("same", "inbound", "buyer@acme.example", "rep@slipstream.example", "First")
    assert client.post("/api/v1/emails", json=message).status_code == 200
    message["body"] = "Different"
    assert client.post("/api/v1/emails", json=message).status_code == 409


def test_email_ingest_validates_addresses_and_authentication() -> None:
    settings = Settings(_env_file=None, environment="test", ingest_token="secret")
    with TestClient(create_app(settings)) as client:
        message = _email(
            "email-auth", "inbound", "buyer@acme.example", "rep@slipstream.example", "Hello"
        )
        assert client.post("/api/v1/emails", json=message).status_code == 401
        assert (
            client.post(
                "/api/v1/emails",
                json=message,
                headers={"X-Slipstream-Ingest-Token": "secret"},
            ).status_code
            == 200
        )
        assert client.get("/api/v1/emails/threads/thread-1").status_code == 401
        assert client.post("/api/v1/emails/threads/thread-1/draft-reply").status_code == 401
        message["source_external_id"] = "bad-email"
        message["sender"]["email"] = "not-an-email"
        assert (
            client.post(
                "/api/v1/emails",
                json=message,
                headers={"X-Slipstream-Ingest-Token": "secret"},
            ).status_code
            == 422
        )


def test_email_names_and_subject_headers_are_normalized(client: TestClient) -> None:
    message = _email(
        "normalized", "inbound", "buyer@acme.example", "rep@slipstream.example", "Hello"
    )
    message["sender"]["name"] = "   "
    response = client.post("/api/v1/emails", json=message)
    assert response.status_code == 200
    assert response.json()["sender"]["name"] is None
    message["source_external_id"] = "bad-subject"
    message["subject"] = "Hello\r\nBcc: victim@example.com"
    assert client.post("/api/v1/emails", json=message).status_code == 422


def test_unknown_thread_cannot_be_drafted(client: TestClient) -> None:
    assert client.post("/api/v1/emails/threads/missing/draft-reply").status_code == 404
