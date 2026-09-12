from pathlib import Path

from app.services.fixture_history import load_fixture_history
from app.services.icp_leads_store import InMemoryIcpLeadsStore


def test_history_load_is_idempotent_and_has_expected_outcome_mix() -> None:
    store = InMemoryIcpLeadsStore()
    fixtures_dir = Path(__file__).resolve().parents[2] / "fixtures"

    first = load_fixture_history(store, fixtures_dir)
    second = load_fixture_history(store, fixtures_dir)

    assert first == second
    assert first.deals == 13
    assert first.outcomes == {"won": 5, "lost": 3, "stalled": 3, "open": 2}
    assert all(
        deal.metadata["source"] == "fixtures"
        for deal in store.list_fixture_deals(include_demo=True)
    )
