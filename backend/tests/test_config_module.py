from __future__ import annotations

from pathlib import Path

import pytest

from backend.config import Settings


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "test_config.db"


def build_settings(**overrides):
    base = {
        "SECRET_KEY": "x" * 48,
        "DATABASE_URL": f"sqlite:///{DEFAULT_DB_PATH.as_posix()}",
        "SEMESTER_WEEKS": 14,
        "CORS_ORIGINS": "http://localhost:5173",
    }
    base.update(overrides)
    return Settings(**base)


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
    insecure = build_settings(SECRET_KEY="change-me")
    assert insecure.SECRET_KEY != "change-me"
    assert len(insecure.SECRET_KEY) >= 32


def test_cors_origins_list_parses_json_string():
    settings = build_settings(CORS_ORIGINS='["http://a.example","http://b.example"]')
    assert settings.CORS_ORIGINS_LIST == ["http://a.example", "http://b.example"]


def test_cors_origins_list_handles_comma_values():
    settings = build_settings(CORS_ORIGINS="http://a.com, http://b.com , http://c.com")
    assert settings.CORS_ORIGINS_LIST == ["http://a.com", "http://b.com", "http://c.com"]
