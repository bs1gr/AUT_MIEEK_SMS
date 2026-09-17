"""Restore must never execute backup content, and must refuse what it cannot restore.

Regression tests for 2026-09-17. Without psql, restore_backup used to split the file on ";"
and execute every fragment on an autocommit connection. A psycopg COPY data export - what
create_backup wrote when pg_dump was missing - is CSV under a "--" header, so a typical one
was skipped as a comment and reported success with 0 statements executed, while a stored text
value such as "x;DELETE FROM users;y" was split out and executed verbatim.

create_backup now writes a data-only backup in PostgreSQL's COPY text format, and restore
parses that format structurally: identifiers are re-quoted from the live catalog and row data
only ever travels through COPY's data stream, so backup data can never become SQL. The tests
below hold that line - see test_restore_never_lets_row_data_become_sql - and keep refusing the
old CSV exports, which remain unrestorable by anything.

The end-to-end proof against a real PostgreSQL server lives in
test_database_manager_restore_roundtrip.py.
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
CURRENT_EXPORT_HEADER = "-- SMS PostgreSQL data export (psycopg COPY)\n"

INJECTION = "x;DELETE FROM users;y"


def _export_with_injection(header: str) -> str:
    return (
        header + "-- Timestamp: 20260917_120000\n\n"
        "\n-- Table: students\n-- COPY students (3 columns)\n"
        "id,first_name,email\n"
        f"1,{INJECTION},maria@example.com\n"
    )


def _data_only_backup(rows: str = f"1\t{INJECTION}\n", revision: str = "abc123") -> str:
    return (
        f"{database_manager._DATA_BACKUP_HEADER}\n"
        "-- Restorable: by this app, or with: psql -f <file>\n"
        "-- Timestamp: 20260917_120000\n"
        f"-- Alembic version: {revision}\n"
        "\nBEGIN;\n\n"
        'TRUNCATE TABLE "students" RESTART IDENTITY CASCADE;\n'
        '\nCOPY "students" ("id", "first_name") FROM stdin;\n'
        f"{rows}"
        "\\.\n"
        "\nSELECT pg_catalog.setval('students_id_seq', 7, true);\n"
        "\nCOMMIT;\n"
    )


# ---------------------------------------------------------------------------
# Fake psycopg objects - a restore may touch these, but never a real database
# ---------------------------------------------------------------------------


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None


class _Ctx:
    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


class _FakeCopy(_Ctx):
    def __init__(self, sink):
        self._sink = sink

    def write(self, data):
        self._sink.append(data)


class _FakeCursor:
    def __init__(self, conn):
        self._conn = conn

    def copy(self, statement):
        self._conn.copy_statements.append(statement)
        return _FakeCopy(self._conn.copied)


class _FakeConn(_Ctx):
    """Answers the catalog queries restore makes and records everything it executes."""

    def __init__(
        self,
        *,
        tables=None,
        columns=None,
        sequences=("students_id_seq",),
        revision="abc123",
        has_alembic_table=True,
    ):
        self.tables = list(tables if tables is not None else ["students"])
        self.columns = dict(columns if columns is not None else {"students": ["id", "first_name"]})
        self.sequences = list(sequences)
        self.revision = revision
        self.has_alembic_table = has_alembic_table
        self.executed = []
        self.copy_statements = []
        self.copied = []

    def execute(self, statement, params=None):
        self.executed.append((statement, params))
        text = statement if isinstance(statement, str) else ""
        if "information_schema.tables" in text:
            return _Rows([(t,) for t in self.tables])
        if "information_schema.columns" in text:
            return _Rows([(c,) for c in self.columns.get(params[0], [])])
        if "information_schema.sequences" in text:
            return _Rows([(s,) for s in self.sequences])
        if "to_regclass" in text:
            return _Rows([("alembic_version" if self.has_alembic_table else None,)])
        if "alembic_version" in text:
            return _Rows([(self.revision,)] if self.revision else [])
        if not isinstance(statement, str):
            # A composed statement: the sequence-value read ("SELECT last_value, is_called
            # FROM <seq>") or the TRUNCATE, whose result is not used.
            return _Rows([(7, True)])
        return _Rows([])

    def transaction(self):
        return _Ctx()

    def cursor(self):
        return _FakeCursor(self)

    def executed_sql_text(self) -> str:
        """Every statement handed to the server, as one searchable string."""
        return "\n".join(f"{statement!r} {params!r}" for statement, params in self.executed)


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


# ---------------------------------------------------------------------------
# The old CSV exports stay refused
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("psql_present", [True, False])
@pytest.mark.parametrize(
    "header",
    [LEGACY_EXPORT_HEADER, CURRENT_EXPORT_HEADER],
    ids=["legacy-header", "data-export-header"],
)
def test_restore_refuses_psycopg_data_export(backup_dir, nothing_may_execute, monkeypatch, header, psql_present):
    (backup_dir / "primary_sms_20260917_120000.sql").write_text(_export_with_injection(header), encoding="utf-8")
    monkeypatch.setattr(database_manager.shutil, "which", lambda _name: "/usr/bin/psql" if psql_present else None)

    with pytest.raises(ValueError, match="CSV data export"):
        database_manager.restore_backup(INSTANCE, "primary_sms_20260917_120000.sql")


def test_restore_of_pg_dump_script_without_psql_refuses_instead_of_executing(
    backup_dir, nothing_may_execute, monkeypatch
):
    # Genuine SQL, and not this module's format, so only psql could apply it.
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


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------


def test_is_psycopg_data_export_only_matches_exports():
    assert database_manager._is_psycopg_data_export(LEGACY_EXPORT_HEADER + "id\n1\n")
    assert database_manager._is_psycopg_data_export("\ufeff" + CURRENT_EXPORT_HEADER)
    assert not database_manager._is_psycopg_data_export("--\n-- PostgreSQL database dump\n--\n")
    assert not database_manager._is_psycopg_data_export("SELECT 1;\n-- (psycopg COPY)\n")
    # The new data-only backup must not be mistaken for an old export, or it would be refused.
    assert not database_manager._is_psycopg_data_export(_data_only_backup())


def test_is_data_only_backup_only_matches_data_only_backups():
    assert database_manager._is_data_only_backup(_data_only_backup())
    assert database_manager._is_data_only_backup("\ufeff" + _data_only_backup())
    assert not database_manager._is_data_only_backup(LEGACY_EXPORT_HEADER)
    assert not database_manager._is_data_only_backup(CURRENT_EXPORT_HEADER)
    assert not database_manager._is_data_only_backup("--\n-- PostgreSQL database dump\n--\n")
    assert not database_manager._is_data_only_backup("SELECT 1;\n-- (COPY format)\n")


# ---------------------------------------------------------------------------
# The parser treats row data as data, never as SQL
# ---------------------------------------------------------------------------


def test_parser_returns_row_data_verbatim_including_semicolons():
    revision, blocks, sequences = database_manager._parse_data_only_backup(_data_only_backup())

    assert revision == "abc123"
    assert sequences == [("students_id_seq", 7, True)]
    assert len(blocks) == 1
    table, columns, data = blocks[0]
    assert table == "students"
    assert columns == ["id", "first_name"]
    assert data == f"1\t{INJECTION}\n".encode("utf-8")


def test_parser_cannot_have_its_terminator_forged_from_row_data():
    r"""A value of "\." is escaped as "\\." by COPY, so it never ends the block."""
    rows = "1\t\\\\.\n2\tsecond row\n"
    _revision, blocks, _sequences = database_manager._parse_data_only_backup(_data_only_backup(rows=rows))

    assert len(blocks) == 1
    assert blocks[0][2] == rows.encode("utf-8")


def test_parser_rejects_a_truncated_backup():
    truncated = _data_only_backup().split("\\.\n")[0]

    with pytest.raises(ValueError, match="truncated"):
        database_manager._parse_data_only_backup(truncated)


def test_restore_never_lets_row_data_become_sql(monkeypatch):
    """The core regression: "x;DELETE FROM users;y" must arrive as data, not as a statement."""
    import psycopg

    conn = _FakeConn()
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup())

    assert result["success"] is True
    assert result["method"] == "psycopg_copy"

    # The injected text reached the server only through COPY's data stream...
    assert b"".join(conn.copied) == f"1\t{INJECTION}\n".encode("utf-8")
    # ...and never inside a statement.
    assert "DELETE" not in conn.executed_sql_text().upper()
    assert INJECTION not in conn.executed_sql_text()
    assert INJECTION not in "\n".join(repr(s) for s in conn.copy_statements)


def test_restore_refuses_an_alembic_revision_mismatch(monkeypatch):
    import psycopg

    conn = _FakeConn(revision="different-revision")
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup(revision="abc123"))

    assert result["success"] is False
    assert "abc123" in result["error"] and "different-revision" in result["error"]
    assert "Nothing was changed" in result["error"]
    assert conn.copied == [], "no data may be written when the schema revision disagrees"


def test_alembic_revision_checks_for_the_table_before_querying_it(monkeypatch):
    """A missing alembic_version must not be discovered by running a failing statement.

    In PostgreSQL a failed statement aborts the transaction, so catching the error would leave
    the connection unusable for the backup or restore that follows.
    """
    conn = _FakeConn(has_alembic_table=False)

    assert database_manager._alembic_revision(conn) == ""
    statements = [s for s, _p in conn.executed if isinstance(s, str)]
    assert any("to_regclass" in s for s in statements), "existence must be checked first"
    assert not any("FROM alembic_version" in s for s in statements), (
        "the table must not be queried when it does not exist"
    )


def test_restore_proceeds_when_the_backup_records_no_revision(monkeypatch):
    """A backup from a database without alembic_version still restores."""
    import psycopg

    conn = _FakeConn(has_alembic_table=False)
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup(revision=""))

    assert result["success"] is True
    assert b"".join(conn.copied) == f"1\t{INJECTION}\n".encode("utf-8")


def test_restore_refuses_a_table_the_database_does_not_have(monkeypatch):
    import psycopg

    conn = _FakeConn(tables=["courses"], columns={"courses": ["id"]})
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup())

    assert result["success"] is False
    assert "students" in result["error"]
    assert conn.copied == []


def test_restore_refuses_a_column_the_table_does_not_have(monkeypatch):
    import psycopg

    conn = _FakeConn(columns={"students": ["id"]})
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup())

    assert result["success"] is False
    assert "first_name" in result["error"]
    assert conn.copied == []


def test_restore_reports_failure_without_claiming_success(monkeypatch):
    import psycopg

    def _explode(*_a, **_k):
        raise RuntimeError("connection lost")

    monkeypatch.setattr(psycopg, "connect", _explode)

    result = database_manager.restore_sql_content(INSTANCE, _data_only_backup())

    assert result["success"] is False
    assert "nothing was changed" in result["error"].lower()


# ---------------------------------------------------------------------------
# What backup writes is what restore reads
# ---------------------------------------------------------------------------


def test_psycopg_backup_is_restorable_and_round_trips_through_the_parser(backup_dir, monkeypatch):
    import psycopg

    class _CopyOut(_Ctx):
        def __enter__(self):
            # Two chunks, splitting a multi-byte Greek name, as a real COPY stream may.
            payload = f"1\t{INJECTION}\n2\tΜαρία\n".encode("utf-8")
            return iter([payload[:26], payload[26:]])

    class _BackupCursor:
        def copy(self, _sql):
            return _CopyOut()

    class _BackupConn(_FakeConn):
        def cursor(self):
            return _BackupCursor()

    conn = _BackupConn()
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)

    result = database_manager._backup_via_psycopg(INSTANCE, backup_dir, "20260917_150000", compress=False)

    assert result["success"] is True
    assert result["method"] == "psycopg_copy"
    assert result["restorable"] is True
    assert result["alembic_version"] == "abc123"

    written = (backup_dir / result["filename"]).read_text(encoding="utf-8")
    assert database_manager._is_data_only_backup(written)
    assert not database_manager._is_psycopg_data_export(written)

    # The file restore would read back carries both values intact, chunk split and all.
    revision, blocks, sequences = database_manager._parse_data_only_backup(written)
    assert revision == "abc123"
    assert blocks[0][0] == "students"
    assert blocks[0][2].decode("utf-8") == f"1\t{INJECTION}\n2\tΜαρία\n"
    assert ("students_id_seq", 7, True) in sequences


def test_backup_excludes_alembic_version_table(backup_dir, monkeypatch):
    """The schema revision is recorded in the header and checked, not restored as data."""
    import psycopg

    conn = _FakeConn(tables=["alembic_version", "students"])
    monkeypatch.setattr(psycopg, "connect", lambda *_a, **_k: conn)
    assert database_manager._public_tables(conn) == ["students"]


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
