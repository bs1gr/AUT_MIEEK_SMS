"""End-to-end proof that a data-only backup really restores, against a real PostgreSQL server.

The unit tests in test_database_manager_restore_safety.py use fakes, so they can show that row
data never becomes SQL but not that the format round-trips through a real server. This module
does the real thing: build a schema with a foreign key, a sequence and awkward data, back it
up, destroy the data, restore, and compare.

Needs a throwaway PostgreSQL and is skipped without one. To run it:

    docker run -d --name sms-restore-test -e POSTGRES_PASSWORD=testpass \
        -e POSTGRES_DB=smstest -p 55433:5432 postgres:16-alpine
    $env:SMS_TEST_POSTGRES_URL = "postgresql://postgres:testpass@127.0.0.1:55433/smstest"
    python -m pytest src/backend/tests/test_database_manager_restore_roundtrip.py -v

Point it only at a disposable database: every test here truncates and rewrites its tables.
"""

import importlib.util
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest

psycopg = pytest.importorskip("psycopg")

TEST_URL = os.environ.get("SMS_TEST_POSTGRES_URL", "").strip()

pytestmark = pytest.mark.skipif(
    not TEST_URL,
    reason="SMS_TEST_POSTGRES_URL is not set; see this module's docstring to run it",
)

# A value that the removed split-on-";" restore executed verbatim as SQL.
INJECTION = "x;DELETE FROM users;y"
# Multi-byte text, which a COPY stream may split across chunk boundaries.
GREEK_NAME = "Μαρία Παπαδοπούλου"
# COPY's own end-of-data marker, as a stored value.
TERMINATOR_LOOKALIKE = "\\."


def _load_database_manager_module():
    module_path = Path(__file__).resolve().parents[1] / "services" / "database_manager.py"
    spec = importlib.util.spec_from_file_location("test_database_manager_roundtrip_module", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


database_manager = _load_database_manager_module()


def _instance() -> dict:
    parsed = urlparse(TEST_URL)
    return {
        "name": "test",
        "host": parsed.hostname or "127.0.0.1",
        "port": parsed.port or 5432,
        "dbname": (parsed.path or "/postgres").lstrip("/"),
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
        "sslmode": "disable",
    }


@pytest.fixture
def conn():
    with psycopg.connect(TEST_URL, autocommit=True) as connection:
        yield connection


@pytest.fixture
def schema(conn):
    """A small schema with a foreign key, a sequence and an Alembic revision."""
    conn.execute("DROP TABLE IF EXISTS students, users, alembic_version CASCADE")
    conn.execute("CREATE TABLE alembic_version (version_num varchar(32) NOT NULL)")
    conn.execute("INSERT INTO alembic_version (version_num) VALUES ('testrev1')")
    conn.execute("CREATE TABLE users (id serial PRIMARY KEY, email text NOT NULL, role text)")
    conn.execute(
        "CREATE TABLE students ("
        "  id serial PRIMARY KEY,"
        "  full_name text NOT NULL,"
        "  notes text,"
        "  user_id integer REFERENCES users (id)"
        ")"
    )
    conn.execute("INSERT INTO users (email, role) VALUES ('admin@example.com', 'admin'), ('t@example.com', 'teacher')")
    conn.execute(
        "INSERT INTO students (full_name, notes, user_id) VALUES (%s, %s, 1), (%s, %s, 2), (%s, %s, NULL)",
        (GREEK_NAME, INJECTION, "Tab\tand\nnewline", TERMINATOR_LOOKALIKE, "Nobody", None),
    )
    yield
    conn.execute("DROP TABLE IF EXISTS students, users, alembic_version CASCADE")


@pytest.fixture
def backup_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(database_manager, "_BACKUP_DIR", tmp_path)
    return tmp_path


def _snapshot(conn) -> dict:
    return {
        "users": conn.execute("SELECT id, email, role FROM users ORDER BY id").fetchall(),
        "students": conn.execute("SELECT id, full_name, notes, user_id FROM students ORDER BY id").fetchall(),
    }


def _backup(backup_dir, compress: bool = False) -> dict:
    return database_manager._backup_via_psycopg(_instance(), backup_dir, "20260917_170000", compress=compress)


def test_data_only_backup_restores_exactly_what_it_captured(conn, schema, backup_dir):
    before = _snapshot(conn)
    assert len(before["students"]) == 3

    result = _backup(backup_dir)
    assert result["success"] is True
    assert result["restorable"] is True
    assert result["alembic_version"] == "testrev1"
    assert result["rows"] == 5  # 2 users + 3 students

    # Destroy the data, and leave different rows behind so a no-op restore cannot pass.
    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")
    conn.execute("INSERT INTO users (email, role) VALUES ('wrong@example.com', 'nobody')")
    assert _snapshot(conn) != before

    restore = database_manager.restore_sql_content(
        _instance(), (backup_dir / result["filename"]).read_text(encoding="utf-8")
    )
    assert restore["success"] is True, restore.get("error")
    assert restore["method"] == "psycopg_copy"

    assert _snapshot(conn) == before


def test_restored_values_keep_semicolons_tabs_newlines_and_greek_text(conn, schema, backup_dir):
    result = _backup(backup_dir)
    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")

    restore = database_manager.restore_sql_content(
        _instance(), (backup_dir / result["filename"]).read_text(encoding="utf-8")
    )
    assert restore["success"] is True, restore.get("error")

    rows = conn.execute("SELECT full_name, notes FROM students ORDER BY id").fetchall()
    assert rows[0] == (GREEK_NAME, INJECTION)
    assert rows[1] == ("Tab\tand\nnewline", TERMINATOR_LOOKALIKE)

    # The point of the exercise: the injected text is a value, and the DELETE it spells out
    # never ran - both users are still here.
    assert conn.execute("SELECT count(*) FROM users").fetchone()[0] == 2


def test_restore_resumes_the_sequence_so_new_rows_do_not_collide(conn, schema, backup_dir):
    result = _backup(backup_dir)
    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")
    database_manager.restore_sql_content(
        _instance(), (backup_dir / result["filename"]).read_text(encoding="utf-8")
    )

    new_id = conn.execute(
        "INSERT INTO students (full_name) VALUES ('Added after restore') RETURNING id"
    ).fetchone()[0]
    assert new_id == 4, "the sequence must carry on past the restored rows, not restart at 1"


def test_backup_orders_parents_before_children_so_foreign_keys_hold(conn, schema, backup_dir):
    result = _backup(backup_dir)
    written = (backup_dir / result["filename"]).read_text(encoding="utf-8")

    assert written.index('COPY "users"') < written.index('COPY "students"')
    # students.user_id references users.id, so the restore above would fail without that order.


def test_compressed_backups_round_trip(conn, schema, backup_dir):
    import gzip

    before = _snapshot(conn)
    result = _backup(backup_dir, compress=True)
    assert result["filename"].endswith(".sql.gz")

    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")
    with gzip.open(backup_dir / result["filename"], "rt", encoding="utf-8") as f:
        content = f.read()

    restore = database_manager.restore_sql_content(_instance(), content)
    assert restore["success"] is True, restore.get("error")
    assert _snapshot(conn) == before


def test_restore_refuses_a_schema_revision_mismatch_without_touching_data(conn, schema, backup_dir):
    before = _snapshot(conn)
    result = _backup(backup_dir)
    content = (backup_dir / result["filename"]).read_text(encoding="utf-8")

    conn.execute("UPDATE alembic_version SET version_num = 'testrev2'")

    restore = database_manager.restore_sql_content(_instance(), content)

    assert restore["success"] is False
    assert "testrev1" in restore["error"] and "testrev2" in restore["error"]
    assert _snapshot(conn) == before, "a refused restore must leave the data alone"


def test_a_failed_restore_rolls_back_and_changes_nothing(conn, schema, backup_dir):
    """A backup whose data violates a live constraint must leave the database untouched."""
    result = _backup(backup_dir)
    content = (backup_dir / result["filename"]).read_text(encoding="utf-8")
    before = _snapshot(conn)

    # Point a student at a user id that does not exist: the row is "3\tNobody\t\N\t\N"
    # (id, full_name, notes, user_id), so this rewrites user_id alone. The COPY passes, the
    # foreign key fails, and the whole transaction - including the TRUNCATE - must roll back.
    broken = content.replace("Nobody\t\\N\t\\N", "Nobody\t\\N\t999999")
    assert broken != content, "the fixture row changed shape; update this rewrite"

    restore = database_manager.restore_sql_content(_instance(), broken)

    assert restore["success"] is False
    assert "rolled back" in restore["error"].lower()
    assert _snapshot(conn) == before


def test_backup_and_restore_work_without_an_alembic_version_table(conn, schema, backup_dir):
    """A missing alembic_version must not poison the transaction.

    In PostgreSQL a failed statement aborts the whole transaction, so probing for the table by
    querying it and catching the error would break the backup's very next COPY.
    """
    conn.execute("DROP TABLE alembic_version")
    before = _snapshot(conn)

    result = _backup(backup_dir)
    assert result["success"] is True, "backup must survive a database with no alembic_version"
    assert result["alembic_version"] == ""
    assert result["rows"] == 5

    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")
    restore = database_manager.restore_sql_content(
        _instance(), (backup_dir / result["filename"]).read_text(encoding="utf-8")
    )
    assert restore["success"] is True, restore.get("error")
    assert _snapshot(conn) == before


def test_the_backup_file_is_also_valid_input_for_psql(conn, schema, backup_dir):
    """The format is a plain PostgreSQL script, so psql can restore it where it exists."""
    import shutil
    import subprocess

    if not shutil.which("psql"):
        pytest.skip("psql is not installed on this machine")

    before = _snapshot(conn)
    result = _backup(backup_dir)
    conn.execute("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE")

    env = os.environ.copy()
    env["PGPASSWORD"] = _instance()["password"]
    completed = subprocess.run(
        ["psql", "-v", "ON_ERROR_STOP=1", "-d", TEST_URL, "-f", str(backup_dir / result["filename"])],
        capture_output=True,
        env=env,
        timeout=120,
    )

    assert completed.returncode == 0, completed.stderr.decode(errors="replace")
    assert _snapshot(conn) == before
