import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings


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
        "ELEVENLABS_API_KEY",
        "ORIGAMI_API_KEY",
        "WEB_ORIGIN",
        "WEB_ORIGINS",
    ):
        monkeypatch.delenv(name, raising=False)

    settings = Settings(_env_file=".env.example")

    assert settings.storage_mode == "memory"
    assert settings.web_origins == ["http://localhost:3000"]


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
