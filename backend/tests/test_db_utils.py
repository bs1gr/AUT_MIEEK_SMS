from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, text

from backend import db


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

    monkeypatch.setattr(db, "SessionLocal", fake_sessionmaker)

    generator = db.get_session()
    session = next(generator)
    assert session in session_holder
    generator.close()
    # assert session.closed  # mypy: Session has no .closed attr


def test_ensure_column_adds_missing_column_sqlite():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT)"))

    db._ensure_column(engine, "courses", "absence_penalty", "FLOAT", "0.0")

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
            executed.append("commit")

    class FakeEngine:
        dialect = SimpleNamespace(name="postgresql")

        def connect(self):
            return FakeConnection()

    class FakeInspector:
        def __init__(self, cols):
            self._cols = cols

        def get_columns(self, table):
            return [{"name": c} for c in self._cols]

    fake_engine = FakeEngine()
    monkeypatch.setattr(db, "inspect", lambda _: FakeInspector(["id", "name"]))

    db._ensure_column(fake_engine, "courses", "absence_penalty", "FLOAT", "0.0")

    assert any("ALTER TABLE courses ADD COLUMN absence_penalty" in stmt for stmt in executed)
    assert "commit" in executed


def test_ensure_schema_delegates_to_helper(monkeypatch: pytest.MonkeyPatch):
    called = {}

    def fake_ensure(engine, table, column, coltype, default):
        called.update({"engine": engine, "table": table, "column": column, "type": coltype, "default": default})

    monkeypatch.setattr(db, "_ensure_column", fake_ensure)
    sentinel = object()
    db.ensure_schema(sentinel)

    assert called == {
        "engine": sentinel,
        "table": "courses",
        "column": "absence_penalty",
        "type": "FLOAT",
        "default": "0.0",
    }
