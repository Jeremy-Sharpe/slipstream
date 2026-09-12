import asyncio
from time import monotonic

import httpx

from app.core.config import Settings


class StorageUnavailableError(RuntimeError):
    pass


class StorageReadinessProbe:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._storage_mode = settings.storage_mode
        self._lock = asyncio.Lock()
        self._last_success = 0.0
        self._client: httpx.AsyncClient | None = None
        if settings.supabase_url and settings.supabase_service_role_key:
            key = settings.supabase_service_role_key.get_secret_value()
            self._client = httpx.AsyncClient(
                base_url=settings.supabase_url.rstrip("/"),
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
                timeout=httpx.Timeout(3.0, connect=2.0),
                transport=transport,
            )

    async def check(self) -> None:
        if self._storage_mode == "memory":
            return
        if monotonic() - self._last_success < 5:
            return
        async with self._lock:
            if monotonic() - self._last_success < 5:
                return
            if self._client is None:
                raise StorageUnavailableError("Supabase readiness client is not initialised")
            try:
                response = await self._client.get(
                    "/rest/v1/companies", params={"select": "id", "limit": 1}
                )
                response.raise_for_status()
            except (httpx.HTTPError, TimeoutError) as error:
                raise StorageUnavailableError("Configured storage is unavailable") from error
            self._last_success = monotonic()

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
