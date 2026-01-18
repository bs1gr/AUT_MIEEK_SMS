from __future__ import annotations

import importlib
from pathlib import Path

import pytest


def _reload_modules():
    import backend.config as config_mod
    import backend.run_migrations as run_migrations_mod

    importlib.reload(config_mod)
    return importlib.reload(run_migrations_mod)


def _ensure_default_modules():
    import backend.config as config_mod
    import backend.run_migrations as run_migrations_mod

    importlib.reload(config_mod)
    importlib.reload(run_migrations_mod)


@pytest.fixture(autouse=True)
def reset_modules():
    """Reset modules after each test, with proper environment setup to avoid validation errors."""
    yield
    # Set test environment variables directly in os.environ before reloading modules
    # This prevents SECRET_KEY validation errors during teardown
    # We use os.environ directly because monkeypatch context has ended after yield
    import os

    os.environ["SMS_ENV"] = "test"
    os.environ["SMS_EXECUTION_MODE"] = "native"
    # Disable auth to prevent special PYTEST_CURRENT_TEST validation (config.py:481-487)
    os.environ["AUTH_ENABLED"] = "0"
    os.environ["SECRET_KEY_STRICT_ENFORCEMENT"] = "0"
    try:
        _ensure_default_modules()
    finally:
        # Clean up env vars we set (optional, but cleaner)
        for key in ["SMS_ENV", "SMS_EXECUTION_MODE", "AUTH_ENABLED", "SECRET_KEY_STRICT_ENFORCEMENT"]:
            if key in os.environ:
                del os.environ[key]


def test_run_migrations_creates_tables(monkeypatch, tmp_path):
    # Ensure test environment is properly detected before reloading modules
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "test_run_migrations.py::test_run_migrations_creates_tables")
    monkeypatch.setenv("SMS_ENV", "test")
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    monkeypatch.setenv("AUTH_ENABLED", "0")
    monkeypatch.setenv("SECRET_KEY_STRICT_ENFORCEMENT", "0")

    db_file = tmp_path / "test_migrations.db"
    if db_file.exists():
        db_file.unlink()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")

    run_migrations = _reload_modules()

    ok = run_migrations.run_migrations(verbose=True)
    assert ok is True
    assert db_file.exists()

    import sqlite3

    con = sqlite3.connect(str(db_file))
    cur = con.cursor()
    tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    assert "alembic_version" in tables or "courses" in tables


def test_alembic_config_uses_application_settings(monkeypatch):
    # Ensure test environment before module reload
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "test_run_migrations.py::test_alembic_config_uses_application_settings")
    monkeypatch.setenv("SMS_ENV", "test")
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    monkeypatch.setenv("AUTH_ENABLED", "0")
    monkeypatch.setenv("SECRET_KEY_STRICT_ENFORCEMENT", "0")

    run_migrations = _reload_modules()
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = run_migrations._alembic_config(backend_dir)
    assert cfg.get_main_option("sqlalchemy.url") == run_migrations.settings.DATABASE_URL
    assert cfg.get_main_option("script_location") == str(backend_dir / "migrations")


def test_run_migrations_invokes_upgrade(monkeypatch):
    # Ensure test environment before module reload
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "test_run_migrations.py::test_run_migrations_invokes_upgrade")
    monkeypatch.setenv("SMS_ENV", "test")
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    monkeypatch.setenv("AUTH_ENABLED", "0")
    monkeypatch.setenv("SECRET_KEY_STRICT_ENFORCEMENT", "0")

    run_migrations = _reload_modules()
    called = {}

    def fake_upgrade(cfg, revision):
        called["revision"] = revision

    monkeypatch.setattr(run_migrations.command, "upgrade", fake_upgrade)

    result = run_migrations.run_migrations(verbose=True)
    assert result is True
    assert called["revision"] == "head"


def test_run_migrations_handles_failure(monkeypatch):
    # Ensure test environment before module reload
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "test_run_migrations.py::test_run_migrations_handles_failure")
    monkeypatch.setenv("SMS_ENV", "test")
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    monkeypatch.setenv("AUTH_ENABLED", "0")
    monkeypatch.setenv("SECRET_KEY_STRICT_ENFORCEMENT", "0")

    run_migrations = _reload_modules()

    def boom(cfg, revision):
        raise RuntimeError("upgrade failed")

    monkeypatch.setattr(run_migrations.command, "upgrade", boom)

    result = run_migrations.run_migrations(verbose=False)
    assert result is False


def test_check_migration_status_returns_string(monkeypatch):
    # Ensure test environment before module reload
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "test_run_migrations.py::test_check_migration_status_returns_string")
    monkeypatch.setenv("SMS_ENV", "test")
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    monkeypatch.setenv("AUTH_ENABLED", "0")
    monkeypatch.setenv("SECRET_KEY_STRICT_ENFORCEMENT", "0")

    run_migrations = _reload_modules()
    monkeypatch.setattr(run_migrations.command, "current", lambda cfg, verbose=False: "abc123")
    status = run_migrations.check_migration_status(verbose=True)
    assert status == "abc123"
