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
    yield
    _ensure_default_modules()


def test_run_migrations_creates_tables(monkeypatch):
    project_root = Path(__file__).resolve().parents[2]
    tmp_dir = project_root / "tmp_test_migrations"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    dbfile = tmp_dir / "test_migrations.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{dbfile}")

    run_migrations = _reload_modules()

    ok = run_migrations.run_migrations(verbose=True)
    assert ok is True
    assert dbfile.exists()

    import sqlite3

    con = sqlite3.connect(str(dbfile))
    cur = con.cursor()
    tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    assert "alembic_version" in tables or "courses" in tables


def test_alembic_config_uses_application_settings():
    run_migrations = _reload_modules()
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = run_migrations._alembic_config(backend_dir)
    assert cfg.get_main_option("sqlalchemy.url") == run_migrations.settings.DATABASE_URL
    assert cfg.get_main_option("script_location") == str(backend_dir / "migrations")


def test_run_migrations_invokes_upgrade(monkeypatch):
    run_migrations = _reload_modules()
    called = {}

    def fake_upgrade(cfg, revision):
        called["revision"] = revision

    monkeypatch.setattr(run_migrations.command, "upgrade", fake_upgrade)

    result = run_migrations.run_migrations(verbose=True)
    assert result is True
    assert called["revision"] == "head"


def test_run_migrations_handles_failure(monkeypatch):
    run_migrations = _reload_modules()

    def boom(cfg, revision):  # noqa: ARG001
        raise RuntimeError("upgrade failed")

    monkeypatch.setattr(run_migrations.command, "upgrade", boom)

    result = run_migrations.run_migrations(verbose=False)
    assert result is False


def test_check_migration_status_returns_string(monkeypatch):
    run_migrations = _reload_modules()
    monkeypatch.setattr(run_migrations.command, "current", lambda cfg, verbose=False: "abc123")
    status = run_migrations.check_migration_status(verbose=True)
    assert status == "abc123"
