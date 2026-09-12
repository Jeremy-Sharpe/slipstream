from __future__ import annotations

import asyncio
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, ValidationError

from app.services.email_delivery import (
    EmailDeliveryOutcomeUnknownError,
    EmailDeliveryPayload,
    EmailDeliveryReceipt,
    EmailDeliveryRejectedError,
    delivery_payload_sha256,
    resend_idempotency_key,
    send_with_resend,
)

router = APIRouter(prefix="/drafts", tags=["email-delivery"])
DELIVERY_ADMISSION_WAIT_SECONDS = 0.1
DELIVERY_TOTAL_SECONDS = 15
DELIVERY_RETRY_WINDOW = timedelta(hours=23, minutes=55)
EXPIRED_DELIVERY_DETAIL = "Ambiguous delivery left the safe retry window; reconcile it in Resend"


class DeliverableDraft(BaseModel):
    id: UUID | str
    kind: Literal["follow_up", "outreach"]
    deal_id: UUID | str | None = None
    lead_id: UUID | str | None = None
    conversation_id: UUID | str | None = None
    recipient_email: str | None = None
    subject: str
    body: str
    status: Literal["draft", "approved", "sent"]
    approved_by: str | None = None


class DeliveryClaim(BaseModel):
    draft_id: UUID | str
    idempotency_key: str
    payload_sha256: str
    sender: str
    recipient_email: str
    state: Literal["pending", "unknown", "sent"]
    attempt_owner: UUID | str
    first_attempt_at: datetime
    last_attempt_at: datetime
    provider_message_id: str | None = None
    sent_at: datetime | None = None
    may_send: bool
    expired: bool


async def _run_db(request: Request, function: Any, *args: Any) -> Any:
    slots = request.app.state.email_delivery_db_slots
    await slots.acquire()
    loop = asyncio.get_running_loop()
    future = loop.run_in_executor(request.app.state.email_delivery_db_executor, function, *args)
    release_on_completion = False
    try:
        return await asyncio.shield(future)
    except asyncio.CancelledError:
        future.add_done_callback(lambda _: loop.call_soon_threadsafe(slots.release))
        release_on_completion = True
        raise
    finally:
        if not release_on_completion:
            slots.release()


def _authorise(request: Request, token: str | None) -> None:
    required = request.app.state.settings.ingest_token
    if (
        required is None
        or token is None
        or not secrets.compare_digest(token.encode(), required.get_secret_value().encode())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest token")


def _read_durable(client: Any, draft_id: UUID) -> DeliverableDraft | None:
    rows = client.table("drafts").select("*").eq("id", str(draft_id)).limit(1).execute().data
    return DeliverableDraft.model_validate(rows[0]) if rows else None


async def _load(request: Request, draft_id: UUID) -> DeliverableDraft | None:
    if request.app.state.supabase is not None:
        try:
            return await _run_db(request, _read_durable, request.app.state.supabase, draft_id)
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The draft store is unavailable",
            ) from error
    follow_up = request.app.state.draft_store.get(str(draft_id))
    if follow_up is not None:
        return DeliverableDraft(**follow_up.model_dump(), kind="follow_up", lead_id=None)
    outreach = request.app.state.icp_leads_store.get_draft(str(draft_id))
    return DeliverableDraft.model_validate(outreach.model_dump()) if outreach else None


def _claim_durable(client: Any, values: dict[str, str]) -> DeliveryClaim:
    result = client.rpc("claim_email_delivery", values).execute().data
    return DeliveryClaim.model_validate(result)


async def _claim(
    request: Request,
    draft: DeliverableDraft,
    payload: EmailDeliveryPayload,
    sender: str,
    owner: UUID,
) -> DeliveryClaim:
    identity = delivery_payload_sha256(sender, payload)
    key = resend_idempotency_key(sender, payload)
    values = {
        "requested_draft_id": str(draft.id),
        "requested_idempotency_key": key,
        "requested_payload_sha256": identity,
        "requested_sender": sender,
        "requested_recipient_email": payload.recipient_email,
        "requested_subject": payload.subject,
        "requested_body": payload.body,
        "requested_owner": str(owner),
    }
    if request.app.state.supabase is not None:
        try:
            return await _run_db(request, _claim_durable, request.app.state.supabase, values)
        except Exception as error:
            if getattr(error, "code", None) == "PT409":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The approved draft conflicts with its delivery ledger",
                ) from error
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The delivery ledger is unavailable",
            ) from error

    now = datetime.now(UTC)
    stored = request.app.state.email_delivery_attempts.get(str(draft.id))
    if stored is None:
        stored = DeliveryClaim(
            draft_id=draft.id,
            idempotency_key=key,
            payload_sha256=identity,
            sender=sender,
            recipient_email=payload.recipient_email,
            state="pending",
            attempt_owner=owner,
            first_attempt_at=now,
            last_attempt_at=now,
            may_send=True,
            expired=False,
        )
    elif (
        stored.idempotency_key != key
        or stored.payload_sha256 != identity
        or stored.sender != sender
        or stored.recipient_email != payload.recipient_email
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The delivery identity does not match its first attempt",
        )
    else:
        expired = stored.state != "sent" and now - stored.first_attempt_at >= DELIVERY_RETRY_WINDOW
        may_send = stored.state != "sent" and not expired
        stored = stored.model_copy(
            update={
                "state": "pending" if may_send else stored.state,
                "attempt_owner": owner if may_send else stored.attempt_owner,
                "last_attempt_at": now if may_send else stored.last_attempt_at,
                "may_send": may_send,
                "expired": expired,
            }
        )
    request.app.state.email_delivery_attempts[str(draft.id)] = stored
    return stored


def _unknown_durable(client: Any, draft_id: UUID, owner: UUID) -> None:
    client.rpc(
        "mark_email_delivery_unknown",
        {"requested_draft_id": str(draft_id), "requested_owner": str(owner)},
    ).execute()


async def _mark_unknown(request: Request, draft_id: UUID, owner: UUID) -> None:
    if request.app.state.supabase is not None:
        try:
            await _run_db(request, _unknown_durable, request.app.state.supabase, draft_id, owner)
        except Exception:
            return
    else:
        stored = request.app.state.email_delivery_attempts.get(str(draft_id))
        if stored is not None and str(stored.attempt_owner) == str(owner):
            request.app.state.email_delivery_attempts[str(draft_id)] = stored.model_copy(
                update={"state": "unknown", "may_send": False}
            )


def _complete_durable(
    client: Any, draft_id: UUID, owner: UUID, provider_message_id: str
) -> DeliveryClaim:
    result = (
        client.rpc(
            "complete_email_delivery",
            {
                "requested_draft_id": str(draft_id),
                "requested_owner": str(owner),
                "requested_provider_message_id": provider_message_id,
            },
        )
        .execute()
        .data
    )
    return DeliveryClaim.model_validate({**result, "may_send": False, "expired": False})


async def _complete(
    request: Request,
    draft: DeliverableDraft,
    owner: UUID,
    receipt: EmailDeliveryReceipt,
) -> None:
    if request.app.state.supabase is not None:
        await _run_db(
            request,
            _complete_durable,
            request.app.state.supabase,
            UUID(str(draft.id)),
            owner,
            receipt.provider_message_id,
        )
        return

    when = datetime.now(UTC)
    if draft.kind == "follow_up":
        stored_draft = request.app.state.draft_store[str(draft.id)]
        if stored_draft.status == "approved":
            request.app.state.draft_store[str(draft.id)] = stored_draft.model_copy(
                update={"status": "sent", "sent_at": when}
            )
    else:
        stored_draft = request.app.state.icp_leads_store.get_draft(str(draft.id))
        if stored_draft is not None and stored_draft.status == "approved":
            request.app.state.icp_leads_store.update_draft_delivered(str(draft.id), when=when)
        if draft.lead_id is not None:
            request.app.state.icp_leads_store.update_lead_status(str(draft.lead_id), "contacted")
            request.app.state.icp_leads_store.log_activity(
                "outreach.delivered",
                actor=draft.approved_by or "approved-rep",
                lead_id=str(draft.lead_id),
                details={"draft_id": str(draft.id), **receipt.model_dump()},
            )
    attempt = request.app.state.email_delivery_attempts[str(draft.id)]
    request.app.state.email_delivery_attempts[str(draft.id)] = attempt.model_copy(
        update={
            "state": "sent",
            "provider_message_id": receipt.provider_message_id,
            "sent_at": when,
            "last_attempt_at": when,
            "may_send": False,
        }
    )
    request.app.state.activity_store[f"draft-delivered:{draft.id}"] = {
        "action": "email.delivered",
        "provider": receipt.provider,
        "provider_message_id": receipt.provider_message_id,
        "idempotency_key": receipt.idempotency_key,
    }


def _receipt_from_claim(claim: DeliveryClaim) -> EmailDeliveryReceipt:
    if claim.provider_message_id is None:
        raise RuntimeError("Sent delivery has no provider receipt")
    return EmailDeliveryReceipt(
        draft_id=str(claim.draft_id),
        provider_message_id=claim.provider_message_id,
        idempotency_key=claim.idempotency_key,
    )


@router.post("/{draft_id}/deliver", response_model=EmailDeliveryReceipt)
async def deliver_draft(
    draft_id: UUID,
    request: Request,
    ingest_token: Annotated[str | None, Header(alias="X-Slipstream-Ingest-Token")] = None,
) -> EmailDeliveryReceipt:
    settings = request.app.state.settings
    if settings.resend_api_key is None or settings.resend_from is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery integration is not configured",
        )
    _authorise(request, ingest_token)
    admission = request.app.state.email_delivery_admission_slots
    try:
        await asyncio.wait_for(admission.acquire(), timeout=DELIVERY_ADMISSION_WAIT_SECONDS)
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Email delivery capacity is busy; retry this exact draft",
        ) from error
    owner: UUID | None = None
    admission_released = False
    try:
        async with asyncio.timeout(DELIVERY_TOTAL_SECONDS):
            lock = request.app.state.email_delivery_locks[
                draft_id.int % len(request.app.state.email_delivery_locks)
            ]
            async with lock:
                draft = await _load(request, draft_id)
                if draft is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
                    )
                if draft.status == "draft":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Approve the exact draft before delivery",
                    )
                try:
                    payload = EmailDeliveryPayload(
                        draft_id=str(draft.id),
                        recipient_email=draft.recipient_email,
                        subject=draft.subject,
                        body=draft.body,
                    )
                except ValidationError as error:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="The approved draft does not fit the delivery contract",
                    ) from error
                if (
                    draft.status == "sent"
                    and request.app.state.supabase is None
                    and str(draft.id) not in request.app.state.email_delivery_attempts
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Sent draft has no delivery receipt; reconcile it before retrying",
                    )

                owner = uuid4()
                claim = await _claim(request, draft, payload, settings.resend_from, owner)
                if claim.state == "sent":
                    return _receipt_from_claim(claim)
                if claim.expired:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=EXPIRED_DELIVERY_DETAIL,
                    )
                if not claim.may_send:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="An email delivery attempt is already in progress",
                    )
                if datetime.now(UTC) - claim.first_attempt_at >= DELIVERY_RETRY_WINDOW:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=EXPIRED_DELIVERY_DETAIL,
                    )
                try:
                    receipt = await send_with_resend(
                        request.app.state.email_delivery_client,
                        base_url=settings.resend_base_url,
                        api_key=settings.resend_api_key.get_secret_value(),
                        sender=settings.resend_from,
                        payload=payload,
                    )
                except EmailDeliveryRejectedError:
                    await _mark_unknown(request, draft_id, owner)
                    raise
                except EmailDeliveryOutcomeUnknownError:
                    await _mark_unknown(request, draft_id, owner)
                    raise
                try:
                    await _complete(request, draft, owner, receipt)
                except Exception as error:
                    await _mark_unknown(request, draft_id, owner)
                    raise EmailDeliveryOutcomeUnknownError(
                        "Email was accepted but its local delivery record is incomplete"
                    ) from error
                return receipt
    except EmailDeliveryRejectedError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The email provider rejected the approved draft",
        ) from error
    except (EmailDeliveryOutcomeUnknownError, TimeoutError) as error:
        admission.release()
        admission_released = True
        if owner is not None:
            try:
                await asyncio.wait_for(_mark_unknown(request, draft_id, owner), timeout=0.25)
            except TimeoutError:
                pass
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The email delivery outcome is unknown",
        ) from error
    finally:
        if not admission_released:
            admission.release()
