from __future__ import annotations

import asyncio
import secrets
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.routers.drafts import _create_draft
from app.services.draft import DraftResponse
from app.services.email import EmailIngest, EmailRecord, draft_thread_reply, record_email

router = APIRouter(prefix="/emails", tags=["emails"])


def _authorised(request: Request, token: str | None) -> bool:
    required = request.app.state.settings.ingest_token
    return required is None or (
        token is not None
        and secrets.compare_digest(token.encode(), required.get_secret_value().encode())
    )


def _persist(client: Any, record: EmailRecord) -> None:
    contact = record.sender if record.direction == "inbound" else record.recipients[0]
    first, _, last = (contact.name or contact.email.split("@", 1)[0]).partition(" ")
    contacts = (
        client.table("contacts")
        .upsert(
            {"first_name": first, "last_name": last, "email": contact.email}, on_conflict="email"
        )
        .execute()
        .data
    )
    if not contacts:
        raise RuntimeError("Contact upsert returned no row")
    deals = (
        client.table("deals")
        .upsert(
            {
                "name": f"{record.subject} — email follow-up",
                "primary_contact_id": contacts[0]["id"],
                "crm_external_id": record.deal_external_id,
            },
            on_conflict="crm_external_id",
        )
        .execute()
        .data
    )
    if not deals:
        raise RuntimeError("Deal upsert returned no row")
    client.table("conversations").upsert(
        {
            "id": str(record.id),
            "deal_id": deals[0]["id"],
            "contact_id": contacts[0]["id"],
            "channel": "email",
            "subject": record.subject,
            "direction": record.direction,
            "occurred_at": record.occurred_at.isoformat(),
            "source_external_id": record.source_external_id,
            "raw_content": record.body,
            "processing_status": "ready",
            "metadata": {
                "thread_external_id": record.thread_external_id,
                "sender": record.sender.model_dump(),
                "recipients": [party.model_dump() for party in record.recipients],
                "in_reply_to": record.in_reply_to,
            },
        },
        on_conflict="channel,source_external_id",
        ignore_duplicates=True,
    ).execute()


def _record_from_row(row: dict[str, Any]) -> EmailRecord:
    metadata = row.get("metadata") or {}
    return EmailRecord(
        id=row["id"],
        source_external_id=row["source_external_id"],
        thread_external_id=metadata["thread_external_id"],
        direction=row["direction"],
        sender=metadata["sender"],
        recipients=metadata["recipients"],
        subject=row["subject"],
        body=row.get("raw_content") or "",
        occurred_at=row["occurred_at"],
        in_reply_to=metadata.get("in_reply_to"),
        contact_email=(
            metadata["sender"]["email"]
            if row["direction"] == "inbound"
            else metadata["recipients"][0]["email"]
        ),
        deal_external_id=f"slipstream-email-thread:{metadata['thread_external_id']}",
    )


def _read_source(client: Any, source_external_id: str) -> EmailRecord | None:
    rows = (
        client.table("conversations")
        .select("id,source_external_id,direction,subject,raw_content,occurred_at,metadata")
        .eq("channel", "email")
        .eq("source_external_id", source_external_id)
        .limit(1)
        .execute()
        .data
    )
    return _record_from_row(rows[0]) if rows else None


def _read_thread(client: Any, thread_external_id: str) -> list[EmailRecord]:
    rows = (
        client.table("conversations")
        .select("id,source_external_id,direction,subject,raw_content,occurred_at,metadata")
        .eq("channel", "email")
        .contains("metadata", {"thread_external_id": thread_external_id})
        .order("occurred_at")
        .execute()
        .data
    )
    return [_record_from_row(row) for row in rows]


async def _load_thread(thread_external_id: str, request: Request) -> list[EmailRecord]:
    if request.app.state.supabase is None:
        return request.app.state.email_threads.get(thread_external_id, [])
    try:
        return await asyncio.to_thread(_read_thread, request.app.state.supabase, thread_external_id)
    except Exception as error:
        raise HTTPException(status_code=503, detail="The email store is unavailable") from error


@router.post("", response_model=EmailRecord)
async def ingest_email(
    message: EmailIngest,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> EmailRecord:
    if not _authorised(request, ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    record = record_email(message)
    existing = request.app.state.email_store.get(str(record.id))
    if existing is None and request.app.state.supabase is not None:
        try:
            existing = await asyncio.to_thread(
                _read_source, request.app.state.supabase, record.source_external_id
            )
        except Exception as error:
            raise HTTPException(status_code=503, detail="The email store is unavailable") from error
    if existing is not None:
        if existing == record:
            return existing
        raise HTTPException(status_code=409, detail="Email source ID already exists")
    if request.app.state.supabase is not None:
        try:
            await asyncio.to_thread(_persist, request.app.state.supabase, record)
        except Exception as error:
            raise HTTPException(status_code=503, detail="The email store is unavailable") from error
    request.app.state.email_store[str(record.id)] = record
    request.app.state.email_threads.setdefault(record.thread_external_id, []).append(record)
    return record


@router.get("/threads/{thread_external_id}", response_model=list[EmailRecord])
async def get_thread(
    thread_external_id: str,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> list[EmailRecord]:
    if not _authorised(request, ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    return sorted(
        await _load_thread(thread_external_id, request),
        key=lambda item: item.occurred_at,
    )


@router.post("/threads/{thread_external_id}/draft-reply", response_model=DraftResponse)
async def create_reply(
    thread_external_id: str,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> DraftResponse:
    if not _authorised(request, ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    messages = await _load_thread(thread_external_id, request)
    if not messages:
        raise HTTPException(status_code=404, detail="Email thread not found")
    draft = draft_thread_reply(messages)
    if request.app.state.supabase is not None:
        try:
            draft = await asyncio.to_thread(_create_draft, request.app.state.supabase, draft)
        except Exception as error:
            raise HTTPException(
                status_code=503, detail="The reply draft could not be stored"
            ) from error
    request.app.state.draft_store.setdefault(str(draft.id), draft)
    return request.app.state.draft_store[str(draft.id)]
