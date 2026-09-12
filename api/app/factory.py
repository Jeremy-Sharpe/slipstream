import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.database import create_supabase
from app.core.readiness import StorageReadinessProbe
from app.routers import calls, drafts, extractions, health, icp, leads
from app.services.icp_leads_store import create_icp_leads_store


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.transcription_client = httpx.AsyncClient(
        timeout=httpx.Timeout(180, connect=10),
        limits=httpx.Limits(max_connections=2, max_keepalive_connections=2),
    )
    try:
        yield
    finally:
        await app.state.transcription_client.aclose()
        await app.state.readiness.close()


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
    app.state.icp_leads_store = create_icp_leads_store(runtime_settings)
    app.state.supabase = create_supabase(runtime_settings)
    app.state.call_store = {}
    app.state.extraction_store = {}
    app.state.draft_store = {}
    app.state.activity_store = {}
    app.state.transcription_slots = asyncio.Semaphore(2)
    app.state.ingest_locks = [asyncio.Lock() for _ in range(32)]
    app.state.extraction_locks = [asyncio.Lock() for _ in range(32)]
    app.add_middleware(calls.UploadSizeLimitMiddleware)
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
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(calls.router, prefix="/api/v1")
    app.include_router(extractions.router, prefix="/api/v1")
    app.include_router(drafts.router, prefix="/api/v1")
    app.include_router(icp.router)
    app.include_router(icp.router, prefix="/api/v1")
    app.include_router(leads.router)
    app.include_router(leads.router, prefix="/api/v1")
    return app
