from __future__ import annotations

from pathlib import Path

import pytest

from backend.config import Settings

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "test_config.db"


def build_settings(**overrides):
    base = {
        "SECRET_KEY": "x" * 48,  # pragma: allowlist secret
        "DATABASE_URL": f"sqlite:///{DEFAULT_DB_PATH.as_posix()}",
        "SEMESTER_WEEKS": 14,
        "CORS_ORIGINS": "http://localhost:5173",
        "SMS_ENV": "development",  # Avoid production mode enforcement
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_semester_weeks_validation_bounds():
    with pytest.raises(ValueError):
        build_settings(SEMESTER_WEEKS=0)
    with pytest.raises(ValueError):
        build_settings(SEMESTER_WEEKS=60)


def test_database_url_must_reside_in_project(monkeypatch):
    outside_path = PROJECT_ROOT.parent / "outside.db"
    with pytest.raises(ValueError):
        build_settings(DATABASE_URL=f"sqlite:///{outside_path.as_posix()}")


def test_secret_key_auto_generates_secure_value(monkeypatch):
    # With AUTH_ENABLED True, short non-placeholder key is auto-generated
    insecure = build_settings(
        SECRET_KEY="short",  # pragma: allowlist secret
        AUTH_ENABLED=True,  # pragma: allowlist secret
    )
    assert insecure.SECRET_KEY != "short"  # pragma: allowlist secret
    assert len(insecure.SECRET_KEY) >= 32
    # With AUTH_ENABLED False, insecure key is allowed as-is
    insecure = build_settings(
        SECRET_KEY="change-me",  # pragma: allowlist secret
        AUTH_ENABLED=False,  # pragma: allowlist secret
    )  # pragma: allowlist secret
    assert insecure.SECRET_KEY == "change-me"  # pragma: allowlist secret


def test_cors_origins_list_parses_json_string():
    settings = build_settings(CORS_ORIGINS='["http://a.example","http://b.example"]')
    assert settings.CORS_ORIGINS_LIST == ["http://a.example", "http://b.example"]


def test_cors_origins_list_handles_comma_values():
    settings = build_settings(CORS_ORIGINS="http://a.com, http://b.com , http://c.com")
    assert settings.CORS_ORIGINS_LIST == [
        "http://a.com",
        "http://b.com",
        "http://c.com",
    ]


def test_database_url_accepts_postgres_uri():
    settings = build_settings(
        DATABASE_URL="postgresql://sms_user:pw@localhost:5432/student_management",  # pragma: allowlist secret
    )
    assert settings.DATABASE_URL.startswith("postgresql://")


def test_database_url_autobuilds_when_engine_is_postgres():
    settings = build_settings(
        DATABASE_ENGINE="postgresql",
        DATABASE_URL="",
        POSTGRES_USER="sms",
        POSTGRES_PASSWORD="pw",  # pragma: allowlist secret
        POSTGRES_DB="smsdb",
        POSTGRES_HOST="db.internal",
        POSTGRES_PORT=5433,
        POSTGRES_SSLMODE="require",
    )
    assert settings.DATABASE_URL.startswith(
        "postgresql+psycopg://sms:pw@db.internal:5433/smsdb"  # pragma: allowlist secret
    )
    assert "sslmode=require" in settings.DATABASE_URL


def test_database_url_autobuild_requires_complete_postgres_config():
    with pytest.raises(ValueError):
        build_settings(
            DATABASE_ENGINE="postgresql",
            DATABASE_URL="",
            POSTGRES_USER="sms",
            POSTGRES_PASSWORD="pw",  # pragma: allowlist secret
        )
