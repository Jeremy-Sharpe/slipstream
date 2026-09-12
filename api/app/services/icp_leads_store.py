from __future__ import annotations

import json
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

from supabase import Client

from app.core.config import Settings
from app.core.database import create_supabase
from app.schemas.icp import DealRecord, IcpEvidenceItem, IcpProfile, StoredIcpProfile
from app.schemas.leads import Draft, Lead, LeadIn, LeadStatus

JsonDict = dict[str, Any]
MAX_ICP_DEALS = 100


class IcpLeadsStore(Protocol):
    def upsert_company(self, values: JsonDict) -> JsonDict: ...

    def upsert_contact(self, values: JsonDict) -> JsonDict: ...

    def upsert_deal(self, values: JsonDict) -> DealRecord: ...

    def list_fixture_deals(self, *, include_demo: bool = False) -> list[DealRecord]: ...

    def list_icp_deals(self, *, include_demo: bool = False) -> list[DealRecord]: ...

    def get_deal_by_external_id(self, external_id: str) -> DealRecord | None: ...

    def get_contact_by_email(self, email: str) -> JsonDict | None: ...

    def update_deal_embedding(
        self, deal_id: str, embedding: list[float], embedding_model: str
    ) -> DealRecord: ...

    def max_icp_version(self) -> int: ...

    def insert_icp_profile(
        self,
        *,
        version: int,
        profile: IcpProfile,
        model: str,
        embedding_model: str,
    ) -> StoredIcpProfile: ...

    def insert_icp_source_deal(
        self, *, profile_id: str, deal_id: str, evidence: JsonDict
    ) -> None: ...

    def latest_icp_profile(self) -> StoredIcpProfile | None: ...

    def get_icp_profile(self, profile_id: str) -> StoredIcpProfile | None: ...

    def source_deals_for_profile(self, profile_id: str) -> list[DealRecord]: ...

    def log_activity(
        self,
        action: str,
        *,
        actor: str = "slipstream",
        lead_id: str | None = None,
        deal_id: str | None = None,
        details: JsonDict | None = None,
    ) -> JsonDict: ...

    def upsert_lead(self, lead: LeadIn) -> Lead: ...

    def list_leads(
        self, *, icp_profile_id: str | None = None, status: LeadStatus | None = None
    ) -> list[Lead]: ...

    def get_lead(self, lead_id: str) -> Lead | None: ...

    def update_lead_status(self, lead_id: str, status: LeadStatus) -> Lead: ...

    def insert_draft(self, values: JsonDict) -> Draft: ...

    def latest_outreach_draft_for_lead(self, lead_id: str) -> Draft | None: ...

    def get_draft(self, draft_id: str) -> Draft | None: ...

    def approve_outreach_draft(self, draft_id: str, *, actor: str, when: datetime) -> Draft: ...

    def update_draft_delivered(self, draft_id: str, *, when: datetime) -> Draft: ...


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _row_id() -> str:
    return str(uuid4())


def _first_name(name: str | None) -> str:
    if not name:
        return ""
    return name.split(" ", 1)[0]


def _last_name(name: str | None) -> str:
    if not name or " " not in name:
        return ""
    return name.split(" ", 1)[1]


def _deal_from_row(row: JsonDict) -> DealRecord:
    company = row.get("companies") if isinstance(row.get("companies"), dict) else {}
    contact = row.get("contacts") if isinstance(row.get("contacts"), dict) else {}
    contact_name = " ".join(
        part for part in [contact.get("first_name"), contact.get("last_name")] if part
    )
    return DealRecord(
        id=row["id"],
        company_id=row.get("company_id"),
        primary_contact_id=row.get("primary_contact_id"),
        company_name=company.get("name") or row.get("company_name"),
        company_domain=company.get("domain") or row.get("company_domain"),
        industry=company.get("industry") or row.get("industry"),
        employee_count=company.get("employee_count") or row.get("employee_count"),
        location=company.get("location") or row.get("location"),
        contact_name=contact_name or row.get("contact_name"),
        contact_role=contact.get("title") or row.get("contact_role"),
        name=row["name"],
        stage=row["stage"],
        outcome=row["outcome"],
        amount=float(row["amount"]) if row.get("amount") is not None else None,
        currency=row.get("currency") or "AUD",
        owner_name=row.get("owner_name"),
        summary=row.get("summary"),
        close_date=row.get("close_date"),
        crm_external_id=row.get("crm_external_id"),
        embedding=_vector(row.get("embedding")),
        embedding_model=row.get("embedding_model"),
        metadata=row.get("metadata") or {},
        interactions=row.get("interactions")
        or (row.get("metadata") or {}).get("fixture_interactions")
        or [],
        updated_at=row.get("updated_at"),
    )


def _vector(value: object) -> list[float] | None:
    """PostgREST returns pgvector columns as text such as "[0.1,0.2]"; parse it back."""
    if value is None or isinstance(value, list):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [float(item) for item in parsed]
    raise ValueError("embedding column must be a vector literal or a list")


def _lead_from_row(row: JsonDict) -> Lead:
    return Lead.model_validate({**row, "embedding": _vector(row.get("embedding"))})


class SupabaseIcpLeadsStore:
    def __init__(self, client: Client) -> None:
        self._client = client

    def upsert_company(self, values: JsonDict) -> JsonDict:
        payload = deepcopy(values)
        if payload.get("domain"):
            payload["domain"] = str(payload["domain"]).strip().lower()
        return self._single(
            self._client.table("companies")
            .upsert(payload, on_conflict="domain")
            .select("*")
            .execute()
            .data
        )

    def upsert_contact(self, values: JsonDict) -> JsonDict:
        payload = deepcopy(values)
        if payload.get("email"):
            payload["email"] = str(payload["email"]).strip().lower()
        return self._single(
            self._client.table("contacts")
            .upsert(payload, on_conflict="email")
            .select("*")
            .execute()
            .data
        )

    def upsert_deal(self, values: JsonDict) -> DealRecord:
        payload = deepcopy(values)
        interactions = payload.pop("interactions", None)
        if interactions:
            metadata = dict(payload.get("metadata") or {})
            metadata["fixture_interactions"] = interactions
            payload["metadata"] = metadata
        row = self._single(
            self._client.table("deals")
            .upsert(payload, on_conflict="crm_external_id")
            .select("*")
            .execute()
            .data
        )
        return _deal_from_row(row)

    def list_fixture_deals(self, *, include_demo: bool = False) -> list[DealRecord]:
        rows = self._client.table("deals").select("*,companies(*),contacts(*)").execute().data
        deals = [
            _deal_from_row(row)
            for row in rows
            if row.get("metadata", {}).get("source") == "fixtures"
        ]
        if not include_demo:
            deals = [deal for deal in deals if not deal.metadata.get("demo")]
        return sorted(deals, key=lambda deal: deal.crm_external_id or "")

    def list_icp_deals(self, *, include_demo: bool = False) -> list[DealRecord]:
        rows = self._client.rpc(
            "read_icp_deals", {"include_demo": include_demo}
        ).execute().data
        if not isinstance(rows, list):
            raise RuntimeError("ICP deal snapshot returned an invalid response")
        return [_deal_from_row(row) for row in rows]

    def get_deal_by_external_id(self, external_id: str) -> DealRecord | None:
        rows = (
            self._client.table("deals")
            .select("*,companies(*),contacts(*)")
            .eq("crm_external_id", external_id)
            .limit(1)
            .execute()
            .data
        )
        return _deal_from_row(rows[0]) if rows else None

    def get_contact_by_email(self, email: str) -> JsonDict | None:
        rows = (
            self._client.table("contacts")
            .select("*")
            .eq("email", email.strip().lower())
            .limit(1)
            .execute()
            .data
        )
        return deepcopy(rows[0]) if rows else None

    def update_deal_embedding(
        self, deal_id: str, embedding: list[float], embedding_model: str
    ) -> DealRecord:
        row = self._single(
            self._client.table("deals")
            .update({"embedding": embedding, "embedding_model": embedding_model})
            .eq("id", deal_id)
            .select("*")
            .execute()
            .data
        )
        return _deal_from_row(row)

    def max_icp_version(self) -> int:
        rows = (
            self._client.table("icp_profiles")
            .select("version")
            .order("version", desc=True)
            .limit(1)
            .execute()
            .data
        )
        return int(rows[0]["version"]) if rows else 0

    def insert_icp_profile(
        self,
        *,
        version: int,
        profile: IcpProfile,
        model: str,
        embedding_model: str,
    ) -> StoredIcpProfile:
        payload = {
            "version": version,
            "status": "ready",
            "profile": profile.model_dump(mode="json"),
            "evidence": [item.model_dump(mode="json") for item in profile.evidence],
            "origami_brief": profile.origami_brief,
            "model": model,
            "embedding_model": embedding_model,
        }
        row = self._single(
            self._client.table("icp_profiles").insert(payload).select("*").execute().data
        )
        return _stored_profile(row)

    def insert_icp_source_deal(self, *, profile_id: str, deal_id: str, evidence: JsonDict) -> None:
        self._client.table("icp_profile_source_deals").insert(
            {"icp_profile_id": profile_id, "deal_id": deal_id, "evidence": evidence}
        ).execute()

    def latest_icp_profile(self) -> StoredIcpProfile | None:
        rows = (
            self._client.table("icp_profiles")
            .select("*")
            .eq("status", "ready")
            .order("version", desc=True)
            .limit(1)
            .execute()
            .data
        )
        return _stored_profile(rows[0]) if rows else None

    def get_icp_profile(self, profile_id: str) -> StoredIcpProfile | None:
        rows = self._client.table("icp_profiles").select("*").eq("id", profile_id).execute().data
        return _stored_profile(rows[0]) if rows else None

    def source_deals_for_profile(self, profile_id: str) -> list[DealRecord]:
        source_rows = (
            self._client.table("icp_profile_source_deals")
            .select("deal_id,evidence")
            .eq("icp_profile_id", profile_id)
            .execute()
            .data
        )
        snapshots = [
            DealRecord.model_validate(row["evidence"]["deal_snapshot"])
            for row in source_rows
            if isinstance(row.get("evidence"), dict)
            and isinstance(row["evidence"].get("deal_snapshot"), dict)
        ]
        snapshot_ids = {str(deal.id) for deal in snapshots}
        legacy_ids = {
            str(row["deal_id"])
            for row in source_rows
            if str(row["deal_id"]) not in snapshot_ids
        }
        if not legacy_ids:
            return snapshots
        rows = (
            self._client.table("deals")
            .select("*,companies(*),contacts(*)")
            .in_("id", list(legacy_ids))
            .execute()
            .data
        )
        return [*snapshots, *[_deal_from_row(row) for row in rows]]

    def log_activity(
        self,
        action: str,
        *,
        actor: str = "slipstream",
        lead_id: str | None = None,
        deal_id: str | None = None,
        details: JsonDict | None = None,
    ) -> JsonDict:
        payload = {
            "actor": actor,
            "action": action,
            "lead_id": lead_id,
            "deal_id": deal_id,
            "details": details or {},
        }
        return self._single(
            self._client.table("activities").insert(payload).select("*").execute().data
        )

    def upsert_lead(self, lead: LeadIn) -> Lead:
        row = self._single(
            self._client.table("leads")
            .upsert(lead.model_dump(mode="json"), on_conflict="origami_row_id")
            .select("*")
            .execute()
            .data
        )
        return _lead_from_row(row)

    def list_leads(
        self, *, icp_profile_id: str | None = None, status: LeadStatus | None = None
    ) -> list[Lead]:
        query = self._client.table("leads").select("*")
        if icp_profile_id:
            query = query.eq("icp_profile_id", icp_profile_id)
        if status:
            query = query.eq("status", status)
        rows = query.order("similarity_score", desc=True).execute().data
        return [_lead_from_row(row) for row in rows]

    def get_lead(self, lead_id: str) -> Lead | None:
        rows = self._client.table("leads").select("*").eq("id", lead_id).execute().data
        return _lead_from_row(rows[0]) if rows else None

    def update_lead_status(self, lead_id: str, status: LeadStatus) -> Lead:
        row = self._single(
            self._client.table("leads")
            .update({"status": status})
            .eq("id", lead_id)
            .select("*")
            .execute()
            .data
        )
        return _lead_from_row(row)

    def insert_draft(self, values: JsonDict) -> Draft:
        row = self._single(
            self._client.table("drafts").insert(deepcopy(values)).select("*").execute().data
        )
        return Draft.model_validate(row)

    def latest_outreach_draft_for_lead(self, lead_id: str) -> Draft | None:
        rows = (
            self._client.table("drafts")
            .select("*")
            .eq("lead_id", lead_id)
            .eq("kind", "outreach")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        return Draft.model_validate(rows[0]) if rows else None

    def get_draft(self, draft_id: str) -> Draft | None:
        rows = self._client.table("drafts").select("*").eq("id", draft_id).execute().data
        return Draft.model_validate(rows[0]) if rows else None

    def approve_outreach_draft(self, draft_id: str, *, actor: str, when: datetime) -> Draft:
        row = (
            self._client.rpc(
                "approve_outreach_draft",
                {"requested_draft_id": draft_id, "requested_actor": actor},
            )
            .execute()
            .data
        )
        if not isinstance(row, dict):
            raise RuntimeError("Outreach approval returned an invalid response")
        return Draft.model_validate(row)

    def update_draft_delivered(self, draft_id: str, *, when: datetime) -> Draft:
        row = self._single(
            self._client.table("drafts")
            .update({"status": "sent", "sent_at": when.isoformat()})
            .eq("id", draft_id)
            .eq("status", "approved")
            .select("*")
            .execute()
            .data
        )
        return Draft.model_validate(row)

    @staticmethod
    def _single(rows: list[JsonDict]) -> JsonDict:
        if not rows:
            raise RuntimeError("Supabase returned no rows")
        return rows[0]


class InMemoryIcpLeadsStore:
    def __init__(self) -> None:
        self.companies: dict[str, JsonDict] = {}
        self.contacts: dict[str, JsonDict] = {}
        self.deals: dict[str, JsonDict] = {}
        self.icp_profiles: dict[str, JsonDict] = {}
        self.icp_source_deals: dict[tuple[str, str], JsonDict] = {}
        self.leads: dict[str, JsonDict] = {}
        self.drafts: dict[str, JsonDict] = {}
        self.activities: list[JsonDict] = []

    def upsert_company(self, values: JsonDict) -> JsonDict:
        payload = deepcopy(values)
        payload["domain"] = str(payload.get("domain") or "").lower() or None
        key = payload.get("domain") or payload.get("crm_external_id") or _row_id()
        existing = self.companies.get(key, {})
        row = {**existing, **payload}
        row.setdefault("id", existing.get("id") or _row_id())
        row.setdefault("created_at", _now())
        row["updated_at"] = _now()
        self.companies[key] = row
        return deepcopy(row)

    def upsert_contact(self, values: JsonDict) -> JsonDict:
        payload = deepcopy(values)
        payload["email"] = str(payload.get("email") or "").lower() or None
        key = payload.get("email") or payload.get("crm_external_id") or _row_id()
        existing = self.contacts.get(key, {})
        row = {**existing, **payload}
        row.setdefault("id", existing.get("id") or _row_id())
        row.setdefault("created_at", _now())
        row["updated_at"] = _now()
        self.contacts[key] = row
        return deepcopy(row)

    def upsert_deal(self, values: JsonDict) -> DealRecord:
        payload = deepcopy(values)
        key = payload.get("crm_external_id") or _row_id()
        existing = self.deals.get(key, {})
        row = {**existing, **payload}
        row.setdefault("id", existing.get("id") or _row_id())
        row.setdefault("created_at", _now())
        row["updated_at"] = _now()
        self.deals[key] = row
        return self._deal_from_memory_row(row)

    def list_fixture_deals(self, *, include_demo: bool = False) -> list[DealRecord]:
        deals = [
            self._deal_from_memory_row(row)
            for row in self.deals.values()
            if row.get("metadata", {}).get("source") == "fixtures"
        ]
        if not include_demo:
            deals = [deal for deal in deals if not deal.metadata.get("demo")]
        return sorted(deals, key=lambda deal: deal.crm_external_id or "")

    def list_icp_deals(self, *, include_demo: bool = False) -> list[DealRecord]:
        return _select_icp_deals(
            [self._deal_from_memory_row(row) for row in self.deals.values()],
            include_demo=include_demo,
        )

    def get_deal_by_external_id(self, external_id: str) -> DealRecord | None:
        row = self.deals.get(external_id)
        return self._deal_from_memory_row(row) if row else None

    def get_contact_by_email(self, email: str) -> JsonDict | None:
        row = self.contacts.get(email.strip().lower())
        return deepcopy(row) if row else None

    def update_deal_embedding(
        self, deal_id: str, embedding: list[float], embedding_model: str
    ) -> DealRecord:
        key, row = self._deal_key_and_row(deal_id)
        row["embedding"] = embedding
        row["embedding_model"] = embedding_model
        row["updated_at"] = _now()
        self.deals[key] = row
        return self._deal_from_memory_row(row)

    def max_icp_version(self) -> int:
        return max((int(row["version"]) for row in self.icp_profiles.values()), default=0)

    def insert_icp_profile(
        self,
        *,
        version: int,
        profile: IcpProfile,
        model: str,
        embedding_model: str,
    ) -> StoredIcpProfile:
        row = {
            "id": _row_id(),
            "version": version,
            "status": "ready",
            "profile": profile.model_dump(mode="json"),
            "evidence": [item.model_dump(mode="json") for item in profile.evidence],
            "origami_brief": profile.origami_brief,
            "model": model,
            "embedding_model": embedding_model,
            "created_at": _now(),
        }
        self.icp_profiles[row["id"]] = row
        return _stored_profile(row)

    def insert_icp_source_deal(self, *, profile_id: str, deal_id: str, evidence: JsonDict) -> None:
        self.icp_source_deals[(profile_id, deal_id)] = {
            "icp_profile_id": profile_id,
            "deal_id": deal_id,
            "evidence": deepcopy(evidence),
            "created_at": _now(),
        }

    def latest_icp_profile(self) -> StoredIcpProfile | None:
        ready = [row for row in self.icp_profiles.values() if row.get("status") == "ready"]
        if not ready:
            return None
        return _stored_profile(max(ready, key=lambda row: int(row["version"])))

    def get_icp_profile(self, profile_id: str) -> StoredIcpProfile | None:
        row = self.icp_profiles.get(profile_id)
        return _stored_profile(row) if row else None

    def source_deals_for_profile(self, profile_id: str) -> list[DealRecord]:
        source_rows = [
            row
            for (source_profile_id, _), row in self.icp_source_deals.items()
            if source_profile_id == profile_id
        ]
        snapshots = [
            DealRecord.model_validate(row["evidence"]["deal_snapshot"])
            for row in source_rows
            if isinstance(row.get("evidence"), dict)
            and isinstance(row["evidence"].get("deal_snapshot"), dict)
        ]
        snapshot_ids = {str(deal.id) for deal in snapshots}
        legacy_ids = {
            str(row["deal_id"])
            for row in source_rows
            if str(row["deal_id"]) not in snapshot_ids
        }
        return [
            *snapshots,
            *[
                self._deal_from_memory_row(row)
                for row in self.deals.values()
                if str(row["id"]) in legacy_ids
            ],
        ]

    def log_activity(
        self,
        action: str,
        *,
        actor: str = "slipstream",
        lead_id: str | None = None,
        deal_id: str | None = None,
        details: JsonDict | None = None,
    ) -> JsonDict:
        row = {
            "id": len(self.activities) + 1,
            "actor": actor,
            "action": action,
            "lead_id": lead_id,
            "deal_id": deal_id,
            "details": deepcopy(details or {}),
            "created_at": _now(),
        }
        self.activities.append(row)
        return deepcopy(row)

    def upsert_lead(self, lead: LeadIn) -> Lead:
        payload = lead.model_dump(mode="json")
        key = payload["origami_row_id"]
        existing = self.leads.get(key, {})
        row = {**existing, **payload}
        row.setdefault("id", existing.get("id") or _row_id())
        row.setdefault("status", existing.get("status") or "new")
        row.setdefault("created_at", _now())
        row["updated_at"] = _now()
        self.leads[key] = row
        return Lead.model_validate(deepcopy(row))

    def list_leads(
        self, *, icp_profile_id: str | None = None, status: LeadStatus | None = None
    ) -> list[Lead]:
        rows = list(self.leads.values())
        if icp_profile_id:
            rows = [row for row in rows if str(row.get("icp_profile_id")) == icp_profile_id]
        if status:
            rows = [row for row in rows if row.get("status") == status]
        rows.sort(key=lambda row: row.get("similarity_score") or -2, reverse=True)
        return [Lead.model_validate(deepcopy(row)) for row in rows]

    def get_lead(self, lead_id: str) -> Lead | None:
        for row in self.leads.values():
            if str(row["id"]) == lead_id:
                return Lead.model_validate(deepcopy(row))
        return None

    def update_lead_status(self, lead_id: str, status: LeadStatus) -> Lead:
        key, row = self._lead_key_and_row(lead_id)
        row["status"] = status
        row["updated_at"] = _now()
        self.leads[key] = row
        return Lead.model_validate(deepcopy(row))

    def insert_draft(self, values: JsonDict) -> Draft:
        row = deepcopy(values)
        row.setdefault("id", _row_id())
        row.setdefault("created_at", _now())
        row["updated_at"] = _now()
        self.drafts[row["id"]] = row
        return Draft.model_validate(deepcopy(row))

    def latest_outreach_draft_for_lead(self, lead_id: str) -> Draft | None:
        rows = [
            row
            for row in self.drafts.values()
            if str(row.get("lead_id")) == lead_id and row.get("kind") == "outreach"
        ]
        if not rows:
            return None
        return Draft.model_validate(deepcopy(max(rows, key=lambda row: row["created_at"])))

    def get_draft(self, draft_id: str) -> Draft | None:
        row = self.drafts.get(draft_id)
        return Draft.model_validate(deepcopy(row)) if row else None

    def approve_outreach_draft(self, draft_id: str, *, actor: str, when: datetime) -> Draft:
        row = deepcopy(self.drafts[draft_id])
        if row.get("status") != "draft":
            return Draft.model_validate(row)
        row["status"] = "approved"
        row["approved_by"] = actor
        row["approved_at"] = when
        row["sent_at"] = None
        row["updated_at"] = _now()
        self.drafts[draft_id] = row
        lead = self.get_lead(str(row["lead_id"]))
        if lead is None:
            raise RuntimeError("Outreach draft lead disappeared")
        if lead.status != "contacted":
            self.update_lead_status(str(row["lead_id"]), "approved")
        self.log_activity(
            "outreach.approved",
            actor=actor,
            lead_id=str(row["lead_id"]),
            details={"draft_id": draft_id, "delivery": "not_sent"},
        )
        return Draft.model_validate(deepcopy(row))

    def update_draft_delivered(self, draft_id: str, *, when: datetime) -> Draft:
        row = deepcopy(self.drafts[draft_id])
        if row.get("status") != "approved":
            raise RuntimeError("Only approved drafts can be delivered")
        row["status"] = "sent"
        row["sent_at"] = when
        row["updated_at"] = _now()
        self.drafts[draft_id] = row
        return Draft.model_validate(deepcopy(row))

    def _deal_from_memory_row(self, row: JsonDict) -> DealRecord:
        company = self._company_by_id(row.get("company_id"))
        contact = self._contact_by_id(row.get("primary_contact_id"))
        enriched = {
            **row,
            "companies": company or {},
            "contacts": contact or {},
        }
        return _deal_from_row(enriched)

    def _company_by_id(self, company_id: str | None) -> JsonDict | None:
        if company_id is None:
            return None
        return next((row for row in self.companies.values() if row["id"] == company_id), None)

    def _contact_by_id(self, contact_id: str | None) -> JsonDict | None:
        if contact_id is None:
            return None
        return next((row for row in self.contacts.values() if row["id"] == contact_id), None)

    def _deal_key_and_row(self, deal_id: str) -> tuple[str, JsonDict]:
        for key, row in self.deals.items():
            if str(row["id"]) == deal_id:
                return key, deepcopy(row)
        raise KeyError(f"Deal not found: {deal_id}")

    def _lead_key_and_row(self, lead_id: str) -> tuple[str, JsonDict]:
        for key, row in self.leads.items():
            if str(row["id"]) == lead_id:
                return key, deepcopy(row)
        raise KeyError(f"Lead not found: {lead_id}")


def _stored_profile(row: JsonDict) -> StoredIcpProfile:
    payload = deepcopy(row)
    payload["profile"] = IcpProfile.model_validate(payload["profile"])
    payload["evidence"] = [
        IcpEvidenceItem.model_validate(item) for item in payload.get("evidence", [])
    ]
    return StoredIcpProfile.model_validate(payload)


def _select_icp_deals(
    deals: list[DealRecord], *, include_demo: bool = False
) -> list[DealRecord]:
    unique = {str(deal.id): deal for deal in deals}
    eligible = [
        deal
        for deal in unique.values()
        if (deal.metadata.get("source") == "fixtures" or deal.interactions)
        and (include_demo or not deal.metadata.get("demo"))
    ]
    fixtures = sorted(
        (deal for deal in eligible if deal.metadata.get("source") == "fixtures"),
        key=lambda deal: deal.crm_external_id or str(deal.id),
    )
    live = sorted(
        (deal for deal in eligible if deal.metadata.get("source") != "fixtures"),
        key=lambda deal: (
            deal.updated_at.isoformat() if deal.updated_at else "",
            str(deal.id),
        ),
        reverse=True,
    )
    return [*fixtures, *live][:MAX_ICP_DEALS]


def split_name(name: str) -> tuple[str, str]:
    return _first_name(name), _last_name(name)


def create_icp_leads_store(settings: Settings) -> IcpLeadsStore:
    if settings.storage_mode == "memory":
        return InMemoryIcpLeadsStore()
    client = create_supabase(settings)
    if client is None:
        raise RuntimeError("Supabase integration is not configured")
    return SupabaseIcpLeadsStore(client)
