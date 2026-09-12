import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _clear_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(name, raising=False)


def test_comma_separated_origin_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEB_ORIGINS", "http://localhost:3000, https://slipstream.example")

    settings = Settings(_env_file=None)

    assert settings.web_origins == ["http://localhost:3000", "https://slipstream.example"]


def test_origins_are_canonicalised() -> None:
    settings = Settings(_env_file=None, web_origins=["HTTPS://EXAMPLE.COM:443/"])

    assert settings.web_origins == ["https://example.com"]


def test_production_supabase_requires_https() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            supabase_url="http://database.example",
            supabase_service_role_key="sentinel-secret",
        )


def test_log_level_is_case_insensitive() -> None:
    settings = Settings(_env_file=None, log_level="debug")

    assert settings.log_level == "DEBUG"


def test_validation_error_does_not_expose_secret() -> None:
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None, supabase_service_role_key="sentinel-secret")

    assert "sentinel-secret" not in str(error.value)


def test_example_environment_starts_real_entrypoint(
    tmp_path: Path,
) -> None:
    api_directory = Path(__file__).resolve().parents[1]
    shutil.copy(api_directory / ".env.example", tmp_path / ".env")
    clean_environment = {
        "PATH": os.environ["PATH"],
        "PYTHONPATH": str(api_directory),
    }
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from fastapi.testclient import TestClient; from app.main import app; "
            "c=TestClient(app); assert c.get('/health').status_code == 200; "
            "assert c.get('/ready').status_code == 200; print(app.title)",
        ],
        cwd=tmp_path,
        env=clean_environment,
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "Slipstream API"


def test_checked_in_example_accepts_blank_optional_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in (
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "OPENROUTER_API_KEY",
        "ELEVENLABS_API_KEY",
        "INGEST_TOKEN",
        "ORIGAMI_API_KEY",
        "WEB_ORIGIN",
        "WEB_ORIGINS",
    ):
        monkeypatch.delenv(name, raising=False)

    settings = Settings(_env_file=".env.example")

    assert settings.storage_mode == "memory"
    assert settings.web_origins == ["http://localhost:3000"]


def test_paid_transcription_requires_production_ingest_token() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            elevenlabs_api_key="paid-key",
        )


@pytest.mark.parametrize(
    "origin",
    [
        "https://user@example.com",
        "https://example.com/path",
        "https://example.com?query=yes",
        "https://example.com:99999",
    ],
)
def test_invalid_web_origin_is_rejected(origin: str) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, web_origins=[origin])


@pytest.mark.parametrize(
    ("model", "provider"),
    [
        ("claude-opus-5", "anthropic"),
        ("gpt-5.4", "openai"),
        ("o4-mini", "openai"),
        ("meta-llama/llama-4-maverick", "openrouter"),
    ],
)
def test_reasoning_provider_is_selected_from_model_name(
    monkeypatch: pytest.MonkeyPatch,
    model: str,
    provider: str,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(_env_file=None, reasoning_model=model)

    assert settings.reasoning_provider == provider


def test_reasoning_provider_falls_back_to_openrouter_when_only_openrouter_key_is_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(
        _env_file=None,
        environment="test",
        reasoning_model="gpt-5.4",
        openrouter_api_key="openrouter-test",
    )

    assert settings.reasoning_provider == "openrouter"


@pytest.mark.parametrize(
    ("model", "native_key", "provider"),
    [
        ("gpt-5.4", {"openai_api_key": "openai-test"}, "openai"),
        ("claude-sonnet-5", {"anthropic_api_key": "anthropic-test"}, "anthropic"),
    ],
)
def test_reasoning_provider_stays_native_when_native_key_is_set(
    monkeypatch: pytest.MonkeyPatch,
    model: str,
    native_key: dict[str, str],
    provider: str,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(
        _env_file=None,
        environment="test",
        reasoning_model=model,
        openrouter_api_key="openrouter-test",
        **native_key,
    )

    assert settings.reasoning_provider == provider


def test_reasoning_provider_stays_native_when_no_key_is_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(_env_file=None, environment="test", reasoning_model="gpt-5.4")

    assert settings.reasoning_provider == "openai"


@pytest.mark.parametrize(
    ("kwargs", "provider", "flag"),
    [
        ({}, None, False),
        ({"openai_api_key": "openai-test"}, "openai", True),
        ({"openrouter_api_key": "openrouter-test"}, "openrouter", True),
    ],
)
def test_embedding_provider_and_flag(
    monkeypatch: pytest.MonkeyPatch,
    kwargs: dict[str, str],
    provider: str | None,
    flag: bool,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(_env_file=None, environment="test", **kwargs)

    assert settings.embedding_provider == provider
    assert settings.integration_flags["embeddings"] is flag
