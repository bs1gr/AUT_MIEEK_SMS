"""Opt-in settings for a far-away database: idle-based connection test, transaction-less reads
and the permission cache (backend.remote_db_tuning, backend.permission_cache).

Everything here is off by default; the last test in each group pins that default.
"""

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import QueuePool

from backend import models, permission_cache, remote_db_tuning
from backend.config import settings
from backend.rbac import has_permission
from backend.routers.routers_rbac import _seed_defaults
from backend.tests.db_setup import TestingSessionLocal

# The app installs this on its own session factory (backend.db.connection); the tests' sessions
# come from another one.
permission_cache.install_invalidation(TestingSessionLocal)


# --------------------------------------------------------------------------- idle pre-ping


@pytest.fixture
def pooled_engine(monkeypatch):
    clock = SimpleNamespace(now=1000.0)
    monkeypatch.setattr(remote_db_tuning.time, "monotonic", lambda: clock.now)
    engine = create_engine("sqlite://", poolclass=QueuePool, pool_size=1, max_overflow=0, pool_pre_ping=False)
    pings: list[int] = []
    real_ping = engine.dialect.do_ping

    def counting_ping(dbapi_connection):
        pings.append(1)
        return real_ping(dbapi_connection)

    monkeypatch.setattr(engine.dialect, "do_ping", counting_ping)
    remote_db_tuning.install_idle_pre_ping(engine, 10.0)
    try:
        yield engine, pings, clock
    finally:
        engine.dispose()


def _use(engine) -> None:
    with engine.connect() as conn:
        conn.execute(text("select 1"))


def test_connection_is_not_tested_while_in_recent_use(pooled_engine):
    engine, pings, clock = pooled_engine
    _use(engine)  # a new connection needs no test
    clock.now += 3
    _use(engine)
    clock.now += 9.9
    _use(engine)
    assert pings == []


def test_connection_is_tested_after_sitting_idle(pooled_engine):
    engine, pings, clock = pooled_engine
    _use(engine)
    clock.now += 10.5
    _use(engine)
    assert pings == [1]
    clock.now += 1  # used a second ago: no test again
    _use(engine)
    assert pings == [1]


def test_dead_idle_connection_is_replaced(pooled_engine, monkeypatch):
    engine, pings, clock = pooled_engine
    _use(engine)
    connects: list[int] = []
    event.listen(engine, "connect", lambda *_: connects.append(1))
    monkeypatch.setattr(engine.dialect, "do_ping", lambda dbapi_connection: (_ for _ in ()).throw(OSError("gone")))
    clock.now += 60
    _use(engine)  # the pool discards the dead connection and opens another: no error reaches us
    assert connects == [1]


def test_idle_pre_ping_is_off_unless_configured(monkeypatch):
    monkeypatch.delenv("DB_PRE_PING_IDLE_SECONDS", raising=False)
    assert remote_db_tuning.pre_ping_idle_seconds() == 0
    monkeypatch.setenv("DB_PRE_PING_IDLE_SECONDS", "20")
    assert remote_db_tuning.pre_ping_idle_seconds() == 20
    monkeypatch.setenv("DB_PRE_PING_IDLE_SECONDS", "soon")
    assert remote_db_tuning.pre_ping_idle_seconds() == 0


# --------------------------------------------------------------------------- transaction-less reads


@pytest.mark.parametrize(
    ("method", "expected"),
    [
        ("GET", "reads"),
        ("head", "reads"),
        ("OPTIONS", "reads"),
        ("POST", "writes"),
        ("PUT", "writes"),
        ("DELETE", "writes"),
    ],
)
def test_only_read_requests_get_the_transactionless_engine(method, expected):
    chosen = remote_db_tuning.session_bind_for(SimpleNamespace(method=method), "writes", "reads")
    assert chosen == expected


def test_no_request_or_no_second_engine_means_a_normal_session():
    assert remote_db_tuning.session_bind_for(None, "writes", "reads") == "writes"
    assert remote_db_tuning.session_bind_for(SimpleNamespace(method="GET"), "writes", None) == "writes"


def test_autocommit_reads_are_off_unless_configured(monkeypatch):
    monkeypatch.delenv("DB_AUTOCOMMIT_READS", raising=False)
    assert remote_db_tuning.autocommit_reads_enabled() is False
    monkeypatch.setenv("DB_AUTOCOMMIT_READS", "true")
    assert remote_db_tuning.autocommit_reads_enabled() is True


def test_get_session_still_works_when_called_by_hand():
    from backend.db import get_session

    generator = get_session()
    session = next(generator)
    try:
        assert session.execute(text("select 1")).scalar() == 1
    finally:
        generator.close()


# --------------------------------------------------------------------------- permission cache


@pytest.fixture
def teacher(db, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    permission_cache.clear()
    _seed_defaults(db, None)
    user = models.User(email="cache-teacher@example.com", hashed_password="x", role="teacher", is_active=True)
    db.add(user)
    db.commit()
    role = db.query(models.Role).filter(models.Role.name == "teacher").one()
    db.add(models.UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    permission_cache.clear()
    yield user
    permission_cache.clear()


@pytest.fixture
def statements(db):
    seen: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany):
        seen.append(statement)

    bind = db.get_bind()
    event.listen(bind, "before_cursor_execute", _record)
    try:
        yield seen
    finally:
        event.remove(bind, "before_cursor_execute", _record)


def test_permission_is_asked_every_time_by_default(db, teacher, statements, monkeypatch):
    monkeypatch.delenv("PERMISSION_CACHE_TTL_SECONDS", raising=False)
    assert has_permission(teacher, "attendance:edit", db) is True
    first = len(statements)
    assert first > 0
    assert has_permission(teacher, "attendance:edit", db) is True
    assert len(statements) > first  # asked again (fewer statements: the user row is already loaded)


def test_cached_answer_needs_no_query(db, teacher, statements, monkeypatch):
    monkeypatch.setenv("PERMISSION_CACHE_TTL_SECONDS", "30")
    assert has_permission(teacher, "attendance:edit", db) is True
    assert has_permission(teacher, "users:manage", db) is False
    asked = len(statements)
    assert has_permission(teacher, "attendance:edit", db) is True
    assert has_permission(teacher, "users:manage", db) is False
    assert len(statements) == asked


def test_cached_answer_expires(db, teacher, statements, monkeypatch):
    monkeypatch.setenv("PERMISSION_CACHE_TTL_SECONDS", "30")
    clock = SimpleNamespace(now=500.0)
    monkeypatch.setattr(permission_cache.time, "monotonic", lambda: clock.now)
    assert has_permission(teacher, "attendance:edit", db) is True
    asked = len(statements)
    clock.now += 29
    has_permission(teacher, "attendance:edit", db)
    assert len(statements) == asked
    clock.now += 2
    has_permission(teacher, "attendance:edit", db)
    assert len(statements) > asked


def test_revoking_through_the_orm_takes_effect_at_once(db, teacher, monkeypatch):
    monkeypatch.setenv("PERMISSION_CACHE_TTL_SECONDS", "300")
    assert has_permission(teacher, "attendance:edit", db) is True
    link = (
        db.query(models.RolePermission)
        .join(models.Permission, models.Permission.id == models.RolePermission.permission_id)
        .join(models.Role, models.Role.id == models.RolePermission.role_id)
        .filter(models.Role.name == "teacher", models.Permission.key == "attendance:edit")
        .one()
    )
    db.delete(link)
    db.commit()
    assert has_permission(teacher, "attendance:edit", db) is False


def test_bulk_delete_also_clears_the_cache(db, teacher, monkeypatch):
    monkeypatch.setenv("PERMISSION_CACHE_TTL_SECONDS", "300")
    assert has_permission(teacher, "attendance:edit", db) is True
    db.query(models.UserRole).filter(models.UserRole.user_id == teacher.id).delete()
    db.commit()
    # The role link is gone, but User.role still says "teacher": the legacy defaults now decide.
    # What matters here is that the answer was computed again, not served from the cache.
    assert permission_cache.get(teacher, "attendance:edit") is None


def test_changing_a_users_role_does_not_reuse_the_old_answer(db, teacher, monkeypatch):
    monkeypatch.setenv("PERMISSION_CACHE_TTL_SECONDS", "300")
    assert has_permission(teacher, "attendance:edit", db) is True
    teacher.role = "student"
    db.commit()
    assert permission_cache.get(teacher, "attendance:edit") is None
