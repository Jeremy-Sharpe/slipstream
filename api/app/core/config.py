import re
from email.utils import parseaddr
from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import urlsplit, urlunsplit

from pydantic import (
    AliasChoices,
    BeforeValidator,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _canonical_http_origin(value: str, *, production: bool = False) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL must be an absolute HTTP(S) origin")
    if production and parsed.scheme != "https":
        raise ValueError("URL must use HTTPS in production")
    has_disallowed_part = (
        parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    )
    if has_disallowed_part:
        raise ValueError("URL must not contain credentials, a path, query, or fragment")
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("URL has an invalid port") from error
    host = parsed.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    default_port = 80 if parsed.scheme == "http" else 443
    netloc = host if port in {None, default_port} else f"{host}:{port}"
    return urlunsplit((parsed.scheme.lower(), netloc, "", "", ""))


def _canonical_webhook_url(value: str, *, production: bool = False) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("CRM_WEBHOOK_URL must be an absolute HTTP(S) URL")
    if production and parsed.scheme != "https":
        raise ValueError("CRM_WEBHOOK_URL must use HTTPS in production")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("CRM_WEBHOOK_URL must not contain credentials, a query, or a fragment")
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("CRM_WEBHOOK_URL has an invalid port") from error
    host = parsed.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    default_port = 80 if parsed.scheme == "http" else 443
    netloc = host if port in {None, default_port} else f"{host}:{port}"
    return urlunsplit(
        (
            parsed.scheme.lower(),
            netloc,
            parsed.path or "/",
            "",
            "",
        )
    )


def _canonical_local_model_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in {
        "127.0.0.1",
        "localhost",
        "::1",
    }:
        raise ValueError("LOCAL_MODEL_BASE_URL must use a loopback HTTP(S) host")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("LOCAL_MODEL_BASE_URL must not contain credentials, a query, or fragment")
    if parsed.path.rstrip("/") != "/v1":
        raise ValueError("LOCAL_MODEL_BASE_URL path must be /v1")
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("LOCAL_MODEL_BASE_URL has an invalid port") from error
    if port is None:
        raise ValueError("LOCAL_MODEL_BASE_URL must include an explicit loopback port")
    host = f"[{parsed.hostname}]" if parsed.hostname == "::1" else parsed.hostname
    return urlunsplit((parsed.scheme.lower(), f"{host}:{port}", "/v1", "", ""))


def _split_origins(value: object) -> list[str]:
    if isinstance(value, str):
        origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
    elif isinstance(value, list) and all(isinstance(origin, str) for origin in value):
        origins = [origin.strip().rstrip("/") for origin in value if origin.strip()]
    else:
        raise ValueError("WEB_ORIGINS must be a comma-separated string or a list of URLs")
    if not origins:
        raise ValueError("At least one web origin is required")
    return [_canonical_http_origin(origin) for origin in origins]


def _valid_mailbox(value: str) -> str:
    candidate = value.strip()
    if not candidate or len(candidate) > 320 or "\r" in candidate or "\n" in candidate:
        raise ValueError("RESEND_FROM must be a bounded email mailbox")
    display_name, address = parseaddr(candidate)
    address_pattern = r"[^\s@<>]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}"
    exact_address = candidate == address
    exact_named_address = (
        bool(display_name)
        and candidate.endswith(f"<{address}>")
        and candidate[: -len(f"<{address}>")].strip() == display_name
    )
    if not re.fullmatch(address_pattern, address) or not (exact_address or exact_named_address):
        raise ValueError("RESEND_FROM must contain a valid email address")
    return candidate


Origins = Annotated[list[str], NoDecode, BeforeValidator(_split_origins)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        hide_input_in_errors=True,
        populate_by_name=True,
    )

    app_name: str = "Slipstream API"
    app_version: str = "0.1.0"
    release_sha: str = "local"
    environment: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    web_origins: Origins = Field(
        default_factory=lambda: ["http://localhost:3000"],
        validation_alias=AliasChoices("WEB_ORIGINS", "WEB_ORIGIN"),
    )

    supabase_url: str | None = None
    supabase_service_role_key: SecretStr | None = None
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    scorecard_judge_model: str = "deepseek/deepseek-v3.2"
    elevenlabs_api_key: SecretStr | None = None
    ingest_token: SecretStr | None = None
    origami_api_key: SecretStr | None = None
    crm_webhook_url: str | None = None
    crm_webhook_secret: SecretStr | None = None
    resend_api_key: SecretStr | None = None
    resend_from: str | None = None
    reasoning_model: str = "gpt-5.4"
    embedding_model: str = "text-embedding-3-small"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    local_model_base_url: str | None = None
    local_model_name: str = "slipstream-qwen2.5-1.5b-instruct-q4-k-m"
    local_model_context_tokens: int = Field(default=16_384, ge=8_192, le=131_072)
    origami_base_url: str = "https://origami.chat/api/v3"
    resend_base_url: str = "https://api.resend.com"

    @field_validator("log_level", mode="before")
    @classmethod
    def normalise_log_level(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value

    @field_validator(
        "supabase_url",
        "supabase_service_role_key",
        "anthropic_api_key",
        "openai_api_key",
        "openrouter_api_key",
        "elevenlabs_api_key",
        "ingest_token",
        "origami_api_key",
        "crm_webhook_url",
        "crm_webhook_secret",
        "resend_api_key",
        "resend_from",
        "local_model_base_url",
        mode="before",
    )
    @classmethod
    def empty_values_are_unset(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_supabase_pair(self) -> "Settings":
        if bool(self.supabase_url) != bool(self.supabase_service_role_key):
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together")
        if self.supabase_url:
            self.supabase_url = _canonical_http_origin(
                self.supabase_url, production=self.environment == "production"
            )
        if (
            self.environment == "production"
            and self.elevenlabs_api_key is not None
            and self.ingest_token is None
        ):
            raise ValueError("INGEST_TOKEN is required with ELEVENLABS_API_KEY in production")
        if bool(self.crm_webhook_url) != bool(self.crm_webhook_secret):
            raise ValueError("CRM_WEBHOOK_URL and CRM_WEBHOOK_SECRET must be set together")
        if self.crm_webhook_url:
            self.crm_webhook_url = _canonical_webhook_url(
                self.crm_webhook_url, production=self.environment == "production"
            )
            if len(self.crm_webhook_secret.get_secret_value().encode()) < 32:  # type: ignore[union-attr]
                raise ValueError("CRM_WEBHOOK_SECRET must contain at least 32 bytes")
            if self.ingest_token is None:
                raise ValueError("INGEST_TOKEN is required with CRM_WEBHOOK_URL")
        if bool(self.resend_api_key) != bool(self.resend_from):
            raise ValueError("RESEND_API_KEY and RESEND_FROM must be set together")
        self.resend_base_url = _canonical_http_origin(
            self.resend_base_url, production=self.environment == "production"
        )
        if self.resend_from:
            self.resend_from = _valid_mailbox(self.resend_from)
            if self.ingest_token is None:
                raise ValueError("INGEST_TOKEN is required with RESEND_API_KEY")
            if self.environment == "production" and self.supabase_url is None:
                raise ValueError("Supabase is required with RESEND_API_KEY in production")
        if self.local_model_base_url:
            self.local_model_base_url = _canonical_local_model_url(self.local_model_base_url)
            if not self.local_model_name.strip() or len(self.local_model_name) > 160:
                raise ValueError("LOCAL_MODEL_NAME must be between 1 and 160 characters")
            self.local_model_name = self.local_model_name.strip()
        return self

    @property
    def storage_mode(self) -> Literal["supabase", "memory"]:
        return "supabase" if self.supabase_url else "memory"

    @property
    def _native_reasoning_provider(self) -> Literal["anthropic", "openai", "openrouter"]:
        model = self.reasoning_model.strip().lower()
        if model.startswith("claude"):
            return "anthropic"
        if model.startswith("gpt") or (len(model) > 1 and model[0] == "o" and model[1].isdigit()):
            return "openai"
        return "openrouter"

    @property
    def reasoning_provider(self) -> Literal["anthropic", "openai", "openrouter", "local"]:
        native = self._native_reasoning_provider
        if native == "anthropic" and self.anthropic_api_key is not None:
            return native
        if native == "openai" and self.openai_api_key is not None:
            return native
        if self.openrouter_api_key is not None:
            return "openrouter"
        if self.local_model_base_url is not None:
            return "local"
        return native

    @property
    def reasoning_configured(self) -> bool:
        return {
            "anthropic": self.anthropic_api_key is not None,
            "openai": self.openai_api_key is not None,
            "openrouter": self.openrouter_api_key is not None,
            "local": self.local_model_base_url is not None,
        }[self.reasoning_provider]

    @property
    def effective_reasoning_model(self) -> str:
        provider = self.reasoning_provider
        if provider == "local":
            return self.local_model_name
        if provider == "openrouter" and self._native_reasoning_provider != "openrouter":
            native = self._native_reasoning_provider
            if "/" not in self.reasoning_model:
                return f"{native}/{self.reasoning_model}"
        return self.reasoning_model

    @property
    def embedding_provider(self) -> Literal["openai", "openrouter"] | None:
        if self.openai_api_key is not None:
            return "openai"
        if self.openrouter_api_key is not None:
            return "openrouter"
        return None

    @property
    def integration_flags(self) -> dict[str, bool]:
        return {
            "supabase": self.storage_mode == "supabase",
            "anthropic": self.anthropic_api_key is not None,
            "openai": self.openai_api_key is not None,
            "openrouter": self.openrouter_api_key is not None,
            "local_model": self.local_model_base_url is not None,
            "embeddings": self.embedding_provider is not None,
            "elevenlabs": self.elevenlabs_api_key is not None,
            "origami": self.origami_api_key is not None,
            "crm_webhook": self.crm_webhook_url is not None,
            "email_delivery": self.resend_api_key is not None,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
