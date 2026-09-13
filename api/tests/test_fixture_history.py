import json
from pathlib import Path
from typing import Any

from app.services.fixture_history import load_fixture_history
from app.services.icp_leads_store import InMemoryIcpLeadsStore

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"


def _json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _call_folders() -> list[Path]:
    return sorted(path for path in (FIXTURES_DIR / "calls").iterdir() if path.is_dir())


def _client_rows() -> list[dict[str, Any]]:
    return _json(FIXTURES_DIR / "crm" / "clients.json")


def _email_rows() -> list[dict[str, Any]]:
    return _json(FIXTURES_DIR / "emails" / "icp-evidence.json")


def _history_call_ids() -> list[str]:
    """Call fixtures that are part of the sales history rather than the coached demo."""
    return [
        folder.name for folder in _call_folders() if not _json(folder / "script.json").get("demo")
    ]


def _expected_outcomes() -> dict[str, int]:
    outcomes = {"won": 0, "lost": 0, "stalled": 0, "open": 0}
    for folder in _call_folders():
        expected = _json(folder / "expected.json")["extraction"]["deal"]["outcome"]
        demo = bool(_json(folder / "script.json").get("demo"))
        outcomes[expected if not demo and expected != "no_show" else "open"] += 1
    for row in _client_rows():
        outcomes[row["outcome"]] += 1
    return outcomes


def test_history_load_is_idempotent_and_has_expected_outcome_mix() -> None:
    store = InMemoryIcpLeadsStore()

    first = load_fixture_history(store, FIXTURES_DIR)
    second = load_fixture_history(store, FIXTURES_DIR)

    assert first == second
    assert first.deals == len(_call_folders()) + len(_client_rows())
    assert first.contacts == len(_call_folders())
    assert first.outcomes == _expected_outcomes()
    assert all(
        deal.metadata["source"] == "fixtures"
        for deal in store.list_fixture_deals(include_demo=True)
    )
    interactions = [
        item
        for deal in store.list_fixture_deals(include_demo=False)
        for item in deal.interactions
    ]
    assert sum(item.channel == "call" for item in interactions) == len(_history_call_ids())
    assert sum(item.channel == "email" for item in interactions) == len(_email_rows())
    assert {item.source_external_id for item in interactions if item.channel == "email"} == {
        row["source_external_id"] for row in _email_rows()
    }


def test_reloading_the_fixtures_never_duplicates_a_company_or_a_deal() -> None:
    store = InMemoryIcpLeadsStore()

    load_fixture_history(store, FIXTURES_DIR)
    after_first = [deal.crm_external_id for deal in store.list_fixture_deals(include_demo=True)]
    companies_after_first = len(store.companies)
    load_fixture_history(store, FIXTURES_DIR)
    after_second = [deal.crm_external_id for deal in store.list_fixture_deals(include_demo=True)]

    assert after_first == after_second
    assert len(after_second) == len(set(after_second))
    assert len(store.companies) == companies_after_first
    assert len(store.contacts) == len(_call_folders())


def test_call_deals_are_named_for_the_ai_automation_offering() -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, FIXTURES_DIR)
    by_external = {
        deal.crm_external_id: deal for deal in store.list_fixture_deals(include_demo=True)
    }

    for folder in _call_folders():
        company = _json(folder / "expected.json")["extraction"]["company"]["name"]
        assert by_external[f"fixture:{folder.name}"].name == f"{company} AI automation"


def test_public_client_rows_load_as_contactless_won_deals_the_icp_counts() -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, FIXTURES_DIR)
    rows = _client_rows()
    by_external = {
        deal.crm_external_id: deal for deal in store.list_fixture_deals(include_demo=True)
    }

    for row in rows:
        deal = by_external[row["crm_external_id"]]
        assert deal.outcome == "won"
        assert deal.stage == "customer"
        assert deal.name == f"{row['name']} AI automation (public client)"
        assert deal.primary_contact_id is None
        assert deal.contact_role is None
        assert deal.amount is None
        assert deal.owner_name is None
        assert deal.close_date is None
        assert deal.interactions == []
        assert deal.summary == row["summary"]
        assert deal.company_name == row["name"]
        assert deal.company_domain == row["domain"]
        assert deal.industry == row["industry"]
        assert deal.employee_count is None
        assert deal.metadata["source"] == "fixtures"
        assert deal.metadata["evidence"] == "public_client_list"
        assert deal.metadata["source_url"] == row["source_url"]
        assert deal.metadata["icp_signals"] == {
            "industry": row["industry"],
            "headcount_band": None,
            "role": None,
            "trigger": None,
        }

    icp_ids = {deal.crm_external_id for deal in store.list_icp_deals()}
    assert {row["crm_external_id"] for row in rows} <= icp_ids
    won = [deal for deal in store.list_icp_deals() if deal.outcome == "won"]
    assert sum(deal.metadata.get("evidence") == "public_client_list" for deal in won) == len(rows)
