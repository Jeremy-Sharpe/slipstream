import asyncio
import hashlib
import hmac
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr


def _configure(client: TestClient, responder: httpx.MockTransport) -> None:
    client.app.state.settings.crm_webhook_url = "https://crm.example.test/slipstream"
    client.app.state.settings.crm_webhook_secret = SecretStr("s" * 32)
    client.app.state.settings.ingest_token = SecretStr("ingest-secret")
    client.app.state.crm_webhook_client._transport = responder


def _extracted_call(client: TestClient) -> str:
    call = client.post("/api/v1/calls/fixtures/call-13-marlowe-finch-demo/ingest").json()
    response = client.post(f"/api/v1/calls/{call['id']}/extract")
    assert response.status_code == 200
    return call["id"]


def test_crm_sync_is_signed_scoped_and_idempotent(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(202, headers={"X-Request-Id": "crm-request-1"})

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)

    unauthorised = client.post(f"/api/v1/calls/{call_id}/crm-sync")
    first = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )
    second = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )

    assert unauthorised.status_code == 401
    assert first.status_code == 200
    assert second.json() == first.json()
    assert len(requests) == 1
    assert first.json() == {
        "conversation_id": call_id,
        "status": "delivered",
        "target_host": "crm.example.test",
        "idempotency_key": requests[0].headers["Idempotency-Key"],
        "provider_request_id": "crm-request-1",
    }

    body = requests[0].read()
    payload = json.loads(body)
    assert payload["schema_version"] == "2026-09-13"
    assert payload["event"] == "conversation.crm_update.requested"
    assert payload["conversation_id"] == call_id
    assert payload["contact"]["email"] == "donnie@marlowefinch.example"
    assert payload["company"]["name"] == "Marlowe & Finch Accounting"
    assert payload["deal"]["amount"] == 48600
    assert payload["deal"]["next_step_due_date"] == "2026-09-11"
    assert "transcript" not in body.decode().lower()
    assert "evidence" not in body.decode().lower()
    assert "promises" not in payload
    assert "objections" not in payload

    signed_message = requests[0].headers["Idempotency-Key"].encode() + b"." + body
    expected_signature = hmac.new(b"s" * 32, signed_message, hashlib.sha256).hexdigest()
    assert requests[0].headers["X-Slipstream-Signature"] == f"sha256={expected_signature}"
    assert requests[0].headers["X-Slipstream-Schema"] == "2026-09-13"

    forged_key = requests[0].headers["Idempotency-Key"] + "-replay"
    forged_message = forged_key.encode() + b"." + body
    forged_signature = hmac.new(b"s" * 32, forged_message, hashlib.sha256).hexdigest()
    assert forged_signature != expected_signature


def test_corrected_extraction_gets_a_new_delivery_identity(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(202)

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)
    headers = {"X-Slipstream-Ingest-Token": "ingest-secret"}

    first = client.post(f"/api/v1/calls/{call_id}/crm-sync", headers=headers)
    client.app.state.extraction_store[call_id].summary = "A corrected, still grounded CRM summary."
    second = client.post(f"/api/v1/calls/{call_id}/crm-sync", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(requests) == 2
    assert first.json()["idempotency_key"] != second.json()["idempotency_key"]


def test_crm_sync_has_fail_fast_admission(client: TestClient) -> None:
    _configure(client, httpx.MockTransport(lambda _: httpx.Response(202)))
    call_id = _extracted_call(client)
    client.app.state.crm_sync_admission_slots = asyncio.Semaphore(0)

    response = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )

    assert response.status_code == 429
    assert response.json() == {"detail": "CRM sync capacity is busy; retry this exact update"}


def test_crm_sync_enforces_an_overall_deadline(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def respond(_: httpx.Request) -> httpx.Response:
        await asyncio.sleep(1)
        return httpx.Response(202)

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)
    monkeypatch.setattr("app.routers.crm.CRM_SYNC_TOTAL_SECONDS", 0.01)

    response = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )

    assert response.status_code == 504
    assert response.json() == {"detail": "The CRM delivery outcome is unknown"}


def test_dropped_response_is_ambiguous_and_retry_identity_is_stable(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        raise httpx.ReadError("receiver committed, then dropped the connection", request=request)

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)
    headers = {"X-Slipstream-Ingest-Token": "ingest-secret"}

    first = client.post(f"/api/v1/calls/{call_id}/crm-sync", headers=headers)
    second = client.post(f"/api/v1/calls/{call_id}/crm-sync", headers=headers)

    assert first.status_code == 504
    assert second.status_code == 504
    assert first.json() == {"detail": "The CRM delivery outcome is unknown"}
    assert len(requests) == 2
    assert requests[0].headers["Idempotency-Key"] == requests[1].headers["Idempotency-Key"]
    assert client.app.state.crm_sync_admission_slots._value == 4


def test_crm_sync_fails_closed_and_hides_provider_details(client: TestClient) -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="private CRM stack trace and customer token")

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)

    response = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "The CRM update could not be delivered"}
    assert "private" not in response.text


def test_crm_sync_rejects_oversized_fields_without_delivery(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(202)

    _configure(client, httpx.MockTransport(respond))
    call_id = _extracted_call(client)
    client.app.state.extraction_store[call_id].contact.name.value = "x" * 201

    response = client.post(
        f"/api/v1/calls/{call_id}/crm-sync",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "The extracted fields do not fit the CRM delivery contract"
    }
    assert requests == []


def test_crm_sync_reports_missing_configuration_before_data_lookup(client: TestClient) -> None:
    response = client.post("/api/v1/calls/00000000-0000-0000-0000-000000000000/crm-sync")

    assert response.status_code == 503
    assert response.json() == {"detail": "CRM webhook integration is not configured"}
