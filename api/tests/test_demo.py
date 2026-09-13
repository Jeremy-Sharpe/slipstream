from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.llm import ReasoningResult
from app.factory import create_app
from app.schemas.icp import (
    IcpEvidenceInventory,
    IcpProfile,
    IcpSourceSummary,
    StoredIcpProfile,
)
from app.schemas.leads import LeadIn
from app.services.demo_leads import (
    DemoLeadAttributes,
    DemoLeadBatch,
    demo_job_id,
    generate_demo_leads,
)
from app.services.fixture_history import load_fixture_history
from app.services.icp import cohort_revision
from app.services.icp_leads_store import InMemoryIcpLeadsStore


def _profile() -> StoredIcpProfile:
    source = IcpSourceSummary(deals=12, calls=12, emails=1, outcome_labelled=11)
    profile = IcpProfile(
        summary="Professional-services teams with manual compliance work.",
        industries=["Professional services"],
        headcount_band="25-80",
        roles=["Operations Manager"],
        triggers=["Manual compliance workload"],
        disqualifiers=[],
        evidence=[],
        confidence=0.8,
        origami_brief="Find professional-services operations managers.",
        source_summary=source,
        cohort_revision="a" * 64,
    )
    return StoredIcpProfile(
        id="profile-demo",
        version=1,
        profile=profile,
        evidence=[],
        origami_brief=profile.origami_brief,
        model="openai/gpt-5.4-mini",
        embedding_model="text-embedding-3-small",
    )


def test_demo_bootstrap_runs_bounded_two_key_proof(monkeypatch: Any) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        openrouter_api_key="openrouter-test",
        origami_api_key="origami-test",
    )
    app = create_app(settings)
    requested: list[dict[str, Any]] = []

    async def verified() -> dict[str, bool | None]:
        return {"openrouter": True, "origami": True}

    def fake_derive(*_: Any, **__: Any) -> StoredIcpProfile:
        return _profile()

    def fake_generate(*_: Any, **kwargs: Any) -> list[Any]:
        requested.append(kwargs)
        return []

    monkeypatch.setattr(app.state.provider_readiness, "verify", verified)
    monkeypatch.setattr("app.routers.demo.derive_icp", fake_derive)
    monkeypatch.setattr("app.routers.demo.generate_demo_leads", fake_generate)

    with TestClient(app) as client:
        response = client.post("/api/v1/demo/bootstrap", json={"source_leads": True})

    assert response.status_code == 200
    assert response.json()["status"] == "lead search started"
    assert response.json()["lead_source"] == {
        "origami_job_id": demo_job_id(_profile(), "openai/gpt-5.4-mini"),
        "icp_profile_id": "profile-demo",
        "status": "succeeded",
    }
    assert response.json()["lead_provider"] == "openrouter_demo"
    assert "10 fictional prospects" in response.json()["spend_guardrail"]
    assert requested == [
        {
            "profile": _profile(),
        }
    ]


def test_demo_bootstrap_rejects_unverified_keys_before_loading_data(
    monkeypatch: Any,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        openrouter_api_key="openrouter-test",
        origami_api_key="origami-test",
    )
    app = create_app(settings)

    async def rejected() -> dict[str, bool | None]:
        return {"openrouter": False, "origami": False}

    monkeypatch.setattr(app.state.provider_readiness, "verify", rejected)
    with TestClient(app) as client:
        response = client.post("/demo/bootstrap", json={"source_leads": True})
        evidence = client.get("/icp/evidence").json()

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Required demo provider credentials are not verified"
    }
    assert evidence["deals"] == 0


def test_current_profile_match_requires_exact_models_and_inventory() -> None:
    from app.routers.demo import _profile_is_current

    inventory = IcpEvidenceInventory(
        deals=12,
        calls=12,
        emails=1,
        outcome_labelled=11,
        won_deals=5,
        contrast_deals=6,
        active_deals=1,
        ready_to_derive=True,
    )
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    assert _profile_is_current(_profile(), inventory, settings, "a" * 64) is True
    assert _profile_is_current(
        _profile().model_copy(update={"model": "another/model"}),
        inventory,
        settings,
        "a" * 64,
    ) is False
    assert _profile_is_current(_profile(), inventory, settings, "b" * 64) is False


def test_generated_demo_leads_are_obviously_fictional_and_reused(monkeypatch: Any) -> None:
    store = InMemoryIcpLeadsStore()
    deal = store.upsert_deal(
        {
            "crm_external_id": "won-demo",
            "name": "Won demo",
            "stage": "won",
            "outcome": "won",
            "embedding": [1.0, 0.0],
            "embedding_model": "text-embedding-3-small",
        }
    )
    profile = store.insert_icp_profile(
        version=1,
        profile=_profile().profile,
        model="openai/gpt-5.4-mini",
        embedding_model="text-embedding-3-small",
    )
    store.insert_icp_source_deal(
        profile_id=str(profile.id),
        deal_id=str(deal.id),
        evidence={"deal_snapshot": deal.model_dump(mode="json")},
    )
    calls = 0

    def fake_structured(*_: Any, **__: Any) -> ReasoningResult[DemoLeadBatch]:
        nonlocal calls
        calls += 1
        return ReasoningResult(
            output=DemoLeadBatch(
                leads=[
                    DemoLeadAttributes(
                        title="Operations Manager",
                        industry="Professional services",
                        employee_count=40 + index,
                        location="Melbourne",
                        rationale="Matches the observed operations workflow trigger.",
                        relevance_score=0.9,
                    )
                    for index in range(10)
                ]
            ),
            model="openai/gpt-5.4-mini",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.demo_leads.structured", fake_structured)
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    def embed(texts: list[str]) -> list[list[float]]:
        return [[1.0, 0.0] for _ in texts]

    first = generate_demo_leads(store, settings, embed, settings, profile=profile)
    second = generate_demo_leads(store, settings, embed, settings, profile=profile)

    assert calls == 1
    assert [lead.id for lead in second] == [lead.id for lead in first]
    assert len(first) == 10
    assert all(lead.company_domain and lead.company_domain.endswith(".example") for lead in first)
    assert all(lead.person_name and lead.person_name.startswith("Demo Contact") for lead in first)
    assert all(lead.email is None and lead.linkedin_url is None for lead in first)
    assert all(lead.metadata["synthetic"] is True for lead in first)
    assert all(lead.similarity_score == 1 for lead in first)


def test_demo_evidence_returns_bounded_safe_latest_profile_proof() -> None:
    settings = Settings(_env_file=None, environment="test", openrouter_api_key="test")
    app = create_app(settings)
    store = app.state.icp_leads_store
    load_fixture_history(store, Path(__file__).resolve().parents[2] / "fixtures")
    current_revision = cohort_revision(store.list_icp_deals())
    profile = store.insert_icp_profile(
        version=1,
        profile=_profile().profile.model_copy(
            update={"cohort_revision": current_revision}
        ),
        model=settings.effective_reasoning_model,
        embedding_model=settings.effective_embedding_model,
    )
    for index in range(10):
        store.upsert_lead(
            LeadIn(
                icp_profile_id=profile.id,
                company_name=f"ICP Match {index + 1:02d} (fictional)",
                company_domain=f"icp-match-{index + 1:02d}.example",
                person_name=f"Demo Contact {index + 1:02d}",
                title="Operations Manager",
                industry="Professional services",
                origami_row_id=f"openrouter-demo-{index}",
                origami_relevance_score=0.9,
                similarity_score=0.8,
                embedding=[1.0, 0.0],
                embedding_model=settings.effective_embedding_model,
                metadata={
                    "source": "openrouter_demo",
                    "synthetic": True,
                    "model": settings.effective_reasoning_model,
                    "rationale": "Matches the observed operations trigger.",
                },
            )
        )

    with TestClient(app) as client:
        response = client.get("/api/v1/demo/evidence")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "verified"
    assert payload["lead_count"] == 10
    assert payload["all_fictional"] is True
    assert payload["all_reserved_domains"] is True
    assert payload["no_delivery_coordinates"] is True
    assert payload["models"] == [settings.effective_reasoning_model]
    assert payload["delivery_enabled"] is False
    assert payload["revenue_dna"]["status"] == "current"
    assert payload["revenue_dna"]["leads_on_profile"] == 10
    assert payload["revenue_dna"]["leads_needing_rescore"] == 0
    assert len(payload["sample_leads"]) == 3
    assert all("embedding" not in lead for lead in payload["sample_leads"])


def test_demo_evidence_is_missing_until_an_icp_exists() -> None:
    app = create_app(Settings(_env_file=None, environment="test"))

    with TestClient(app) as client:
        response = client.get("/api/v1/demo/evidence")

    assert response.status_code == 404
    assert response.json() == {"detail": "No derived ICP is available"}
