from __future__ import annotations

import sys
from pathlib import Path

import pytest

from backend.config import Settings


def test_cors_origins_list_parses_json_like_string():
    settings = Settings(CORS_ORIGINS='["http://a.test", " http://b.test "]')
    assert settings.CORS_ORIGINS_LIST == ["http://a.test", "http://b.test"]


def test_cors_origins_list_parses_comma_list():
    settings = Settings(CORS_ORIGINS="http://a.test, http://b.test ,")
    assert settings.CORS_ORIGINS_LIST == ["http://a.test", "http://b.test"]


def test_semester_weeks_validator_rejects_out_of_range():
    with pytest.raises(ValueError):
        Settings(SEMESTER_WEEKS=0)


def test_secret_key_placeholder_generates_random_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    # With AUTH_ENABLED True, insecure key is auto-generated
    settings = Settings(SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345", AUTH_ENABLED=True)
    assert settings.SECRET_KEY != "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"
    assert len(settings.SECRET_KEY) >= 32
    # With AUTH_ENABLED False, insecure key is allowed as-is
    settings = Settings(SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345", AUTH_ENABLED=False)
    assert settings.SECRET_KEY == "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"


def test_secret_key_placeholder_raises_when_not_in_test_env(monkeypatch: pytest.MonkeyPatch):
    # Clear all CI and test detection environment variables
    ci_and_test_flags = (
        "PYTEST_CURRENT_TEST",
        "PYTEST_RUNNING",
        "CI",
        "GITHUB_ACTIONS",
        "GITLAB_CI",
        "GITHUB_RUN_ID",
        "CI_SERVER",
        "CONTINUOUS_INTEGRATION",
        "CI_ALLOW_INSECURE_SECRET",
        "TESTING",
    )
    for flag in ci_and_test_flags:
        monkeypatch.delenv(flag, raising=False)
    monkeypatch.setattr(sys, "argv", ["python"], raising=False)

    # With AUTH_ENABLED True, should raise
    with pytest.raises(ValueError):
        Settings(SECRET_KEY="change-me", AUTH_ENABLED=True)
    # With AUTH_ENABLED False, should not raise
    Settings(SECRET_KEY="change-me", AUTH_ENABLED=False)


def test_secret_key_short_generates_when_allowed(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CI", "1")
    # With AUTH_ENABLED True, short key is auto-generated
    settings = Settings(SECRET_KEY="short", AUTH_ENABLED=True)
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short"
    # With AUTH_ENABLED False, short key is allowed as-is
    settings = Settings(SECRET_KEY="short", AUTH_ENABLED=False)
    assert settings.SECRET_KEY == "short"


def test_database_url_rejects_path_outside_project(monkeypatch: pytest.MonkeyPatch):
    project_root = Path(__file__).resolve().parents[2]
    outside = project_root.parent / "outside" / "db.sqlite"
    db_url = f"sqlite:///{outside.as_posix()}"
    with pytest.raises(ValueError):
        Settings(DATABASE_URL=db_url)


def test_database_url_accepts_path_inside_project():
    project_root = Path(__file__).resolve().parents[2]
    db_path = project_root / "data" / "tests" / "db.sqlite"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_url = f"sqlite:///{db_path.as_posix()}"
    settings = Settings(DATABASE_URL=db_url)
    assert settings.DATABASE_URL == db_url
