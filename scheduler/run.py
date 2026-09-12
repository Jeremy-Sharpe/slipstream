from __future__ import annotations

import json
import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Protocol, Self
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID

MAX_RESPONSE_BYTES = 65_536


class ConfigError(ValueError):
    pass


class SchedulerError(RuntimeError):
    pass


class Response(Protocol):
    status: int

    def read(self, amount: int = -1) -> bytes: ...

    def __enter__(self) -> Self: ...

    def __exit__(self, *args: object) -> None: ...


class Opener(Protocol):
    def open(self, request: Request, *, timeout: float) -> Response: ...


class RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, *args: object, **kwargs: object) -> None:
        return None


@dataclass(frozen=True)
class Settings:
    api_url: str
    ingest_token: str
    limit: int
    timeout_seconds: float
    campaign_id: str | None


def load_settings(environment: Mapping[str, str]) -> Settings:
    api_url = environment.get("SLIPSTREAM_API_URL", "").strip().rstrip("/")
    token = environment.get("SLIPSTREAM_INGEST_TOKEN", "").strip()
    parsed = urlsplit(api_url)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ConfigError("SLIPSTREAM_API_URL must be an HTTPS origin or base path")
    if not token:
        raise ConfigError("SLIPSTREAM_INGEST_TOKEN is required")
    try:
        limit = int(environment.get("SLIPSTREAM_CAMPAIGN_BATCH_LIMIT", "8"))
    except ValueError as error:
        raise ConfigError(
            "SLIPSTREAM_CAMPAIGN_BATCH_LIMIT must be an integer"
        ) from error
    if not 1 <= limit <= 8:
        raise ConfigError("SLIPSTREAM_CAMPAIGN_BATCH_LIMIT must be between 1 and 8")
    try:
        timeout_seconds = float(
            environment.get("SLIPSTREAM_SCHEDULER_TIMEOUT_SECONDS", "65")
        )
    except ValueError as error:
        raise ConfigError(
            "SLIPSTREAM_SCHEDULER_TIMEOUT_SECONDS must be a number"
        ) from error
    if not 5 <= timeout_seconds <= 70:
        raise ConfigError(
            "SLIPSTREAM_SCHEDULER_TIMEOUT_SECONDS must be between 5 and 70"
        )
    campaign_id = environment.get("SLIPSTREAM_CAMPAIGN_ID", "").strip() or None
    if campaign_id is not None:
        try:
            campaign_id = str(UUID(campaign_id))
        except ValueError as error:
            raise ConfigError("SLIPSTREAM_CAMPAIGN_ID must be a UUID") from error
    return Settings(api_url, token, limit, timeout_seconds, campaign_id)


def run(settings: Settings, opener: Opener | None = None) -> dict[str, object]:
    body: dict[str, object] = {"limit": settings.limit}
    if settings.campaign_id is not None:
        body["campaign_id"] = settings.campaign_id
    request = Request(
        f"{settings.api_url}/api/v1/campaigns/run-due",
        data=json.dumps(body, separators=(",", ":")).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Slipstream-Ingest-Token": settings.ingest_token,
        },
        method="POST",
    )
    client = opener or build_opener(RejectRedirects())
    try:
        with client.open(request, timeout=settings.timeout_seconds) as response:
            if response.status != 200:
                raise SchedulerError(
                    f"campaign scheduler returned HTTP {response.status}"
                )
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        raise SchedulerError(
            f"campaign scheduler returned HTTP {error.code}"
        ) from error
    except (TimeoutError, URLError) as error:
        raise SchedulerError("campaign scheduler request did not complete") from error
    if len(raw) > MAX_RESPONSE_BYTES:
        raise SchedulerError("campaign scheduler response exceeded the size limit")
    try:
        payload = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise SchedulerError("campaign scheduler returned malformed JSON") from error
    if not isinstance(payload, dict):
        raise SchedulerError("campaign scheduler returned an invalid response")
    claimed_count = payload.get("claimed_count")
    campaign = payload.get("campaign")
    if (
        not isinstance(claimed_count, int)
        or isinstance(claimed_count, bool)
        or not 0 <= claimed_count <= settings.limit
        or (claimed_count == 0 and campaign is not None)
        or (claimed_count > 0 and not isinstance(campaign, dict))
    ):
        raise SchedulerError("campaign scheduler returned an inconsistent response")
    summary: dict[str, object] = {"ok": True, "claimed_count": claimed_count}
    if isinstance(campaign, dict):
        campaign_id = campaign.get("id")
        campaign_status = campaign.get("status")
        try:
            parsed_campaign_id = (
                str(UUID(campaign_id)) if isinstance(campaign_id, str) else None
            )
        except ValueError:
            parsed_campaign_id = None
        if parsed_campaign_id is None or campaign_status not in {
            "scheduled",
            "running",
            "paused",
            "completed",
            "attention",
        }:
            raise SchedulerError(
                "campaign scheduler returned malformed campaign status"
            )
        summary["campaign_id"] = parsed_campaign_id
        summary["status"] = campaign_status
    return summary


def main() -> int:
    try:
        summary = run(load_settings(os.environ))
    except ConfigError as error:
        print(f"configuration error: {error}", file=sys.stderr)
        return 2
    except SchedulerError as error:
        print(f"scheduler error: {error}", file=sys.stderr)
        return 1
    print(json.dumps(summary, separators=(",", ":"), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
