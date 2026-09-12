import asyncio
import logging
import threading
from collections import OrderedDict, deque
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.database import create_supabase
from app.core.readiness import LocalModelReadinessProbe, StorageReadinessProbe
from app.routers import (
    calls,
    campaigns,
    crm,
    deliveries,
    drafts,
    emails,
    extractions,
    health,
    icp,
    leads,
    scorecards,
)
from app.services.campaigns import create_campaign_store
from app.services.icp_leads_store import create_icp_leads_store
from app.services.score import build_judge
from app.ws import coach


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.transcription_client = httpx.AsyncClient(
        timeout=httpx.Timeout(180, connect=10),
        limits=httpx.Limits(max_connections=2, max_keepalive_connections=2),
    )
    app.state.crm_webhook_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10, connect=5),
        limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
        follow_redirects=False,
    )
    app.state.email_delivery_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10, connect=5),
        limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
        follow_redirects=False,
    )
    try:
        yield
    finally:
        close_judge = getattr(app.state.scorecard_judge, "close", None)
        if callable(close_judge):
            await asyncio.to_thread(close_judge)
        await app.state.transcription_client.aclose()
        await app.state.crm_webhook_client.aclose()
        await app.state.email_delivery_client.aclose()
        await app.state.readiness.close()
        await app.state.reasoning_readiness.close()
        app.state.email_delivery_db_executor.shutdown(wait=False, cancel_futures=True)
        app.state.campaign_store_executor.shutdown(wait=False, cancel_futures=True)


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or get_settings()
    logging.basicConfig(level=runtime_settings.log_level)
    app = FastAPI(
        title=runtime_settings.app_name,
        version=runtime_settings.app_version,
        description="Turns sales conversations into CRM updates, drafts, and ICP evidence.",
        lifespan=lifespan,
    )
    app.state.settings = runtime_settings
    app.state.readiness = StorageReadinessProbe(runtime_settings)
    app.state.reasoning_readiness = LocalModelReadinessProbe(runtime_settings)
    app.state.icp_leads_store = create_icp_leads_store(runtime_settings)
    app.state.supabase = create_supabase(runtime_settings)
    app.state.campaign_store = create_campaign_store(runtime_settings, app.state.supabase)
    app.state.call_store = {}
    app.state.extraction_store = {}
    app.state.draft_store = {}
    app.state.activity_store = {}
    app.state.email_store = {}
    app.state.email_threads = {}
    app.state.scorecard_store = OrderedDict()
    app.state.playbook_store = OrderedDict()
    app.state.crm_sync_receipts = OrderedDict()
    app.state.email_delivery_attempts = {}
    app.state.transcription_slots = asyncio.Semaphore(2)
    app.state.ingest_locks = [asyncio.Lock() for _ in range(32)]
    app.state.extraction_locks = [asyncio.Lock() for _ in range(32)]
    app.state.crm_sync_locks = [asyncio.Lock() for _ in range(32)]
    app.state.crm_sync_admission_slots = asyncio.Semaphore(4)
    app.state.email_delivery_locks = [asyncio.Lock() for _ in range(64)]
    app.state.email_delivery_gate_locks = [asyncio.Lock() for _ in range(64)]
    app.state.email_delivery_waiter_slots = asyncio.Semaphore(deliveries.DELIVERY_WAITER_LIMIT)
    app.state.email_delivery_batch_slots = asyncio.Semaphore(deliveries.BATCH_REQUEST_LIMIT)
    app.state.email_delivery_admission_slots = asyncio.Semaphore(4)
    app.state.email_delivery_db_slots = asyncio.Semaphore(4)
    app.state.email_delivery_db_executor = ThreadPoolExecutor(
        max_workers=4, thread_name_prefix="slipstream-email-delivery"
    )
    app.state.campaign_store_slots = asyncio.Semaphore(4)
    app.state.campaign_store_executor = ThreadPoolExecutor(
        max_workers=4, thread_name_prefix="slipstream-campaign-store"
    )
    app.state.coach_slots = asyncio.Semaphore(4)
    app.state.coach_handshake_slots = asyncio.Semaphore(16)
    app.state.coach_reasoning_slots = asyncio.Semaphore(2)
    app.state.coach_checkpoints = {}
    app.state.coach_source_locks = {}
    app.state.coach_source_locks_guard = asyncio.Lock()
    app.state.coach_token_issued_at = deque()
    app.state.coach_token_lock = asyncio.Lock()
    app.state.coach_suggestion_started_at = deque()
    app.state.coach_suggestion_lock = asyncio.Lock()
    app.state.scorecard_slots = asyncio.Semaphore(2)
    app.state.scorecard_admission_slots = asyncio.Semaphore(8)
    app.state.outreach_locks = [threading.Lock() for _ in range(64)]
    try:
        app.state.scorecard_judge = build_judge(runtime_settings)
    except RuntimeError:
        app.state.scorecard_judge = None
    app.add_middleware(calls.UploadSizeLimitMiddleware)
    app.add_middleware(scorecards.ScorecardSizeLimitMiddleware)

    def judge_factory():
        if app.state.scorecard_judge is None:
            raise RuntimeError("No scorecard judge is configured")
        return app.state.scorecard_judge

    app.state.judge_factory = judge_factory
    app.add_middleware(
        CORSMiddleware,
        allow_origins=runtime_settings.web_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-Slipstream-Ingest-Token",
        ],
    )
    app.include_router(health.router)
    app.include_router(scorecards.router)
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(scorecards.router, prefix="/api/v1")
    app.include_router(calls.router, prefix="/api/v1")
    app.include_router(extractions.router, prefix="/api/v1")
    app.include_router(crm.router, prefix="/api/v1")
    app.include_router(deliveries.router, prefix="/api/v1")
    app.include_router(campaigns.router, prefix="/api/v1")
    app.include_router(drafts.router, prefix="/api/v1")
    app.include_router(emails.router, prefix="/api/v1")
    app.include_router(icp.router)
    app.include_router(icp.router, prefix="/api/v1")
    app.include_router(leads.router)
    app.include_router(leads.router, prefix="/api/v1")
    app.include_router(coach.router, prefix="/api/v1")
    return app
