"""Refresh tokens that can never be used again are removed.

Every login and every refresh stores a row in `refresh_tokens`; nothing ever deleted one, so
the table only grew (835 rows, one usable, in the shared database in November 2026). A row
is dead when it is revoked or past its expiry. The purge runs at startup and in the daily
maintenance job, and it must not change what `POST /auth/refresh` answers.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

import pytest

from backend import models
from backend.services.maintenance_scheduler import MaintenanceScheduler
from backend.services.refresh_token_cleanup import (
    purge_dead_refresh_tokens,
    purge_dead_refresh_tokens_in_own_session,
)
from backend.tests.db_setup import TestingSessionLocal


def _user(db, email: str = "tokens@example.com") -> models.User:
    user = models.User(email=email, hashed_password="x", role="teacher", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token(db, user, jti: str, *, expires_in: timedelta, revoked=False) -> None:
    db.add(
        models.RefreshToken(
            user_id=user.id,
            jti=jti,
            token_hash="hash-" + jti,
            expires_at=datetime.now(timezone.utc) + expires_in,
            revoked=revoked,
        )
    )
    db.commit()


def _jtis(db) -> set[str]:
    db.expire_all()
    return {row.jti for row in db.query(models.RefreshToken).all()}


def _seed_live_and_dead(db) -> None:
    user = _user(db)
    # One hour either side of now: a purge that compared local time with the stored UTC
    # values would get these wrong wherever the clock is not on UTC.
    _token(db, user, "live", expires_in=timedelta(hours=1))
    _token(db, user, "live-long", expires_in=timedelta(days=29))
    _token(db, user, "live-revoked-unset", expires_in=timedelta(hours=1), revoked=None)
    _token(db, user, "revoked", expires_in=timedelta(days=29), revoked=True)
    _token(db, user, "expired", expires_in=timedelta(hours=-1))
    _token(db, user, "expired-and-revoked", expires_in=timedelta(days=-40), revoked=True)


LIVE = {"live", "live-long", "live-revoked-unset"}


def test_revoked_and_expired_rows_go_and_live_rows_stay(db):
    _seed_live_and_dead(db)

    removed = purge_dead_refresh_tokens(db)

    assert removed == 3
    assert _jtis(db) == LIVE


def test_a_second_purge_finds_nothing(db):
    _seed_live_and_dead(db)
    purge_dead_refresh_tokens(db)

    assert purge_dead_refresh_tokens(db) == 0
    assert _jtis(db) == LIVE


def test_the_purge_changes_no_answer_of_the_refresh_endpoint(client, db):
    account = {"email": "rotate@example.com", "password": "Passw0rd!", "full_name": "Rotate"}
    assert client.post("/api/v1/auth/register", json=account).status_code == 200
    login = client.post("/api/v1/auth/login", json={"email": account["email"], "password": account["password"]})
    assert login.status_code == 200
    first = client.cookies.get("refresh_token")
    assert client.post("/api/v1/auth/refresh", add_auth=False).status_code == 200
    second = client.cookies.get("refresh_token")
    assert first and second and first != second

    # Before the purge: the rotated token is refused because its row is revoked.
    before = client.post("/api/v1/auth/refresh", json={"refresh_token": first}, add_auth=False)
    assert before.status_code == 401

    assert purge_dead_refresh_tokens(db) == 1

    # After it: the same token is refused because its row is gone. Same status, same message.
    after = client.post("/api/v1/auth/refresh", json={"refresh_token": first}, add_auth=False)
    assert after.status_code == 401
    assert after.json()["error"]["message"] == before.json()["error"]["message"]

    # The token in use was not touched: it still refreshes.
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": second}, add_auth=False).status_code == 200


def test_the_own_session_variant_purges_and_says_what_it_removed(db, caplog):
    _seed_live_and_dead(db)

    with caplog.at_level(logging.INFO, logger="backend.services.refresh_token_cleanup"):
        removed = purge_dead_refresh_tokens_in_own_session(TestingSessionLocal)

    assert removed == 3
    assert _jtis(db) == LIVE
    assert "Removed 3 dead refresh tokens" in caplog.text


def test_the_own_session_variant_is_silent_when_there_is_nothing_to_remove(db, caplog):
    _token(db, _user(db), "live", expires_in=timedelta(hours=1))

    with caplog.at_level(logging.DEBUG, logger="backend.services.refresh_token_cleanup"):
        assert purge_dead_refresh_tokens_in_own_session(TestingSessionLocal) == 0

    assert caplog.text == ""


def test_the_own_session_variant_never_raises():
    class BrokenSession:
        rolled_back = False
        closed = False

        def query(self, *_args, **_kwargs):
            raise RuntimeError("database is away")

        def rollback(self):
            self.rolled_back = True

        def close(self):
            self.closed = True

    session = BrokenSession()

    assert purge_dead_refresh_tokens_in_own_session(lambda: session) == 0
    assert session.rolled_back is True
    assert session.closed is True


class _RecordingScheduler:
    def __init__(self):
        self.jobs = {}

    def add_job(self, func, **options):
        self.jobs[options["id"]] = (func, options)


class _FakeExportScheduler:
    def __init__(self):
        self.scheduler = _RecordingScheduler()

    def is_available(self):
        return True


def _maintenance_with_a_recording_scheduler() -> MaintenanceScheduler:
    maintenance = MaintenanceScheduler.__new__(MaintenanceScheduler)
    maintenance.export_scheduler = _FakeExportScheduler()
    return maintenance


def _fire_times(trigger, count: int) -> list[datetime]:
    """The trigger's next fire times from a winter Monday, 00:30 (no clock change near it)."""
    moment = datetime(2026, 1, 5, 0, 30, tzinfo=timezone.utc).astimezone(trigger.timezone)
    times: list[datetime] = []
    previous = None
    for _ in range(count):
        previous = trigger.get_next_fire_time(previous, moment)
        times.append(previous)
        moment = previous + timedelta(seconds=1)
    return times


def test_the_hourly_cleanup_runs_once_an_hour():
    """It was "*/1" in the minute field: every minute."""
    maintenance = _maintenance_with_a_recording_scheduler()

    maintenance.schedule_cleanup_task(frequency="hourly")

    jobs = maintenance.export_scheduler.scheduler.jobs
    assert set(jobs) == {"cleanup_exports_hourly", "purge_refresh_tokens_hourly"}
    for _func, options in jobs.values():
        first, second, third = _fire_times(options["trigger"], 3)
        assert (first.minute, first.second) == (0, 0)
        assert second - first == timedelta(hours=1)
        assert third - second == timedelta(hours=1)


@pytest.mark.parametrize(
    ("frequency", "apart"),
    [
        ("hourly", timedelta(hours=1)),
        ("daily", timedelta(days=1)),
        ("weekly", timedelta(days=7)),
        ("monthly", timedelta(days=28)),  # 1 February to 1 March 2026
    ],
)
def test_each_cleanup_frequency_runs_as_often_as_its_name_says(frequency, apart):
    maintenance = _maintenance_with_a_recording_scheduler()

    maintenance.schedule_cleanup_task(frequency=frequency)

    _func, options = maintenance.export_scheduler.scheduler.jobs[f"cleanup_exports_{frequency}"]
    first, second = _fire_times(options["trigger"], 2)
    assert second - first == apart


def test_the_daily_maintenance_job_includes_the_purge():
    maintenance = _maintenance_with_a_recording_scheduler()

    maintenance.schedule_cleanup_task(frequency="daily")

    jobs = maintenance.export_scheduler.scheduler.jobs
    assert set(jobs) == {"cleanup_exports_daily", "purge_refresh_tokens_daily"}
    func, options = jobs["purge_refresh_tokens_daily"]
    assert func == maintenance.purge_dead_refresh_tokens
    assert options["replace_existing"] is True
    # Daily at 02:00, the schedule of the export cleanup beside it.
    assert str(options["trigger"]) == str(jobs["cleanup_exports_daily"][1]["trigger"])
    assert "hour='2'" in str(options["trigger"]) and "minute='0'" in str(options["trigger"])


def test_the_maintenance_job_purges_the_database_it_is_given(db, monkeypatch):
    _seed_live_and_dead(db)
    monkeypatch.setattr("backend.services.maintenance_scheduler.SessionLocal", TestingSessionLocal)
    maintenance = MaintenanceScheduler.__new__(MaintenanceScheduler)

    assert maintenance.purge_dead_refresh_tokens() == 3
    assert _jtis(db) == LIVE


# --- startup -----------------------------------------------------------------------------


class _NoSchedulers:
    def __getattr__(self, _name):
        return lambda *args, **kwargs: None


@pytest.fixture
def lifespan_module(monkeypatch):
    """The real lifespan with everything but its database start-up tasks switched off.

    `SessionLocal` is pointed at the test database: the module's own copy is the configured
    one, which on a development machine can be a real server.
    """
    import backend.lifespan as module

    monkeypatch.setattr(module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(module.profiler, "register", lambda _engine: None)
    monkeypatch.setattr(module, "run_migrations", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(module, "ensure_defaults_startup", lambda _session_factory: False)
    monkeypatch.setattr(module.settings, "DEFAULT_ADMIN_EMAIL", None, raising=False)
    monkeypatch.setattr("backend.services.smtp_override.load_and_apply", lambda: None)
    monkeypatch.setattr(
        "backend.services.maintenance_scheduler.get_maintenance_scheduler", lambda: _NoSchedulers()
    )
    return module


@pytest.fixture
def committed_db():
    """A session whose commits are real.

    The `db` fixture keeps a test's rows inside one open transaction, and the test database
    has a single shared connection: any other session that closes (the lifespan opens some)
    rolls that transaction back, rows and all. Rows committed here survive that, so what
    these tests see is the lifespan's doing. `setup_db` empties the tables afterwards.
    """
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _start_and_stop(module) -> None:
    class App:
        class state:
            pass

    async def run():
        async with module.get_lifespan()(App()):
            pass

    asyncio.run(run())


def test_a_server_start_removes_dead_tokens(committed_db, lifespan_module, monkeypatch):
    _seed_live_and_dead(committed_db)
    monkeypatch.setattr(lifespan_module, "startup_tasks_enabled", lambda: True)

    _start_and_stop(lifespan_module)

    assert _jtis(committed_db) == LIVE


def test_a_start_without_startup_tasks_leaves_the_table_alone(committed_db, lifespan_module, monkeypatch):
    # A test run, or DISABLE_STARTUP_TASKS: nothing may write to the configured database.
    _seed_live_and_dead(committed_db)
    monkeypatch.setattr(lifespan_module, "startup_tasks_enabled", lambda: False)

    _start_and_stop(lifespan_module)

    assert len(_jtis(committed_db)) == 6


def test_a_start_whose_migrations_failed_leaves_the_table_alone(committed_db, lifespan_module, monkeypatch):
    # The table may not exist, or not in the shape this code expects.
    _seed_live_and_dead(committed_db)
    monkeypatch.setattr(lifespan_module, "startup_tasks_enabled", lambda: True)
    monkeypatch.setattr(lifespan_module, "run_migrations", lambda *_args, **_kwargs: False)

    _start_and_stop(lifespan_module)

    assert len(_jtis(committed_db)) == 6
