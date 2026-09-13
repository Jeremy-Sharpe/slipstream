import asyncio
import math
from time import monotonic

import httpx

from app.core.config import Settings


class StorageUnavailableError(RuntimeError):
    pass


class ReasoningUnavailableError(RuntimeError):
    pass


class EmbeddingUnavailableError(RuntimeError):
    pass


class ProviderUnavailableError(RuntimeError):
    pass


class ProviderReadinessProbe:
    """Verify hosted credentials without generating tokens or spending lead credits."""

    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._lock = asyncio.Lock()
        self._last_checked = 0.0
        self._last_results: dict[str, bool | None] | None = None
        common = {
            "timeout": httpx.Timeout(5.0, connect=2.0),
            "transport": transport,
            "trust_env": False,
            "follow_redirects": False,
        }
        self._openrouter = (
            httpx.AsyncClient(
                base_url=settings.openrouter_base_url.rstrip("/") + "/",
                headers={
                    "Authorization": (
                        f"Bearer {settings.openrouter_api_key.get_secret_value()}"
                    ),
                    **settings.openrouter_headers,
                },
                **common,
            )
            if settings.openrouter_api_key is not None
            else None
        )
        self._origami = (
            httpx.AsyncClient(
                base_url=settings.origami_base_url.rstrip("/") + "/",
                headers={
                    "Authorization": f"Bearer {settings.origami_api_key.get_secret_value()}"
                },
                **common,
            )
            if settings.origami_api_key is not None
            else None
        )

    async def verify(self) -> dict[str, bool | None]:
        if self._cached_result_applies():
            return dict(self._last_results or {})
        async with self._lock:
            if self._cached_result_applies():
                return dict(self._last_results or {})
            openrouter, origami = await asyncio.gather(
                self._probe_openrouter(), self._probe_origami()
            )
            self._last_results = {"openrouter": openrouter, "origami": origami}
            self._last_checked = monotonic()
            return dict(self._last_results)

    async def check(self) -> None:
        results = await self.verify()
        if any(result is False for result in results.values()):
            raise ProviderUnavailableError("A configured hosted provider is unavailable")

    async def _probe_openrouter(self) -> bool | None:
        if self._openrouter is None:
            return None
        try:
            response = await self._openrouter.get("key")
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict):
                raise ValueError("OpenRouter returned an unexpected key response")
            return True
        except (httpx.HTTPError, ValueError):
            return False

    async def _probe_origami(self) -> bool | None:
        if self._origami is None:
            return None
        try:
            response = await self._origami.get("account")
            response.raise_for_status()
            if not isinstance(response.json(), dict):
                raise ValueError("Origami returned an unexpected account response")
            return True
        except (httpx.HTTPError, ValueError):
            return False

    def _cached_result_applies(self) -> bool:
        return self._last_results is not None and monotonic() - self._last_checked < 30

    async def close(self) -> None:
        for client in (self._openrouter, self._origami):
            if client is not None:
                await client.aclose()


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
                trust_env=False,
                follow_redirects=False,
            )
            if settings.reasoning_provider == "local" and settings.local_model_base_url
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


class LocalEmbeddingReadinessProbe:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._model = settings.local_embedding_name
        self._lock = asyncio.Lock()
        self._last_checked = 0.0
        self._last_result = True
        self._client = (
            httpx.AsyncClient(
                base_url=settings.local_embedding_base_url,
                timeout=httpx.Timeout(3.0, connect=1.0),
                transport=transport,
                trust_env=False,
                follow_redirects=False,
            )
            if settings.embedding_provider == "local"
            and settings.local_embedding_base_url
            else None
        )

    async def check(self) -> None:
        if self._client is None:
            return
        if self._cached_result_applies():
            self._raise_if_failed()
            return
        async with self._lock:
            if self._cached_result_applies():
                self._raise_if_failed()
                return
            try:
                models_response = await self._client.get("models")
                models_response.raise_for_status()
                models_payload = models_response.json()
                models = (
                    models_payload.get("data")
                    if isinstance(models_payload, dict)
                    else None
                )
                if not isinstance(models, list) or not any(
                    isinstance(item, dict) and item.get("id") == self._model
                    for item in models
                ):
                    raise ValueError(
                        "Configured local embedding model is not loaded"
                    )
                response = await self._client.post(
                    "embeddings",
                    json={
                        "model": self._model,
                        "input": ["search_document: readiness probe"],
                    },
                )
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict):
                    raise ValueError(
                        "Configured local embedding model returned invalid output"
                    )
                data = payload.get("data")
                vector = (
                    data[0].get("embedding")
                    if isinstance(data, list)
                    and len(data) == 1
                    and isinstance(data[0], dict)
                    else None
                )
                if (
                    payload.get("model") != self._model
                    or not isinstance(vector, list)
                    or len(vector) != 768
                    or not all(
                        type(value) in (int, float) and math.isfinite(value)
                        for value in vector
                    )
                ):
                    raise ValueError(
                        "Configured local embedding model returned invalid output"
                    )
            except (httpx.HTTPError, ValueError) as error:
                self._record_result(False)
                raise EmbeddingUnavailableError(
                    "Configured local embedding model is unavailable"
                ) from error
            self._record_result(True)

    def _cached_result_applies(self) -> bool:
        ttl = 5 if self._last_result else 2
        return monotonic() - self._last_checked < ttl

    def _raise_if_failed(self) -> None:
        if not self._last_result:
            raise EmbeddingUnavailableError(
                "Configured local embedding model is unavailable"
            )

    def _record_result(self, success: bool) -> None:
        self._last_result = success
        self._last_checked = monotonic()

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
