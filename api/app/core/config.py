from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    AliasChoices,
    BeforeValidator,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _split_origins(value: object) -> list[str]:
    if isinstance(value, str):
        origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
    elif isinstance(value, list) and all(isinstance(origin, str) for origin in value):
        origins = [origin.strip().rstrip("/") for origin in value if origin.strip()]
    else:
        raise ValueError("WEB_ORIGINS must be a comma-separated string or a list of URLs")
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.path:
            raise ValueError(f"Invalid web origin: {origin}")
    if not origins:
        raise ValueError("At least one web origin is required")
    return origins


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
    elevenlabs_api_key: SecretStr | None = None
    origami_api_key: SecretStr | None = None

    @field_validator(
        "supabase_url",
        "supabase_service_role_key",
        "anthropic_api_key",
        "elevenlabs_api_key",
        "origami_api_key",
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
            parsed = urlsplit(self.supabase_url)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise ValueError("SUPABASE_URL must be an absolute HTTP(S) URL")
            if self.environment == "production" and parsed.scheme != "https":
                raise ValueError("SUPABASE_URL must use HTTPS in production")
        return self

    @property
    def storage_mode(self) -> Literal["supabase", "memory"]:
        return "supabase" if self.supabase_url else "memory"

    @property
    def integration_flags(self) -> dict[str, bool]:
        return {
            "supabase": self.storage_mode == "supabase",
            "anthropic": self.anthropic_api_key is not None,
            "elevenlabs": self.elevenlabs_api_key is not None,
            "origami": self.origami_api_key is not None,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
