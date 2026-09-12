import asyncio
from time import monotonic

import httpx

from app.core.config import Settings


class StorageUnavailableError(RuntimeError):
    pass


class ReasoningUnavailableError(RuntimeError):
    pass


class LocalModelReadinessProbe:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._model = settings.local_model_name
        self._client = (
            httpx.AsyncClient(
                base_url=settings.local_model_base_url,
                timeout=httpx.Timeout(3.0, connect=1.0),
                transport=transport,
            )
            if settings.local_model_base_url
            else None
        )

    async def check(self) -> None:
        if self._client is None:
            return
        try:
            response = await self._client.get("models")
            response.raise_for_status()
            payload = response.json()
            models = payload.get("data") if isinstance(payload, dict) else None
            if not isinstance(models, list) or not any(
                isinstance(item, dict) and item.get("id") == self._model for item in models
            ):
                raise ValueError("Configured local model is not loaded")
        except (httpx.HTTPError, ValueError) as error:
            raise ReasoningUnavailableError("Configured local model is unavailable") from error

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()


class StorageReadinessProbe:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._storage_mode = settings.storage_mode
        self._lock = asyncio.Lock()
        self._last_checked = 0.0
        self._last_result = True
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
        try:
            async with asyncio.timeout(4):
                await self._check_with_lock()
        except TimeoutError as error:
            raise StorageUnavailableError("Configured storage is unavailable") from error

    async def _check_with_lock(self) -> None:
        if self._cached_result_applies():
            self._raise_if_failed()
            return
        async with self._lock:
            if self._cached_result_applies():
                self._raise_if_failed()
                return
            if self._client is None:
                self._record_result(False)
                raise StorageUnavailableError("Supabase readiness client is not initialised")
            try:
                response = await self._client.get(
                    "/rest/v1/companies", params={"select": "id", "limit": 1}
                )
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list) or any(
                    not isinstance(item, dict) or "id" not in item for item in payload
                ):
                    raise ValueError("Supabase returned an unexpected readiness payload")
            except (httpx.HTTPError, ValueError) as error:
                self._record_result(False)
                raise StorageUnavailableError("Configured storage is unavailable") from error
            self._record_result(True)

    def _cached_result_applies(self) -> bool:
        ttl = 5 if self._last_result else 2
        return monotonic() - self._last_checked < ttl

    def _raise_if_failed(self) -> None:
        if not self._last_result:
            raise StorageUnavailableError("Configured storage is unavailable")

    def _record_result(self, success: bool) -> None:
        self._last_result = success
        self._last_checked = monotonic()

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
