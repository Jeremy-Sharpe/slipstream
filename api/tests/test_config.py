import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _clear_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "OPENROUTER_API_KEY",
        "LOCAL_MODEL_BASE_URL",
    ):
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
        "LOCAL_MODEL_BASE_URL",
        "LOCAL_MODEL_NAME",
        "LOCAL_MODEL_CONTEXT_TOKENS",
        "ELEVENLABS_API_KEY",
        "INGEST_TOKEN",
        "ORIGAMI_API_KEY",
        "CRM_WEBHOOK_URL",
        "CRM_WEBHOOK_SECRET",
        "RESEND_API_KEY",
        "RESEND_FROM",
        "RESEND_BASE_URL",
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


def test_crm_webhook_configuration_is_canonical_and_visible() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        ingest_token="browser-mutation-secret",
        crm_webhook_url="HTTPS://CRM.EXAMPLE.COM:443/hooks/slipstream",
        crm_webhook_secret="s" * 32,
    )

    assert settings.crm_webhook_url == "https://crm.example.com/hooks/slipstream"
    assert settings.integration_flags["crm_webhook"] is True


@pytest.mark.parametrize(
    "kwargs",
    [
        {"crm_webhook_url": "https://crm.example.test/hook"},
        {"crm_webhook_secret": "s" * 32},
        {
            "crm_webhook_url": "https://crm.example.test/hook",
            "crm_webhook_secret": "short",
            "ingest_token": "browser-secret",
        },
        {
            "environment": "production",
            "crm_webhook_url": "http://crm.example.test/hook",
            "crm_webhook_secret": "s" * 32,
            "ingest_token": "browser-secret",
        },
        {
            "environment": "production",
            "crm_webhook_url": "https://crm.example.test/hook",
            "crm_webhook_secret": "s" * 32,
        },
        {
            "crm_webhook_url": "https://user:password@crm.example.test/hook",
            "crm_webhook_secret": "s" * 32,
        },
        {
            "crm_webhook_url": "https://crm.example.test/hook#fragment",
            "crm_webhook_secret": "s" * 32,
        },
        {
            "crm_webhook_url": "https://crm.example.test/hook?token=secret",
            "crm_webhook_secret": "s" * 32,
        },
    ],
)
def test_invalid_crm_webhook_configuration_is_rejected(kwargs: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **kwargs)


def test_resend_configuration_is_canonical_and_visible() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        ingest_token="server-mutation-secret",
        supabase_url="https://database.example",
        supabase_service_role_key="service-role-secret",
        resend_api_key="re_test_secret",
        resend_from="Slipstream <sales@example.com>",
        resend_base_url="HTTPS://API.RESEND.COM:443/",
    )

    assert settings.resend_base_url == "https://api.resend.com"
    assert settings.integration_flags["email_delivery"] is True


@pytest.mark.parametrize(
    "kwargs",
    [
        {"resend_api_key": "re_test_secret"},
        {"resend_from": "sales@example.com"},
        {
            "resend_api_key": "re_test_secret",
            "resend_from": "not-an-address",
            "ingest_token": "server-secret",
        },
        {
            "resend_api_key": "re_test_secret",
            "resend_from": "one@example.com, two@example.com",
            "ingest_token": "server-secret",
        },
        {
            "resend_api_key": "re_test_secret",
            "resend_from": "sales@example.com",
        },
        {
            "environment": "production",
            "resend_api_key": "re_test_secret",
            "resend_from": "sales@example.com",
            "resend_base_url": "http://api.resend.test",
            "ingest_token": "server-secret",
        },
        {
            "environment": "production",
            "resend_api_key": "re_test_secret",
            "resend_from": "sales@example.com",
            "ingest_token": "server-secret",
        },
    ],
)
def test_invalid_resend_configuration_is_rejected(kwargs: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **kwargs)


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


def test_local_model_is_credential_free_reasoning_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(
        _env_file=None,
        environment="production",
        reasoning_model="gpt-5.4",
        local_model_base_url="HTTP://LOCALHOST:8081/v1/",
        local_model_name="  local-qwen  ",
    )

    assert settings.local_model_base_url == "http://localhost:8081/v1"
    assert settings.local_model_name == "local-qwen"
    assert settings.reasoning_provider == "local"
    assert settings.effective_reasoning_model == "local-qwen"
    assert settings.reasoning_configured is True
    assert settings.integration_flags["local_model"] is True


def test_hosted_reasoning_provider_takes_priority_over_local_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(
        _env_file=None,
        environment="test",
        reasoning_model="gpt-5.4",
        openrouter_api_key="hosted-key",
        local_model_base_url="http://127.0.0.1:8081/v1",
    )

    assert settings.reasoning_provider == "openrouter"
    assert settings.effective_reasoning_model == "openai/gpt-5.4"


@pytest.mark.parametrize(
    "url",
    [
        "http://model.example/v1",
        "http://127.0.0.1/v1",
        "http://127.0.0.1:8081/not-v1",
        "http://user:secret@127.0.0.1:8081/v1",
        "http://127.0.0.1:8081/v1?token=secret",
    ],
)
def test_local_model_url_rejects_non_loopback_or_ambiguous_endpoints(url: str) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, local_model_base_url=url)


def test_local_model_context_must_match_a_supported_runtime_size() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, local_model_context_tokens=4096)


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
