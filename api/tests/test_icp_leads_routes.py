from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.factory import create_app
from app.schemas.leads import LeadIn
from app.schemas.origami import Job


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
        "emails": 0,
        "outcome_labelled": 11,
        "won_deals": 5,
        "contrast_deals": 6,
        "active_deals": 1,
        "ready_to_derive": True,
    }


def test_lead_source_returns_503_with_missing_integration(client: TestClient) -> None:
    response = client.post("/leads/source", json={"count": 10})

    assert response.status_code == 503
    assert "origami" in response.json()["detail"]


def test_outreach_approval_rejects_a_stale_reviewed_draft(client: TestClient) -> None:
    store = client.app.state.icp_leads_store
    lead = store.upsert_lead(LeadIn(company_name="Northstar", origami_row_id="row-stale"))
    stale = store.insert_draft({
        "lead_id": str(lead.id),
        "kind": "outreach",
        "subject": "First",
        "body": "Old",
        "status": "draft",
    })
    latest = store.insert_draft({
        "lead_id": str(lead.id),
        "kind": "outreach",
        "subject": "Second",
        "body": "New",
        "status": "draft",
    })

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
    draft = store.insert_draft({
        "lead_id": str(lead.id),
        "kind": "outreach",
        "subject": "Current",
        "body": "Reviewed",
        "status": "draft",
    })

    response = client.post(
        f"/leads/{lead.id}/outreach/approve",
        json={"actor": "reviewer", "draft_id": str(draft.id)},
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(draft.id)
    assert response.json()["status"] == "sent"


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
    reviewed = store.insert_draft({
        "lead_id": str(lead.id),
        "kind": "outreach",
        "subject": "Reviewed",
        "body": "Old copy",
        "status": "draft",
    })
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
        return store.insert_draft({
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "New",
            "body": "Latest copy",
            "status": "draft",
        })

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
        async def create_search(self, brief: str, count: int, quality: str) -> Job:
            assert brief == "Find fit."
            assert count == 10
            assert quality == "fast"
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
