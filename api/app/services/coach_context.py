"""CRM reads and bounded, source-addressable context. Never reads expected fixture labels."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from app.services.coach_state import RISKY

ROOT = Path(__file__).resolve().parents[3] / "fixtures"


def fixture_id(kind: str, value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"coach:{kind}:{value}"))


def fixture_records() -> list[dict]:
    return [json.loads(p.read_text()) for p in sorted((ROOT / "calls").glob("*/script.json"))]


def customers(client) -> list[dict]:
    if client is None:
        return [
            {
                "contact_id": fixture_id("contact", p["prospect"]["email"]),
                "deal_id": fixture_id("deal", p["call_id"]),
                "name": p["prospect"]["name"],
                "company": p["company"]["name"],
                "deal_name": "Managed IT",
                "role": p["prospect"]["role"],
                "demo": True,
            }
            for p in fixture_records()
        ]
    contacts = client.table("contacts").select("*").limit(500).execute().data
    companies = {
        c["id"]: c for c in client.table("companies").select("*").limit(500).execute().data
    }
    deals = client.table("deals").select("*").limit(1000).execute().data
    result = []
    for c in contacts:
        matches = [d for d in deals if d.get("company_id") == c.get("company_id")]
        for d in matches or [None]:
            result.append(
                {
                    "contact_id": c["id"],
                    "deal_id": d["id"] if d else None,
                    "name": f"{c['first_name']} {c['last_name']}".strip(),
                    "company": companies.get(c.get("company_id"), {}).get("name", ""),
                    "role": c.get("title"),
                    "deal_name": d["name"] if d else "No deal",
                    "demo": False,
                }
            )
    return result


def peer_sources(records: list[dict], company: dict, exclude: str, before: datetime) -> list[dict]:
    peers = [
        p
        for p in records
        if p["call_id"] != exclude
        and not p.get("demo")
        and datetime.fromisoformat(p["scheduled_at"]) < before
    ]
    peers.sort(
        key=lambda p: (
            p["company"]["industry"] == company.get("industry"),
            -abs(p["company"].get("headcount", 0) - company.get("headcount", 0)),
        ),
        reverse=True,
    )
    result = []
    for peer in peers[:3]:
        if peer.get("outcome") != "won":
            continue
        for i, turn in enumerate(peer["turns"][:-1]):
            reply = peer["turns"][i + 1]
            if (
                turn["speaker"] == "rep"
                and "?" in turn["text"]
                and not RISKY.search(turn["text"])
                and reply["speaker"] == "prospect"
                and len(reply["text"].split()) > 10
            ):
                result.append(
                    {
                        "id": f"peer:{peer['call_id']}:{i}",
                        "kind": "peer",
                        "text": turn["text"] + "\nCustomer response: " + reply["text"],
                        "label": f"{peer['company']['name']} · historical discovery",
                        "at": peer["scheduled_at"],
                    }
                )
                break
    return result


def load_context(
    client, contact_id: str | None, deal_id: str | None, new_customer: dict | None, before: datetime
) -> dict:
    sources: list[dict] = []
    if not contact_id:
        customer = new_customer or {}
        return finalise_context(
            customer,
            [
                {
                    "id": "customer",
                    "kind": "customer",
                    "label": "Provided before the call",
                    "text": json.dumps(customer),
                }
            ],
            customer.get("context") or "No prior history.",
        )
    if client is None:
        records = fixture_records()
        record = next(
            (
                p
                for p in records
                if fixture_id("contact", p["prospect"]["email"]) == contact_id
                and fixture_id("deal", p["call_id"]) == deal_id
            ),
            None,
        )
        if not record:
            raise ValueError("Choose an existing contact and deal")
        customer = {
            "name": record["prospect"]["name"],
            "company": record["company"]["name"],
            "role": record["prospect"]["role"],
            "industry": record["company"]["industry"],
        }
        # Only fixture identity is available. Transcript, trigger and outcome are held out.
        sources.append(
            {
                "id": "customer",
                "kind": "customer",
                "label": "Customer profile",
                "text": json.dumps(customer),
            }
        )
        sources += peer_sources(records, record["company"], record["call_id"], before)
        brief = (
            "Synthetic customer profile. This customer’s fixture call is held out from coaching."
        )
    else:
        contacts = client.table("contacts").select("*").eq("id", contact_id).execute().data
        if not contacts:
            raise ValueError("Contact not found")
        contact = contacts[0]
        company_rows = (
            client.table("companies").select("*").eq("id", contact["company_id"]).execute().data
            if contact.get("company_id")
            else []
        )
        company = company_rows[0] if company_rows else {}
        deal_rows = (
            client.table("deals").select("*").eq("id", deal_id).execute().data if deal_id else []
        )
        deal = deal_rows[0] if deal_rows else {}
        if deal_id and (not deal or deal.get("company_id") != contact.get("company_id")):
            raise ValueError("Deal does not belong to this customer")
        customer = {
            "name": f"{contact['first_name']} {contact['last_name']}".strip(),
            "company": company.get("name"),
            "role": contact.get("title"),
            "industry": company.get("industry"),
            "stage": deal.get("stage"),
        }
        sources.append(
            {
                "id": "customer",
                "kind": "customer",
                "label": "CRM profile",
                "text": json.dumps(customer),
            }
        )
        if deal:
            # Demo records may contain the future demo transcript; never expose it to the coach.
            held_out = (deal.get("metadata") or {}).get("demo", False)
            for table in () if held_out else ("notes", "tasks", "conversations"):
                query = client.table(table).select("*").eq("deal_id", deal_id)
                query = query.lt("created_at", before.isoformat())
                if table == "tasks":
                    query = query.is_("completed_at", "null")
                rows = query.order("created_at", desc=True).limit(12).execute().data
                for row in rows:
                    text = (
                        row.get("body")
                        or row.get("title")
                        or row.get("summary")
                        or row.get("raw_content")
                    )
                    if text:
                        sources.append(
                            {
                                "id": f"{table}:{row['id']}",
                                "kind": "history",
                                "label": table.title(),
                                "text": str(text)[:3500],
                                "at": row.get("created_at"),
                            }
                        )
            if deal.get("summary") and not held_out:
                sources.append(
                    {
                        "id": f"deal:{deal_id}",
                        "kind": "history",
                        "label": "Deal summary",
                        "text": deal["summary"][:2500],
                    }
                )
        peer_deals = []
        if contact.get("company_id"):
            peer_deals = (
                client.table("deals")
                .select("id,name,company_id,metadata")
                .eq("outcome", "won")
                .neq("company_id", contact.get("company_id"))
                .limit(30)
                .execute()
                .data
            )
        if deal.get("embedding") and deal.get("embedding_model") and not held_out:
            try:
                matches = (
                    client.rpc(
                        "match_deals",
                        {
                            "query_embedding": deal["embedding"],
                            "query_model": deal["embedding_model"],
                            "match_count": 10,
                            "outcome_filter": "won",
                        },
                    )
                    .execute()
                    .data
                )
                ranks = {item["deal_id"]: rank for rank, item in enumerate(matches)}
                peer_deals.sort(key=lambda peer: ranks.get(peer["id"], 1000))
            except Exception:
                pass  # Explicit industry matching remains available if embeddings are absent.
        for peer in peer_deals:
            if len([s for s in sources if s["kind"] == "peer"]) >= 3:
                break
            if (peer.get("metadata") or {}).get("demo"):
                continue
            peer_company = (
                client.table("companies")
                .select("industry")
                .eq("id", peer["company_id"])
                .execute()
                .data
            )
            if not peer_company or peer_company[0].get("industry") != company.get("industry"):
                continue
            conversations = (
                client.table("conversations")
                .select("id,occurred_at")
                .eq("deal_id", peer["id"])
                .lt("occurred_at", before.isoformat())
                .limit(3)
                .execute()
                .data
            )
            for conversation in conversations:
                segments = (
                    client.table("transcript_segments")
                    .select("*")
                    .eq("conversation_id", conversation["id"])
                    .order("sequence")
                    .limit(100)
                    .execute()
                    .data
                )
                for segment in segments:
                    if "?" in segment["body"] and not RISKY.search(segment["body"]):
                        sources.append(
                            {
                                "id": f"peer:{segment['id']}",
                                "kind": "peer",
                                "label": peer["name"] + " · historical question",
                                "text": segment["body"][:1500],
                            }
                        )
                        break
                if sources and sources[-1]["kind"] == "peer":
                    break
        brief = (
            deal.get("summary") if deal and not (deal.get("metadata") or {}).get("demo") else None
        )
        brief = brief or "No previous call summary available. Start with discovery."
    return finalise_context(customer, sources, brief)


def finalise_context(customer: dict, sources: list[dict], brief: str) -> dict:
    seller = json.loads((ROOT / "seller.json").read_text())
    approved = {
        "id": "approved:seller",
        "kind": "approved",
        "label": "Seller profile",
        "text": seller["description"],
    }
    return {"customer": customer, "sources": [approved, *sources[:39]], "brief": brief}
