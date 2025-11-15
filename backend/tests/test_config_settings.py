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


def test_secret_key_placeholder_generates_random_key_when_enforced(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    settings = Settings(
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    assert settings.SECRET_KEY != "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"
    assert len(settings.SECRET_KEY) >= 32


def test_secret_key_placeholder_allowed_when_not_enforced(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    settings = Settings(
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,
    )
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

    # Enforced either via AUTH_ENABLED or explicit flag
    with pytest.raises(ValueError):
        Settings(SECRET_KEY="change-me", AUTH_ENABLED=True, SECRET_KEY_STRICT_ENFORCEMENT=False)
    with pytest.raises(ValueError):
        Settings(SECRET_KEY="change-me", AUTH_ENABLED=False, SECRET_KEY_STRICT_ENFORCEMENT=True)

    # When neither auth nor strict mode is enabled, placeholder is allowed
    Settings(SECRET_KEY="change-me", AUTH_ENABLED=False, SECRET_KEY_STRICT_ENFORCEMENT=False)


def test_secret_key_short_generates_when_enforced(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CI", "1")
    # With AUTH_ENABLED True, short key is auto-generated
    settings = Settings(SECRET_KEY="short", AUTH_ENABLED=True, SECRET_KEY_STRICT_ENFORCEMENT=False)
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short"
    # With AUTH_DISABLED but strict flag enabled, still auto-generated
    settings = Settings(SECRET_KEY="short", AUTH_ENABLED=False, SECRET_KEY_STRICT_ENFORCEMENT=True)
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short"


def test_secret_key_short_allowed_when_not_enforced():
    settings = Settings(SECRET_KEY="short", AUTH_ENABLED=False, SECRET_KEY_STRICT_ENFORCEMENT=False)
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
