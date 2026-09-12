import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from threading import Event
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.routers import deliveries
from app.schemas.leads import LeadIn
from app.services.outreach import approve_outreach


def _configure(client: TestClient, responder: httpx.MockTransport) -> None:
    client.app.state.settings.resend_api_key = SecretStr("re_test_secret")
    client.app.state.settings.resend_from = "Slipstream <sales@example.com>"
    client.app.state.settings.resend_base_url = "https://api.resend.test"
    client.app.state.settings.ingest_token = SecretStr("ingest-secret")
    client.app.state.email_delivery_client._transport = responder


def _approved_follow_up(client: TestClient) -> dict:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    assert client.post(f"/api/v1/calls/{call['id']}/extract").status_code == 200
    draft = client.post(f"/api/v1/drafts/from-call/{call['id']}").json()
    response = client.post(
        f"/api/v1/drafts/{draft['id']}/approve",
        json={"approved_by": "Jordan Lee"},
    )
    assert response.status_code == 200
    return response.json()


def _deliver(client: TestClient, draft_id: str):
    return client.post(
        f"/api/v1/drafts/{draft_id}/deliver",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )


def test_approved_follow_up_is_delivered_exactly_once(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": "email-provider-1"})

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)

    unauthorised = client.post(f"/api/v1/drafts/{draft['id']}/deliver")
    first = _deliver(client, draft["id"])
    second = _deliver(client, draft["id"])

    assert unauthorised.status_code == 401
    assert first.status_code == 200
    assert second.json() == first.json()
    assert len(requests) == 1
    assert first.json() == {
        "draft_id": draft["id"],
        "status": "sent",
        "provider": "resend",
        "provider_message_id": "email-provider-1",
        "idempotency_key": requests[0].headers["Idempotency-Key"],
    }
    payload = json.loads(requests[0].read())
    assert requests[0].url == "https://api.resend.test/emails"
    assert requests[0].headers["Authorization"] == "Bearer re_test_secret"
    assert payload == {
        "from": "Slipstream <sales@example.com>",
        "to": [draft["recipient_email"]],
        "subject": draft["subject"],
        "text": draft["body"],
    }
    stored = client.app.state.draft_store[draft["id"]]
    assert stored.status == "sent"
    assert stored.sent_at is not None
    assert client.app.state.activity_store[f"draft-delivered:{draft['id']}"] == {
        "action": "email.delivered",
        "provider": "resend",
        "provider_message_id": "email-provider-1",
        "idempotency_key": first.json()["idempotency_key"],
    }


def test_unapproved_draft_is_not_delivered(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    assert client.post(f"/api/v1/calls/{call['id']}/extract").status_code == 200
    draft = client.post(f"/api/v1/drafts/from-call/{call['id']}").json()

    response = _deliver(client, draft["id"])

    assert response.status_code == 409
    assert response.json() == {"detail": "Approve the exact draft before delivery"}
    assert requests == []


def test_legacy_sent_draft_without_receipt_is_not_delivered(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft = _approved_follow_up(client)
    stored = client.app.state.draft_store[draft["id"]]
    client.app.state.draft_store[draft["id"]] = stored.model_copy(
        update={"status": "sent", "sent_at": stored.approved_at}
    )

    response = _deliver(client, draft["id"])

    assert response.status_code == 409
    assert "reconcile" in response.json()["detail"]
    assert requests == []


def test_outreach_delivery_marks_lead_contacted(client: TestClient) -> None:
    _configure(
        client,
        httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "outreach-1"})),
    )
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(
        LeadIn(
            company_name="Northstar Labs",
            person_name="Maya Chen",
            email="maya@example.com",
            origami_row_id="delivery-row-1",
        )
    )
    draft = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "recipient_name": lead.person_name,
            "recipient_email": lead.email,
            "subject": "A relevant note",
            "body": "Hi Maya,\n\nWould a short conversation be useful?\n\nSam",
            "status": "draft",
        }
    )
    approve_outreach(store, draft_id=str(draft.id), actor="anna")

    response = _deliver(client, str(draft.id))

    assert response.status_code == 200
    assert store.get_draft(str(draft.id)).status == "sent"  # type: ignore[union-attr]
    assert store.get_lead(str(lead.id)).status == "contacted"  # type: ignore[union-attr]
    assert store.activities[-1]["action"] == "outreach.delivered"


def test_provider_rejection_is_safe_and_does_not_expose_details(client: TestClient) -> None:
    _configure(
        client,
        httpx.MockTransport(
            lambda _: httpx.Response(422, text="secret provider diagnostics re_test_secret")
        ),
    )
    draft = _approved_follow_up(client)

    response = _deliver(client, draft["id"])

    assert response.status_code == 502
    assert response.json() == {"detail": "The email provider rejected the approved draft"}
    assert "secret" not in response.text
    assert client.app.state.draft_store[draft["id"]].status == "approved"
    assert client.app.state.email_delivery_attempts[draft["id"]].state == "unknown"


def test_dropped_response_is_ambiguous_and_retry_identity_is_stable(
    client: TestClient,
) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("provider accepted, then dropped response", request=request)

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)

    first = _deliver(client, draft["id"])
    second = _deliver(client, draft["id"])

    assert first.status_code == 504
    assert second.status_code == 504
    assert first.json() == {"detail": "The email delivery outcome is unknown"}
    assert len(requests) == 2
    assert requests[0].headers["Idempotency-Key"] == requests[1].headers["Idempotency-Key"]
    assert client.app.state.email_delivery_admission_slots._value == 4


def test_provider_acceptance_retries_with_the_same_provider_identity(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": "accepted-1"})

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)
    real_complete = deliveries._complete
    attempts = 0

    async def flaky_complete(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("temporary store failure")
        return await real_complete(*args, **kwargs)

    monkeypatch.setattr(deliveries, "_complete", flaky_complete)

    first = _deliver(client, draft["id"])
    second = _deliver(client, draft["id"])

    assert first.status_code == 504
    assert second.status_code == 200
    assert len(requests) == 2
    assert requests[0].headers["Idempotency-Key"] == requests[1].headers["Idempotency-Key"]
    assert client.app.state.draft_store[draft["id"]].status == "sent"


def test_ambiguous_attempt_expires_without_another_provider_call(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("ambiguous", request=request)

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)
    assert _deliver(client, draft["id"]).status_code == 504
    attempt = client.app.state.email_delivery_attempts[draft["id"]]
    client.app.state.email_delivery_attempts[draft["id"]] = attempt.model_copy(
        update={"first_attempt_at": attempt.first_attempt_at - deliveries.DELIVERY_RETRY_WINDOW}
    )

    response = _deliver(client, draft["id"])

    assert response.status_code == 409
    assert response.json() == {"detail": deliveries.EXPIRED_DELIVERY_DETAIL}
    assert len(requests) == 1


def test_sender_change_cannot_reuse_an_ambiguous_attempt(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("ambiguous", request=request)

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)
    assert _deliver(client, draft["id"]).status_code == 504
    client.app.state.settings.resend_from = "Another Sender <other@example.com>"

    response = _deliver(client, draft["id"])

    assert response.status_code == 409
    assert response.json() == {"detail": "The delivery identity does not match its first attempt"}
    assert len(requests) == 1


@pytest.mark.parametrize(
    "provider_response",
    [
        httpx.Response(500, text="provider error"),
        httpx.Response(409, text="concurrent idempotent request"),
        httpx.Response(200, text="not-json"),
        httpx.Response(200, json={}),
        httpx.Response(200, content=b"x" * 4097),
    ],
)
def test_uncertain_provider_responses_are_ambiguous(
    client: TestClient, provider_response: httpx.Response
) -> None:
    _configure(client, httpx.MockTransport(lambda _: provider_response))
    draft = _approved_follow_up(client)

    response = _deliver(client, draft["id"])

    assert response.status_code == 504
    assert response.json() == {"detail": "The email delivery outcome is unknown"}
    assert client.app.state.draft_store[draft["id"]].status == "approved"


def test_delivery_has_fail_fast_admission_and_overall_deadline(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def respond(_: httpx.Request) -> httpx.Response:
        await asyncio.sleep(1)
        return httpx.Response(200, json={"id": "late"})

    _configure(client, httpx.MockTransport(respond))
    draft = _approved_follow_up(client)
    client.app.state.email_delivery_admission_slots = asyncio.Semaphore(0)
    busy = _deliver(client, draft["id"])
    client.app.state.email_delivery_admission_slots = asyncio.Semaphore(4)
    monkeypatch.setattr("app.routers.deliveries.DELIVERY_TOTAL_SECONDS", 0.01)
    timed_out = _deliver(client, draft["id"])

    assert busy.status_code == 429
    assert timed_out.status_code == 504
    assert timed_out.json() == {"detail": "The email delivery outcome is unknown"}


def test_delivery_reports_missing_configuration_before_lookup(client: TestClient) -> None:
    response = client.post("/api/v1/drafts/00000000-0000-0000-0000-000000000000/deliver")

    assert response.status_code == 503
    assert response.json() == {"detail": "Email delivery integration is not configured"}


def test_cancelled_database_work_keeps_its_own_capacity_until_thread_finishes() -> None:
    async def scenario() -> None:
        gate = Event()
        slots = asyncio.Semaphore(1)
        executor = ThreadPoolExecutor(max_workers=1)
        request = SimpleNamespace(
            app=SimpleNamespace(
                state=SimpleNamespace(
                    email_delivery_db_slots=slots,
                    email_delivery_db_executor=executor,
                )
            )
        )
        task = asyncio.create_task(deliveries._run_db(request, gate.wait))
        await asyncio.sleep(0.01)
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        assert slots._value == 0
        gate.set()
        for _ in range(20):
            if slots._value == 1:
                break
            await asyncio.sleep(0.01)
        assert slots._value == 1
        executor.shutdown(wait=True)

    asyncio.run(scenario())
