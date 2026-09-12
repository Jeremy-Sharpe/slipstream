from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Job(BaseModel):
    id: str
    status: Literal["queued", "running", "needs_input", "succeeded", "failed", "cancelled"]
    phase: str | None = None
    next_poll_at: datetime | str | None = None
    result: dict[str, Any] | None = None
    credits: dict[str, Any] | None = None
    error: str | dict[str, Any] | None = None


class OrigamiSearchRequest(BaseModel):
    brief: str = Field(min_length=1)
    count: int = Field(ge=1, le=100)
    quality: Literal["fast", "accurate"] = "fast"
