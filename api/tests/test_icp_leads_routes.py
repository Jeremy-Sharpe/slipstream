from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.factory import create_app
from app.schemas.origami import Job


def test_icp_derive_returns_503_with_missing_integration(client: TestClient) -> None:
    response = client.post("/icp/derive", json={"include_demo": False})

    assert response.status_code == 503
    assert "openai" in response.json()["detail"]


def test_lead_source_returns_503_with_missing_integration(client: TestClient) -> None:
    response = client.post("/leads/source", json={"count": 10})

    assert response.status_code == 503
    assert "origami" in response.json()["detail"]


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
    monkeypatch.setattr("app.routers.leads.get_openai_client", lambda _: object())
    monkeypatch.setattr("app.routers.leads.complete_search", no_complete)

    with TestClient(app) as configured_client:
        response = configured_client.post("/leads/source", json={"count": 10})

    assert response.status_code == 202
    assert response.json() == {
        "origami_job_id": "job-1",
        "icp_profile_id": "profile-1",
        "status": "running",
    }
