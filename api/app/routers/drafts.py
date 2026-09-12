from __future__ import annotations

import asyncio
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Body, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.routers.extractions import load_extraction
from app.services.draft import DraftResponse, draft_follow_up, mark_sent

router = APIRouter(prefix="/drafts", tags=["drafts"])


class ApprovalRequest(BaseModel):
    approved_by: str = Field(default="Demo rep", min_length=1, max_length=120)


def _read_draft(client: Any, draft_id: UUID) -> DraftResponse | None:
    rows = client.table("drafts").select("*").eq("id", str(draft_id)).limit(1).execute().data
    if not rows:
        return None
    row = rows[0]
    return DraftResponse(
        id=row["id"],
        conversation_id=row["conversation_id"],
        recipient_name=row["recipient_name"],
        recipient_email=row["recipient_email"],
        subject=row["subject"],
        body=row["body"],
        status=row["status"],
        model=row.get("model") or "grounded-template-v1",
        approved_by=row.get("approved_by"),
        approved_at=row.get("approved_at"),
        sent_at=row.get("sent_at"),
    )


def _create_draft(client: Any, draft: DraftResponse) -> DraftResponse:
    conversation = (
        client.table("conversations")
        .select("deal_id")
        .eq("id", str(draft.conversation_id))
        .limit(1)
        .execute()
        .data
    )
    if not conversation or not conversation[0].get("deal_id"):
        raise RuntimeError("The extraction has not created its CRM deal")
    existing = (
        client.table("drafts")
        .select("id")
        .eq("conversation_id", str(draft.conversation_id))
        .eq("kind", "follow_up")
        .limit(1)
        .execute()
        .data
    )
    if existing:
        stored = _read_draft(client, UUID(existing[0]["id"]))
        if stored is None:
            raise RuntimeError("Stored draft disappeared")
        return stored
    client.table("drafts").upsert(
        {
            "id": str(draft.id),
            "deal_id": conversation[0]["deal_id"],
            "conversation_id": str(draft.conversation_id),
            "kind": "follow_up",
            "recipient_name": draft.recipient_name,
            "recipient_email": draft.recipient_email,
            "subject": draft.subject,
            "body": draft.body,
            "status": "draft",
            "model": draft.model,
            "prompt_version": "grounded-template-v1",
        },
        on_conflict="id",
        ignore_duplicates=True,
    ).execute()
    stored = _read_draft(client, draft.id)
    if stored is None:
        raise RuntimeError("Draft insert returned no row")
    return stored


def _approve(client: Any, draft: DraftResponse, approved_by: str) -> DraftResponse:
    draft_rows = (
        client.table("drafts")
        .select("deal_id,status")
        .eq("id", str(draft.id))
        .limit(1)
        .execute()
        .data
    )
    if not draft_rows:
        raise RuntimeError("Draft disappeared before approval")
    activity_key = f"draft-approved:{draft.id}"
    client.table("activities").upsert(
        {
            "deal_id": draft_rows[0]["deal_id"],
            "conversation_id": str(draft.conversation_id),
            "action": "follow_up_approved",
            "fixture_key": activity_key,
            "details": {"approved_by": approved_by, "delivery": "simulated"},
        },
        on_conflict="fixture_key",
        ignore_duplicates=True,
    ).execute()
    activities = (
        client.table("activities")
        .select("created_at,details")
        .eq("fixture_key", activity_key)
        .limit(1)
        .execute()
        .data
    )
    if not activities:
        raise RuntimeError("Approval audit could not be established")
    canonical_approver = activities[0]["details"]["approved_by"]
    canonical_time = activities[0]["created_at"]
    client.table("drafts").update(
        {
            "status": "sent",
            "approved_by": canonical_approver,
            "approved_at": canonical_time,
            "sent_at": canonical_time,
        }
    ).eq("id", str(draft.id)).eq("status", "draft").execute()
    stored = _read_draft(client, draft.id)
    if stored is None or stored.status != "sent":
        raise RuntimeError("Draft approval did not complete")
    return stored


async def _get(request: Request, draft_id: UUID) -> DraftResponse | None:
    if request.app.state.supabase is None:
        return request.app.state.draft_store.get(str(draft_id))
    try:
        return await asyncio.to_thread(_read_draft, request.app.state.supabase, draft_id)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The draft store is unavailable",
        ) from error


@router.post("/from-call/{conversation_id}", response_model=DraftResponse)
async def create_call_draft(conversation_id: UUID, request: Request) -> DraftResponse:
    extraction = await load_extraction(request, conversation_id)
    if extraction is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Extract CRM fields before drafting the follow-up",
        )
    draft = draft_follow_up(extraction)
    if request.app.state.supabase is None:
        request.app.state.draft_store.setdefault(str(draft.id), draft)
        return request.app.state.draft_store[str(draft.id)]
    try:
        return await asyncio.to_thread(_create_draft, request.app.state.supabase, draft)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The follow-up draft could not be stored",
        ) from error


@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(draft_id: UUID, request: Request) -> DraftResponse:
    draft = await _get(request, draft_id)
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    return draft


@router.post("/{draft_id}/approve", response_model=DraftResponse)
async def approve_draft(
    draft_id: UUID,
    request: Request,
    approval: Annotated[ApprovalRequest | None, Body()] = None,
) -> DraftResponse:
    approved_by = (approval.approved_by if approval else "Demo rep").strip()
    if not approved_by:
        raise HTTPException(status_code=422, detail="Approver must not be blank")
    draft = await _get(request, draft_id)
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    if draft.status == "sent" and request.app.state.supabase is None:
        return draft
    if request.app.state.supabase is None:
        sent = mark_sent(draft, approved_by)
        request.app.state.draft_store[str(draft_id)] = sent
        request.app.state.activity_store[f"draft-approved:{draft_id}"] = {
            "action": "follow_up_approved",
            "approved_by": approved_by,
            "delivery": "simulated",
        }
        return sent
    try:
        return await asyncio.to_thread(_approve, request.app.state.supabase, draft, approved_by)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The follow-up approval could not be recorded",
        ) from error
