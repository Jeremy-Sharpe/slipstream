from pathlib import Path

from app.core.config import Settings
from app.schemas.icp import IcpProfile
from app.services.fixture_history import load_fixture_history
from app.services.icp import derive_icp, won_centroid
from app.services.icp_leads_store import InMemoryIcpLeadsStore


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
    assert len(store.source_deals_for_profile(str(profile.id))) == 5
    assert all(
        not deal.metadata.get("demo") for deal in store.source_deals_for_profile(str(profile.id))
    )
    assert len(won_centroid(store, str(profile.id))) == 3
