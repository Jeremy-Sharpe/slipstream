from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.factory import create_app
from app.routers import emails
from app.services.draft import mark_sent
from app.services.email import EmailIngest, record_email, scoped_email_id

THREAD = "/api/v1/emails/demo/mailboxes/sales/threads/thread-1"


def _email(
    source: str,
    direction: str,
    sender: str,
    recipient: str,
    body: str,
    *,
    mailbox_id: str = "sales",
    occurred_at: str | None = None,
) -> dict:
    return {
        "provider": "demo",
        "mailbox_external_id": mailbox_id,
        "mailbox": {"name": "Rep", "email": "rep@slipstream.example"},
        "source_external_id": source,
        "thread_external_id": "thread-1",
        "direction": direction,
        "sender": {"name": "Buyer" if direction == "inbound" else "Rep", "email": sender},
        "recipients": [
            {
                "name": "Rep" if direction == "inbound" else "Buyer",
                "email": recipient,
                "kind": "to",
            }
        ],
        "subject": "Re: Workflow review" if source != "email-1" else "Workflow review",
        "body": body,
        "occurred_at": occurred_at
        or ("2026-09-12T10:00:00Z" if source == "email-1" else "2026-09-12T11:00:00Z"),
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
    thread = client.get(THREAD).json()
    assert [message["source_external_id"] for message in thread] == ["email-1", "email-2"]
    assert all(message["contact_email"] == "buyer@acme.example" for message in thread)
    crm_deals = client.app.state.icp_leads_store.list_icp_deals()
    email_deal = next(
        deal for deal in crm_deals if deal.crm_external_id == first.json()["deal_external_id"]
    )
    assert email_deal.contact_name == "buyer"
    assert [item.source_external_id for item in email_deal.interactions] == [
        scoped_email_id("source", "demo", "sales", "email-2"),
        scoped_email_id("source", "demo", "sales", "email-1"),
    ]
    assert email_deal.metadata["channels"] == ["email"]
    inventory = client.get("/api/v1/icp/evidence").json()
    assert inventory == {
        "deals": 1,
        "calls": 0,
        "emails": 2,
        "outcome_labelled": 0,
        "won_deals": 0,
        "contrast_deals": 0,
        "active_deals": 1,
        "ready_to_derive": False,
    }

    response = client.post(f"{THREAD}/draft-reply")
    assert response.status_code == 200
    draft = response.json()
    assert draft["recipient_email"] == "buyer@acme.example"
    assert draft["subject"] == "Re: Workflow review"
    assert "Yes, tomorrow works." in draft["body"]
    approved = client.post(f"/api/v1/drafts/{draft['id']}/approve", json={"approved_by": "Jeremy"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "sent"


def test_email_ids_are_namespaced_by_mailbox(client: TestClient) -> None:
    first = _email("same", "inbound", "buyer@acme.example", "rep@slipstream.example", "One")
    second = _email(
        "same", "inbound", "buyer@acme.example", "rep@slipstream.example", "Two", mailbox_id="other"
    )
    second["mailbox"] = {"email": "other@slipstream.example"}
    second["recipients"] = [{"email": "other@slipstream.example", "kind": "to"}]
    left = client.post("/api/v1/emails", json=first)
    right = client.post("/api/v1/emails", json=second)
    assert left.status_code == right.status_code == 200
    assert left.json()["id"] != right.json()["id"]
    assert len(client.get(THREAD).json()) == 1
    assert len(client.get("/api/v1/emails/demo/mailboxes/other/threads/thread-1").json()) == 1


def test_scoped_ids_cannot_collide_when_components_contain_delimiters() -> None:
    assert scoped_email_id("thread", "demo", "sales:a", "b") != scoped_email_id(
        "thread", "demo", "sales", "a:b"
    )
    assert scoped_email_id("source", "demo:a", "sales", "b") != scoped_email_id(
        "source", "demo", "a:sales", "b"
    )


def test_email_source_collision_is_rejected(client: TestClient) -> None:
    message = _email("same", "inbound", "buyer@acme.example", "rep@slipstream.example", "First")
    assert client.post("/api/v1/emails", json=message).status_code == 200
    message["body"] = "Different"
    assert client.post("/api/v1/emails", json=message).status_code == 409


def test_email_mirror_failure_does_not_commit_and_retry_repairs(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    message = _email(
        "mirror-retry", "inbound", "buyer@acme.example", "rep@slipstream.example", "Hi"
    )
    original = emails.mirror_interaction

    def fail(*args: object, **kwargs: object) -> None:
        raise RuntimeError("CRM unavailable")

    monkeypatch.setattr(emails, "mirror_interaction", fail)
    failed = client.post("/api/v1/emails", json=message)
    assert failed.status_code == 503
    assert client.app.state.email_store == {}
    assert client.app.state.email_threads == {}

    monkeypatch.setattr(emails, "mirror_interaction", original)
    assert client.post("/api/v1/emails", json=message).status_code == 200
    assert len(client.app.state.icp_leads_store.list_icp_deals()) == 1


def test_email_mirror_preserves_curated_contact_name(client: TestClient) -> None:
    store = client.app.state.icp_leads_store
    store.upsert_contact(
        {
            "first_name": "Curated",
            "last_name": "Buyer",
            "email": "buyer@acme.example",
        }
    )

    response = client.post(
        "/api/v1/emails",
        json=_email(
            "curated-contact",
            "inbound",
            "buyer@acme.example",
            "rep@slipstream.example",
            "Hello",
        ),
    )

    assert response.status_code == 200
    contact = store.get_contact_by_email("buyer@acme.example")
    assert contact["first_name"] == "Curated"
    assert contact["last_name"] == "Buyer"


def test_draft_versions_when_new_message_arrives(client: TestClient) -> None:
    first = _email("email-1", "inbound", "buyer@acme.example", "rep@slipstream.example", "First")
    second = _email(
        "email-3",
        "inbound",
        "buyer@acme.example",
        "rep@slipstream.example",
        "New detail",
        occurred_at="2026-09-12T12:00:00Z",
    )
    client.post("/api/v1/emails", json=first)
    first_draft = client.post(f"{THREAD}/draft-reply").json()
    client.post(f"/api/v1/drafts/{first_draft['id']}/approve", json={"approved_by": "Jeremy"})
    client.post("/api/v1/emails", json=second)
    second_draft = client.post(f"{THREAD}/draft-reply").json()
    assert second_draft["id"] != first_draft["id"]
    assert second_draft["status"] == "draft"
    assert "New detail" in second_draft["body"]


def test_ambiguous_outbound_reply_target_fails_safe(client: TestClient) -> None:
    message = _email(
        "email-many", "outbound", "rep@slipstream.example", "one@acme.example", "Checking in"
    )
    message["recipients"].append({"email": "two@acme.example", "kind": "to"})
    assert client.post("/api/v1/emails", json=message).status_code == 200
    response = client.post(f"{THREAD}/draft-reply")
    assert response.status_code == 409
    assert "single external" in response.json()["detail"]


def test_email_ingest_validates_addresses_direction_and_authentication() -> None:
    settings = Settings(_env_file=None, environment="test", ingest_token="secret")
    with TestClient(create_app(settings)) as client:
        message = _email(
            "email-auth", "inbound", "buyer@acme.example", "rep@slipstream.example", "Hello"
        )
        assert client.post("/api/v1/emails", json=message).status_code == 401
        headers = {"X-Slipstream-Ingest-Token": "secret"}
        assert client.post("/api/v1/emails", json=message, headers=headers).status_code == 200
        assert client.get(THREAD).status_code == 401
        assert client.post(f"{THREAD}/draft-reply").status_code == 401
        assert client.get(THREAD, headers=headers).status_code == 200
        message["source_external_id"] = "bad-email"
        message["sender"]["email"] = "not-an-email"
        assert client.post("/api/v1/emails", json=message, headers=headers).status_code == 422


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
    assert client.post(f"{THREAD}/draft-reply").status_code == 404


class _RpcCall:
    def __init__(self, result: object) -> None:
        self.result = result

    def execute(self) -> SimpleNamespace:
        if isinstance(self.result, Exception):
            raise self.result
        return SimpleNamespace(data=self.result)


class _RpcClient:
    def __init__(self, *results: object) -> None:
        self.results = list(results)
        self.calls: list[tuple[str, dict]] = []

    def rpc(self, name: str, payload: dict) -> _RpcCall:
        self.calls.append((name, payload))
        return _RpcCall(self.results.pop(0))


def test_thread_read_uses_one_bounded_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    rows = [{"id": index} for index in range(emails.MAX_THREAD_MESSAGES)]
    store = _RpcClient({"messages": rows, "overflow": False})
    monkeypatch.setattr(emails, "_record_from_row", lambda row: row)
    monkeypatch.setattr(emails, "_thread_is_too_large", lambda _: False)

    assert emails._read_thread(store, "thread-key") == rows
    assert store.calls == [("read_email_thread", {"thread_id": "thread-key"})]


def test_thread_read_rejects_only_message_5001(monkeypatch: pytest.MonkeyPatch) -> None:
    store = _RpcClient({"messages": [], "overflow": True})
    monkeypatch.setattr(emails, "_record_from_row", lambda row: row)

    with pytest.raises(emails.EmailThreadTooLargeError, match="exceeds"):
        emails._read_thread(store, "thread-key")


@pytest.mark.parametrize("suffix", ["", "/draft-reply"])
def test_supabase_oversized_thread_returns_413(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, suffix: str
) -> None:
    def oversized(*_: object) -> list:
        raise emails.EmailThreadTooLargeError("too large")

    monkeypatch.setattr(emails, "_read_thread", oversized)
    client.app.state.supabase = object()

    response = client.post(f"{THREAD}{suffix}") if suffix else client.get(THREAD)

    assert response.status_code == 413
    assert response.json()["detail"] == "Email thread is too large"


@pytest.mark.parametrize("suffix", ["", "/draft-reply"])
def test_memory_thread_byte_budget_returns_413(client: TestClient, suffix: str) -> None:
    message = EmailIngest.model_validate(
        _email(
            "large-memory-thread",
            "inbound",
            "buyer@acme.example",
            "rep@slipstream.example",
            "x" * 100_000,
        )
    )
    record = record_email(message)
    client.app.state.email_threads[record.namespaced_thread_id] = [record] * 84

    response = client.post(f"{THREAD}{suffix}") if suffix else client.get(THREAD)

    assert response.status_code == 413
    assert response.json()["detail"] == "Email thread is too large"


def test_email_persistence_retries_a_deadlock(monkeypatch: pytest.MonkeyPatch) -> None:
    class DeadlockError(RuntimeError):
        code = "40P01"

    message = EmailIngest.model_validate(
        _email(
            "retry",
            "inbound",
            "buyer@acme.example",
            "rep@slipstream.example",
            "Please retry",
        )
    )
    record = record_email(message)
    store = _RpcClient(DeadlockError("deadlock detected"), [record.model_dump(mode="json")])
    monkeypatch.setattr(emails, "_record_from_row", lambda _: record)
    monkeypatch.setattr(emails.time, "sleep", lambda _: None)

    assert emails._persist(store, record) == record
    assert [name for name, _ in store.calls] == [
        "ingest_email_conversation",
        "ingest_email_conversation",
    ]


def test_supabase_draft_clears_stale_memory_cache(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    message = EmailIngest.model_validate(
        _email(
            "canonical-draft",
            "inbound",
            "buyer@acme.example",
            "rep@slipstream.example",
            "Canonical reply",
        )
    )
    record = record_email(message)
    generated = emails.draft_thread_reply([record])
    canonical = mark_sent(generated, "Database approver")

    async def load_thread(*_: object) -> list:
        return [record]

    monkeypatch.setattr(emails, "_load_thread", load_thread)
    monkeypatch.setattr(emails, "_create_draft", lambda *_: canonical)
    client.app.state.supabase = object()
    client.app.state.draft_store[str(generated.id)] = generated

    response = client.post(f"{THREAD}/draft-reply")

    assert response.status_code == 200
    assert response.json()["status"] == "sent"
    assert str(generated.id) not in client.app.state.draft_store


def test_supabase_ingestion_does_not_retain_message_bodies(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(emails, "_read_source", lambda *_: None)
    monkeypatch.setattr(emails, "_persist", lambda _, record: record)
    client.app.state.supabase = object()

    for source in ("durable-one", "durable-two"):
        response = client.post(
            "/api/v1/emails",
            json=_email(
                source,
                "inbound",
                "buyer@acme.example",
                "rep@slipstream.example",
                "x" * 100_000,
            ),
        )
        assert response.status_code == 200

    assert client.app.state.email_store == {}
    assert client.app.state.email_threads == {}


def test_email_migration_keeps_ingestion_atomic_and_service_role_only() -> None:
    migration = (
        Path(__file__).parents[2] / "supabase/migrations/20260912010000_email_ingestion.sql"
    ).read_text()

    assert "pg_advisory_xact_lock" in migration
    assert "order by lower(value->>'email')" in migration
    assert "create or replace function public.read_email_thread" in migration
    assert "octet_length(to_jsonb(conversation)::text)" in migration
    assert "revoke all on function public.ingest_email_conversation(jsonb) from public" in migration
    assert "revoke all on function public.ingest_email_conversation(jsonb) from anon" in migration
    assert (
        "revoke all on function public.ingest_email_conversation(jsonb) from authenticated"
        in migration
    )
    assert "grant execute on function public.read_email_thread(text) to service_role" in migration
