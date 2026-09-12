import json
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings
from app.schemas.icp import IcpProfile, InteractionEvidence
from app.services.crm_mirror import mirror_interaction
from app.services.fixture_history import load_fixture_history
from app.services.icp import (
    MAX_MODEL_INPUT_CHARS,
    _cohort_payload,
    _fit_model_budget,
    derive_icp,
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
    assert len(store.source_deals_for_profile(str(profile.id))) == 5
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
