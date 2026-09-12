import os
import subprocess
import sys

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_comma_separated_origin_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEB_ORIGINS", "http://localhost:3000, https://slipstream.example")

    settings = Settings(_env_file=None)

    assert settings.web_origins == ["http://localhost:3000", "https://slipstream.example"]


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


def test_example_environment_starts_in_subprocess() -> None:
    clean_environment = {
        "PATH": os.environ["PATH"],
        "PYTHONPATH": ".",
        "ENVIRONMENT": "test",
        "WEB_ORIGINS": "http://localhost:3000",
    }
    result = subprocess.run(
        [sys.executable, "-c", "from app.main import app; print(app.title)"],
        cwd=os.path.dirname(os.path.dirname(__file__)),
        env=clean_environment,
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "Slipstream API"
