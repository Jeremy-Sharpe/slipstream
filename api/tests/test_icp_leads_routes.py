from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.factory import create_app
from app.schemas.icp import IcpProfile
from app.schemas.leads import LeadIn
from app.schemas.origami import Job
from app.services.icp import cohort_revision, evidence_inventory


def test_icp_derive_returns_503_with_missing_integration(client: TestClient) -> None:
    response = client.post("/icp/derive", json={"include_demo": False})

    assert response.status_code == 503
    assert "embeddings" in response.json()["detail"]


def test_icp_evidence_inventory_is_keyless_and_becomes_ready(client: TestClient) -> None:
    assert client.get("/api/v1/icp/evidence").json()["ready_to_derive"] is False

    loaded = client.post("/api/v1/icp/history/load")
    inventory = client.get("/api/v1/icp/evidence")

    assert loaded.status_code == 200
    assert inventory.status_code == 200
    assert inventory.json() == {
        "deals": 12,
        "calls": 12,
        "emails": 1,
        "outcome_labelled": 11,
        "won_deals": 5,
        "contrast_deals": 6,
        "active_deals": 1,
        "ready_to_derive": True,
    }


def test_icp_freshness_requires_a_profile(client: TestClient) -> None:
    response = client.get("/api/v1/icp/freshness")

    assert response.status_code == 404
    assert response.json()["detail"] == "No ready ICP profile found"


def test_icp_freshness_exposes_current_revenue_dna_and_lead_version(client: TestClient) -> None:
    client.post("/api/v1/icp/history/load")
    store = client.app.state.icp_leads_store
    deals = store.list_icp_deals()
    inventory = evidence_inventory(store)
    profile = store.insert_icp_profile(
        version=2,
        profile=IcpProfile(
            summary="Best-fit services firms",
            industries=["Professional services"],
            headcount_band="25-80",
            roles=["Managing Partner"],
            triggers=["Compliance"],
            disqualifiers=[],
            evidence=[],
            confidence=0.8,
            origami_brief="Find similar firms.",
            source_summary=inventory,
            cohort_revision=cohort_revision(deals),
        ),
        model="openai/gpt-5.4",
        embedding_model="text-embedding-3-small",
    )
    store.upsert_lead(
        LeadIn(
            company_name="Fictional Match",
            origami_row_id="demo:freshness-route",
            icp_profile_id=profile.id,
        )
    )

    response = client.get("/api/v1/icp/freshness")

    assert response.status_code == 200
    assert response.json() == {
        "profile_id": str(profile.id),
        "profile_version": 2,
        "status": "current",
        "derived_cohort_revision": cohort_revision(deals),
        "current_cohort_revision": cohort_revision(deals),
        "source_summary": {
            "deals": 12,
            "calls": 12,
            "emails": 1,
            "outcome_labelled": 11,
        },
        "deals_added": 0,
        "outcome_labels_added": 0,
        "leads_on_profile": 1,
        "leads_needing_rescore": 0,
        "reason": "Revenue DNA is current: every eligible CRM outcome is reflected in this ICP.",
    }


def test_latest_icp_includes_bounded_source_call_refs(client: TestClient) -> None:
    store = client.app.state.icp_leads_store
    deal = store.upsert_deal(
        {
            "crm_external_id": "live:northstar",
            "company_name": "Northstar Legal",
            "name": "Northstar renewal",
            "stage": "closed_won",
            "outcome": "won",
            "interactions": [
                {
                    "source_external_id": "call-01-northstar-labs",
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-12T10:00:00Z",
                    "subject": "Discovery call",
                    "content": "Private transcript content is not returned in the source ref.",
                },
                {
                    "source_external_id": "call-02-arcwell-health",
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-12T10:30:00Z",
                    "subject": "Follow-up call",
                    "content": "A second canonical call is retained.",
                },
                {
                    "source_external_id": "call-01-northstar-labs",
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-12T10:45:00Z",
                    "subject": "Duplicate import",
                    "content": "Duplicate source identifiers collapse.",
                },
                {
                    "source_external_id": "x" * 201,
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-12T10:50:00Z",
                    "subject": "Oversized identifier",
                    "content": "Oversized identifiers are omitted.",
                },
            ],
        }
    )
    private_title_deal = store.upsert_deal(
        {
            "crm_external_id": "live:private-title",
            "name": "Renewal for Jane Citizen after acquisition",
            "stage": "closed_won",
            "outcome": "won",
            "interactions": [
                {
                    "source_external_id": "crm-call-not-in-slipstream",
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-12T11:00:00Z",
                    "subject": "Renewal",
                    "content": "Private source",
                }
            ],
        }
    )
    uncited_deal = store.upsert_deal(
        {
            "crm_external_id": "live:uncited",
            "company_name": "Uncited Company",
            "name": "Uncited deal",
            "stage": "closed_won",
            "outcome": "won",
            "interactions": [],
        }
    )
    profile = store.insert_icp_profile(
        version=1,
        profile=IcpProfile(
            summary="Best-fit firms",
            industries=["Legal"],
            headcount_band="25-80",
            roles=["Managing Partner"],
            triggers=["Renewal"],
            disqualifiers=[],
            evidence=[
                {
                    "attribute": "industry",
                    "deal_ids": [str(deal.id), str(private_title_deal.id)],
                    "why": "Won legal deals",
                }
            ],
            confidence=0.8,
            origami_brief="Find similar firms.",
        ),
        model="test-model",
        embedding_model="test-embedding",
    )
    store.insert_icp_source_deal(
        profile_id=str(profile.id),
        deal_id=str(deal.id),
        evidence={"deal_snapshot": deal.model_dump(mode="json")},
    )
    for source in (private_title_deal, uncited_deal):
        store.insert_icp_source_deal(
            profile_id=str(profile.id),
            deal_id=str(source.id),
            evidence={"deal_snapshot": source.model_dump(mode="json")},
        )
    store.upsert_deal(
        {
            "crm_external_id": "live:northstar",
            "company_name": "Changed after derivation",
            "name": "Changed after derivation",
            "stage": "discovery",
            "outcome": "lost",
        }
    )

    response = client.get("/api/v1/icp/latest")

    assert response.status_code == 200
    assert response.json()["source_deals"] == [
        {
            "deal_id": str(deal.id),
            "company_name": "Northstar Legal",
            "call_ids": ["call-01-northstar-labs", "call-02-arcwell-health"],
        },
        {
            "deal_id": str(private_title_deal.id),
            "company_name": "Won deal",
            "call_ids": ["crm-call-not-in-slipstream"],
        },
    ]
    assert "content" not in response.json()["source_deals"][0]
    assert "Jane Citizen" not in str(response.json()["source_deals"])
    assert str(uncited_deal.id) not in str(response.json()["source_deals"])


def test_lead_source_returns_503_with_missing_integration(client: TestClient) -> None:
    response = client.post("/leads/source", json={"count": 10})

    assert response.status_code == 503
    assert "origami" in response.json()["detail"]


def test_outreach_approval_rejects_a_stale_reviewed_draft(client: TestClient) -> None:
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(LeadIn(company_name="Northstar", origami_row_id="row-stale"))
    stale = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "First",
            "body": "Old",
            "status": "draft",
        }
    )
    latest = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "Second",
            "body": "New",
            "status": "draft",
        }
    )

    response = client.post(
        f"/leads/{lead.id}/outreach/approve",
        json={"actor": "reviewer", "draft_id": str(stale.id)},
    )

    assert response.status_code == 409
    assert "stale" in response.json()["detail"]
    assert store.get_draft(str(latest.id)).status == "draft"


def test_outreach_approval_is_bound_to_the_reviewed_draft(client: TestClient) -> None:
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(LeadIn(company_name="Arcwell", origami_row_id="row-current"))
    draft = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "Current",
            "body": "Reviewed",
            "status": "draft",
        }
    )

    response = client.post(
        f"/leads/{lead.id}/outreach/approve",
        json={"actor": "reviewer", "draft_id": str(draft.id)},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(draft.id)
    assert response.json()["status"] == "approved"


def test_outreach_approval_waits_for_concurrent_redraft(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        openai_api_key=SecretStr("openai-test"),
    )
    app = create_app(settings)
    store = app.state.icp_leads_store
    lead = store.upsert_lead(LeadIn(company_name="Marlowe", origami_row_id="row-race"))
    reviewed = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "Reviewed",
            "body": "Old copy",
            "status": "draft",
        }
    )
    drafting = Event()
    release = Event()

    class ObservedLock:
        def __init__(self) -> None:
            self.lock = Lock()
            self.guard = Lock()
            self.attempts = 0
            self.second_attempt = Event()

        def __enter__(self) -> "ObservedLock":
            with self.guard:
                self.attempts += 1
                if self.attempts == 2:
                    self.second_attempt.set()
            self.lock.acquire()
            return self

        def __exit__(self, *_: object) -> None:
            self.lock.release()

    observed = ObservedLock()
    slot = hash(str(lead.id)) % len(app.state.outreach_locks)
    app.state.outreach_locks[slot] = observed

    def slow_redraft(*args: Any, **kwargs: Any) -> Any:
        drafting.set()
        assert release.wait(timeout=2)
        return store.insert_draft(
            {
                "lead_id": str(lead.id),
                "kind": "outreach",
                "subject": "New",
                "body": "Latest copy",
                "status": "draft",
            }
        )

    monkeypatch.setattr("app.routers.leads.draft_outreach", slow_redraft)
    with TestClient(app) as configured_client, ThreadPoolExecutor(max_workers=2) as pool:
        redraft = pool.submit(
            configured_client.post,
            f"/leads/{lead.id}/outreach",
            json={"rep_name": "Sam"},
        )
        assert drafting.wait(timeout=2)
        approval = pool.submit(
            configured_client.post,
            f"/leads/{lead.id}/outreach/approve",
            json={"actor": "reviewer", "draft_id": str(reviewed.id)},
        )
        assert observed.second_attempt.wait(timeout=2)
        release.set()

        assert redraft.result(timeout=2).status_code == 200
        response = approval.result(timeout=2)

    assert response.status_code == 409
    assert store.get_draft(str(reviewed.id)).status == "draft"


def test_lead_source_returns_202_when_integrations_present(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        anthropic_api_key=SecretStr("anthropic-test"),
        openai_api_key=SecretStr("openai-test"),
        origami_api_key=SecretStr("origami-test"),
    )
    app = create_app(settings)
    app.state.icp_leads_store.icp_profiles["profile-1"] = {
        "id": "profile-1",
        "version": 1,
        "status": "ready",
        "profile": {
            "summary": "Fit",
            "industries": ["Professional services"],
            "headcount_band": "25-80",
            "roles": ["Practice Manager"],
            "triggers": ["Compliance"],
            "disqualifiers": [],
            "evidence": [],
            "confidence": 0.8,
            "origami_brief": "Find fit.",
        },
        "evidence": [],
        "origami_brief": "Find fit.",
        "model": "claude-opus-5",
        "embedding_model": "text-embedding-3-small",
        "created_at": None,
    }

    class FakeOrigami:
        async def create_search(
            self,
            brief: str,
            count: int,
            quality: str,
            idempotency_key: str | None = None,
        ) -> Job:
            assert brief == "Find fit."
            assert count == 10
            assert quality == "fast"
            assert idempotency_key is not None
            return Job(id="job-1", status="running")

        async def aclose(self) -> None:
            return None

    async def no_complete(*args: Any, **kwargs: Any) -> None:
        return None

    monkeypatch.setattr("app.routers.leads._origami_client", lambda _: FakeOrigami())
    monkeypatch.setattr("app.routers.leads.get_embedding_client", lambda _: object())
    monkeypatch.setattr("app.routers.leads.complete_search", no_complete)

    with TestClient(app) as configured_client:
        response = configured_client.post("/leads/source", json={"count": 10})

    assert response.status_code == 202
    assert response.json() == {
        "origami_job_id": "job-1",
        "icp_profile_id": "profile-1",
        "status": "running",
    }


def test_icp_derive_gets_past_integration_check_with_openrouter_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        openrouter_api_key=SecretStr("openrouter-test"),
    )
    app = create_app(settings)

    def fake_derive_icp(*args: Any, **kwargs: Any) -> dict[str, Any]:
        assert kwargs["include_demo"] is False
        return {
            "id": "profile-1",
            "version": 1,
            "status": "ready",
            "profile": {
                "summary": "Fit",
                "industries": ["Professional services"],
                "headcount_band": "25-80",
                "roles": ["Practice Manager"],
                "triggers": ["Compliance"],
                "disqualifiers": [],
                "evidence": [],
                "confidence": 0.8,
                "origami_brief": "Find fit.",
            },
            "evidence": [],
            "origami_brief": "Find fit.",
            "model": "openai/gpt-5.4",
            "embedding_model": "text-embedding-3-small",
            "created_at": None,
        }

    monkeypatch.setattr("app.routers.icp.get_embedding_client", lambda _: object())
    monkeypatch.setattr("app.routers.icp.derive_icp", fake_derive_icp)

    with TestClient(app) as configured_client:
        response = configured_client.post("/icp/derive", json={"include_demo": False})

    assert response.status_code == 200
    assert response.json()["model"] == "openai/gpt-5.4"
    assert response.json()["embedding_model"] == "text-embedding-3-small"


def test_icp_derive_gets_past_integration_check_with_local_models(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        local_model_base_url="http://127.0.0.1:8081/v1",
        local_embedding_base_url="http://127.0.0.1:8082/v1",
    )
    app = create_app(settings)

    def fake_derive_icp(*args: Any, **kwargs: Any) -> dict[str, Any]:
        return {
            "id": "profile-local",
            "version": 1,
            "status": "ready",
            "profile": {
                "summary": "Fit",
                "industries": ["Professional services"],
                "headcount_band": "25-80",
                "roles": ["Practice Manager"],
                "triggers": ["Compliance"],
                "disqualifiers": [],
                "evidence": [],
                "confidence": 0.8,
                "origami_brief": "Find fit.",
            },
            "evidence": [],
            "origami_brief": "Find fit.",
            "model": settings.local_model_name,
            "embedding_model": settings.local_embedding_name,
            "created_at": None,
        }

    monkeypatch.setattr("app.routers.icp.get_embedding_client", lambda _: object())
    monkeypatch.setattr("app.routers.icp.derive_icp", fake_derive_icp)

    with TestClient(app) as configured_client:
        response = configured_client.post("/icp/derive", json={"include_demo": False})

    assert response.status_code == 200
    assert response.json()["model"] == settings.local_model_name
    assert response.json()["embedding_model"] == settings.local_embedding_name


def test_lead_outreach_gets_past_integration_check_with_local_reasoning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        local_model_base_url="http://127.0.0.1:8081/v1",
    )
    app = create_app(settings)
    store = app.state.icp_leads_store
    lead = store.upsert_lead(LeadIn(company_name="Northstar", origami_row_id="row-local"))
    reached_drafting = False

    def fake_draft_outreach(*args: Any, **kwargs: Any) -> Any:
        nonlocal reached_drafting
        reached_drafting = True
        return store.insert_draft(
            {
                "lead_id": str(lead.id),
                "kind": "outreach",
                "subject": "Local follow-up",
                "body": "Thanks for the conversation.",
                "status": "draft",
            }
        )

    monkeypatch.setattr("app.routers.leads.draft_outreach", fake_draft_outreach)

    with TestClient(app) as configured_client:
        response = configured_client.post(
            f"/leads/{lead.id}/outreach",
            json={"rep_name": "Jordan"},
        )

    assert response.status_code == 200
    assert response.json()["subject"] == "Local follow-up"
    assert reached_drafting is True
