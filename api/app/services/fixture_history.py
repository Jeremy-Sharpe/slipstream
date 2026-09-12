import json
from pathlib import Path
from typing import Any

from app.schemas.icp import FixtureHistoryCounts
from app.services.icp_leads_store import IcpLeadsStore, split_name

VALID_STAGES = {"discovery", "demo", "evaluation", "pilot", "procurement", "customer"}


def load_fixture_history(store: IcpLeadsStore, fixtures_dir: Path) -> FixtureHistoryCounts:
    calls_dir = fixtures_dir / "calls"
    for call_dir in sorted(path for path in calls_dir.iterdir() if path.is_dir()):
        expected = _read_json(call_dir / "expected.json")
        script = _read_json(call_dir / "script.json")
        _load_call(store, expected, script)
    deals = store.list_fixture_deals(include_demo=True)
    outcomes = {"won": 0, "lost": 0, "stalled": 0, "open": 0}
    for deal in deals:
        outcomes[deal.outcome] = outcomes.get(deal.outcome, 0) + 1
    return FixtureHistoryCounts(
        companies=len({deal.company_id for deal in deals if deal.company_id}),
        contacts=len({deal.primary_contact_id for deal in deals if deal.primary_contact_id}),
        deals=len(deals),
        outcomes=outcomes,
    )


def _load_call(store: IcpLeadsStore, expected: dict[str, Any], script: dict[str, Any]) -> None:
    extraction = expected["extraction"]
    call_id = expected["call_id"]
    contact_email = extraction["contact"]["email"].strip().lower()
    domain = contact_email.split("@", 1)[1]
    company = store.upsert_company(
        {
            "name": extraction["company"]["name"],
            "domain": domain,
            "industry": extraction["company"].get("industry"),
            "employee_count": extraction["company"].get("headcount"),
            "location": extraction["company"].get("location"),
            "metadata": {"source": "fixtures"},
        }
    )
    first_name, last_name = split_name(extraction["contact"]["name"])
    contact = store.upsert_contact(
        {
            "company_id": company["id"],
            "first_name": first_name,
            "last_name": last_name,
            "email": contact_email,
            "phone": extraction["contact"].get("phone"),
            "title": extraction["contact"].get("role"),
            "metadata": {"source": "fixtures", "fixture_call_id": call_id},
        }
    )
    original_outcome = extraction["deal"]["outcome"]
    outcome = _map_outcome(original_outcome, demo=bool(script.get("demo")))
    stage = _map_stage(extraction["deal"].get("stage"))
    close_date = None
    if outcome in {"won", "lost"}:
        close_date = str(script["scheduled_at"]).split("T", 1)[0]
    store.upsert_deal(
        {
            "company_id": company["id"],
            "primary_contact_id": contact["id"],
            "name": f"{extraction['company']['name']} managed IT",
            "stage": stage,
            "outcome": outcome,
            "amount": extraction["deal"].get("value_aud"),
            "currency": "AUD",
            "owner_name": script.get("rep"),
            "summary": _summary(expected, script),
            "close_date": close_date,
            "crm_external_id": f"fixture:{call_id}",
            "metadata": {
                "source": "fixtures",
                "fixture_call_id": call_id,
                "trigger": script.get("trigger"),
                "icp_signals": expected.get("icp_signals", {}),
                "demo": bool(script.get("demo")),
                "original_outcome": original_outcome,
            },
        }
    )


def _map_outcome(outcome: str, *, demo: bool) -> str:
    if demo:
        return "open"
    if outcome == "no_show":
        return "open"
    if outcome in {"won", "lost", "stalled"}:
        return outcome
    return "open"


def _map_stage(stage: str | None) -> str:
    if stage == "closed_won":
        return "customer"
    if stage == "closed_lost":
        return "discovery"
    if stage in VALID_STAGES:
        return stage
    return "discovery"


def _summary(expected: dict[str, Any], script: dict[str, Any]) -> str:
    scorecard = expected.get("scorecard", {})
    trigger = script.get("trigger") or expected.get("icp_signals", {}).get("trigger")
    parts = [scorecard.get("notes"), f"Trigger: {trigger}" if trigger else None]
    return " ".join(part for part in parts if part)


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
