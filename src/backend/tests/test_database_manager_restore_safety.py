"""Restore must never execute backup content it cannot restore correctly.

Regression tests for 2026-09-17. Without psql, restore_backup used to split the file on ";"
and execute every fragment on an autocommit connection. A psycopg COPY data export - what
create_backup writes when pg_dump is missing - is CSV under a "--" header, so a typical one
was skipped as a comment and reported success with 0 statements executed, while a stored text
value such as "x;DELETE FROM users;y" was split out and executed verbatim.
"""

import importlib.util
from pathlib import Path

import pytest


def _load_database_manager_module():
    module_path = Path(__file__).resolve().parents[1] / "services" / "database_manager.py"
    spec = importlib.util.spec_from_file_location("test_database_manager_restore_module", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


database_manager = _load_database_manager_module()

INSTANCE = {"name": "primary", "host": "db", "port": 5432, "dbname": "sms", "user": "u", "password": "p"}

LEGACY_EXPORT_HEADER = "-- SMS PostgreSQL Backup (psycopg COPY)\n"


def _export_with_injection(header: str) -> str:
    return (
        header + "-- Timestamp: 20260917_120000\n\n"
        "\n-- Table: students\n-- COPY students (3 columns)\n"
        "id,first_name,email\n"
        "1,x;DELETE FROM users;y,maria@example.com\n"
    )


@pytest.fixture
def backup_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def nothing_may_execute(monkeypatch):
    """Fail the test if restore reaches psql or opens a database connection."""
    import psycopg

    def _no_connect(*_a, **_k):
        raise AssertionError("restore opened a database connection")

    def _no_subprocess(*_a, **_k):
        raise AssertionError("restore ran a subprocess")

    monkeypatch.setattr(psycopg, "connect", _no_connect)
    monkeypatch.setattr(database_manager.subprocess, "run", _no_subprocess)


@pytest.mark.parametrize("psql_present", [True, False])
@pytest.mark.parametrize(
    "header",
    [LEGACY_EXPORT_HEADER, "-- SMS PostgreSQL data export (psycopg COPY)\n"],
    ids=["legacy-header", "current-header"],
)
def test_restore_refuses_psycopg_data_export(backup_dir, nothing_may_execute, monkeypatch, header, psql_present):
    (backup_dir / "primary_sms_20260917_120000.sql").write_text(_export_with_injection(header), encoding="utf-8")
    monkeypatch.setattr(database_manager.shutil, "which", lambda _name: "/usr/bin/psql" if psql_present else None)

    with pytest.raises(ValueError, match="data export"):
        database_manager.restore_backup(INSTANCE, "primary_sms_20260917_120000.sql")


def test_restore_without_psql_refuses_instead_of_executing(backup_dir, nothing_may_execute, monkeypatch):
    # Genuine SQL, so the export check does not apply: the absence of psql alone must stop it.
    (backup_dir / "primary_sms_20260917_130000.sql").write_text(
        "SELECT 1;\nDELETE FROM users;\n", encoding="utf-8"
    )
    monkeypatch.setattr(database_manager.shutil, "which", lambda _name: None)

    result = database_manager.restore_backup(INSTANCE, "primary_sms_20260917_130000.sql")

    assert result["success"] is False
    assert result["method"] == "none"
    assert "psql" in result["error"]
    assert "Nothing was changed" in result["error"]


def test_restore_with_psql_hands_sql_to_psql(backup_dir, monkeypatch):
    sql = "--\n-- PostgreSQL database dump\n--\nSELECT 1;\n"
    (backup_dir / "primary_sms_20260917_140000.sql").write_text(sql, encoding="utf-8")
    monkeypatch.setattr(database_manager.shutil, "which", lambda _name: "/usr/bin/psql")
    seen = {}

    class _Completed:
        returncode = 0
        stdout = b""
        stderr = b""

    def _fake_run(cmd, input=None, **_kwargs):  # noqa: A002 - mirrors subprocess.run
        seen["cmd"] = cmd
        seen["input"] = input
        return _Completed()

    monkeypatch.setattr(database_manager.subprocess, "run", _fake_run)

    result = database_manager.restore_backup(INSTANCE, "primary_sms_20260917_140000.sql")

    assert result["success"] is True
    assert result["method"] == "psql"
    assert seen["cmd"][0] == "psql"
    assert seen["input"] == sql.encode("utf-8")


def test_is_psycopg_data_export_only_matches_exports():
    assert database_manager._is_psycopg_data_export(LEGACY_EXPORT_HEADER + "id\n1\n")
    assert database_manager._is_psycopg_data_export("﻿-- SMS PostgreSQL data export (psycopg COPY)\n")
    assert not database_manager._is_psycopg_data_export("--\n-- PostgreSQL database dump\n--\n")
    assert not database_manager._is_psycopg_data_export("SELECT 1;\n-- (psycopg COPY)\n")


def test_psycopg_backup_is_labelled_and_refused_on_restore(backup_dir, monkeypatch):
    """Round trip: what the fallback backup writes is exactly what restore refuses."""
    import psycopg

    class _Rows:
        def __init__(self, rows):
            self._rows = rows

        def fetchall(self):
            return self._rows

    class _Copy:
        def __enter__(self):
            return iter([b"id,first_name\n", b"1,x;DELETE FROM users;y\n"])

        def __exit__(self, *_a):
            return False

    class _Cursor:
        def copy(self, _sql):
            return _Copy()

    class _Conn:
        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

        def execute(self, sql, _params=None):
            if "information_schema.tables" in sql:
                return _Rows([("students",)])
            return _Rows([("id",), ("first_name",)])

        def cursor(self):
            return _Cursor()

    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: _Conn())

    result = database_manager._backup_via_psycopg(INSTANCE, backup_dir, "20260917_150000", compress=False)

    assert result["success"] is True
    assert result["method"] == "psycopg_copy"
    assert result["restorable"] is False
    assert result["warning"] == database_manager.PSYCOPG_EXPORT_WARNING
    written = (backup_dir / result["filename"]).read_text(encoding="utf-8")
    assert "NOT a restorable backup" in written

    # The same file must be refused, with psql present or not, and nothing executed.
    def _no_connect(*_a, **_k):
        raise AssertionError("restore opened a database connection")

    monkeypatch.setattr(psycopg, "connect", _no_connect)
    for psql in ("/usr/bin/psql", None):
        monkeypatch.setattr(database_manager.shutil, "which", lambda _name, _p=psql: _p)
        with pytest.raises(ValueError, match="data export"):
            database_manager.restore_backup(INSTANCE, result["filename"])


def test_pg_dump_backup_result_is_marked_restorable(backup_dir, monkeypatch):
    class _Completed:
        returncode = 0
        stdout = b"--\n-- PostgreSQL database dump\n--\n"
        stderr = b""

    def _fake_pg_dump(cmd, **_kwargs):
        # Uncompressed, the real code passes "-f <path>" and pg_dump writes the file itself.
        Path(cmd[cmd.index("-f") + 1]).write_bytes(_Completed.stdout)
        return _Completed()

    monkeypatch.setattr(database_manager.subprocess, "run", _fake_pg_dump)

    result = database_manager._backup_via_pg_dump(INSTANCE, backup_dir, "20260917_160000", compress=False)

    assert result["method"] == "pg_dump"
    assert result["restorable"] is True
