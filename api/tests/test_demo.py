import json
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
    company_domain,
    demo_job_id,
    generate_demo_leads,
)
from app.services.fixture_history import load_fixture_history
from app.services.icp import cohort_revision, evidence_inventory
from app.services.icp_leads_store import InMemoryIcpLeadsStore

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"


def _fixture_inventory() -> IcpEvidenceInventory:
    """The evidence the fixtures on disk actually produce, so counts never go stale."""
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, FIXTURES_DIR)
    return evidence_inventory(store)


def _fixture_deal_count() -> int:
    calls = [path for path in (FIXTURES_DIR / "calls").iterdir() if path.is_dir()]
    return len(calls) + len(_client_rows())


def _fixture_won_count() -> int:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, FIXTURES_DIR)
    return sum(
        deal.outcome == "won" for deal in store.list_fixture_deals(include_demo=True)
    )


def _client_rows() -> list[dict[str, Any]]:
    return json.loads(
        (FIXTURES_DIR / "crm" / "clients.json").read_text(encoding="utf-8")
    )


def _profile() -> StoredIcpProfile:
    source = IcpSourceSummary.model_validate(_fixture_inventory().model_dump())
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
    history = response.json()["history"]
    assert history["deals"] == _fixture_deal_count()
    assert history["outcomes"]["won"] == _fixture_won_count()
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

    inventory = _fixture_inventory()
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    assert inventory.ready_to_derive is True
    assert inventory.won_deals > inventory.active_deals

    assert _profile_is_current(_profile(), inventory, settings, "a" * 64) is True
    assert _profile_is_current(
        _profile().model_copy(update={"model": "another/model"}),
        inventory,
        settings,
        "a" * 64,
    ) is False
    assert _profile_is_current(_profile(), inventory, settings, "b" * 64) is False


COMPANY_NAMES = [
    "Marrick Capital Partners",
    "Southbank Quant Research",
    "Bayside Advisory Group",
    "Coburg Freight Systems",
    "Yarraville Risk Collective",
    "Parkville Ledger Co",
    "Docklands Asset Works",
    "Brunswick Claims Bureau",
    "Fitzroy Audit House",
    "Carlton Treasury Labs",
]
PERSON_NAMES = [
    "Imogen Wheeler",
    "Samuel Okafor",
    "Ruby Castellano",
    "Hamish Petrov",
    "Nadia Brightwell",
    "Callum Verity",
    "Thea Lindqvist",
    "Marcus Dalrymple",
    "Sienna Whitlock",
    "Arjun Mehta",
]


def _attributes(index: int, **overrides: Any) -> DemoLeadAttributes:
    fields: dict[str, Any] = {
        "company_name": COMPANY_NAMES[index],
        "person_name": PERSON_NAMES[index],
        "title": "Operations Manager",
        "industry": "Professional services",
        "employee_count": 40 + index,
        "location": "Melbourne",
        "rationale": "Matches the observed operations workflow trigger.",
        "relevance_score": 0.9,
    }
    fields.update(overrides)
    return DemoLeadAttributes(**fields)


def _seeded_profile(store: InMemoryIcpLeadsStore) -> Any:
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
    return profile


def _batch_returning(
    monkeypatch: Any, leads: list[DemoLeadAttributes]
) -> None:
    def fake_structured(*_: Any, **__: Any) -> ReasoningResult[DemoLeadBatch]:
        return ReasoningResult(
            output=DemoLeadBatch(leads=leads),
            model="openai/gpt-5.4-mini",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.demo_leads.structured", fake_structured)


def _embed(texts: list[str]) -> list[list[float]]:
    return [[1.0, 0.0] for _ in texts]


def test_generated_demo_leads_are_obviously_fictional_and_reused(monkeypatch: Any) -> None:
    store = InMemoryIcpLeadsStore()
    profile = _seeded_profile(store)
    calls = 0

    def fake_structured(*_: Any, **__: Any) -> ReasoningResult[DemoLeadBatch]:
        nonlocal calls
        calls += 1
        return ReasoningResult(
            output=DemoLeadBatch(leads=[_attributes(index) for index in range(10)]),
            model="openai/gpt-5.4-mini",
            provider="openrouter",
        )

    monkeypatch.setattr("app.services.demo_leads.structured", fake_structured)
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    first = generate_demo_leads(store, settings, _embed, settings, profile=profile)
    second = generate_demo_leads(store, settings, _embed, settings, profile=profile)

    assert calls == 1
    assert [lead.id for lead in second] == [lead.id for lead in first]
    assert len(first) == 10
    assert [lead.company_name for lead in first] == COMPANY_NAMES
    assert [lead.person_name for lead in first] == PERSON_NAMES
    assert all(lead.company_domain and lead.company_domain.endswith(".example") for lead in first)
    assert first[0].company_domain == "marrick-capital-partners.example"
    assert all(lead.email is None and lead.linkedin_url is None for lead in first)
    assert all(lead.metadata["synthetic"] is True for lead in first)
    assert all(lead.metadata["name_replaced"] is False for lead in first)
    assert all(lead.similarity_score == 1 for lead in first)


def test_generated_names_never_reuse_a_real_client(monkeypatch: Any) -> None:
    store = InMemoryIcpLeadsStore()
    profile = _seeded_profile(store)
    leads = [_attributes(index) for index in range(10)]
    leads[3] = _attributes(3, company_name="Bell Potter", person_name="Maya Chen")
    _batch_returning(monkeypatch, leads)
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    generated = generate_demo_leads(store, settings, _embed, settings, profile=profile)

    assert "Bell Potter" in {row["name"] for row in _client_rows()}
    assert generated[3].company_name == "Prospect 04 Pty Ltd"
    assert generated[3].company_domain == "prospect-04-pty-ltd.example"
    assert generated[3].person_name == "Contact 04"
    assert generated[3].metadata["name_replaced"] is True
    assert all(lead.metadata["name_replaced"] is False for lead in generated[:3] + generated[4:])
    assert not any(
        "bell potter" in (lead.company_name or "").casefold() for lead in generated
    )


def test_duplicate_generated_company_names_are_replaced(monkeypatch: Any) -> None:
    store = InMemoryIcpLeadsStore()
    profile = _seeded_profile(store)
    leads = [_attributes(index) for index in range(10)]
    leads[5] = _attributes(5, company_name=COMPANY_NAMES[0].upper())
    _batch_returning(monkeypatch, leads)
    settings = Settings(_env_file=None, openrouter_api_key="openrouter-test")

    generated = generate_demo_leads(store, settings, _embed, settings, profile=profile)
    companies = [lead.company_name for lead in generated]

    assert companies[0] == COMPANY_NAMES[0]
    assert companies[5] == "Prospect 06 Pty Ltd"
    assert generated[5].metadata["name_replaced"] is True
    assert len({name.casefold() for name in companies}) == 10
    assert len({lead.company_domain for lead in generated}) == 10


def test_demo_evidence_returns_bounded_safe_latest_profile_proof() -> None:
    settings = Settings(_env_file=None, environment="test", openrouter_api_key="test")
    app = create_app(settings)
    store = app.state.icp_leads_store
    load_fixture_history(store, FIXTURES_DIR)
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
                company_name=COMPANY_NAMES[index],
                company_domain=company_domain(COMPANY_NAMES[index]),
                person_name=PERSON_NAMES[index],
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


def test_retired_brand_is_replaced() -> None:
    from app.services.demo_leads import DemoLeadAttributes, protected_names, resolve_names

    item = DemoLeadAttributes(
        company_name="Harbourline Commercial Finance",
        person_name="Monique Telfer",
        title="Head of Credit Operations",
        industry="Non-bank commercial lender",
        employee_count=58,
        location="North Sydney, NSW",
        rationale="Lending operations at the right scale.",
        relevance_score=0.9,
    )
    resolved = resolve_names([item], protected_names())
    assert resolved[0].company == "Prospect 01 Pty Ltd"
    assert resolved[0].replaced is True
