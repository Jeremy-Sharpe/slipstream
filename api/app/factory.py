import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.readiness import StorageReadinessProbe
from app.routers import health, scorecards
from app.services.score import build_judge


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    try:
        yield
    finally:
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

    app.state.judge_factory = lambda: build_judge(runtime_settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=runtime_settings.web_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )
    app.include_router(health.router)
    app.include_router(scorecards.router)
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(scorecards.router, prefix="/api/v1")
    return app
