from datetime import UTC, datetime
from typing import Literal

from anyio import fail_after, to_thread
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import Settings
from app.core.database import get_supabase

router = APIRouter(tags=["operations"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    revision: str
    environment: str
    storage: Literal["supabase", "memory"]
    integrations: dict[str, bool]
    timestamp: datetime


def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = _settings(request)
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        revision=settings.release_sha,
        environment=settings.environment,
        storage=settings.storage_mode,
        integrations=settings.integration_flags,
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness(request: Request) -> HealthResponse:
    settings = _settings(request)
    if settings.storage_mode == "supabase":
        client = get_supabase()
        try:
            if client is None:
                raise RuntimeError("Supabase client is not initialised")
            with fail_after(3):
                await to_thread.run_sync(
                    lambda: client.table("companies").select("id").limit(1).execute(),
                    abandon_on_cancel=True,
                )
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Configured storage is unavailable",
            ) from error
    return await health(request)
