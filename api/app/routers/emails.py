from __future__ import annotations

import asyncio
import hashlib
import secrets
import time
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.llm import MissingReasoningProviderError
from app.routers.drafts import _create_draft
from app.schemas.icp import InteractionEvidence
from app.services.crm_mirror import mirror_interaction
from app.services.draft import DraftResponse, DraftUnavailableError
from app.services.email import (
    EmailIngest,
    EmailRecord,
    draft_thread_reply,
    record_email,
    scoped_email_id,
)

router = APIRouter(prefix="/emails", tags=["emails"])
MAX_THREAD_MESSAGES = 5000
MAX_THREAD_BYTES = 8 * 1024 * 1024
ROW_FIELDS = "id,source_external_id,direction,subject,raw_content,occurred_at,metadata"


class EmailThreadTooLargeError(RuntimeError):
    pass


def _thread_is_too_large(records: list[EmailRecord]) -> bool:
    if len(records) > MAX_THREAD_MESSAGES:
        return True
    total_bytes = 0
    for record in records:
        total_bytes += len(record.model_dump_json().encode())
        if total_bytes > MAX_THREAD_BYTES:
            return True
    return False


def _authorised(request: Request, token: str | None) -> bool:
    required = request.app.state.settings.ingest_token
    return required is None or (
        token is not None
        and secrets.compare_digest(token.encode(), required.get_secret_value().encode())
    )


def _metadata(record: EmailRecord) -> dict[str, Any]:
    return {
        "provider": record.provider,
        "mailbox_external_id": record.mailbox_external_id,
        "mailbox": record.mailbox.model_dump(),
        "provider_source_external_id": record.source_external_id,
        "thread_external_id": record.thread_external_id,
        "namespaced_thread_id": record.namespaced_thread_id,
        "sender": record.sender.model_dump(),
        "recipients": [party.model_dump() for party in record.recipients],
        "in_reply_to": record.in_reply_to,
        "contact_email": record.contact_email,
        "deal_external_id": record.deal_external_id,
    }


def _is_deadlock(error: Exception) -> bool:
    return getattr(error, "code", None) == "40P01" or "deadlock detected" in str(error).casefold()


def _persist(client: Any, record: EmailRecord) -> EmailRecord:
    external_parties: dict[str, dict[str, str | None]] = {}
    if record.sender.email != record.mailbox.email:
        external_parties[record.sender.email] = record.sender.model_dump()
    for recipient in record.recipients:
        if recipient.email != record.mailbox.email and recipient.kind != "bcc":
            external_parties[recipient.email] = {
                "email": recipient.email,
                "name": recipient.name,
            }
    payload = {
        "id": str(record.id),
        "source_external_id": record.namespaced_source_id,
        "subject": record.subject,
        "direction": record.direction,
        "occurred_at": record.occurred_at.isoformat(),
        "raw_content": record.body,
        "metadata": _metadata(record),
        "contacts": list(external_parties.values()),
        "primary_contact_email": record.contact_email,
        "deal_external_id": record.deal_external_id,
    }
    result: Any = None
    for attempt in range(2):
        try:
            result = client.rpc("ingest_email_conversation", {"payload": payload}).execute().data
            break
        except Exception as error:
            if attempt == 1 or not _is_deadlock(error):
                raise
            time.sleep(0.05)
    if not result:
        raise RuntimeError("Email ingestion returned no canonical row")
    return _record_from_row(result[0] if isinstance(result, list) else result)


def _record_from_row(row: dict[str, Any]) -> EmailRecord:
    metadata = row.get("metadata") or {}
    return EmailRecord(
        id=row["id"],
        provider=metadata["provider"],
        mailbox_external_id=metadata["mailbox_external_id"],
        mailbox=metadata["mailbox"],
        source_external_id=metadata["provider_source_external_id"],
        thread_external_id=metadata["thread_external_id"],
        direction=row["direction"],
        sender=metadata["sender"],
        recipients=metadata["recipients"],
        subject=row["subject"],
        body=row.get("raw_content") or "",
        occurred_at=row["occurred_at"],
        in_reply_to=metadata.get("in_reply_to"),
        contact_email=metadata.get("contact_email"),
        deal_external_id=metadata["deal_external_id"],
    )


def _read_source(client: Any, namespaced_source_id: str) -> EmailRecord | None:
    rows = (
        client.table("conversations")
        .select(ROW_FIELDS)
        .eq("channel", "email")
        .eq("source_external_id", namespaced_source_id)
        .limit(1)
        .execute()
        .data
    )
    return _record_from_row(rows[0]) if rows else None


def _read_thread(client: Any, namespaced_thread_id: str) -> list[EmailRecord]:
    snapshot = (
        client.rpc(
            "read_email_thread",
            {"thread_id": namespaced_thread_id},
        )
        .execute()
        .data
    )
    if not isinstance(snapshot, dict):
        raise RuntimeError("Email thread read returned an invalid snapshot")
    rows = snapshot.get("messages")
    if not isinstance(rows, list) or not isinstance(snapshot.get("overflow"), bool):
        raise RuntimeError("Email thread read returned an invalid snapshot")
    records = [_record_from_row(row) for row in rows]
    if snapshot["overflow"] or _thread_is_too_large(records):
        raise EmailThreadTooLargeError("Email thread exceeds the supported message limit")
    return records


def _thread_key(provider: str, mailbox_external_id: str, thread_external_id: str) -> str:
    return scoped_email_id("thread", provider.casefold(), mailbox_external_id, thread_external_id)


async def _load_thread(
    provider: str, mailbox_external_id: str, thread_external_id: str, request: Request
) -> list[EmailRecord]:
    key = _thread_key(provider, mailbox_external_id, thread_external_id)
    if request.app.state.supabase is None:
        records = request.app.state.email_threads.get(key, [])
        if _thread_is_too_large(records):
            raise HTTPException(status_code=413, detail="Email thread is too large")
        return records
    try:
        return await asyncio.to_thread(_read_thread, request.app.state.supabase, key)
    except EmailThreadTooLargeError as error:
        raise HTTPException(status_code=413, detail="Email thread is too large") from error
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
    lock_digest = hashlib.sha256(record.namespaced_source_id.encode()).digest()[0]
    lock = request.app.state.ingest_locks[lock_digest % len(request.app.state.ingest_locks)]
    async with lock:
        if request.app.state.supabase is None:
            existing = request.app.state.email_store.get(str(record.id))
        else:
            try:
                existing = await asyncio.to_thread(
                    _read_source, request.app.state.supabase, record.namespaced_source_id
                )
            except Exception as error:
                raise HTTPException(
                    status_code=503, detail="The email store is unavailable"
                ) from error
        if existing is not None:
            if existing == record:
                return existing
            raise HTTPException(status_code=409, detail="Email source ID already exists")
        if request.app.state.supabase is not None:
            try:
                canonical = await asyncio.to_thread(_persist, request.app.state.supabase, record)
            except Exception as error:
                raise HTTPException(
                    status_code=503, detail="The email store is unavailable"
                ) from error
            if canonical != record:
                raise HTTPException(status_code=409, detail="Email source ID already exists")
            return canonical
        contact_email = record.contact_email
        try:
            mirror_interaction(
                request.app.state.icp_leads_store,
                deal_external_id=record.deal_external_id,
                interaction=InteractionEvidence(
                    source_external_id=record.namespaced_source_id,
                    channel="email",
                    direction=record.direction,
                    occurred_at=record.occurred_at,
                    subject=record.subject,
                    content=record.body[:800],
                ),
                contact={"email": contact_email} if contact_email else None,
                deal={
                    "name": f"{record.subject} — email follow-up",
                    "summary": f"Email thread: {record.subject}",
                    "metadata": {"source": "live"},
                },
            )
        except Exception as error:
            raise HTTPException(
                status_code=503, detail="The email could not be mirrored into the CRM"
            ) from error
        request.app.state.email_store[str(record.id)] = record
        request.app.state.email_threads.setdefault(record.namespaced_thread_id, []).append(record)
        return record


@router.get(
    "/{provider}/mailboxes/{mailbox_external_id}/threads/{thread_external_id}",
    response_model=list[EmailRecord],
)
async def get_thread(
    provider: str,
    mailbox_external_id: str,
    thread_external_id: str,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> list[EmailRecord]:
    if not _authorised(request, ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    return sorted(
        await _load_thread(provider, mailbox_external_id, thread_external_id, request),
        key=lambda item: (item.occurred_at, str(item.id)),
    )


@router.post(
    "/{provider}/mailboxes/{mailbox_external_id}/threads/{thread_external_id}/draft-reply",
    response_model=DraftResponse,
)
async def create_reply(
    provider: str,
    mailbox_external_id: str,
    thread_external_id: str,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> DraftResponse:
    if not _authorised(request, ingest_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")
    messages = await _load_thread(provider, mailbox_external_id, thread_external_id, request)
    if not messages:
        raise HTTPException(status_code=404, detail="Email thread not found")
    try:
        draft = await asyncio.to_thread(
            draft_thread_reply, messages, request.app.state.settings
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except MissingReasoningProviderError as error:
        raise HTTPException(
            status_code=503, detail="The reply draft model is not configured"
        ) from error
    except DraftUnavailableError as error:
        raise HTTPException(status_code=502, detail="The reply could not be drafted") from error
    if request.app.state.supabase is not None:
        try:
            draft = await asyncio.to_thread(_create_draft, request.app.state.supabase, draft)
        except Exception as error:
            raise HTTPException(
                status_code=503, detail="The reply draft could not be stored"
            ) from error
        request.app.state.draft_store.pop(str(draft.id), None)
        return draft
    request.app.state.draft_store.setdefault(str(draft.id), draft)
    return request.app.state.draft_store[str(draft.id)]
