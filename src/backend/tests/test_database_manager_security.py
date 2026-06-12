"""Focused security tests for database backup path handling."""

import importlib.util
from pathlib import Path

import pytest


def _load_database_manager_module():
    module_path = Path(__file__).resolve().parents[1] / "services" / "database_manager.py"
    spec = importlib.util.spec_from_file_location("test_database_manager_module", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


database_manager = _load_database_manager_module()


def test_get_backup_path_rejects_traversal(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)

    assert database_manager.get_backup_path("..\\evil.sql") is None
    assert database_manager.get_backup_path("../evil.sql") is None


def test_delete_backup_rejects_traversal(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)

    with pytest.raises(ValueError, match="Invalid backup filename"):
        database_manager.delete_backup("../evil.sql")


def test_restore_backup_rejects_traversal(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)

    with pytest.raises(ValueError, match="Invalid backup filename"):
        database_manager.restore_backup({"name": "primary"}, "..\\evil.sql")


def test_get_backup_path_accepts_valid_backup(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)
    backup = tmp_path / "primary_student_management_20260310_120000.sql.gz"
    backup.write_text("-- backup", encoding="utf-8")

    resolved = database_manager.get_backup_path(backup.name)

    assert resolved == backup.resolve()
