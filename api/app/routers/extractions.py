from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status

from app.core.llm import MissingReasoningProviderError
from app.routers.calls import load_call
from app.schemas.extraction import ExtractionResult
from app.schemas.icp import InteractionEvidence
from app.services.crm_mirror import mirror_interaction
from app.services.extract import (
    ExtractionUnavailableError,
    extract_fixture,
    extract_with_model,
)

router = APIRouter(prefix="/calls", tags=["extraction"])


def _read_stored(client: Any, conversation_id: UUID) -> ExtractionResult | None:
    rows = (
        client.table("conversations")
        .select("extracted_fields")
        .eq("id", str(conversation_id))
        .limit(1)
        .execute()
        .data
    )
    if not rows or not rows[0].get("extracted_fields"):
        return None
    return ExtractionResult.model_validate(rows[0]["extracted_fields"])


def _store(client: Any, result: ExtractionResult) -> None:
    company_id = None
    company_name = result.company.name.value
    if company_name:
        domain = result.company.domain.value
        company_key = domain or f"slipstream-company:{company_name.casefold()}"
        company_payload = {
            "name": company_name,
            **({"domain": domain.casefold()} if domain else {"crm_external_id": company_key}),
            **(
                {"industry": result.company.industry.value} if result.company.industry.value else {}
            ),
            **(
                {"employee_count": result.company.employee_count.value}
                if result.company.employee_count.value is not None
                else {}
            ),
            **(
                {"location": result.company.location.value} if result.company.location.value else {}
            ),
        }
        conflict = "domain" if domain else "crm_external_id"
        companies = (
            client.table("companies").upsert(company_payload, on_conflict=conflict).execute().data
        )
        if not companies:
            raise RuntimeError("CRM company upsert returned no row")
        company_id = companies[0]["id"]

    contact_id = None
    contact_name = result.contact.name.value
    if contact_name:
        first_name, _, last_name = contact_name.strip().partition(" ")
        email = result.contact.email.value
        contact_key = email or f"slipstream-contact:{result.conversation_id}"
        contact_payload = {
            "first_name": first_name,
            "last_name": last_name,
            **({"company_id": company_id} if company_id else {}),
            **({"email": email} if email else {"crm_external_id": contact_key}),
            **({"phone": result.contact.phone.value} if result.contact.phone.value else {}),
            **({"title": result.contact.title.value} if result.contact.title.value else {}),
        }
        conflict = "email" if email else "crm_external_id"
        contacts = (
            client.table("contacts").upsert(contact_payload, on_conflict=conflict).execute().data
        )
        if not contacts:
            raise RuntimeError("CRM contact upsert returned no row")
        contact_id = contacts[0]["id"]

    deal_payload = {
        "name": f"{company_name or contact_name or 'Unqualified'} — follow-up",
        "currency": result.deal.currency,
        "summary": result.summary,
        "crm_external_id": f"slipstream-conversation:{result.conversation_id}",
        **({"stage": result.deal.stage.value} if result.deal.stage.value else {}),
        **({"outcome": result.deal.outcome.value} if result.deal.outcome.value else {}),
        **({"company_id": company_id} if company_id else {}),
        **({"primary_contact_id": contact_id} if contact_id else {}),
        **({"amount": result.deal.amount.value} if result.deal.amount.value is not None else {}),
    }
    deals = client.table("deals").upsert(deal_payload, on_conflict="crm_external_id").execute().data
    if not deals:
        raise RuntimeError("CRM deal upsert returned no row")
    deal_id = deals[0]["id"]

    payload = result.model_dump(mode="json")
    updated = (
        client.table("conversations")
        .update(
            {
                "deal_id": deal_id,
                **({"contact_id": contact_id} if contact_id else {}),
                "extracted_fields": payload,
                "summary": result.summary,
                "processing_status": "ready",
                "processing_error": None,
            }
        )
        .eq("id", str(result.conversation_id))
        .execute()
    )
    if not updated.data:
        raise RuntimeError("CRM conversation link updated no row")


async def load_extraction(request: Request, conversation_id: UUID) -> ExtractionResult | None:
    if request.app.state.supabase is None:
        return request.app.state.extraction_store.get(str(conversation_id))
    try:
        return await asyncio.to_thread(_read_stored, request.app.state.supabase, conversation_id)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The CRM staging store is unavailable",
        ) from error


async def _save(request: Request, result: ExtractionResult, call: Any | None = None) -> None:
    if request.app.state.supabase is None:
        if call is not None and not call.fixture:
            mirror_interaction(
                request.app.state.icp_leads_store,
                deal_external_id=f"slipstream-conversation:{result.conversation_id}",
                interaction=InteractionEvidence(
                    source_external_id=call.source_external_id,
                    channel="call",
                    direction="unknown",
                    occurred_at=call.occurred_at,
                    subject=call.subject,
                    content=(result.summary or call.transcript)[:800],
                ),
                company={
                    "name": result.company.name.value,
                    **(
                        {"domain": result.company.domain.value.casefold()}
                        if result.company.domain.value
                        else {
                            "crm_external_id": (
                                f"slipstream-company:{result.company.name.value.casefold()}"
                            )
                        }
                    ),
                    **(
                        {"industry": result.company.industry.value}
                        if result.company.industry.value
                        else {}
                    ),
                    **(
                        {"employee_count": result.company.employee_count.value}
                        if result.company.employee_count.value is not None
                        else {}
                    ),
                    **(
                        {"location": result.company.location.value}
                        if result.company.location.value
                        else {}
                    ),
                }
                if result.company.name.value
                else None,
                contact={
                    "name": result.contact.name.value,
                    "email": result.contact.email.value,
                    "phone": result.contact.phone.value,
                    "title": result.contact.title.value,
                },
                deal={
                    "name": (
                        f"{result.company.name.value or result.contact.name.value or 'Unqualified'}"
                        " — follow-up"
                    ),
                    "stage": result.deal.stage.value,
                    "outcome": result.deal.outcome.value,
                    "amount": result.deal.amount.value,
                    "currency": result.deal.currency,
                    "summary": result.summary,
                    "metadata": {
                        "source": "live",
                        "fixture": bool(call.fixture),
                    },
                },
            )
        request.app.state.extraction_store[str(result.conversation_id)] = result
        return
    try:
        await asyncio.to_thread(_store, request.app.state.supabase, result)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The extracted CRM fields could not be staged",
        ) from error


@router.post("/{conversation_id}/extract", response_model=ExtractionResult)
async def extract_call(conversation_id: UUID, request: Request) -> ExtractionResult:
    lock = request.app.state.extraction_locks[
        conversation_id.int % len(request.app.state.extraction_locks)
    ]
    async with lock:
        existing = await load_extraction(request, conversation_id)
        if existing is not None:
            if request.app.state.supabase is not None:
                await _save(request, existing)
            return existing
        call = await load_call(request, conversation_id)
        if call is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
        try:
            result = await asyncio.to_thread(extract_with_model, call, request.app.state.settings)
        except MissingReasoningProviderError as error:
            if not call.fixture:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="No reasoning provider is configured; fixture calls remain available",
                ) from error
            result = await asyncio.to_thread(extract_fixture, call)
        except ExtractionUnavailableError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The call could not be converted into CRM fields",
            ) from error
        await _save(request, result, call)
        return result


@router.get("/{conversation_id}/extraction", response_model=ExtractionResult)
async def get_extraction(conversation_id: UUID, request: Request) -> ExtractionResult:
    result = await load_extraction(request, conversation_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extraction not found")
    return result
