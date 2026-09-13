from __future__ import annotations

import asyncio
import logging
import secrets
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError, field_validator

from app.services.email_delivery import (
    EmailDeliveryOutcomeUnknownError,
    EmailDeliveryPayload,
    EmailDeliveryReceipt,
    EmailDeliveryRejectedError,
    delivery_payload_sha256,
    resend_idempotency_key,
    send_with_resend,
)

LOGGER = logging.getLogger(__name__)
DELIVERY_ADMISSION_WAIT_SECONDS = 0.1
DELIVERY_TOTAL_SECONDS = 15
DELIVERY_RETRY_WINDOW = timedelta(hours=23, minutes=55)
EXPIRED_DELIVERY_DETAIL = "Ambiguous delivery left the safe retry window; reconcile it in Resend"
BATCH_DELIVERY_LIMIT = 8
BATCH_DELIVERY_CONCURRENCY = 2
BATCH_DELIVERY_TOTAL_SECONDS = 50
DELIVERY_WAITER_LIMIT = 16
BATCH_REQUEST_LIMIT = 4
BatchOutcome = Literal[
    "sent",
    "not_found",
    "not_deliverable",
    "busy",
    "rejected",
    "unavailable",
    "unknown",
    "not_started",
]


class DeliveryHttpError(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        *,
        outcome: BatchOutcome,
        retryable: bool = False,
        reconciliation_required: bool = False,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.outcome = outcome
        self.retryable = retryable
        self.reconciliation_required = reconciliation_required


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
    fresh: bool = False
    had_prior_submission: bool = False
    submission_count: int = 0


class BatchDeliveryRequest(BaseModel):
    draft_ids: list[UUID] = Field(min_length=1, max_length=BATCH_DELIVERY_LIMIT)

    @field_validator("draft_ids")
    @classmethod
    def draft_ids_are_unique(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("draft_ids must not contain duplicates")
        return value


class BatchDeliveryItem(BaseModel):
    draft_id: UUID
    outcome: BatchOutcome
    http_status: int
    detail: str | None = None
    retryable: bool = False
    reconciliation_required: bool = False
    receipt: EmailDeliveryReceipt | None = None


class BatchDeliveryResponse(BaseModel):
    requested_count: int
    confirmed_sent_count: int
    unconfirmed_count: int
    unknown_count: int
    results: list[BatchDeliveryItem]


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
            raise DeliveryHttpError(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The draft store is unavailable",
                outcome="unavailable",
                retryable=True,
            ) from error
    follow_up = request.app.state.draft_store.get(str(draft_id))
    if follow_up is not None:
        return DeliverableDraft(**follow_up.model_dump(), kind="follow_up", lead_id=None)
    outreach = request.app.state.icp_leads_store.get_draft(str(draft_id))
    return DeliverableDraft.model_validate(outreach.model_dump()) if outreach else None


def _claim_durable(client: Any, values: dict[str, str]) -> DeliveryClaim:
    result = client.rpc("claim_email_delivery_v2", values).execute().data
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
            error_code = getattr(error, "code", None)
            if error_code == "PT409":
                raise DeliveryHttpError(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The approved draft conflicts with its delivery ledger",
                    outcome="not_deliverable",
                    reconciliation_required=True,
                ) from error
            if error_code == "PT412":
                raise DeliveryHttpError(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The draft is not deliverable in its current state",
                    outcome="not_deliverable",
                ) from error
            if error_code == "PT423":
                raise DeliveryHttpError(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An email delivery reservation is already in progress",
                    outcome="busy",
                    retryable=True,
                ) from error
            raise DeliveryHttpError(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The delivery ledger is unavailable",
                outcome="unavailable",
                retryable=True,
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
            fresh=True,
            had_prior_submission=False,
            submission_count=0,
        )
    elif (
        stored.idempotency_key != key
        or stored.payload_sha256 != identity
        or stored.sender != sender
        or stored.recipient_email != payload.recipient_email
    ):
        if stored.submission_count > 0:
            raise DeliveryHttpError(
                status_code=status.HTTP_409_CONFLICT,
                detail="The delivery identity does not match its first attempt",
                outcome="not_deliverable",
                reconciliation_required=True,
            )
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
            fresh=True,
            had_prior_submission=False,
            submission_count=0,
        )
    else:
        had_prior_submission = stored.submission_count > 0 or stored.state == "unknown"
        expired = (
            had_prior_submission
            and now - stored.first_attempt_at >= DELIVERY_RETRY_WINDOW
        )
        may_send = stored.state != "sent" and not expired
        stored = stored.model_copy(
            update={
                "state": "pending" if may_send else stored.state,
                "attempt_owner": owner if may_send else stored.attempt_owner,
                "last_attempt_at": now if may_send else stored.last_attempt_at,
                "may_send": may_send,
                "expired": expired,
                "fresh": False,
                "had_prior_submission": had_prior_submission,
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
            LOGGER.exception("Could not mark email delivery %s unknown", draft_id)
            return
    else:
        stored = request.app.state.email_delivery_attempts.get(str(draft_id))
        if (
            stored is not None
            and stored.state == "pending"
            and str(stored.attempt_owner) == str(owner)
        ):
            request.app.state.email_delivery_attempts[str(draft_id)] = stored.model_copy(
                update={"state": "unknown", "may_send": False}
            )


def _release_durable(client: Any, draft_id: UUID, owner: UUID) -> None:
    client.rpc(
        "release_email_delivery_reservation",
        {"requested_draft_id": str(draft_id), "requested_owner": str(owner)},
    ).execute()


async def _release_unsubmitted(request: Request, draft_id: UUID, owner: UUID) -> None:
    """Best-effort release of a claim known not to have reached the provider."""
    if request.app.state.supabase is not None:
        try:
            await _run_db(request, _release_durable, request.app.state.supabase, draft_id, owner)
        except Exception:
            LOGGER.exception("Could not release email delivery reservation %s", draft_id)
        return

    stored = request.app.state.email_delivery_attempts.get(str(draft_id))
    if (
        stored is not None
        and stored.state == "pending"
        and stored.submission_count == 0
        and str(stored.attempt_owner) == str(owner)
    ):
        request.app.state.email_delivery_attempts.pop(str(draft_id), None)


async def _abandon_before_submission(
    request: Request,
    draft_id: UUID,
    owner: UUID,
    claim: DeliveryClaim,
) -> None:
    try:
        if claim.submission_count == 0:
            await _release_unsubmitted(request, draft_id, owner)
        else:
            await _mark_unknown(request, draft_id, owner)
    except asyncio.CancelledError:
        raise
    except Exception:
        LOGGER.exception("Could not abandon pre-submission reservation %s", draft_id)


def _start_durable(client: Any, draft_id: UUID, owner: UUID) -> None:
    client.rpc(
        "start_email_delivery_attempt",
        {"requested_draft_id": str(draft_id), "requested_owner": str(owner)},
    ).execute()


async def _start_submission(
    request: Request,
    draft: DeliverableDraft,
    payload: EmailDeliveryPayload,
    owner: UUID,
) -> None:
    """Persist the non-releasable transition immediately before provider I/O."""
    draft_id = UUID(str(draft.id))
    if request.app.state.supabase is not None:
        try:
            await _run_db(request, _start_durable, request.app.state.supabase, draft_id, owner)
        except Exception as error:
            error_code = getattr(error, "code", None)
            if error_code == "PT412":
                raise DeliveryHttpError(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The approved draft changed before provider submission",
                    outcome="not_deliverable",
                ) from error
            if error_code == "PT423":
                raise DeliveryHttpError(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The delivery reservation is no longer owned by this request",
                    outcome="busy",
                    retryable=True,
                ) from error
            raise DeliveryHttpError(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The delivery ledger is unavailable before provider submission",
                outcome="unavailable",
                retryable=True,
            ) from error
        return

    current = await _load(request, draft_id)
    if (
        current is None
        or current.status != "approved"
        or current.recipient_email != payload.recipient_email
        or current.subject != payload.subject
        or current.body != payload.body
    ):
        raise DeliveryHttpError(
            status_code=status.HTTP_409_CONFLICT,
            detail="The approved draft changed before provider submission",
            outcome="not_deliverable",
        )
    stored = request.app.state.email_delivery_attempts[str(draft_id)]
    if str(stored.attempt_owner) != str(owner) or stored.state != "pending":
        raise DeliveryHttpError(
            status_code=status.HTTP_409_CONFLICT,
            detail="The delivery reservation is no longer owned by this request",
            outcome="busy",
            retryable=True,
        )
    request.app.state.email_delivery_attempts[str(draft_id)] = stored.model_copy(
        update={
            "state": "pending",
            "fresh": False,
            "first_attempt_at": (
                datetime.now(UTC) if stored.submission_count == 0 else stored.first_attempt_at
            ),
            "last_attempt_at": datetime.now(UTC),
            "submission_count": stored.submission_count + 1,
        }
    )


def _rollback_start_durable(client: Any, draft_id: UUID, owner: UUID) -> None:
    client.rpc(
        "release_email_delivery_unsubmitted_attempt",
        {"requested_draft_id": str(draft_id), "requested_owner": str(owner)},
    ).execute()


async def _rollback_before_invocation(
    request: Request,
    draft_id: UUID,
    owner: UUID,
    claim: DeliveryClaim,
) -> None:
    """Undo a first submission transition when provider I/O never began."""
    if claim.had_prior_submission:
        await _mark_unknown(request, draft_id, owner)
        return
    if request.app.state.supabase is not None:
        try:
            await _run_db(
                request,
                _rollback_start_durable,
                request.app.state.supabase,
                draft_id,
                owner,
            )
        except Exception:
            LOGGER.exception("Could not roll back unsubmitted delivery %s", draft_id)
        return
    stored = request.app.state.email_delivery_attempts.get(str(draft_id))
    if (
        stored is not None
        and stored.state == "pending"
        and stored.submission_count in {0, 1}
        and str(stored.attempt_owner) == str(owner)
    ):
        request.app.state.email_delivery_attempts.pop(str(draft_id), None)


async def _require_submission_current(
    request: Request,
    draft: DeliverableDraft,
    payload: EmailDeliveryPayload,
) -> None:
    """Recheck the memory store after the final awaited disconnect check."""
    if request.app.state.supabase is not None:
        # The database trigger freezes delivery-sensitive fields while armed.
        return
    current = await _load(request, UUID(str(draft.id)))
    if (
        current is None
        or current.status != "approved"
        or current.recipient_email != payload.recipient_email
        or current.subject != payload.subject
        or current.body != payload.body
    ):
        raise DeliveryHttpError(
            status_code=status.HTTP_409_CONFLICT,
            detail="The approved draft changed before provider submission",
            outcome="not_deliverable",
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


def _require_delivery_configuration(request: Request) -> None:
    settings = request.app.state.settings
    if settings.resend_api_key is None or settings.resend_from is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery integration is not configured",
        )


async def _require_may_start(
    may_start: Callable[[], Awaitable[bool]] | None,
) -> None:
    if may_start is None:
        return
    try:
        allowed = await may_start()
    except asyncio.CancelledError:
        raise
    except Exception as error:
        raise DeliveryHttpError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The caller connection could not be checked before delivery",
            outcome="not_started",
            retryable=True,
        ) from error
    if not allowed:
        raise DeliveryHttpError(
            status_code=499,
            detail="The batch caller disconnected before this draft started",
            outcome="not_started",
            retryable=True,
        )


async def _deliver_draft_gated(
    draft_id: UUID,
    request: Request,
    deadline: float,
    may_start: Callable[[], Awaitable[bool]] | None = None,
    on_cancel: Callable[[], None] | None = None,
) -> EmailDeliveryReceipt:
    settings = request.app.state.settings
    admission = request.app.state.email_delivery_admission_slots
    remaining = deadline - asyncio.get_running_loop().time()
    if remaining <= 0:
        raise DeliveryHttpError(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The delivery deadline passed before provider admission; retry this draft",
            outcome="busy",
            retryable=True,
        )
    try:
        await asyncio.wait_for(
            admission.acquire(), timeout=min(DELIVERY_ADMISSION_WAIT_SECONDS, remaining)
        )
    except TimeoutError as error:
        raise DeliveryHttpError(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Email delivery capacity is busy; retry this exact draft",
            outcome="busy",
            retryable=True,
        ) from error
    owner: UUID | None = None
    claim: DeliveryClaim | None = None
    submission_armed = False
    provider_invoked = False
    admission_released = False
    try:
        async with asyncio.timeout_at(deadline):
            await _require_may_start(may_start)
            lock = request.app.state.email_delivery_locks[
                draft_id.int % len(request.app.state.email_delivery_locks)
            ]
            async with lock:
                draft = await _load(request, draft_id)
                if draft is None:
                    raise DeliveryHttpError(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Draft not found",
                        outcome="not_found",
                    )
                if draft.status == "draft":
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Approve the exact draft before delivery",
                        outcome="not_deliverable",
                    )
                try:
                    payload = EmailDeliveryPayload(
                        draft_id=str(draft.id),
                        recipient_email=draft.recipient_email,
                        subject=draft.subject,
                        body=draft.body,
                    )
                except ValidationError as error:
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="The approved draft does not fit the delivery contract",
                        outcome="not_deliverable",
                    ) from error
                if (
                    draft.status == "sent"
                    and request.app.state.supabase is None
                    and str(draft.id) not in request.app.state.email_delivery_attempts
                ):
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Sent draft has no delivery receipt; reconcile it before retrying",
                        outcome="not_deliverable",
                        reconciliation_required=True,
                    )

                owner = uuid4()
                claim = await _claim(request, draft, payload, settings.resend_from, owner)
                if claim.state == "sent":
                    return _receipt_from_claim(claim)
                if claim.expired:
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=EXPIRED_DELIVERY_DETAIL,
                        outcome="not_deliverable",
                        reconciliation_required=True,
                    )
                if not claim.may_send:
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="An email delivery attempt is already in progress",
                        outcome="busy",
                        retryable=True,
                    )
                if (
                    claim.had_prior_submission
                    and datetime.now(UTC) - claim.first_attempt_at >= DELIVERY_RETRY_WINDOW
                ):
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=EXPIRED_DELIVERY_DETAIL,
                        outcome="not_deliverable",
                        reconciliation_required=True,
                    )
                try:
                    await _require_may_start(may_start)
                except DeliveryHttpError as error:
                    await _abandon_before_submission(request, draft_id, owner, claim)
                    error.reconciliation_required = (
                        error.reconciliation_required or claim.had_prior_submission
                    )
                    raise
                if asyncio.get_running_loop().time() >= deadline:
                    await _abandon_before_submission(request, draft_id, owner, claim)
                    raise DeliveryHttpError(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=(
                            "The delivery deadline passed before provider submission; "
                            "retry this draft"
                        ),
                        outcome="busy",
                        retryable=True,
                        reconciliation_required=claim.had_prior_submission,
                    )
                try:
                    submission_armed = True
                    await _start_submission(request, draft, payload, owner)
                except DeliveryHttpError as error:
                    await _rollback_before_invocation(request, draft_id, owner, claim)
                    error.reconciliation_required = (
                        error.reconciliation_required or claim.had_prior_submission
                    )
                    raise
                try:
                    await _require_may_start(may_start)
                except DeliveryHttpError as error:
                    await _rollback_before_invocation(request, draft_id, owner, claim)
                    error.reconciliation_required = (
                        error.reconciliation_required or claim.had_prior_submission
                    )
                    raise
                if asyncio.get_running_loop().time() >= deadline:
                    await _rollback_before_invocation(request, draft_id, owner, claim)
                    raise DeliveryHttpError(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=(
                            "The delivery deadline passed before provider submission; "
                            "retry this draft"
                        ),
                        outcome="busy",
                        retryable=True,
                        reconciliation_required=claim.had_prior_submission,
                    )
                if (
                    claim.had_prior_submission
                    and datetime.now(UTC) - claim.first_attempt_at >= DELIVERY_RETRY_WINDOW
                ):
                    await _rollback_before_invocation(request, draft_id, owner, claim)
                    raise DeliveryHttpError(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=EXPIRED_DELIVERY_DETAIL,
                        outcome="not_deliverable",
                        reconciliation_required=True,
                    )
                try:
                    await _require_submission_current(request, draft, payload)
                except DeliveryHttpError as error:
                    await _rollback_before_invocation(request, draft_id, owner, claim)
                    error.reconciliation_required = (
                        error.reconciliation_required or claim.had_prior_submission
                    )
                    raise
                provider_invoked = True
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
        raise DeliveryHttpError(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The email provider rejected the approved draft",
            outcome="rejected",
            reconciliation_required=bool(claim and claim.had_prior_submission),
        ) from error
    except asyncio.CancelledError:
        if on_cancel is not None:
            on_cancel()
        admission.release()
        admission_released = True
        if owner is not None and claim is not None:
            cleanup = (
                _mark_unknown(request, draft_id, owner)
                if provider_invoked
                else (
                    _rollback_before_invocation(request, draft_id, owner, claim)
                    if submission_armed
                    else _abandon_before_submission(request, draft_id, owner, claim)
                )
            )
            try:
                await asyncio.wait_for(asyncio.shield(cleanup), timeout=0.25)
            except (TimeoutError, asyncio.CancelledError):
                pass
        raise
    except (EmailDeliveryOutcomeUnknownError, TimeoutError) as error:
        admission.release()
        admission_released = True
        if owner is not None and claim is not None:
            cleanup = (
                _mark_unknown(request, draft_id, owner)
                if provider_invoked
                else (
                    _rollback_before_invocation(request, draft_id, owner, claim)
                    if submission_armed
                    else _abandon_before_submission(request, draft_id, owner, claim)
                )
            )
            try:
                await asyncio.wait_for(cleanup, timeout=0.25)
            except TimeoutError:
                pass
        if not provider_invoked and (claim is None or not claim.had_prior_submission):
            raise DeliveryHttpError(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="The delivery deadline passed before provider submission",
                outcome="not_started",
                retryable=True,
            ) from error
        raise DeliveryHttpError(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The email delivery outcome is unknown",
            outcome="unknown",
            retryable=True,
            reconciliation_required=True,
        ) from error
    finally:
        if not admission_released:
            admission.release()


async def _deliver_draft(
    draft_id: UUID,
    request: Request,
    may_start: Callable[[], Awaitable[bool]] | None = None,
    on_cancel: Callable[[], None] | None = None,
) -> EmailDeliveryReceipt:
    """Coalesce same-draft callers before they consume global provider capacity."""
    deadline = asyncio.get_running_loop().time() + DELIVERY_TOTAL_SECONDS
    waiters = request.app.state.email_delivery_waiter_slots
    if waiters.locked():
        raise DeliveryHttpError(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Email delivery request capacity is busy; retry this exact draft",
            outcome="busy",
            retryable=True,
        )
    await waiters.acquire()
    gate = request.app.state.email_delivery_gate_locks[
        draft_id.int % len(request.app.state.email_delivery_gate_locks)
    ]
    try:
        try:
            await asyncio.wait_for(
                gate.acquire(), timeout=max(0, deadline - asyncio.get_running_loop().time())
            )
        except TimeoutError as error:
            raise DeliveryHttpError(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Another delivery is still using this draft lock; retry it later",
                outcome="busy",
                retryable=True,
            ) from error
        try:
            return await _deliver_draft_gated(
                draft_id, request, deadline, may_start, on_cancel
            )
        finally:
            gate.release()
    finally:
        waiters.release()


async def _deliver_draft_batch(
    batch: BatchDeliveryRequest,
    request: Request,
) -> BatchDeliveryResponse:
    """Deliver an explicit bounded set of already-approved drafts.

    The caller is responsible for campaign scheduling and passes exact draft IDs;
    this endpoint never discovers or implicitly enrolls recipients.
    """
    concurrency = asyncio.Semaphore(BATCH_DELIVERY_CONCURRENCY)
    stop_starting = asyncio.Event()
    results: list[BatchDeliveryItem | None] = [None] * len(batch.draft_ids)

    async def client_disconnected() -> bool:
        checker = getattr(request, "is_disconnected", None)
        return bool(await checker()) if callable(checker) else False

    async def deliver_one(index: int, draft_id: UUID) -> None:
        async with concurrency:
            if stop_starting.is_set():
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="not_started",
                    http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Batch execution stopped before this draft started",
                    retryable=True,
                )
                return
            try:
                disconnected = await client_disconnected()
            except asyncio.CancelledError:
                stop_starting.set()
                raise
            except Exception:
                LOGGER.exception("Could not check batch connection for draft %s", draft_id)
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="not_started",
                    http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="The caller connection could not be checked before delivery",
                    retryable=True,
                )
                return
            if disconnected:
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="not_started",
                    http_status=499,
                    detail="The batch caller disconnected before this draft started",
                    retryable=True,
                )
                return
            try:
                async def may_start() -> bool:
                    disconnected_after_wait = await client_disconnected()
                    return not disconnected_after_wait and not stop_starting.is_set()

                receipt = await _deliver_draft(
                    draft_id, request, may_start, stop_starting.set
                )
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="sent",
                    http_status=status.HTTP_200_OK,
                    receipt=receipt,
                )
            except DeliveryHttpError as error:
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome=error.outcome,
                    http_status=error.status_code,
                    detail=str(error.detail),
                    retryable=error.retryable,
                    reconciliation_required=error.reconciliation_required,
                )
            except HTTPException as error:
                LOGGER.exception("Untyped delivery error for draft %s", draft_id)
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="unknown",
                    http_status=error.status_code,
                    detail="The draft delivery outcome is unknown",
                    retryable=error.status_code >= 500,
                    reconciliation_required=True,
                )
            except asyncio.CancelledError:
                stop_starting.set()
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="unknown",
                    http_status=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="The draft delivery outcome is unknown",
                    retryable=True,
                    reconciliation_required=True,
                )
                raise
            except Exception:
                LOGGER.exception("Unexpected batch delivery error for draft %s", draft_id)
                results[index] = BatchDeliveryItem(
                    draft_id=draft_id,
                    outcome="unknown",
                    http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="The draft delivery outcome is unknown",
                    reconciliation_required=True,
                )

    workers = [
        asyncio.create_task(deliver_one(index, draft_id))
        for index, draft_id in enumerate(batch.draft_ids)
    ]
    try:
        try:
            async with asyncio.timeout(BATCH_DELIVERY_TOTAL_SECONDS):
                await asyncio.gather(*workers)
        except TimeoutError:
            pass
    finally:
        for worker in workers:
            if not worker.done():
                worker.cancel()
        await asyncio.gather(*workers, return_exceptions=True)

    completed_results = [
        item
        or BatchDeliveryItem(
            draft_id=batch.draft_ids[index],
            outcome="not_started",
            http_status=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The batch deadline passed before this draft started",
            retryable=True,
        )
        for index, item in enumerate(results)
    ]
    sent_count = sum(item.outcome == "sent" for item in completed_results)
    return BatchDeliveryResponse(
        requested_count=len(completed_results),
        confirmed_sent_count=sent_count,
        unconfirmed_count=len(completed_results) - sent_count,
        unknown_count=sum(item.outcome == "unknown" for item in completed_results),
        results=completed_results,
    )


async def deliver_draft_batch(
    batch: BatchDeliveryRequest,
    request: Request,
    ingest_token: str | None = None,
) -> BatchDeliveryResponse:
    """Apply request-level admission control around the bounded batch workflow."""
    _authorise(request, ingest_token)
    _require_delivery_configuration(request)
    requests = request.app.state.email_delivery_batch_slots
    if requests.locked():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Batch delivery request capacity is busy; retry this batch later",
        )
    await requests.acquire()
    try:
        return await _deliver_draft_batch(batch, request)
    finally:
        requests.release()
