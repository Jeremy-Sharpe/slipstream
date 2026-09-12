from typing import Annotated, Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.core.config import Settings
from app.core.llm import MissingEmbeddingProviderError, MissingReasoningProviderError
from app.schemas.leads import (
    Draft,
    Lead,
    LeadSourceAccepted,
    LeadSourceRequest,
    LeadSourceStatus,
    OutreachApproveRequest,
    OutreachRequest,
)
from app.services.dependencies import get_embedding_client, get_settings, get_store
from app.services.icp_leads_store import IcpLeadsStore
from app.services.leads import complete_search, start_search
from app.services.origami import OrigamiClient
from app.services.outreach import approve_outreach, draft_outreach

router = APIRouter(prefix="/leads", tags=["leads"])
SettingsDep = Annotated[Settings, Depends(get_settings)]
StoreDep = Annotated[IcpLeadsStore, Depends(get_store)]


@router.post("/source", response_model=LeadSourceAccepted, status_code=status.HTTP_202_ACCEPTED)
async def source(
    body: LeadSourceRequest,
    background: BackgroundTasks,
    request: Request,
    settings: SettingsDep,
    store: StoreDep,
) -> LeadSourceAccepted:
    _require(settings, "origami")
    _require(settings, "embeddings")
    origami = _origami_client(settings)
    try:
        job, profile_id = await start_search(
            store,
            origami,
            icp_profile_id=str(body.icp_profile_id) if body.icp_profile_id else None,
            count=body.count,
            quality=body.quality,
        )
    except ValueError as error:
        await origami.aclose()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    background.add_task(
        _complete_and_close,
        store,
        origami,
        get_embedding_client(request),
        settings,
        profile_id,
        job.id,
    )
    return LeadSourceAccepted(origami_job_id=job.id, icp_profile_id=profile_id, status=job.status)


@router.get("/source/{job_id}", response_model=LeadSourceStatus)
async def source_status(job_id: str, settings: SettingsDep) -> LeadSourceStatus:
    _require(settings, "origami")
    origami = _origami_client(settings)
    try:
        job = await origami.get_job(job_id)
    finally:
        await origami.aclose()
    return LeadSourceStatus(
        status=job.status,
        phase=job.phase,
        credits=job.credits,
        next_poll_at=job.next_poll_at,
    )


@router.get("", response_model=list[Lead])
def list_leads(
    store: StoreDep,
    icp_profile_id: str | None = None,
    status: str | None = None,
) -> list[Lead]:
    return store.list_leads(icp_profile_id=icp_profile_id, status=status)  # type: ignore[arg-type]


@router.post("/{lead_id}/outreach", response_model=Draft)
def outreach(
    lead_id: str,
    body: OutreachRequest,
    request: Request,
    settings: SettingsDep,
    store: StoreDep,
) -> Draft:
    _require(settings, settings.reasoning_provider)
    try:
        with _lead_lock(request, lead_id):
            return draft_outreach(
                store,
                settings,
                settings,
                lead_id=lead_id,
                rep_name=body.rep_name,
            )
    except (MissingEmbeddingProviderError, MissingReasoningProviderError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.post("/{lead_id}/outreach/approve", response_model=Draft)
def approve(
    lead_id: str,
    body: OutreachApproveRequest,
    request: Request,
    store: StoreDep,
) -> Draft:
    with _lead_lock(request, lead_id):
        draft = store.latest_outreach_draft_for_lead(lead_id)
        if draft is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No outreach draft found",
            )
        if str(draft.id) != str(body.draft_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Outreach draft is stale; review the latest draft before approval",
            )
        try:
            return approve_outreach(store, draft_id=str(draft.id), actor=body.actor)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
            ) from error


def _lead_lock(request: Request, lead_id: str) -> Any:
    locks = request.app.state.outreach_locks
    return locks[hash(lead_id) % len(locks)]


async def _complete_and_close(
    store: IcpLeadsStore,
    origami: OrigamiClient,
    embedder: object,
    settings: Settings,
    profile_id: str,
    job_id: str,
) -> None:
    try:
        await complete_search(
            store,
            origami,
            embedder,
            settings,
            icp_profile_id=profile_id,
            job_id=job_id,
        )
    finally:
        await origami.aclose()


def _origami_client(settings: Settings) -> OrigamiClient:
    if settings.origami_api_key is None:
        raise RuntimeError("Origami integration is not configured")
    return OrigamiClient(
        httpx.AsyncClient(timeout=httpx.Timeout(30.0)),
        settings.origami_api_key.get_secret_value(),
        settings.origami_base_url,
    )


def _require(settings: Settings, integration: str) -> None:
    if not settings.integration_flags[integration]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{integration} integration is not configured",
        )
