from __future__ import annotations

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Event
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.routers import campaigns
from app.schemas.leads import LeadIn
from app.services.campaigns import InMemoryCampaignStore, new_campaign_id
from app.services.outreach import approve_outreach


def _configure(client: TestClient, responder: httpx.MockTransport | None = None) -> None:
    client.app.state.settings.ingest_token = SecretStr("ingest-secret")
    if responder is not None:
        client.app.state.settings.resend_api_key = SecretStr("re_test_secret")
        client.app.state.settings.resend_from = "Slipstream <sales@example.com>"
        client.app.state.settings.resend_base_url = "https://api.resend.test"
        client.app.state.email_delivery_client._transport = responder


def _approved_draft(client: TestClient, suffix: str) -> str:
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(
        LeadIn(
            company_name=f"Campaign {suffix}",
            person_name=f"Casey {suffix}",
            email=f"casey-{suffix.lower()}@example.com",
            origami_row_id=f"campaign-{suffix}",
        )
    )
    draft = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "recipient_name": lead.person_name,
            "recipient_email": lead.email,
            "subject": f"A note for {suffix}",
            "body": f"Hi Casey,\n\nA useful note for {suffix}.\n\nSam",
            "status": "draft",
        }
    )
    approve_outreach(store, draft_id=str(draft.id), actor="anna")
    return str(draft.id)


def _create(
    client: TestClient,
    draft_ids: list[str],
    *,
    campaign_id: str | None = None,
    scheduled_for: datetime | None = None,
    token: str = "ingest-secret",
):
    return client.post(
        "/api/v1/campaigns",
        headers={"X-Slipstream-Ingest-Token": token},
        json={
            "campaign_id": campaign_id or str(uuid4()),
            "name": "September signal follow-up",
            "created_by": "anna",
            "scheduled_for": (scheduled_for or datetime.now(UTC)).isoformat(),
            "draft_ids": draft_ids,
        },
    )


def _run(client: TestClient, campaign_id: str, *, limit: int = 8):
    return client.post(
        "/api/v1/campaigns/run-due",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
        json={"campaign_id": campaign_id, "limit": limit},
    )


def test_campaign_create_is_authenticated_exact_and_idempotent(client: TestClient) -> None:
    _configure(client)
    first = _approved_draft(client, "One")
    second = _approved_draft(client, "Two")
    campaign_id = str(uuid4())
    scheduled_for = datetime.now(UTC) - timedelta(minutes=1)

    unauthorized = _create(
        client,
        [first, second],
        campaign_id=campaign_id,
        scheduled_for=scheduled_for,
        token="wrong",
    )
    created = _create(client, [first, second], campaign_id=campaign_id, scheduled_for=scheduled_for)
    repeated = _create(
        client, [first, second], campaign_id=campaign_id, scheduled_for=scheduled_for
    )

    assert unauthorized.status_code == 401
    assert created.status_code == 201
    assert repeated.status_code == 201
    assert repeated.json() == created.json()
    assert [item["draft_id"] for item in created.json()["items"]] == [first, second]
    assert created.json()["counts"]["queued"] == 2
    assert created.json()["status"] == "scheduled"

    conflicting = client.post(
        "/api/v1/campaigns",
        headers={"X-Slipstream-Ingest-Token": "ingest-secret"},
        json={
            "campaign_id": campaign_id,
            "name": "A different campaign",
            "created_by": "anna",
            "scheduled_for": scheduled_for.isoformat(),
            "draft_ids": [first, second],
        },
    )
    assert conflicting.status_code == 409


def test_campaign_rejects_unapproved_duplicate_and_missing_drafts(client: TestClient) -> None:
    _configure(client)
    approved = _approved_draft(client, "Approved")
    unapproved = _approved_draft(client, "Unapproved")
    row = client.app.state.icp_leads_store.drafts[unapproved]
    row["status"] = "draft"

    duplicate = _create(client, [approved, approved])
    review = _create(client, [unapproved])
    missing = _create(client, [str(uuid4())])

    assert duplicate.status_code == 422
    assert review.status_code == 409
    assert missing.status_code == 404
    assert client.get("/api/v1/campaigns").json() == []


def test_campaign_public_reads_expose_status_without_delivery_token(client: TestClient) -> None:
    _configure(client)
    draft_id = _approved_draft(client, "Readable")
    created = _create(client, [draft_id]).json()

    listed = client.get("/api/v1/campaigns")
    detail = client.get(f"/api/v1/campaigns/{created['id']}")

    assert listed.status_code == 200
    assert [campaign["id"] for campaign in listed.json()] == [created["id"]]
    assert detail.json() == created
    assert "ingest" not in detail.text.lower()


def test_due_campaign_runs_in_bounded_resumable_chunks(client: TestClient) -> None:
    requests: list[httpx.Request] = []

    def accepted(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        recipient = json.loads(request.read())["to"][0]
        return httpx.Response(200, json={"id": f"provider-{recipient}"})

    _configure(client, httpx.MockTransport(accepted))
    draft_ids = [_approved_draft(client, str(index)) for index in range(10)]
    campaign = _create(
        client, draft_ids, scheduled_for=datetime.now(UTC) - timedelta(minutes=1)
    ).json()

    first = _run(client, campaign["id"])
    second = _run(client, campaign["id"])
    empty = _run(client, campaign["id"])

    assert first.status_code == 200
    assert first.json()["claimed_count"] == 8
    assert first.json()["campaign"]["status"] == "scheduled"
    assert first.json()["campaign"]["counts"]["sent"] == 8
    assert second.json()["claimed_count"] == 2
    assert second.json()["campaign"]["status"] == "completed"
    assert second.json()["campaign"]["counts"]["sent"] == 10
    assert empty.json() == {"claimed_count": 0, "campaign": None}
    assert len(requests) == 10


def test_retryable_campaign_item_keeps_exact_provider_identity(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []

    def flaky(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 1:
            raise httpx.ReadError("response lost", request=request)
        return httpx.Response(200, json={"id": "provider-recovered"})

    _configure(client, httpx.MockTransport(flaky))
    monkeypatch.setattr(campaigns, "CAMPAIGN_RETRY_DELAY", timedelta(0))
    draft_id = _approved_draft(client, "Retry")
    campaign = _create(
        client, [draft_id], scheduled_for=datetime.now(UTC) - timedelta(minutes=1)
    ).json()

    first = _run(client, campaign["id"]).json()
    replay = _create(
        client,
        [draft_id],
        campaign_id=campaign["id"],
        scheduled_for=datetime.fromisoformat(campaign["scheduled_for"]),
    )
    second = _run(client, campaign["id"]).json()

    assert first["campaign"]["counts"]["retryable"] == 1
    assert first["campaign"]["items"][0]["reconciliation_required"] is True
    assert replay.status_code == 201
    assert second["campaign"]["status"] == "completed"
    assert second["campaign"]["counts"]["sent"] == 1
    assert len(requests) == 2
    assert requests[0].headers["Idempotency-Key"] == requests[1].headers["Idempotency-Key"]


def test_scheduler_fails_closed_before_claim_when_delivery_is_unconfigured(
    client: TestClient,
) -> None:
    _configure(client)
    draft_id = _approved_draft(client, "Unconfigured")
    campaign = _create(
        client, [draft_id], scheduled_for=datetime.now(UTC) - timedelta(minutes=1)
    ).json()

    response = _run(client, campaign["id"])
    stored = client.get(f"/api/v1/campaigns/{campaign['id']}").json()

    assert response.status_code == 503
    assert response.json() == {"detail": "Email delivery integration is not configured"}
    assert stored["status"] == "scheduled"
    assert stored["items"][0]["state"] == "queued"


def test_scheduler_requires_server_token_before_inspecting_due_work(
    client: TestClient,
) -> None:
    _configure(client)
    response = client.post(
        "/api/v1/campaigns/run-due",
        headers={"X-Slipstream-Ingest-Token": "wrong"},
        json={},
    )
    assert response.status_code == 401


def test_campaign_list_is_bounded(client: TestClient) -> None:
    _configure(client)
    for suffix in ("Old", "Middle", "New"):
        assert _create(client, [_approved_draft(client, suffix)]).status_code == 201

    response = client.get("/api/v1/campaigns?limit=2")

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["name"] == "September signal follow-up"
    assert client.get("/api/v1/campaigns?limit=101").status_code == 422


def test_store_timeout_keeps_capacity_until_blocking_work_finishes(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    entered = Event()
    release = Event()

    def blocked_list(**_kwargs):
        entered.set()
        release.wait(2)
        return []

    client.app.state.campaign_store.list = blocked_list
    client.app.state.campaign_store_slots = asyncio.Semaphore(1)
    monkeypatch.setattr(campaigns, "CAMPAIGN_STORE_SECONDS", 0.01)

    first = client.get("/api/v1/campaigns")
    assert entered.is_set()
    second = client.get("/api/v1/campaigns")

    assert first.status_code == 503
    assert second.status_code == 429
    release.set()


def test_memory_store_preserves_future_retry_and_exclusive_claim() -> None:
    store = InMemoryCampaignStore()
    campaign_id = new_campaign_id()
    draft_id = new_campaign_id()
    first_owner = new_campaign_id()
    store.create(
        campaign_id=campaign_id,
        name="Lease contract",
        scheduled_for=datetime.now(UTC) - timedelta(minutes=1),
        created_by="test",
        draft_ids=[draft_id],
    )

    with ThreadPoolExecutor(max_workers=2) as executor:
        claims = list(
            executor.map(
                lambda owner: store.claim_due(owner=owner, limit=1, campaign_id=campaign_id),
                [first_owner, new_campaign_id()],
            )
        )

    claim = next(item for item in claims if item is not None)
    assert sum(item is not None for item in claims) == 1
    retry_at = datetime.now(UTC) + timedelta(minutes=5)
    stored = store.record(
        campaign_id=campaign_id,
        owner=claim.owner,
        results=[
            campaigns.CampaignItemResult(
                draft_id=draft_id,
                state="retryable",
                outcome="unknown",
                http_status=504,
                retryable=True,
                reconciliation_required=True,
                next_attempt_at=retry_at,
            )
        ],
    )

    assert store.claim_due(owner=new_campaign_id(), limit=1, campaign_id=campaign_id) is None
    scheduled = store.get(campaign_id)
    assert scheduled is not None
    assert scheduled.status == "scheduled"
    assert scheduled.scheduled_for == retry_at
    assert stored.requested_scheduled_for < retry_at
