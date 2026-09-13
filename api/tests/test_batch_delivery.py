import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Event
from types import SimpleNamespace
from uuid import UUID

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.schemas.leads import LeadIn
from app.services import deliveries
from app.services.email_delivery import EmailDeliveryReceipt
from app.services.outreach import approve_outreach


def _configure(client: TestClient, responder: httpx.MockTransport) -> None:
    client.app.state.settings.resend_api_key = SecretStr("re_test_secret")
    client.app.state.settings.resend_from = "Slipstream <sales@example.com>"
    client.app.state.settings.resend_base_url = "https://api.resend.test"
    client.app.state.settings.ingest_token = SecretStr("ingest-secret")
    client.app.state.email_delivery_client._transport = responder


def _outreach_draft(client: TestClient, suffix: str, *, approved: bool) -> str:
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(
        LeadIn(
            company_name=f"Northstar {suffix}",
            person_name=f"Maya {suffix}",
            email=f"maya-{suffix.lower()}@example.com",
            origami_row_id=f"batch-row-{suffix}",
        )
    )
    draft = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "recipient_name": lead.person_name,
            "recipient_email": lead.email,
            "subject": f"A relevant note for {suffix}",
            "body": f"Hi Maya,\n\nWould a short conversation about {suffix} be useful?\n\nSam",
            "status": "draft",
        }
    )
    if approved:
        approve_outreach(store, draft_id=str(draft.id), actor="anna")
    return str(draft.id)


def _batch(client: TestClient, draft_ids: list[str], *, token: str = "ingest-secret"):
    return client.post(
        "/api/v1/drafts/deliver-batch",
        headers={"X-Slipstream-Ingest-Token": token},
        json={"draft_ids": draft_ids},
    )


def _single(client: TestClient, draft_id: str):
    return client.post(
        f"/api/v1/drafts/{draft_id}/deliver",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )


def test_batch_delivers_exact_approved_drafts_and_preserves_order(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        payload = json.loads(request.read())
        return httpx.Response(200, json={"id": f"provider-{payload['to'][0]}"})

    _configure(client, httpx.MockTransport(respond))
    first = _outreach_draft(client, "One", approved=True)
    rejected = _outreach_draft(client, "Two", approved=False)
    third = _outreach_draft(client, "Three", approved=True)

    response = _batch(client, [first, rejected, third])

    assert response.status_code == 200
    body = response.json()
    assert body["requested_count"] == 3
    assert body["confirmed_sent_count"] == 2
    assert body["unconfirmed_count"] == 1
    assert body["unknown_count"] == 0
    assert [item["draft_id"] for item in body["results"]] == [first, rejected, third]
    assert [item["outcome"] for item in body["results"]] == [
        "sent",
        "not_deliverable",
        "sent",
    ]
    assert body["results"][1]["http_status"] == 409
    assert body["results"][1]["receipt"] is None
    assert len(requests) == 2
    sent_payloads = {
        payload["to"][0]: payload
        for payload in (json.loads(request.read()) for request in requests)
    }
    assert sent_payloads == {
        "maya-one@example.com": {
            "from": "Slipstream <sales@example.com>",
            "to": ["maya-one@example.com"],
            "subject": "A relevant note for One",
            "text": "Hi Maya,\n\nWould a short conversation about One be useful?\n\nSam",
        },
        "maya-three@example.com": {
            "from": "Slipstream <sales@example.com>",
            "to": ["maya-three@example.com"],
            "subject": "A relevant note for Three",
            "text": "Hi Maya,\n\nWould a short conversation about Three be useful?\n\nSam",
        },
    }


def test_batch_retries_return_existing_receipts_without_resending(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": f"provider-{len(requests)}"})

    _configure(client, httpx.MockTransport(respond))
    first = _outreach_draft(client, "RetryOne", approved=True)
    second = _outreach_draft(client, "RetryTwo", approved=True)

    initial = _batch(client, [first, second])
    retry = _batch(client, [first, second])

    assert initial.status_code == 200
    assert retry.status_code == 200
    assert retry.json() == initial.json()
    assert len(requests) == 2


def test_batch_authorises_before_reading_or_sending_drafts(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "Private", approved=True)

    missing = client.post("/api/v1/drafts/deliver-batch", json={"draft_ids": [draft_id]})
    wrong = _batch(client, [draft_id], token="wrong")

    assert missing.status_code == 401
    assert wrong.status_code == 401
    assert requests == []


def test_batch_requires_config_before_exposing_draft_state(client: TestClient) -> None:
    client.app.state.settings.ingest_token = SecretStr("ingest-secret")
    response = client.post(
        "/api/v1/drafts/deliver-batch",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
        json={"draft_ids": ["00000000-0000-0000-0000-000000000001"]},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Email delivery integration is not configured"}


def test_batch_rejects_duplicates_and_more_than_eight_ids(client: TestClient) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    one = "00000000-0000-0000-0000-000000000001"

    duplicate = _batch(client, [one, one])
    too_many = _batch(
        client,
        [f"00000000-0000-0000-0000-{number:012d}" for number in range(1, 10)],
    )

    assert duplicate.status_code == 422
    assert too_many.status_code == 422


def test_batch_reports_provider_ambiguity_per_draft(client: TestClient) -> None:
    calls = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if "unknown" in json.loads(request.read())["to"][0]:
            raise httpx.ReadError("ambiguous provider result", request=request)
        return httpx.Response(200, json={"id": "provider-known"})

    _configure(client, httpx.MockTransport(respond))
    unknown = _outreach_draft(client, "Unknown", approved=True)
    known = _outreach_draft(client, "Known", approved=True)

    response = _batch(client, [unknown, known])

    assert response.status_code == 200
    assert response.json()["confirmed_sent_count"] == 1
    assert response.json()["unconfirmed_count"] == 1
    assert response.json()["unknown_count"] == 1
    assert [item["outcome"] for item in response.json()["results"]] == ["unknown", "sent"]
    assert response.json()["results"][0]["http_status"] == 504
    assert calls == 2


def test_partial_batch_retry_reuses_ambiguous_identity_and_not_confirmed_send(
    client: TestClient,
) -> None:
    requests: list[httpx.Request] = []
    unknown_attempts = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal unknown_attempts
        requests.append(request)
        recipient = json.loads(request.read())["to"][0]
        if "unknownretry" in recipient:
            unknown_attempts += 1
            if unknown_attempts == 1:
                raise httpx.ReadError("accepted but response lost", request=request)
        return httpx.Response(200, json={"id": f"provider-{recipient}"})

    _configure(client, httpx.MockTransport(respond))
    unknown = _outreach_draft(client, "UnknownRetry", approved=True)
    known = _outreach_draft(client, "KnownRetry", approved=True)

    first = _batch(client, [unknown, known])
    retry = _batch(client, [unknown, known])

    assert [item["outcome"] for item in first.json()["results"]] == ["unknown", "sent"]
    assert [item["outcome"] for item in retry.json()["results"]] == ["sent", "sent"]
    assert retry.json()["confirmed_sent_count"] == 2
    assert len(requests) == 3
    unknown_requests = [
        request for request in requests if "unknownretry" in json.loads(request.read())["to"][0]
    ]
    assert len(unknown_requests) == 2
    assert (
        unknown_requests[0].headers["Idempotency-Key"]
        == unknown_requests[1].headers["Idempotency-Key"]
    )
    known_sends = sum(
        json.loads(request.read())["to"][0] == "maya-knownretry@example.com"
        for request in requests
    )
    assert known_sends == 1


def test_rejection_after_ambiguous_attempt_requires_reconciliation(client: TestClient) -> None:
    attempts = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise httpx.ReadError("accepted but response lost", request=request)
        return httpx.Response(422, text="rejected")

    _configure(client, httpx.MockTransport(respond))
    draft_id = _outreach_draft(client, "AmbiguousReject", approved=True)

    first = _batch(client, [draft_id]).json()["results"][0]
    second = _batch(client, [draft_id]).json()["results"][0]

    assert first["outcome"] == "unknown"
    assert second["outcome"] == "rejected"
    assert second["reconciliation_required"] is True
    assert attempts == 2


def test_disconnect_on_ambiguous_retry_preserves_reconciliation_flag(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def ambiguous(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("accepted but response lost", request=request)

    _configure(client, httpx.MockTransport(ambiguous))
    draft_id = _outreach_draft(client, "AmbiguousDisconnect", approved=True)
    assert _batch(client, [draft_id]).json()["results"][0]["outcome"] == "unknown"
    checks = 0

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            nonlocal checks
            checks += 1
            return checks == 4

    async def retry():
        return await deliveries._deliver_draft_batch(
            deliveries.BatchDeliveryRequest(draft_ids=[draft_id]),
            RequestStub(),  # type: ignore[arg-type]
        )

    assert client.portal is not None
    response = client.portal.call(retry)

    assert response.results[0].outcome == "not_started"
    assert response.results[0].reconciliation_required is True
    assert len(requests) == 1
    assert client.app.state.email_delivery_attempts[draft_id].state == "unknown"


def test_unexpected_item_error_is_logged_and_reported_unknown(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    draft_id = "00000000-0000-0000-0000-000000000001"

    async def explode(*_args, **_kwargs):
        raise RuntimeError("internal secret detail")

    monkeypatch.setattr(deliveries, "_deliver_draft", explode)
    response = _batch(client, [draft_id])

    assert response.status_code == 200
    assert response.json()["unknown_count"] == 1
    assert response.json()["unconfirmed_count"] == 1
    assert response.json()["results"][0]["outcome"] == "unknown"
    assert response.json()["results"][0]["detail"] == "The draft delivery outcome is unknown"
    assert "internal secret detail" not in response.text
    assert f"Unexpected batch delivery error for draft {draft_id}" in caplog.text


def test_batch_deadline_bounds_workers_and_marks_active_items_unknown(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    ids = [f"00000000-0000-0000-0000-{number:012d}" for number in range(1, 5)]
    started = 0
    active = 0
    maximum_active = 0

    async def controlled(draft_id, _request, _may_start=None, _on_cancel=None):
        nonlocal started, active, maximum_active
        started += 1
        active += 1
        maximum_active = max(maximum_active, active)
        try:
            await asyncio.Event().wait()
        finally:
            active -= 1
        return EmailDeliveryReceipt(
            draft_id=str(draft_id),
            provider_message_id="unreachable",
            idempotency_key="unreachable",
        )

    monkeypatch.setattr(deliveries, "_deliver_draft", controlled)
    monkeypatch.setattr(deliveries, "BATCH_DELIVERY_TOTAL_SECONDS", 0.01)

    async def scenario() -> None:
        response = await deliveries.deliver_draft_batch(
            deliveries.BatchDeliveryRequest(draft_ids=ids),
            SimpleNamespace(app=client.app),  # type: ignore[arg-type]
            "ingest-secret",
        )
        assert started == 2
        assert maximum_active == 2
        assert active == 0
        assert response.confirmed_sent_count == 0
        assert response.unconfirmed_count == 4
        assert response.unknown_count == 2
        assert [item.outcome for item in response.results] == [
            "unknown",
            "unknown",
            "not_started",
            "not_started",
        ]

    asyncio.run(scenario())


def test_disconnect_stops_queued_items_before_delivery(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    ids = [f"00000000-0000-0000-0000-{number:012d}" for number in range(1, 5)]
    active_started = asyncio.Event()
    release = asyncio.Event()
    disconnected = False
    started = 0

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            return disconnected

    async def controlled(draft_id, _request, _may_start=None, _on_cancel=None):
        nonlocal started
        started += 1
        if started == 2:
            active_started.set()
        await release.wait()
        return EmailDeliveryReceipt(
            draft_id=str(draft_id),
            provider_message_id=f"provider-{draft_id}",
            idempotency_key=f"key-{draft_id}",
        )

    monkeypatch.setattr(deliveries, "_deliver_draft", controlled)

    async def scenario() -> None:
        nonlocal disconnected
        task = asyncio.create_task(
            deliveries.deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=ids),
                RequestStub(),  # type: ignore[arg-type]
                "ingest-secret",
            )
        )
        await active_started.wait()
        disconnected = True
        release.set()
        response = await task
        assert started == 2
        assert response.confirmed_sent_count == 2
        assert [item.outcome for item in response.results] == [
            "sent",
            "sent",
            "not_started",
            "not_started",
        ]

    asyncio.run(scenario())


def test_cancelled_worker_cancels_and_drains_active_and_queued_siblings(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    ids = [f"00000000-0000-0000-0000-{number:012d}" for number in range(1, 5)]
    two_started = asyncio.Event()
    started = 0
    active = 0

    async def controlled(_draft_id, _request, _may_start=None, _on_cancel=None):
        nonlocal started, active
        started += 1
        active += 1
        if started == 2:
            two_started.set()
        try:
            if started == 1:
                await two_started.wait()
                raise asyncio.CancelledError
            await asyncio.Event().wait()
        finally:
            active -= 1

    monkeypatch.setattr(deliveries, "_deliver_draft", controlled)

    async def scenario() -> None:
        with pytest.raises(asyncio.CancelledError):
            await deliveries.deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=ids),
                SimpleNamespace(app=client.app),  # type: ignore[arg-type]
                "ingest-secret",
            )
        assert started == 2
        assert active == 0

    asyncio.run(scenario())


def test_cancellation_inside_disconnect_check_stops_all_siblings(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    ids = [f"00000000-0000-0000-0000-{number:012d}" for number in range(1, 5)]
    two_checks = asyncio.Event()
    checks = 0
    delivery_calls = 0

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            nonlocal checks
            checks += 1
            if checks == 2:
                two_checks.set()
            if checks == 1:
                await two_checks.wait()
                raise asyncio.CancelledError
            await asyncio.Event().wait()
            return False

    async def delivered(*_args):
        nonlocal delivery_calls
        delivery_calls += 1

    monkeypatch.setattr(deliveries, "_deliver_draft", delivered)

    async def scenario() -> None:
        with pytest.raises(asyncio.CancelledError):
            await deliveries.deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=ids),
                RequestStub(),  # type: ignore[arg-type]
                "ingest-secret",
            )
        assert checks == 2
        assert delivery_calls == 0

    asyncio.run(scenario())


def test_batch_rechecks_disconnect_after_waiting_for_draft_gate(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "GateDisconnect", approved=True)

    async def scenario() -> None:
        gate = client.app.state.email_delivery_gate_locks[
            UUID(draft_id).int % len(client.app.state.email_delivery_gate_locks)
        ]
        await gate.acquire()
        disconnected = False

        async def may_start() -> bool:
            return not disconnected

        task = asyncio.create_task(
            deliveries._deliver_draft(UUID(draft_id), SimpleNamespace(app=client.app), may_start)
        )
        await asyncio.sleep(0)
        disconnected = True
        gate.release()
        with pytest.raises(deliveries.DeliveryHttpError) as caught:
            await task
        assert caught.value.outcome == "not_started"
        assert caught.value.retryable is True

    assert client.portal is not None
    client.portal.call(scenario)
    assert requests == []
    assert client.app.state.email_delivery_admission_slots._value == 4
    assert client.app.state.email_delivery_waiter_slots._value == deliveries.DELIVERY_WAITER_LIMIT


def test_real_provider_cancellation_releases_capacity_and_reuses_identity(
    client: TestClient,
) -> None:
    requests: list[httpx.Request] = []
    entered: asyncio.Event

    async def slow_response(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        entered.set()
        await asyncio.Event().wait()
        return httpx.Response(200, json={"id": "provider-late"})

    _configure(client, httpx.MockTransport(slow_response))
    draft_id = _outreach_draft(client, "Deadline", approved=True)

    async def cancel_after_provider_entry() -> None:
        nonlocal entered
        entered = asyncio.Event()
        task = asyncio.create_task(
            deliveries.deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=[draft_id]),
                SimpleNamespace(app=client.app),  # type: ignore[arg-type]
                "ingest-secret",
            )
        )
        await entered.wait()
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    assert client.portal is not None
    client.portal.call(cancel_after_provider_entry)
    assert client.app.state.email_delivery_admission_slots._value == 4
    assert client.app.state.email_delivery_attempts[draft_id].state == "unknown"
    first_key = requests[0].headers["Idempotency-Key"]

    async def accepted(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": "provider-retry"})

    client.app.state.email_delivery_client._transport = httpx.MockTransport(accepted)
    retry = _batch(client, [draft_id])

    assert retry.json()["results"][0]["outcome"] == "sent"
    assert len(requests) == 2
    assert requests[1].headers["Idempotency-Key"] == first_key


def test_disconnect_checker_failure_isolated_to_its_item(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})))
    ids = [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
    ]
    checks = 0
    delivered_ids: list[str] = []

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            nonlocal checks
            checks += 1
            if checks == 1:
                raise RuntimeError("disconnect checker failed")
            return False

    async def delivered(draft_id, _request, _may_start=None, _on_cancel=None):
        delivered_ids.append(str(draft_id))
        return EmailDeliveryReceipt(
            draft_id=str(draft_id),
            provider_message_id=f"provider-{draft_id}",
            idempotency_key=f"key-{draft_id}",
        )

    monkeypatch.setattr(deliveries, "_deliver_draft", delivered)

    response = asyncio.run(
        deliveries.deliver_draft_batch(
            deliveries.BatchDeliveryRequest(draft_ids=ids),
            RequestStub(),  # type: ignore[arg-type]
            "ingest-secret",
        )
    )

    assert [item.outcome for item in response.results] == ["not_started", "sent"]
    assert response.results[0].retryable is True
    assert response.results[0].reconciliation_required is False
    assert response.unknown_count == 0
    assert delivered_ids == [ids[1]]
    assert "disconnect checker failed" not in response.model_dump_json()
    assert "Could not check batch connection" in caplog.text


def test_expired_ambiguous_item_is_unconfirmed_and_not_resent(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def ambiguous(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("ambiguous", request=request)

    _configure(client, httpx.MockTransport(ambiguous))
    draft_id = _outreach_draft(client, "Expired", approved=True)
    assert _batch(client, [draft_id]).json()["results"][0]["outcome"] == "unknown"
    attempt = client.app.state.email_delivery_attempts[draft_id]
    client.app.state.email_delivery_attempts[draft_id] = attempt.model_copy(
        update={"first_attempt_at": attempt.first_attempt_at - deliveries.DELIVERY_RETRY_WINDOW}
    )

    retry = _batch(client, [draft_id]).json()

    assert retry["confirmed_sent_count"] == 0
    assert retry["unconfirmed_count"] == 1
    assert retry["unknown_count"] == 0
    assert retry["results"][0]["outcome"] == "not_deliverable"
    assert retry["results"][0]["retryable"] is False
    assert retry["results"][0]["reconciliation_required"] is True
    assert "reconcile" in retry["results"][0]["detail"]
    assert len(requests) == 1


def test_ambiguous_retry_crossing_cutoff_before_provider_is_blocked(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []

    def ambiguous(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("ambiguous", request=request)

    _configure(client, httpx.MockTransport(ambiguous))
    draft_id = _outreach_draft(client, "CutoffDuringStart", approved=True)
    assert _batch(client, [draft_id]).json()["results"][0]["outcome"] == "unknown"
    attempt = client.app.state.email_delivery_attempts[draft_id]
    client.app.state.email_delivery_attempts[draft_id] = attempt.model_copy(
        update={"first_attempt_at": datetime.now(UTC)}
    )
    real_start = deliveries._start_submission

    async def delayed_start(*args, **kwargs):
        await asyncio.sleep(0.06)
        return await real_start(*args, **kwargs)

    monkeypatch.setattr(deliveries, "DELIVERY_RETRY_WINDOW", timedelta(milliseconds=50))
    monkeypatch.setattr(deliveries, "_start_submission", delayed_start)
    retry = _batch(client, [draft_id]).json()["results"][0]

    assert retry["outcome"] == "not_deliverable"
    assert retry["retryable"] is False
    assert retry["reconciliation_required"] is True
    assert len(requests) == 1


def test_batch_deadline_during_claim_does_not_reach_provider_and_recovers(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "sent"})
        ),
    )
    draft_id = _outreach_draft(client, "ClaimDeadline", approved=True)
    real_claim = deliveries._claim

    async def blocked_claim(*_args, **_kwargs):
        await asyncio.Event().wait()

    monkeypatch.setattr(deliveries, "_claim", blocked_claim)
    monkeypatch.setattr(deliveries, "BATCH_DELIVERY_TOTAL_SECONDS", 0.01)
    timed_out = _batch(client, [draft_id]).json()

    assert timed_out["results"][0]["outcome"] == "unknown"
    assert requests == []
    assert client.app.state.email_delivery_admission_slots._value == 4

    monkeypatch.setattr(deliveries, "_claim", real_claim)
    monkeypatch.setattr(deliveries, "BATCH_DELIVERY_TOTAL_SECONDS", 50)
    recovered = _batch(client, [draft_id]).json()

    assert recovered["results"][0]["outcome"] == "sent"
    assert len(requests) == 1


def test_disconnect_during_claim_stops_before_provider_and_releases_claim(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "ClaimDisconnect", approved=True)
    real_claim = deliveries._claim
    claim_entered: asyncio.Event
    release_claim: asyncio.Event
    disconnected = False

    async def blocked_claim(*args, **kwargs):
        claim_entered.set()
        await release_claim.wait()
        return await real_claim(*args, **kwargs)

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            return disconnected

    monkeypatch.setattr(deliveries, "_claim", blocked_claim)

    async def scenario():
        nonlocal claim_entered, release_claim, disconnected
        claim_entered = asyncio.Event()
        release_claim = asyncio.Event()
        task = asyncio.create_task(
            deliveries._deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=[draft_id]),
                RequestStub(),  # type: ignore[arg-type]
            )
        )
        await claim_entered.wait()
        disconnected = True
        release_claim.set()
        return await task

    assert client.portal is not None
    response = client.portal.call(scenario)

    assert response.results[0].outcome == "not_started"
    assert response.results[0].retryable is True
    assert requests == []
    assert draft_id not in client.app.state.email_delivery_attempts
    assert client.app.state.email_delivery_admission_slots._value == 4

    disconnected = False
    monkeypatch.setattr(deliveries, "_claim", real_claim)
    retry = _batch(client, [draft_id]).json()

    assert retry["results"][0]["outcome"] == "sent"
    assert len(requests) == 1


def test_disconnect_during_submission_transition_is_rechecked_before_provider(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "StartDisconnect", approved=True)
    real_start = deliveries._start_submission
    start_entered: asyncio.Event
    release_start: asyncio.Event
    disconnected = False

    async def blocked_start(*args, **kwargs):
        start_entered.set()
        await release_start.wait()
        return await real_start(*args, **kwargs)

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            return disconnected

    monkeypatch.setattr(deliveries, "_start_submission", blocked_start)

    async def scenario():
        nonlocal start_entered, release_start, disconnected
        start_entered = asyncio.Event()
        release_start = asyncio.Event()
        task = asyncio.create_task(
            deliveries._deliver_draft_batch(
                deliveries.BatchDeliveryRequest(draft_ids=[draft_id]),
                RequestStub(),  # type: ignore[arg-type]
            )
        )
        await start_entered.wait()
        disconnected = True
        release_start.set()
        return await task

    assert client.portal is not None
    response = client.portal.call(scenario)

    assert response.results[0].outcome == "not_started"
    assert requests == []
    assert draft_id not in client.app.state.email_delivery_attempts


def test_lost_submission_transition_response_rolls_back_before_provider(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "LostStartResponse", approved=True)
    real_start = deliveries._start_submission

    async def committed_then_failed(*args, **kwargs):
        await real_start(*args, **kwargs)
        raise deliveries.DeliveryHttpError(
            status_code=503,
            detail="ledger response lost",
            outcome="unavailable",
            retryable=True,
        )

    monkeypatch.setattr(deliveries, "_start_submission", committed_then_failed)
    response = _batch(client, [draft_id]).json()

    assert response["results"][0]["outcome"] == "unavailable"
    assert requests == []
    assert draft_id not in client.app.state.email_delivery_attempts


def test_draft_change_between_claim_and_submission_is_not_sent(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "ChangedAfterClaim", approved=True)
    real_start = deliveries._start_submission

    async def mutate_then_start(*args, **kwargs):
        client.app.state.icp_leads_store.drafts[draft_id]["subject"] = "Changed after approval"
        return await real_start(*args, **kwargs)

    monkeypatch.setattr(deliveries, "_start_submission", mutate_then_start)
    response = _batch(client, [draft_id]).json()["results"][0]

    assert response["outcome"] == "not_deliverable"
    assert requests == []
    assert draft_id not in client.app.state.email_delivery_attempts


def test_draft_change_during_final_disconnect_check_is_not_sent(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "ChangedDuringCheck", approved=True)
    checks = 0

    class RequestStub:
        app = client.app

        async def is_disconnected(self) -> bool:
            nonlocal checks
            checks += 1
            if checks == 4:
                client.app.state.icp_leads_store.drafts[draft_id]["body"] = "Changed body"
            return False

    async def scenario():
        return await deliveries._deliver_draft_batch(
            deliveries.BatchDeliveryRequest(draft_ids=[draft_id]),
            RequestStub(),  # type: ignore[arg-type]
        )

    assert client.portal is not None
    response = client.portal.call(scenario)

    assert response.results[0].outcome == "not_deliverable"
    assert requests == []
    assert draft_id not in client.app.state.email_delivery_attempts


def test_stale_unsubmitted_reservation_does_not_expire(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request)
            or httpx.Response(200, json={"id": "reserved-sent"})
        ),
    )
    draft_id = _outreach_draft(client, "StaleReservation", approved=True)

    async def reserve_only() -> None:
        draft = await deliveries._load(SimpleNamespace(app=client.app), UUID(draft_id))
        assert draft is not None
        payload = deliveries.EmailDeliveryPayload(
            draft_id=draft_id,
            recipient_email=draft.recipient_email,
            subject=draft.subject,
            body=draft.body,
        )
        await deliveries._claim(
            SimpleNamespace(app=client.app),  # type: ignore[arg-type]
            draft,
            payload,
            client.app.state.settings.resend_from,
            UUID("00000000-0000-0000-0000-000000000099"),
        )

    assert client.portal is not None
    client.portal.call(reserve_only)
    attempt = client.app.state.email_delivery_attempts[draft_id]
    client.app.state.email_delivery_attempts[draft_id] = attempt.model_copy(
        update={"first_attempt_at": attempt.first_attempt_at - deliveries.DELIVERY_RETRY_WINDOW}
    )
    client.app.state.icp_leads_store.drafts[draft_id]["subject"] = "Corrected before submission"

    response = _batch(client, [draft_id]).json()

    assert response["results"][0]["outcome"] == "sent"
    assert len(requests) == 1
    assert json.loads(requests[0].read())["subject"] == "Corrected before submission"
    assert (
        client.app.state.email_delivery_attempts[draft_id].first_attempt_at
        > attempt.first_attempt_at
    )


def test_batch_deadline_after_acceptance_reuses_identity_during_persistence_retry(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []

    def accepted(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": "provider-accepted"})

    _configure(client, httpx.MockTransport(accepted))
    draft_id = _outreach_draft(client, "PersistDeadline", approved=True)
    real_complete = deliveries._complete

    async def blocked_complete(*_args, **_kwargs):
        await asyncio.Event().wait()

    monkeypatch.setattr(deliveries, "_complete", blocked_complete)
    monkeypatch.setattr(deliveries, "BATCH_DELIVERY_TOTAL_SECONDS", 0.1)
    timed_out = _batch(client, [draft_id]).json()

    assert timed_out["results"][0]["outcome"] == "unknown"
    assert len(requests) == 1
    first_key = requests[0].headers["Idempotency-Key"]
    assert client.app.state.email_delivery_attempts[draft_id].state == "unknown"
    assert client.app.state.email_delivery_admission_slots._value == 4

    monkeypatch.setattr(deliveries, "_complete", real_complete)
    monkeypatch.setattr(deliveries, "BATCH_DELIVERY_TOTAL_SECONDS", 50)
    recovered = _batch(client, [draft_id]).json()

    assert recovered["results"][0]["outcome"] == "sent"
    assert len(requests) == 2
    assert requests[1].headers["Idempotency-Key"] == first_key


def test_overlapping_batches_respect_global_admission_and_recover(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    four_entered = Event()
    release = Event()

    async def controlled(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 4:
            four_entered.set()
        if not await asyncio.to_thread(release.wait, 3):
            raise RuntimeError("test release timed out")
        recipient = json.loads(request.read())["to"][0]
        return httpx.Response(200, json={"id": f"provider-{recipient}"})

    _configure(client, httpx.MockTransport(controlled))
    ids: list[str] = []
    buckets: set[int] = set()
    for number in range(30):
        draft_id = _outreach_draft(client, f"Saturate{number}", approved=True)
        bucket = UUID(draft_id).int % len(client.app.state.email_delivery_gate_locks)
        if bucket not in buckets:
            buckets.add(bucket)
            ids.append(draft_id)
        if len(ids) == 6:
            break
    assert len(ids) == 6

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(_batch, client, ids[index : index + 2])
            for index in range(0, 6, 2)
        ]
        try:
            assert four_entered.wait(timeout=2)
            deadline = time.monotonic() + 2
            while not any(future.done() for future in futures):
                assert time.monotonic() < deadline
                time.sleep(0.01)
            assert len(requests) == 4
            assert client.app.state.email_delivery_admission_slots._value == 0
        finally:
            release.set()
        responses = [future.result(timeout=3).json() for future in futures]

    outcomes = [item["outcome"] for response in responses for item in response["results"]]
    assert outcomes.count("sent") == 4
    assert outcomes.count("busy") == 2
    assert all(
        item["retryable"] is True
        for response in responses
        for item in response["results"]
        if item["outcome"] == "busy"
    )
    assert len(requests) == 4
    assert client.app.state.email_delivery_admission_slots._value == 4


def test_delivery_waiter_admission_fails_fast_before_gate_or_provider(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "WaiterCapacity", approved=True)
    client.app.state.email_delivery_waiter_slots = asyncio.Semaphore(0)

    response = _single(client, draft_id)

    assert response.status_code == 429
    assert response.json() == {
        "detail": "Email delivery request capacity is busy; retry this exact draft"
    }
    assert requests == []
    assert client.app.state.email_delivery_admission_slots._value == 4


def test_batch_request_admission_fails_before_creating_workers(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "BatchCapacity", approved=True)
    client.app.state.email_delivery_batch_slots = asyncio.Semaphore(0)

    response = _batch(client, [draft_id])

    assert response.status_code == 429
    assert response.json() == {
        "detail": "Batch delivery request capacity is busy; retry this batch later"
    }
    assert requests == []
    assert client.app.state.email_delivery_waiter_slots._value == deliveries.DELIVERY_WAITER_LIMIT


def test_gate_wait_and_provider_share_one_delivery_deadline(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []

    async def slow_provider(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={"id": "too-late"})

    _configure(client, httpx.MockTransport(slow_provider))
    draft_id = _outreach_draft(client, "SharedDeadline", approved=True)
    monkeypatch.setattr(deliveries, "DELIVERY_TOTAL_SECONDS", 0.06)

    async def scenario() -> tuple[int, str, float]:
        gate = client.app.state.email_delivery_gate_locks[
            UUID(draft_id).int % len(client.app.state.email_delivery_gate_locks)
        ]
        await gate.acquire()
        started_at = time.monotonic()
        task = asyncio.create_task(
            deliveries._deliver_draft(UUID(draft_id), SimpleNamespace(app=client.app))
        )
        await asyncio.sleep(0.03)
        gate.release()
        try:
            await task
        except deliveries.DeliveryHttpError as error:
            return error.status_code, str(error.detail), time.monotonic() - started_at
        raise AssertionError("delivery unexpectedly received a fresh post-gate deadline")

    assert client.portal is not None
    status_code, detail, elapsed = client.portal.call(scenario)

    assert status_code == 504
    assert detail == "The email delivery outcome is unknown"
    assert len(requests) == 1
    assert elapsed < 0.1
    assert client.app.state.email_delivery_waiter_slots._value == deliveries.DELIVERY_WAITER_LIMIT
    assert client.app.state.email_delivery_admission_slots._value == 4


def test_delivery_deadline_can_expire_in_admission_without_provider_request(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    _configure(
        client,
        httpx.MockTransport(
            lambda request: requests.append(request) or httpx.Response(200, json={"id": "x"})
        ),
    )
    draft_id = _outreach_draft(client, "AdmissionDeadline", approved=True)
    client.app.state.email_delivery_admission_slots = asyncio.Semaphore(0)
    monkeypatch.setattr(deliveries, "DELIVERY_TOTAL_SECONDS", 0.02)

    started_at = time.monotonic()
    response = _single(client, draft_id)
    elapsed = time.monotonic() - started_at

    assert response.status_code == 429
    assert response.json() == {
        "detail": "Email delivery capacity is busy; retry this exact draft"
    }
    assert requests == []
    assert elapsed < 0.15
    assert client.app.state.email_delivery_waiter_slots._value == deliveries.DELIVERY_WAITER_LIMIT


def test_overlapping_batch_and_single_send_share_the_draft_lock(client: TestClient) -> None:
    requests: list[httpx.Request] = []
    entered = Event()
    release = Event()

    async def controlled(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        entered.set()
        if not await asyncio.to_thread(release.wait, 2):
            raise RuntimeError("test release timed out")
        return httpx.Response(200, json={"id": "provider-shared"})

    _configure(client, httpx.MockTransport(controlled))
    draft_id = _outreach_draft(client, "Overlap", approved=True)

    with ThreadPoolExecutor(max_workers=2) as executor:
        batch_future = executor.submit(_batch, client, [draft_id])
        try:
            assert entered.wait(timeout=2)
            single_future = executor.submit(_single, client, draft_id)
            time.sleep(0.05)
            assert not single_future.done()
            assert client.app.state.email_delivery_admission_slots._value == 3
        finally:
            release.set()
        batch_response = batch_future.result(timeout=2)
        single_response = single_future.result(timeout=2)

    assert batch_response.status_code == 200
    assert single_response.status_code == 200
    assert batch_response.json()["results"][0]["receipt"] == single_response.json()
    assert len(requests) == 1
