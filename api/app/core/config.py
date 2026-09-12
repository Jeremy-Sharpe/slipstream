from functools import lru_cache
from typing import Annotated, Literal

from pydantic import AliasChoices, BeforeValidator, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_origins(value: object) -> list[str]:
    if isinstance(value, str):
        return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
    if isinstance(value, list):
        return [str(origin).strip().rstrip("/") for origin in value if str(origin).strip()]
    return []


Origins = Annotated[list[str], BeforeValidator(_split_origins)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Slipstream API"
    app_version: str = "0.1.0"
    environment: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"
    web_origins: Origins = Field(
        default_factory=lambda: ["http://localhost:3000"],
        validation_alias=AliasChoices("WEB_ORIGINS", "WEB_ORIGIN"),
    )

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    anthropic_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    origami_api_key: str | None = None

    @model_validator(mode="after")
    def validate_supabase_pair(self) -> "Settings":
        if bool(self.supabase_url) != bool(self.supabase_service_role_key):
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together")
        return self

    @property
    def storage_mode(self) -> Literal["supabase", "memory"]:
        return "supabase" if self.supabase_url else "memory"

    @property
    def integration_flags(self) -> dict[str, bool]:
        return {
            "supabase": self.storage_mode == "supabase",
            "anthropic": bool(self.anthropic_api_key),
            "elevenlabs": bool(self.elevenlabs_api_key),
            "origami": bool(self.origami_api_key),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
