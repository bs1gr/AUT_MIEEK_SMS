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


def test_secret_key_placeholder_generates_random_key_when_enforced(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    assert (
        settings.SECRET_KEY != "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"  # pragma: allowlist secret
    )
    assert len(settings.SECRET_KEY) >= 32


def test_secret_key_placeholder_allowed_when_not_enforced(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    settings = Settings(
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,
    )
    assert (
        settings.SECRET_KEY == "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"  # pragma: allowlist secret
    )


def test_secret_key_placeholder_raises_when_not_in_test_env(
    monkeypatch: pytest.MonkeyPatch,
):
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
        Settings(
            SECRET_KEY="change-me",  # pragma: allowlist secret
            AUTH_ENABLED=True,
            SECRET_KEY_STRICT_ENFORCEMENT=False,
        )
    with pytest.raises(ValueError):
        Settings(
            SECRET_KEY="change-me",  # pragma: allowlist secret
            AUTH_ENABLED=False,
            SECRET_KEY_STRICT_ENFORCEMENT=True,
        )
    # When neither auth nor strict mode is enabled, placeholder is allowed
    Settings(
        SECRET_KEY="change-me",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,  # pragma: allowlist secret
    )


def test_secret_key_short_generates_when_enforced(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CI", "1")
    # With AUTH_ENABLED True, short key is auto-generated
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="short",  # pragma: allowlist secret
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=False,  # pragma: allowlist secret
    )
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short"  # pragma: allowlist secret
    # With AUTH_DISABLED but strict flag enabled, still auto-generated
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="short",  # pragma: allowlist secret
        AUTH_ENABLED=False,  # pragma: allowlist secret
        SECRET_KEY_STRICT_ENFORCEMENT=True,  # pragma: allowlist secret
    )
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short"  # pragma: allowlist secret


def test_secret_key_short_allowed_when_not_enforced():
    settings = Settings(
        SECRET_KEY="short",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,  # pragma: allowlist secret
    )  # pragma: allowlist secret
    assert settings.SECRET_KEY == "short"  # pragma: allowlist secret


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


def test_auth_enabled_raises_error_with_placeholder_secret_key(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    # SECRET_KEY is a placeholder value, should raise error if AUTH_ENABLED
    with pytest.raises(ValueError):
        Settings(
            SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",  # pragma: allowlist secret
            AUTH_ENABLED=True,
            SECRET_KEY_STRICT_ENFORCEMENT=False,
        )


def test_auth_enabled_accepts_custom_secret_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    # Custom secret key should be accepted
    settings = Settings(
        SECRET_KEY="my-custom-secret-key-1234567890abcdef",  # pragma: allowlist secret
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    assert (
        settings.SECRET_KEY == "my-custom-secret-key-1234567890abcdef"  # pragma: allowlist secret
    )  # pragma: allowlist secret


def test_auth_disabled_allows_placeholder_secret_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    # AUTH_ENABLED is False, placeholder secret key should be allowed
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=False,
    )
    assert (
        settings.SECRET_KEY == "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"  # pragma: allowlist secret
    )


def test_secret_key_can_be_explicitly_set(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "config/test")
    # Explicitly setting SECRET_KEY should work
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="explicitly-set-secret-key-with-enough-length-32chars",  # pragma: allowlist secret
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    assert (
        settings.SECRET_KEY == "explicitly-set-secret-key-with-enough-length-32chars"  # pragma: allowlist secret
    )  # pragma: allowlist secret


def test_secret_key_auto_generation_on_short_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CI", "1")
    # Short key should trigger auto-generation
    settings = Settings(
        SMS_ENV="development",
        SECRET_KEY="short-key",  # pragma: allowlist secret
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=False,  # pragma: allowlist secret
    )
    assert len(settings.SECRET_KEY) >= 32
    assert settings.SECRET_KEY != "short-key"  # pragma: allowlist secret


SECRET = "test-key-185"  # pragma: allowlist secret
