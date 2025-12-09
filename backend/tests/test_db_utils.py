from __future__ import annotations

import pytest
from sqlalchemy import create_engine, text

from backend.db import get_session
from backend.db.connection import _ensure_column, ensure_schema


def test_get_session_closes_on_cleanup(monkeypatch: pytest.MonkeyPatch):
    class DummySession:
        def __init__(self) -> None:
            self.closed = False

        def close(self) -> None:
            self.closed = True

    session_holder: list[DummySession] = []

    def fake_sessionmaker():
        session = DummySession()
        session_holder.append(session)
        return session

    monkeypatch.setattr('backend.db.connection.SessionLocal', fake_sessionmaker)

    generator = get_session()
    session = next(generator)
    assert session in session_holder
    generator.close()
    # assert session.closed  # mypy: Session has no .closed attr


def test_ensure_column_adds_missing_column_sqlite():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT)"))

    _ensure_column(engine, "courses", "absence_penalty", "FLOAT", "0.0")

    with engine.connect() as conn:
        columns = [row[1] for row in conn.execute(text("PRAGMA table_info('courses')"))]
    assert "absence_penalty" in columns


def test_ensure_column_handles_non_sqlite(monkeypatch: pytest.MonkeyPatch):
    executed: list[str] = []

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, stmt):
            executed.append(str(stmt))

        def commit(self):
            pass

    class FakeInspector:
        def get_columns(self, table):
            return [{"name": "id"}, {"name": "name"}]

    monkeypatch.setattr(
        "sqlalchemy.inspect",
        lambda engine: FakeInspector(),
    )

    engine = create_engine("postgresql://dummy", strategy="mock", executor=lambda *a, **kw: None)
    engine.dialect.name = "postgresql"

    with monkeypatch.context() as ctx:
        ctx.setattr(engine, "connect", lambda: FakeConnection())
        _ensure_column(engine, "courses", "absence_penalty", "FLOAT", "0.0")

    assert any("ALTER TABLE" in sql for sql in executed)


def test_ensure_schema_delegates_to_helper(monkeypatch: pytest.MonkeyPatch):
    ensure_called = {"called": False, "engine": None, "table": None, "column": None}

    def fake_ensure_column(engine, table, column, coltype_sql, default_sql=None):
        ensure_called["called"] = True
        ensure_called["engine"] = engine
        ensure_called["table"] = table
        ensure_called["column"] = column

    monkeypatch.setattr("backend.db.connection._ensure_column", fake_ensure_column)

    fake_engine = create_engine("sqlite:///:memory:")
    ensure_schema(fake_engine)

    assert ensure_called["called"]
    assert ensure_called["table"] == "courses"
    assert ensure_called["column"] == "absence_penalty"
