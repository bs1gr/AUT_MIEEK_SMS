from __future__ import annotations

from pathlib import Path

import pytest

from backend import run_migrations


def test_run_migrations_success(monkeypatch: pytest.MonkeyPatch, capsys):
    called = {}

    def fake_alembic_config(_backend_dir: Path):
        called["config"] = Path("dummy.ini")
        return called["config"]

    def fake_upgrade(cfg, target):
        called["upgrade_cfg"] = cfg
        called["target"] = target

    monkeypatch.setattr(run_migrations, "_alembic_config", fake_alembic_config)
    monkeypatch.setattr(run_migrations.command, "upgrade", fake_upgrade)

    assert run_migrations.run_migrations(verbose=True) is True
    captured = capsys.readouterr()
    assert "DATABASE MIGRATION CHECK" in captured.out
    assert called["target"] == "head"
    assert called["upgrade_cfg"] == called["config"]


def test_run_migrations_failure(monkeypatch: pytest.MonkeyPatch, capsys):
    def fake_alembic_config(_backend_dir: Path):
        return Path("dummy.ini")

    def fake_upgrade(cfg, target):  # noqa: ARG001 - part of signature contract
        raise RuntimeError("boom")

    monkeypatch.setattr(run_migrations, "_alembic_config", fake_alembic_config)
    monkeypatch.setattr(run_migrations.command, "upgrade", fake_upgrade)

    assert run_migrations.run_migrations(verbose=True) is False
    captured = capsys.readouterr()
    assert "ERROR: Migration error" in captured.err


def test_check_migration_status(monkeypatch: pytest.MonkeyPatch):
    def fake_alembic_config(_backend_dir: Path):
        return Path("dummy.ini")

    def fake_current(cfg, verbose=False):  # noqa: ARG001 - signature compatibility
        return "abc123"

    monkeypatch.setattr(run_migrations, "_alembic_config", fake_alembic_config)
    monkeypatch.setattr(run_migrations.command, "current", fake_current)

    assert run_migrations.check_migration_status() == "abc123"


def test_check_migration_status_handles_exception(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(run_migrations, "_alembic_config", lambda _: Path("dummy.ini"))

    def fake_current(cfg, verbose=False):  # noqa: ARG001
        raise RuntimeError("nope")

    monkeypatch.setattr(run_migrations.command, "current", fake_current)

    assert run_migrations.check_migration_status(verbose=True) == ""
