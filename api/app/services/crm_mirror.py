from __future__ import annotations

from typing import Any

from app.schemas.icp import DealRecord, InteractionEvidence
from app.services.icp_leads_store import IcpLeadsStore, split_name


def mirror_interaction(
    store: IcpLeadsStore,
    *,
    deal_external_id: str,
    interaction: InteractionEvidence,
    company: dict[str, Any] | None = None,
    contact: dict[str, Any] | None = None,
    deal: dict[str, Any] | None = None,
) -> DealRecord:
    """Mirror the production CRM write into the keyless in-memory demo store."""
    company_id = None
    if company and company.get("name"):
        company_id = store.upsert_company(company)["id"]

    contact_id = None
    if contact and (contact.get("name") or contact.get("email")):
        existing_contact = (
            store.get_contact_by_email(contact["email"]) if contact.get("email") else None
        )
        supplied_first, supplied_last = split_name(contact.get("name") or "")
        contact_values = {
            "first_name": supplied_first
            or (existing_contact or {}).get("first_name")
            or str(contact.get("email") or "contact").split("@", 1)[0],
            "last_name": supplied_last or (existing_contact or {}).get("last_name") or "",
            **(
                {"company_id": company_id or (existing_contact or {}).get("company_id")}
                if company_id or (existing_contact or {}).get("company_id")
                else {}
            ),
            **({"email": contact["email"]} if contact.get("email") else {}),
            **(
                {"phone": contact.get("phone") or (existing_contact or {}).get("phone")}
                if contact.get("phone") or (existing_contact or {}).get("phone")
                else {}
            ),
            **(
                {"title": contact.get("title") or (existing_contact or {}).get("title")}
                if contact.get("title") or (existing_contact or {}).get("title")
                else {}
            ),
            **(
                {"crm_external_id": f"slipstream-contact:{deal_external_id}"}
                if not contact.get("email")
                else {}
            ),
        }
        contact_id = store.upsert_contact(contact_values)["id"]

    existing = store.get_deal_by_external_id(deal_external_id)
    interactions = list(existing.interactions) if existing else []
    if not any(item.source_external_id == interaction.source_external_id for item in interactions):
        interactions.append(interaction)
    interactions = sorted(
        interactions, key=lambda item: (item.occurred_at, item.source_external_id), reverse=True
    )[:10]
    metadata = dict(existing.metadata) if existing else {}
    metadata.update((deal or {}).get("metadata") or {})
    metadata["source"] = metadata.get("source") or "live"
    metadata["channels"] = sorted({item.channel for item in interactions})
    values: dict[str, Any] = {
        "name": existing.name
        if existing
        else (deal or {}).get("name") or "CRM follow-up",
        "stage": (deal or {}).get("stage") or (existing.stage if existing else "discovery"),
        "outcome": (deal or {}).get("outcome") or (existing.outcome if existing else "open"),
        "currency": (deal or {}).get("currency") or (existing.currency if existing else "AUD"),
        "summary": (
            existing.summary if existing and existing.summary else (deal or {}).get("summary")
        ),
        "crm_external_id": deal_external_id,
        "metadata": metadata,
        "interactions": [item.model_dump(mode="json") for item in interactions],
    }
    if company_id or (existing and existing.company_id):
        values["company_id"] = company_id or existing.company_id
    if (existing and existing.primary_contact_id) or contact_id:
        values["primary_contact_id"] = (
            existing.primary_contact_id if existing and existing.primary_contact_id else contact_id
        )
    amount = (deal or {}).get("amount")
    if amount is not None or (existing and existing.amount is not None):
        values["amount"] = amount if amount is not None else existing.amount
    return store.upsert_deal(values)
