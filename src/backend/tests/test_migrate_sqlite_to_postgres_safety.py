"""migrate_sqlite_to_postgres must not wipe a database by default.

It used to TRUNCATE every destination table unless --no-truncate was passed, and the QNAP
reconcile runbook told operators to run it against the live QNAP database without that flag.
Truncation is now an explicit --truncate; by default a non-empty destination is refused.
"""

import pytest
import sqlalchemy as sa

from backend import models
from backend.scripts import migrate_sqlite_to_postgres as tool

STUDENT = {"first_name": "Anna", "last_name": "P", "email": "anna@example.com", "student_id": "S1", "is_active": True}


def _sqlite_with_students(path, rows):
    engine = sa.create_engine(f"sqlite:///{path}")
    models.Student.__table__.create(engine)
    with engine.begin() as conn:
        for row in rows:
            conn.execute(models.Student.__table__.insert().values(**row))
    return engine


def test_refuses_a_destination_that_already_has_data(tmp_path, monkeypatch):
    source = tmp_path / "fallback.db"
    _sqlite_with_students(source, [{**STUDENT, "student_id": "S2", "email": "b@example.com"}])
    destination = _sqlite_with_students(tmp_path / "qnap.db", [STUDENT])

    real_create_engine = tool.create_engine
    monkeypatch.setattr(
        tool, "create_engine", lambda url, *a, **k: destination if url.startswith("postgresql") else real_create_engine(url, *a, **k)
    )
    # The real check inspects PostgreSQL's "public" schema; the SQLite stand-in has the table.
    monkeypatch.setattr(tool, "_filter_existing_destination_tables", lambda conn, tables: (list(tables), []))

    rc = tool.main(["--sqlite-path", str(source), "--postgres-url", "postgresql://u@qnap/db", "--skip-migrations", "--tables", "students"])

    assert rc == 4
    with destination.connect() as conn:
        assert conn.execute(sa.select(models.Student.__table__.c.student_id)).scalars().all() == ["S1"]


def test_non_empty_tables_lists_only_tables_with_rows(tmp_path):
    engine = _sqlite_with_students(tmp_path / "db.sqlite", [])
    models.Course.__table__.create(engine)
    with engine.begin() as conn:
        assert tool._non_empty_tables(conn, [models.Student.__table__, models.Course.__table__]) == []
        conn.execute(models.Student.__table__.insert().values(**STUDENT))
        assert tool._non_empty_tables(conn, [models.Student.__table__, models.Course.__table__]) == ["students"]


def test_truncate_and_append_are_explicit_and_exclusive():
    assert tool._parse_arguments([]).truncate is False
    assert tool._parse_arguments(["--truncate"]).truncate is True
    assert tool._parse_arguments(["--no-truncate"]).no_truncate is True
    with pytest.raises(SystemExit):
        tool._parse_arguments(["--truncate", "--no-truncate"])
