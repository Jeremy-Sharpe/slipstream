import json
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings
from app.schemas.icp import DealRecord, IcpProfile, InteractionEvidence, StoredIcpProfile
from app.services.crm_mirror import mirror_interaction
from app.services.fixture_history import load_fixture_history
from app.services.icp import (
    MAX_MODEL_INPUT_CHARS,
    MAX_PROFILE_VALUES,
    _cohort_payload,
    _fit_model_budget,
    _ground_profile,
    _with_source_deals,
    derive_icp,
    evidence_inventory,
    won_centroid,
)
from app.services.icp_leads_store import MAX_ICP_DEALS, InMemoryIcpLeadsStore


def fake_embed(texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for text in texts:
        score = float(sum(ord(character) for character in text) % 97 + 1)
        vectors.append([score, 1.0, 0.5])
    return vectors


def fake_structured(**kwargs: object) -> IcpProfile:
    user = str(kwargs["user"])
    deal_ids = []
    for line in user.splitlines():
        if '"id":' in line:
            deal_ids.append(line.split('"')[3])
    return IcpProfile(
        summary="Professional services firms with urgent compliance triggers.",
        industries=["Professional services", "Allied health"],
        headcount_band="25-80",
        roles=["Managing Partner", "Practice Manager"],
        triggers=["Cyber insurance renewal"],
        disqualifiers=["Price-led buyer"],
        evidence=[
            {
                "attribute": "compliance trigger",
                "deal_ids": deal_ids[:5],
                "why": "Won deals had urgency.",
            }
        ],
        confidence=0.86,
        origami_brief=(
            "Find Australian professional services firms with 25 to 80 staff. Look for "
            "decision makers facing cyber insurance, compliance or reliability triggers."
        ),
    )


def test_derive_icp_excludes_demo_and_writes_source_deals() -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, Path(__file__).resolve().parents[2] / "fixtures")

    profile = derive_icp(store, fake_structured, fake_embed, Settings(_env_file=None))

    assert profile.version == 1
    assert profile.profile.source_summary.deals == 12
    assert profile.profile.source_summary.calls == 12
    assert profile.profile.source_summary.emails == 0
    assert profile.profile.source_summary.outcome_labelled == 11
    assert profile.profile.industries == [
        "Architecture and lab planning consultancy",
        "Multi-site allied health clinic",
        "Family law firm",
        "Accounting practice",
        "Multi-site physiotherapy clinic",
    ]
    assert profile.profile.headcount_band == "25-80"
    assert "Creative branding studio" not in profile.profile.industries
    assert "Sam" not in profile.profile.summary
    assert "Jordan" not in profile.profile.summary
    assert "won-deal industries" in profile.profile.origami_brief
    assert [item.attribute for item in profile.profile.evidence] == [
        "industry",
        "headcount_band",
        "contact_role",
        "trigger",
    ]
    won_ids = {str(deal.id) for deal in store.list_icp_deals() if deal.outcome == "won"}
    assert all(
        set(item.deal_ids).issubset(won_ids) and item.deal_ids
        for item in profile.profile.evidence
    )
    assert all(
        "Sam" not in item.why and "Jordan" not in item.why
        for item in profile.profile.evidence
    )
    assert len(store.source_deals_for_profile(str(profile.id))) == 5
    assert len(profile.source_deals) == 5
    assert {source.deal_id for source in profile.source_deals} == won_ids
    assert all(source.company_name and source.call_ids for source in profile.source_deals)
    assert all(
        call_id.startswith("call-")
        for source in profile.source_deals
        for call_id in source.call_ids
    )
    assert all(
        not deal.metadata.get("demo") for deal in store.source_deals_for_profile(str(profile.id))
    )
    assert len(won_centroid(store, str(profile.id))) == 3
    source_before = store.source_deals_for_profile(str(profile.id))[0]
    store.upsert_deal(
        {
            "name": "Changed later",
            "stage": "discovery",
            "outcome": "lost",
            "crm_external_id": source_before.crm_external_id,
            "embedding": [99.0, 99.0, 99.0],
        }
    )
    source_after = store.source_deals_for_profile(str(profile.id))[0]
    assert source_after.outcome == "won"
    assert source_after.embedding == source_before.embedding


def test_derive_returns_source_refs_without_a_post_commit_store_read() -> None:
    class NoSourceReadStore(InMemoryIcpLeadsStore):
        def source_deals_for_profile(
            self, profile_id: str, *, deal_ids: set[str] | None = None
        ) -> list[DealRecord]:
            raise AssertionError(f"unexpected post-commit read for {profile_id}: {deal_ids}")

    store = NoSourceReadStore()
    load_fixture_history(store, Path(__file__).resolve().parents[2] / "fixtures")

    profile = derive_icp(store, fake_structured, fake_embed, Settings(_env_file=None))

    assert len(profile.source_deals) == 5


def test_source_ref_projection_enforces_limits_and_privacy_defaults() -> None:
    ids = [f"deal-{index:03}" for index in range(101)]
    profile = StoredIcpProfile(
        id="profile-bounds",
        version=1,
        profile=fake_structured(user="", model="test"),
        evidence=[{"attribute": "industry", "deal_ids": ids, "why": "Won cohort"}],
        origami_brief="Find peers.",
    )
    calls = [
        InteractionEvidence(
            source_external_id=f"call-{index:02}",
            channel="call",
            direction="unknown",
            occurred_at=datetime.now(UTC),
            subject="Evidence",
            content="Bounded evidence",
        )
        for index in range(19)
    ]
    calls.append(calls[0])
    deals = [
        DealRecord(
            id=deal_id,
            company_name=None if index == 0 else f"Company {index}",
            name="Private opportunity title",
            stage="customer",
            outcome="won",
            interactions=calls if index == 0 else [],
        )
        for index, deal_id in enumerate(ids)
    ]

    projected = _with_source_deals(profile, deals)

    assert len(projected.source_deals) == 100
    assert projected.source_deals[0].company_name == "Won deal"
    assert projected.source_deals[0].call_ids == [f"call-{index:02}" for index in range(19)]
    assert all("Private opportunity" not in ref.company_name for ref in projected.source_deals)
    assert projected.source_deals[-1].deal_id == "deal-099"


def test_derive_icp_uses_email_as_active_evidence_not_negative_evidence() -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, Path(__file__).resolve().parents[2] / "fixtures")
    company = store.upsert_company({"name": "Acme", "domain": "acme.example"})
    store.upsert_deal(
        {
            "company_id": company["id"],
            "name": "Renewal thread",
            "stage": "evaluation",
            "outcome": "open",
            "crm_external_id": "email:thread:acme",
            "summary": "Buyer is evaluating timing.",
            "metadata": {"source": "live", "channels": ["email"]},
            "interactions": [
                {
                    "source_external_id": "email:source:acme-1",
                    "channel": "email",
                    "direction": "inbound",
                    "occurred_at": "2026-09-12T10:00:00Z",
                    "subject": "Cyber renewal",
                    "content": "Our cyber insurance renewal is due next month.",
                }
            ],
        }
    )
    captured: dict[str, object] = {}

    def capture(**kwargs: object) -> IcpProfile:
        captured.update(json.loads(str(kwargs["user"])))
        return fake_structured(**kwargs)

    profile = derive_icp(store, capture, fake_embed, Settings(_env_file=None))

    active = next(deal for deal in captured["active_deals"] if deal["company"] == "Acme")
    assert active["interactions"][0]["channel"] == "email"
    assert "cyber insurance renewal" in active["interactions"][0]["content"]
    assert all(deal["id"] != active["id"] for deal in captured["contrast_deals"])
    assert profile.profile.source_summary.deals == 13
    assert profile.profile.source_summary.calls == 12
    assert profile.profile.source_summary.emails == 1
    assert "Acme" not in profile.profile.summary
    assert "cyber insurance renewal is due next month" not in profile.profile.origami_brief


def test_derive_icp_deduplicates_model_disqualifiers() -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, Path(__file__).resolve().parents[2] / "fixtures")

    def repeated(**kwargs: object) -> IcpProfile:
        profile = fake_structured(**kwargs)
        return profile.model_copy(
            update={"disqualifiers": ["No next step", " no next step ", "No trigger"]}
        )

    profile = derive_icp(store, repeated, fake_embed, Settings(_env_file=None))

    assert profile.profile.disqualifiers == ["No next step", "No trigger"]


def test_ground_profile_rejects_malformed_and_unsupported_won_signals() -> None:
    profile = _ground_profile(
        fake_structured(user="", model="test"),
        [
            DealRecord(
                id="won-1",
                name="Sparse one",
                stage="customer",
                outcome="won",
                industry=" ",
                contact_role=" ",
                metadata={
                    "trigger": True,
                    "icp_signals": {
                        "industry": "Supported fallback industry",
                        "role": "Supported fallback role",
                        "trigger": "Contract renewal",
                        "headcount_band": {"min": 25, "max": 80},
                    },
                },
            ),
            DealRecord(
                id="won-2",
                name="Sparse two",
                stage="customer",
                outcome="won",
                metadata={"icp_signals": {}},
            ),
        ],
    )

    assert profile.industries == ["Supported fallback industry"]
    assert profile.roles == ["Supported fallback role"]
    assert profile.triggers == ["Contract renewal"]
    assert profile.headcount_band == "Not established"
    assert "concrete" not in profile.summary
    assert "technology need" not in profile.origami_brief
    assert "Contract renewal" in profile.origami_brief
    assert [item.attribute for item in profile.evidence] == [
        "industry",
        "contact_role",
        "trigger",
    ]


def test_ground_profile_reconciles_headcount_band_across_every_win() -> None:
    base = fake_structured(user="", model="test")
    first = DealRecord(
        id="won-1",
        name="First",
        stage="customer",
        outcome="won",
        employee_count=42,
        metadata={"icp_signals": {"headcount_band": "25-80"}},
    )
    contradictory = DealRecord(
        id="won-2",
        name="Second",
        stage="customer",
        outcome="won",
        employee_count=500,
        metadata={"icp_signals": {}},
    )
    unknown = contradictory.model_copy(update={"employee_count": None})
    stale_bands = [
        first,
        contradictory.model_copy(
            update={"metadata": {"icp_signals": {"headcount_band": "25-80"}}}
        ),
    ]

    assert _ground_profile(base, [first, contradictory]).headcount_band == "42-500"
    assert _ground_profile(base, [first, unknown]).headcount_band == "Not established"
    assert _ground_profile(base, stale_bands).headcount_band == "42-500"

    equivalent_bands = [
        first.model_copy(
            update={
                "employee_count": None,
                "metadata": {"icp_signals": {"headcount_band": "Under 80"}},
            }
        ),
        unknown.model_copy(
            update={"metadata": {"icp_signals": {"headcount_band": "under-080"}}}
        ),
    ]
    assert _ground_profile(base, equivalent_bands).headcount_band == "under-80"


def test_ground_evidence_does_not_cite_values_excluded_by_the_cap() -> None:
    won = [
        DealRecord(
            id=f"won-{index}",
            name=f"Won {index}",
            stage="customer",
            outcome="won",
            industry=f"Industry {index}",
        )
        for index in range(MAX_PROFILE_VALUES + 1)
    ]

    profile = _ground_profile(fake_structured(user="", model="test"), won)
    industry_evidence = next(item for item in profile.evidence if item.attribute == "industry")

    assert len(profile.industries) == MAX_PROFILE_VALUES
    assert f"won-{MAX_PROFILE_VALUES}" not in industry_evidence.deal_ids


def test_icp_candidates_exclude_unproven_live_deals_and_bound_model_input() -> None:
    store = InMemoryIcpLeadsStore()
    store.upsert_deal(
        {
            "name": "No evidence",
            "stage": "discovery",
            "outcome": "won",
            "crm_external_id": "live:no-evidence",
            "metadata": {"source": "live"},
        }
    )
    for index in range(MAX_ICP_DEALS + 20):
        store.upsert_deal(
            {
                "name": f"Evidence {index}",
                "stage": "discovery",
                "outcome": "open",
                "crm_external_id": f"live:{index:03}",
                "metadata": {"source": "live"},
                "summary": "x" * 20_000,
                "interactions": [
                    {
                        "source_external_id": f"call:{index}",
                        "channel": "call",
                        "direction": "unknown",
                        "occurred_at": "2026-09-12T10:00:00Z",
                        "subject": "y" * 20_000,
                        "content": "z" * 1200,
                    }
                ],
            }
        )

    candidates = store.list_icp_deals()
    fitted = _fit_model_budget(candidates)
    encoded = json.dumps(_cohort_payload(fitted), separators=(",", ":"))

    assert len(candidates) == MAX_ICP_DEALS
    assert all(deal.crm_external_id != "live:no-evidence" for deal in candidates)
    assert len(encoded) <= MAX_MODEL_INPUT_CHARS
    inventory = evidence_inventory(store)
    assert inventory.deals == len(fitted)
    assert inventory.deals < len(candidates)


def test_legacy_icp_profile_keeps_unknown_source_provenance() -> None:
    legacy = fake_structured(user="", model="test")

    assert legacy.source_summary is None


def test_memory_mirror_preserves_deal_outside_current_icp_cohort() -> None:
    store = InMemoryIcpLeadsStore()
    primary = store.upsert_contact(
        {"first_name": "Primary", "last_name": "Buyer", "email": "primary@example.com"}
    )
    original = store.upsert_deal(
        {
            "name": "Original",
            "stage": "customer",
            "outcome": "won",
            "crm_external_id": "live:original",
            "summary": "Curated summary",
            "primary_contact_id": primary["id"],
            "metadata": {"source": "live", "curated": True},
            "interactions": [
                {
                    "source_external_id": "call:original",
                    "channel": "call",
                    "direction": "unknown",
                    "occurred_at": "2026-09-11T10:00:00Z",
                    "subject": "Original",
                    "content": "Original evidence",
                }
            ],
        }
    )
    for index in range(MAX_ICP_DEALS):
        mirror_interaction(
            store,
            deal_external_id=f"live:new:{index}",
            interaction=InteractionEvidence(
                source_external_id=f"email:new:{index}",
                channel="email",
                direction="inbound",
                occurred_at=datetime.now(UTC),
                subject="New",
                content="New evidence",
            ),
        )
    assert all(deal.id != original.id for deal in store.list_icp_deals())

    mirrored = mirror_interaction(
        store,
        deal_external_id="live:original",
        interaction=InteractionEvidence(
            source_external_id="email:original",
            channel="email",
            direction="inbound",
            occurred_at=datetime.now(),
            subject="Reply",
            content="Fresh evidence",
        ),
        deal={"name": "Generated email name", "summary": "Email thread: Reply"},
        contact={"email": "other@example.com"},
    )

    assert mirrored.stage == "customer"
    assert mirrored.outcome == "won"
    assert mirrored.metadata["curated"] is True
    assert mirrored.name == "Original"
    assert mirrored.summary == "Curated summary"
    assert mirrored.primary_contact_id == primary["id"]
    assert len(mirrored.interactions) == 2
    assert all(item.occurred_at.tzinfo is not None for item in mirrored.interactions)
