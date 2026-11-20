"""Somebody is told when the automatic backup fails, or when the server stops.

Plan todo 54. A failed backup wrote an ERROR line into a log nobody reads, and a server that
has stopped cannot say anything at all. Two answers:

- the administrators get a notice in the bell (at most one a day);
- a "heartbeat": while the server runs, its database answers and its backup is in order, it
  calls an address of a monitoring service outside at a fixed pace. When the calls stop, the
  service tells a person.
"""

from __future__ import annotations

import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from backend import models
from backend.services import database_backup, monitor_heartbeat
from backend.tests.db_setup import TestingSessionLocal


class _Settings:
    AUTO_BACKUP_ENABLED = True
    AUTO_BACKUP_INTERVAL_HOURS = 24
    AUTO_BACKUP_KEEP = 30
    BACKUP_KEYS_DIR = ""
    MONITOR_PING_URL = ""
    MONITOR_FAIL_URL = ""
    MONITOR_PING_MINUTES = 60
    DATABASE_URL = "sqlite:///:memory:"

    def __init__(self, backups_dir: Path):
        self.BACKUPS_DIR = str(backups_dir)


@pytest.fixture
def settings(tmp_path, monkeypatch):
    settings = _Settings(tmp_path / "backups")
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)
    monkeypatch.setattr(monitor_heartbeat, "get_settings", lambda: settings)
    monkeypatch.setattr(database_backup, "_last_failure_notice_at", None)
    database_backup._last_attempt.update(at=None, status=None, error=None)
    return settings


@pytest.fixture
def committed_db():
    """A session whose commits are real: the code under test opens sessions of its own, and in
    the `db` fixture a second session that closes rolls the test's rows back."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _user(db, email: str, role: str = "admin", active: bool = True) -> models.User:
    user = models.User(email=email, hashed_password="x", role=role, is_active=active)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _notices(db) -> list[models.Notification]:
    db.expire_all()
    return (
        db.query(models.Notification)
        .filter(models.Notification.notification_type == database_backup.BACKUP_FAILED_NOTIFICATION_TYPE)
        .order_by(models.Notification.id)
        .all()
    )


def _backup(folder: Path, hours_old: float) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "auto_backup_20260101_000000.enc"
    path.write_bytes(b"x")
    then = time.time() - hours_old * 3600
    os.utime(path, (then, then))
    return path


# --- the notice in the bell -------------------------------------------------------------


def test_a_failed_backup_puts_a_notice_in_the_bell_of_every_active_administrator(settings, committed_db):
    first = _user(committed_db, "admin1@example.com")
    second = _user(committed_db, "admin2@example.com")
    _user(committed_db, "gone@example.com", active=False)
    _user(committed_db, "teacher@example.com", role="teacher")

    created = database_backup.notify_administrators_of_failure(
        "connection to server failed", session_factory=TestingSessionLocal
    )

    notices = _notices(committed_db)
    assert created == 2
    assert {n.user_id for n in notices} == {first.id, second.id}
    notice = notices[0]
    assert notice.title == "Automatic backup failed"
    assert "connection to server failed" in notice.message
    # The page shows it in the user's language from these, and opens Maintenance on a click.
    assert notice.data == {"error": "connection to server failed", "url": "#/power?showControl=1&tab=maintenance"}
    assert not notice.is_read


def test_a_backup_that_keeps_failing_gives_one_notice_a_day_not_one_an_hour(settings, committed_db, monkeypatch):
    _user(committed_db, "admin1@example.com")

    assert database_backup.notify_administrators_of_failure("boom", session_factory=TestingSessionLocal) == 1
    # The next hourly check fails as well.
    assert database_backup.notify_administrators_of_failure("boom", session_factory=TestingSessionLocal) == 0
    # And after a restart of the server, which forgets what it said: the notice itself is there.
    monkeypatch.setattr(database_backup, "_last_failure_notice_at", None)
    assert database_backup.notify_administrators_of_failure("boom", session_factory=TestingSessionLocal) == 0

    assert len(_notices(committed_db)) == 1


def test_the_next_day_the_notice_comes_again(settings, committed_db, monkeypatch):
    _user(committed_db, "admin1@example.com")
    database_backup.notify_administrators_of_failure("boom", session_factory=TestingSessionLocal)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=25)).replace(tzinfo=None)
    committed_db.query(models.Notification).update({models.Notification.created_at: yesterday})
    committed_db.commit()
    monkeypatch.setattr(database_backup, "_last_failure_notice_at", None)

    assert database_backup.notify_administrators_of_failure("boom", session_factory=TestingSessionLocal) == 1
    assert len(_notices(committed_db)) == 2


def test_a_very_long_error_is_cut_short(settings, committed_db):
    _user(committed_db, "admin1@example.com")

    database_backup.notify_administrators_of_failure("x" * 5000, session_factory=TestingSessionLocal)

    assert len(_notices(committed_db)[0].data["error"]) == 300


def test_telling_can_never_break_the_backup_check(settings):
    def no_database():
        raise RuntimeError("the database is gone")

    assert database_backup.notify_administrators_of_failure("boom", session_factory=no_database) == 0


def test_in_a_test_run_the_configured_database_is_left_alone(settings, monkeypatch):
    """On a developer's PC the configured database is a real one."""

    def configured_database(*_args, **_kwargs):
        raise AssertionError("a session was opened on the configured database")

    monkeypatch.setattr("backend.db.SessionLocal", configured_database)

    assert database_backup.configured_session_factory() is None
    assert database_backup.notify_administrators_of_failure("boom") == 0
    assert monitor_heartbeat.server_condition() == (True, "")


def test_a_failed_automatic_backup_tells_the_administrators(settings, monkeypatch):
    told: list[str] = []
    monkeypatch.setattr(database_backup, "notify_administrators_of_failure", lambda error: told.append(error) or 1)

    def broken(**_kwargs):
        raise RuntimeError("pg connection refused")

    monkeypatch.setattr(database_backup, "create_database_backup", broken)

    assert database_backup.run_automatic_backup()["status"] == "failed"
    assert told == ["pg connection refused"]


def test_a_database_that_cannot_be_backed_up_this_way_is_not_a_failure_to_report(settings, monkeypatch):
    told: list[str] = []
    monkeypatch.setattr(database_backup, "notify_administrators_of_failure", lambda error: told.append(error) or 1)

    # sqlite:///:memory: - skipped, not failed.
    assert database_backup.run_automatic_backup()["status"] == "skipped"
    assert told == []


def test_the_backups_page_still_answers_when_the_backups_folder_is_unusable(client, control_admin_headers, tmp_path, monkeypatch):
    # The notice sends the administrator to this page. With the folder broken (here a file
    # stands in its place) the list answered 500 instead of showing why the backup failed.
    (tmp_path / "database").write_text("not a folder", encoding="utf-8")
    settings = _Settings(tmp_path)
    monkeypatch.setattr("backend.routers.control.operations.get_settings", lambda: settings)
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)
    database_backup._last_attempt.update(at="2026-11-16T18:06:28+02:00", status="failed", error="cannot create the folder")

    response = client.get(
        "/control/api/operations/database-backups", headers=control_admin_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["backups"] == []
    assert body["automatic"]["last_error"] == "cannot create the folder"
    database_backup._last_attempt.update(at=None, status=None, error=None)


# --- is the backup in order? ------------------------------------------------------------


def test_a_fresh_backup_is_in_order(settings):
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)

    assert database_backup.backup_health() == {"status": "ok", "reason": ""}


def test_a_backup_a_few_hours_late_is_still_in_order_and_later_is_not(settings):
    folder = Path(settings.BACKUPS_DIR) / "database"
    path = _backup(folder, hours_old=26)  # the hourly check may be late, a backup takes a while
    assert database_backup.backup_health()["status"] == "ok"

    then = time.time() - 28 * 3600
    os.utime(path, (then, then))
    assert database_backup.backup_health() == {"status": "problem", "reason": "the newest automatic backup is 28 hours old"}


def test_a_failed_attempt_is_a_problem_even_with_yesterdays_backup_there(settings):
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)
    database_backup._last_attempt.update(status="failed", error="host db.internal refused the connection")

    health = database_backup.backup_health()

    assert health["status"] == "problem"
    # A fixed phrase: this text goes to a service outside, the error text does not.
    assert health["reason"] == "the last automatic backup failed"
    assert "db.internal" not in health["reason"]


def test_no_backup_yet_is_in_order_right_after_the_start_and_a_problem_later(settings, monkeypatch):
    assert database_backup.backup_health()["status"] == "ok"

    monkeypatch.setattr(database_backup, "_PROCESS_STARTED", time.monotonic() - 3600)
    assert database_backup.backup_health() == {"status": "problem", "reason": "there is no automatic backup"}


def test_a_switched_off_backup_is_not_reported_as_a_problem(settings, monkeypatch):
    settings.AUTO_BACKUP_ENABLED = False
    monkeypatch.setattr(database_backup, "_PROCESS_STARTED", time.monotonic() - 3600)

    assert database_backup.backup_health()["status"] == "disabled"


# --- the heartbeat ----------------------------------------------------------------------


@pytest.fixture
def calls(monkeypatch):
    """What was sent to the monitoring service, instead of sending it."""
    sent: list[tuple[str, str | None]] = []
    monkeypatch.setattr(monitor_heartbeat, "_call", lambda url, body=None: sent.append((url, body)) or True)
    return sent


def _working_database():
    return TestingSessionLocal()


def test_without_an_address_nothing_is_sent(settings, calls):
    assert monitor_heartbeat.send_heartbeat(_working_database) == {"status": "off"}
    assert calls == []


def test_all_is_well_calls_the_address(settings, calls):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)

    assert monitor_heartbeat.send_heartbeat(_working_database) == {"status": "sent"}
    assert calls == [("https://hc-ping.example/abc", None)]


def test_a_backup_problem_withholds_the_signal(settings, calls):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    database_backup._last_attempt.update(status="failed", error="boom")

    outcome = monitor_heartbeat.send_heartbeat(_working_database)

    # Silence is the alarm: the service tells a person when the signal does not come.
    assert outcome == {"status": "withheld", "reason": "the last automatic backup failed"}
    assert calls == []


def test_with_a_failure_address_the_problem_is_reported_at_once(settings, calls):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    settings.MONITOR_FAIL_URL = "https://hc-ping.example/abc/fail"
    database_backup._last_attempt.update(status="failed", error="password for user sms rejected by db.internal")

    outcome = monitor_heartbeat.send_heartbeat(_working_database)

    assert outcome["status"] == "reported"
    assert calls == [("https://hc-ping.example/abc/fail", "the last automatic backup failed")]
    # Nothing of the error text leaves the server.
    assert "db.internal" not in str(calls)


def test_a_database_that_does_not_answer_withholds_the_signal(settings, calls):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)

    def no_database():
        raise RuntimeError("could not connect")

    assert monitor_heartbeat.send_heartbeat(no_database) == {
        "status": "withheld",
        "reason": "the database does not answer",
    }
    assert calls == []


@pytest.mark.parametrize("address", ["file:///etc/passwd", "ftp://example.com/x", "hc-ping.example/abc", "   "])
def test_only_a_web_address_is_ever_called(settings, calls, address):
    settings.MONITOR_PING_URL = address

    assert monitor_heartbeat.send_heartbeat(_working_database) == {"status": "off"}
    assert calls == []


def test_the_request_is_a_plain_get_with_a_time_limit(settings, monkeypatch):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)
    seen: dict = {}

    class _Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

    def fake_urlopen(request, timeout=None):
        seen.update(url=request.full_url, method=request.get_method(), data=request.data, timeout=timeout)
        return _Response()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    assert monitor_heartbeat.send_heartbeat(_working_database) == {"status": "sent"}
    assert seen == {"url": "https://hc-ping.example/abc", "method": "GET", "data": None, "timeout": 10}


def test_a_service_that_cannot_be_reached_is_no_error_of_the_server(settings, monkeypatch, caplog):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    _backup(Path(settings.BACKUPS_DIR) / "database", hours_old=2)

    def unreachable(request, timeout=None):
        raise OSError("network is unreachable")

    monkeypatch.setattr(urllib.request, "urlopen", unreachable)

    with caplog.at_level("WARNING", logger="backend.services.monitor_heartbeat"):
        assert monitor_heartbeat.send_heartbeat(_working_database) == {"status": "not_delivered"}

    assert not [r for r in caplog.records if r.levelname == "ERROR"]


# --- the schedule -----------------------------------------------------------------------


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


def _maintenance():
    from backend.services.maintenance_scheduler import MaintenanceScheduler

    maintenance = MaintenanceScheduler.__new__(MaintenanceScheduler)
    maintenance.export_scheduler = _FakeExportScheduler()
    return maintenance


def test_the_heartbeat_is_scheduled_at_the_set_pace_after_the_first_backup_check(settings, caplog):
    settings.MONITOR_PING_URL = "https://hc-ping.example/secret-check-id"
    settings.MONITOR_PING_MINUTES = 30
    maintenance = _maintenance()

    before = datetime.now(timezone.utc)
    with caplog.at_level("INFO", logger="backend.services.maintenance_scheduler"):
        assert maintenance.schedule_monitor_heartbeat() is True

    func, options = maintenance.export_scheduler.scheduler.jobs["monitor_heartbeat"]
    assert func is monitor_heartbeat.send_heartbeat
    assert options["trigger"].interval == timedelta(minutes=30)
    # After the first backup check (one minute after the start) has had time to finish.
    assert timedelta(seconds=90) <= options["next_run_time"] - before <= timedelta(seconds=300)
    assert options["max_instances"] == 1 and options["coalesce"] is True
    # Whoever has the address can send the signal: it is not written to the log.
    assert "secret-check-id" not in caplog.text


def test_no_heartbeat_is_scheduled_without_an_address(settings):
    maintenance = _maintenance()

    assert maintenance.schedule_monitor_heartbeat() is False
    assert maintenance.export_scheduler.scheduler.jobs == {}


def test_a_pace_under_five_minutes_is_raised_to_five(settings):
    settings.MONITOR_PING_URL = "https://hc-ping.example/abc"
    settings.MONITOR_PING_MINUTES = 0
    assert monitor_heartbeat.heartbeat_settings()[2] == 60  # 0 = not set
    settings.MONITOR_PING_MINUTES = 1
    assert monitor_heartbeat.heartbeat_settings()[2] == 5


# --- where saved mail settings live -----------------------------------------------------


def test_in_docker_saved_mail_settings_are_on_the_data_volume(monkeypatch):
    # Next to the code is the container's own layer: mail settings entered in the application
    # were gone after every update, like the backup key was.
    from backend.services import smtp_override

    monkeypatch.delenv("SMTP_OVERRIDE_PATH", raising=False)
    monkeypatch.setenv("SMS_EXECUTION_MODE", "docker")

    assert smtp_override._default_override_path() == Path("/data/smtp_override.json")


def test_an_explicit_place_for_mail_settings_wins_and_nothing_is_copied_into_it(tmp_path, monkeypatch):
    # A throwaway backend pointed at its own folder must start without the developer's relay.
    from backend.services import smtp_override

    target = tmp_path / "isolated-run" / "smtp_override.json"
    monkeypatch.setenv("SMTP_OVERRIDE_PATH", str(target))
    monkeypatch.setenv("SMS_EXECUTION_MODE", "docker")

    assert smtp_override._default_override_path() == target
    assert not target.exists()
