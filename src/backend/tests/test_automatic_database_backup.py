"""The automatic database backup, and the key that encrypts backups.

Until November 2026 nothing made a backup on a schedule, while the in-app help said
"Automated backups happen daily" (and the owner of the shared database believed it). A backup
existed when somebody asked for one. `backend.services.database_backup` now makes one whenever
the newest automatic backup is older than a day, and keeps the newest thirty.

The second half is about the key: next to the code it was lost at every update of a Docker
install, which made every earlier encrypted backup unreadable.
"""

from __future__ import annotations

import os
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from backend.services import database_backup, encryption_service
from backend.services.backup_service_encrypted import BackupServiceEncrypted
from backend.services.encryption_service import BackupKeyMismatchError, EncryptionService


class _Settings:
    AUTO_BACKUP_ENABLED = True
    AUTO_BACKUP_INTERVAL_HOURS = 24
    AUTO_BACKUP_KEEP = 30
    BACKUP_KEYS_DIR = ""

    def __init__(self, database_url: str, backups_dir: Path):
        self.DATABASE_URL = database_url
        self.BACKUPS_DIR = str(backups_dir)


@pytest.fixture
def install(tmp_path, monkeypatch):
    """A small installation of its own: a SQLite file with one row, a backups folder, a key folder."""
    db_file = tmp_path / "data" / "school.db"
    db_file.parent.mkdir()
    with sqlite3.connect(db_file) as conn:
        conn.execute("CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT)")
        conn.execute("INSERT INTO students (name) VALUES ('Μαρία')")
    conn.close()

    settings = _Settings(f"sqlite:///{db_file.as_posix()}", tmp_path / "backups")
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)
    # Never the key of the tree the tests run in.
    monkeypatch.setattr(encryption_service, "default_key_dir", lambda: tmp_path / "keys")
    monkeypatch.setattr(encryption_service, "legacy_key_dir", lambda: tmp_path / "no-legacy-keys")
    database_backup._last_attempt.update(at=None, status=None, error=None)

    class Install:
        pass

    install = Install()
    install.settings = settings
    install.db_file = db_file
    install.backup_dir = tmp_path / "backups" / "database"
    install.tmp_path = tmp_path
    return install


def _names(folder: Path) -> list[str]:
    return sorted(p.name for p in folder.iterdir() if p.is_file())


def _age(path: Path, hours: float) -> None:
    then = time.time() - hours * 3600
    os.utime(path, (then, then))


def _fake_backup(folder: Path, name: str, hours_old: float) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_bytes(b"x")
    _age(path, hours_old)
    return path


# --- when a backup is made --------------------------------------------------------------


def test_the_first_check_makes_an_encrypted_backup_that_can_be_restored(install):
    outcome = database_backup.run_automatic_backup()

    assert outcome["status"] == "created"
    files = _names(install.backup_dir)
    assert files == [outcome["filename"]]
    assert files[0].startswith("auto_backup_") and files[0].endswith(".enc")
    # The row is not readable in the file ...
    assert "Μαρία".encode() not in (install.backup_dir / files[0]).read_bytes()

    # ... and comes back when the backup is restored.
    restored = BackupServiceEncrypted(backup_dir=install.backup_dir).restore_encrypted_backup(
        backup_name=files[0][: -len(".enc")],
        output_path=install.tmp_path / "restored" / "school.db",
    )
    with sqlite3.connect(restored["restored_to"]) as conn:
        assert conn.execute("SELECT name FROM students").fetchall() == [("Μαρία",)]
    conn.close()


def test_no_second_backup_inside_the_interval(install):
    assert database_backup.run_automatic_backup()["status"] == "created"
    before = _names(install.backup_dir)

    assert database_backup.run_automatic_backup() == {"status": "not_due"}
    assert _names(install.backup_dir) == before


def test_a_backup_older_than_the_interval_is_followed_by_a_new_one(install):
    old = _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=25)

    outcome = database_backup.run_automatic_backup()

    assert outcome["status"] == "created"
    assert set(_names(install.backup_dir)) == {old.name, outcome["filename"]}


def test_a_backup_made_23_hours_ago_is_recent_enough(install):
    _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=23)

    assert database_backup.run_automatic_backup() == {"status": "not_due"}


def test_a_server_that_is_always_on_backs_up_at_the_same_time_every_day(install):
    # Its check comes once an hour at the same minute, and yesterday's backup was finished a
    # second after that minute: today it is a second short of 24 hours old. Waiting for the
    # next check would mean a backup every 25 hours, an hour later each day.
    _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=24 - 1 / 3600)

    assert database_backup.run_automatic_backup()["status"] == "created"


def test_an_hourly_interval_is_not_met_by_a_backup_twenty_minutes_old(install):
    install.settings.AUTO_BACKUP_INTERVAL_HOURS = 1
    _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=20 / 60)

    assert database_backup.run_automatic_backup() == {"status": "not_due"}


def test_a_backup_made_by_hand_does_not_count_as_the_automatic_one(install):
    # Somebody's own backup from this morning may be deleted by them tomorrow.
    _fake_backup(install.backup_dir, "backup_20260101_000000.enc", hours_old=1)

    assert database_backup.run_automatic_backup()["status"] == "created"


def test_the_interval_is_a_setting(install):
    _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=7)
    install.settings.AUTO_BACKUP_INTERVAL_HOURS = 6

    assert database_backup.run_automatic_backup()["status"] == "created"


def test_switched_off_makes_nothing(install):
    install.settings.AUTO_BACKUP_ENABLED = False

    assert database_backup.run_automatic_backup() == {"status": "disabled"}
    assert not install.backup_dir.exists()


def test_due_is_decided_by_the_newest_automatic_backup(tmp_path):
    folder = tmp_path / "database"
    assert database_backup.automatic_backup_due(folder, 24) is True  # no folder yet

    _fake_backup(folder, "auto_backup_20260101_000000.enc", hours_old=100)
    assert database_backup.automatic_backup_due(folder, 24) is True
    _fake_backup(folder, "auto_backup_20260102_000000.enc", hours_old=2)
    assert database_backup.automatic_backup_due(folder, 24) is False
    assert database_backup.automatic_backup_due(folder, 24, now=datetime.now() + timedelta(hours=23)) is True


# --- what is kept -----------------------------------------------------------------------


def test_only_automatic_backups_beyond_the_newest_are_removed(install):
    folder = install.backup_dir
    for day in range(1, 6):  # five automatic backups, the 5th the newest
        _fake_backup(folder, f"auto_backup_2026010{day}_000000.enc", hours_old=24 * (7 - day))
        _fake_backup(folder / ".metadata", f"auto_backup_2026010{day}_000000.json", hours_old=1)
    by_hand = [
        _fake_backup(folder, "backup_20250101_000000.enc", hours_old=9000),
        _fake_backup(folder, "backup_20250101_000001.db", hours_old=9000),
        _fake_backup(folder, "backup_20250101_000002.sql", hours_old=9000),
        _fake_backup(folder, "sms_backup_20250101_000000_ABCD.db", hours_old=9000),
    ]
    install.settings.AUTO_BACKUP_KEEP = 3

    outcome = database_backup.run_automatic_backup()

    assert outcome["status"] == "created"
    assert sorted(outcome["removed"]) == [
        "auto_backup_20260101_000000.enc",
        "auto_backup_20260102_000000.enc",
        "auto_backup_20260103_000000.enc",
    ]
    assert set(_names(folder)) == {
        "auto_backup_20260104_000000.enc",
        "auto_backup_20260105_000000.enc",
        outcome["filename"],
        *(p.name for p in by_hand),
    }
    # The descriptions of the removed ones go with them.
    assert "auto_backup_20260101_000000.json" not in _names(folder / ".metadata")
    assert "auto_backup_20260105_000000.json" in _names(folder / ".metadata")


def test_at_least_one_automatic_backup_is_always_kept(install):
    _fake_backup(install.backup_dir, "auto_backup_20260101_000000.enc", hours_old=1)

    assert database_backup.prune_automatic_backups(install.backup_dir, keep=0) == []
    assert _names(install.backup_dir) == ["auto_backup_20260101_000000.enc"]


def test_an_interrupted_run_leaves_no_readable_dump_behind(install):
    # The server stopped while the previous run was writing: its plaintext dump is still there.
    leftover = _fake_backup(install.backup_dir, "auto_backup_20260101_000000.db", hours_old=30)
    leftover_sql = _fake_backup(install.backup_dir, "auto_backup_20260101_000001.sql", hours_old=30)
    # An unencrypted backup somebody chose to make is theirs.
    by_hand = _fake_backup(install.backup_dir, "backup_20260101_000000.db", hours_old=30)

    assert database_backup.run_automatic_backup()["status"] == "created"

    assert not leftover.exists() and not leftover_sql.exists()
    assert by_hand.exists()
    # And this run's own plaintext is gone too.
    assert [n for n in _names(install.backup_dir) if n.startswith("auto_backup_") and not n.endswith(".enc")] == []


# --- when it cannot be made -------------------------------------------------------------


def test_a_failure_is_reported_and_never_raised(install, monkeypatch, caplog):
    def broken(**_kwargs):
        raise RuntimeError("pg_dump failed: connection refused")

    monkeypatch.setattr(database_backup, "create_database_backup", broken)

    with caplog.at_level("ERROR", logger="backend.services.database_backup"):
        outcome = database_backup.run_automatic_backup()

    assert outcome == {"status": "failed", "error": "pg_dump failed: connection refused"}
    assert any("Automatic database backup FAILED" in r.getMessage() for r in caplog.records)
    status = database_backup.automatic_backup_status(install.backup_dir)
    assert status["last_attempt_status"] == "failed"
    assert status["last_error"] == "pg_dump failed: connection refused"
    assert status["last_backup"] is None


def test_a_database_that_is_not_a_file_is_skipped_without_an_error(install, caplog):
    install.settings.DATABASE_URL = "sqlite:///:memory:"

    with caplog.at_level("INFO", logger="backend.services.database_backup"):
        outcome = database_backup.run_automatic_backup()

    assert outcome["status"] == "skipped"
    assert not [r for r in caplog.records if r.levelname == "ERROR"]
    assert database_backup.automatic_backup_status(install.backup_dir)["last_error"] is None


def test_a_check_that_finds_another_one_running_does_nothing(install):
    assert database_backup._run_lock.acquire(blocking=False)
    try:
        assert database_backup.run_automatic_backup() == {"status": "busy"}
    finally:
        database_backup._run_lock.release()
    assert not install.backup_dir.exists()


def test_a_relative_sqlite_url_is_found_where_the_server_was_started(install, monkeypatch):
    # sqlite:///./data/x.db is what SMS Lite uses when run from source: relative to the
    # working directory, which is how the engine opens it. The backup looked next to the code.
    monkeypatch.chdir(install.tmp_path)
    install.settings.DATABASE_URL = "sqlite:///./data/school.db"

    assert database_backup.run_automatic_backup()["status"] == "created"


# --- what the Operations page is told ---------------------------------------------------


def test_status_names_the_newest_automatic_backup(install):
    assert database_backup.automatic_backup_status(install.backup_dir) == {
        "enabled": True,
        "interval_hours": 24,
        "keep": 30,
        "count": 0,
        "last_backup": None,
        "last_backup_filename": None,
        "last_attempt": None,
        "last_attempt_status": None,
        "last_error": None,
    }

    outcome = database_backup.run_automatic_backup()
    status = database_backup.automatic_backup_status(install.backup_dir)

    assert status["count"] == 1
    assert status["last_backup_filename"] == outcome["filename"]
    # With its UTC offset: a bare time is read by the browser as its own local time, so a
    # backup made on a server running on UTC showed hours early.
    made_at = datetime.fromisoformat(status["last_backup"])
    assert made_at.tzinfo is not None
    assert timedelta(0) <= datetime.now().astimezone() - made_at < timedelta(minutes=1)
    assert datetime.fromisoformat(status["last_attempt"]).tzinfo is not None
    assert status["last_attempt_status"] == "created"


def test_the_backups_list_carries_the_automatic_status(client, control_admin_headers, tmp_path, monkeypatch):
    folder = tmp_path / "database"
    _fake_backup(folder, "auto_backup_20260101_000000.enc", hours_old=3)
    _fake_backup(folder, "backup_20260101_000000.enc", hours_old=1)
    settings = _Settings("sqlite:///:memory:", tmp_path)
    monkeypatch.setattr("backend.routers.control.operations.get_settings", lambda: settings)
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)

    response = client.get(
        "/control/api/operations/database-backups", headers=control_admin_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["automatic"]["enabled"] is True
    assert body["automatic"]["count"] == 1
    assert body["automatic"]["last_backup_filename"] == "auto_backup_20260101_000000.enc"


# --- the schedule -----------------------------------------------------------------------


class _RecordingScheduler:
    def __init__(self):
        self.jobs = {}

    def add_job(self, func, **options):
        self.jobs[options["id"]] = (func, options)


class _FakeExportScheduler:
    def __init__(self, available: bool = True):
        self.scheduler = _RecordingScheduler()
        self._available = available

    def is_available(self):
        return self._available


def _maintenance(available: bool = True):
    from backend.services.maintenance_scheduler import MaintenanceScheduler

    maintenance = MaintenanceScheduler.__new__(MaintenanceScheduler)
    maintenance.export_scheduler = _FakeExportScheduler(available)
    return maintenance


def test_the_check_runs_hourly_and_first_a_minute_after_the_start(monkeypatch, tmp_path):
    from datetime import timezone

    monkeypatch.setattr("backend.config.get_settings", lambda: _Settings("sqlite:///:memory:", tmp_path))
    maintenance = _maintenance()

    before = datetime.now(timezone.utc)
    assert maintenance.schedule_automatic_backup() is True

    jobs = maintenance.export_scheduler.scheduler.jobs
    assert set(jobs) == {"automatic_database_backup"}
    func, options = jobs["automatic_database_backup"]
    assert func is database_backup.run_automatic_backup
    assert options["trigger"].interval == timedelta(hours=1)
    # Soon after the start, not at it: SMS Lite is only up while somebody works with it.
    assert timedelta(seconds=30) <= options["next_run_time"] - before <= timedelta(seconds=120)
    # Two checks never overlap, and a check missed while the PC slept is made up once.
    assert options["max_instances"] == 1 and options["coalesce"] is True
    assert options["replace_existing"] is True


def test_nothing_is_scheduled_when_switched_off(monkeypatch, tmp_path, caplog):
    settings = _Settings("sqlite:///:memory:", tmp_path)
    settings.AUTO_BACKUP_ENABLED = False
    monkeypatch.setattr("backend.config.get_settings", lambda: settings)
    maintenance = _maintenance()

    with caplog.at_level("WARNING", logger="backend.services.maintenance_scheduler"):
        assert maintenance.schedule_automatic_backup() is False

    assert maintenance.export_scheduler.scheduler.jobs == {}
    # Said out loud: an installation without backups should not look like one with them.
    assert any("switched off" in r.getMessage() for r in caplog.records)


def test_nothing_is_scheduled_without_a_scheduler(monkeypatch, tmp_path):
    monkeypatch.setattr("backend.config.get_settings", lambda: _Settings("sqlite:///:memory:", tmp_path))
    maintenance = _maintenance(available=False)

    assert maintenance.schedule_automatic_backup() is False
    assert maintenance.export_scheduler.scheduler.jobs == {}


def test_starting_the_app_inside_a_test_makes_no_backup(monkeypatch):
    """A test run must never dump the database the developer's .env points at."""
    from fastapi.testclient import TestClient

    from backend.main import app

    made: list = []
    scheduled: list = []
    monkeypatch.setattr(database_backup, "create_database_backup", lambda **kwargs: made.append(kwargs))
    monkeypatch.setattr(
        "backend.services.maintenance_scheduler.MaintenanceScheduler.schedule_automatic_backup",
        lambda self, *args, **kwargs: scheduled.append(1),
    )

    with TestClient(app) as client:
        assert client.get("/health/live").status_code in (200, 404)

    assert scheduled == []
    assert made == []


# --- the key ----------------------------------------------------------------------------


@pytest.fixture
def key_places(tmp_path, monkeypatch):
    """The old place of the key (next to the code) and nothing configured."""
    legacy = tmp_path / "code" / ".keys"
    monkeypatch.setattr(encryption_service, "legacy_key_dir", lambda: legacy)
    monkeypatch.setattr("backend.config.get_settings", lambda: _Settings("sqlite:///:memory:", tmp_path))
    monkeypatch.delenv("BACKUP_KEYS_DIR", raising=False)
    monkeypatch.setenv("SMS_EXECUTION_MODE", "native")
    return legacy


def test_from_source_the_key_stays_next_to_the_code(key_places):
    assert encryption_service.default_key_dir() == key_places


def test_in_docker_the_key_is_on_the_data_volume(key_places, monkeypatch):
    # /app/.keys is the container's own layer: an update of the image threw the key away, and
    # with it the way into every encrypted backup made before.
    monkeypatch.setenv("SMS_EXECUTION_MODE", "docker")

    assert encryption_service.default_key_dir() == Path("/data/.keys")


def test_a_configured_folder_wins(key_places, monkeypatch, tmp_path):
    settings = _Settings("sqlite:///:memory:", tmp_path)
    settings.BACKUP_KEYS_DIR = str(tmp_path / "profile" / "backup-keys")
    monkeypatch.setattr("backend.config.get_settings", lambda: settings)
    monkeypatch.setenv("SMS_EXECUTION_MODE", "docker")

    assert encryption_service.default_key_dir() == tmp_path / "profile" / "backup-keys"


def test_an_existing_key_is_brought_to_the_new_place(key_places, monkeypatch, tmp_path):
    # An installation that already has encrypted backups: made with the key next to the code.
    old_service = EncryptionService(key_dir=key_places)
    sealed = old_service.encrypt(b"grades")
    new_place = tmp_path / "profile" / "backup-keys"
    monkeypatch.setattr(encryption_service, "default_key_dir", lambda: new_place)

    service = EncryptionService()

    assert service.master_key_path == new_place / "master.key"
    assert service.master_key_path.read_bytes() == (key_places / "master.key").read_bytes()
    assert service.decrypt(sealed) == b"grades"
    # Left where it was: an older build started on this installation still finds it.
    assert (key_places / "master.key").exists()


def test_a_key_in_the_new_place_is_never_replaced_by_the_old_one(key_places, monkeypatch, tmp_path):
    EncryptionService(key_dir=key_places)._get_or_create_master_key()
    new_place = tmp_path / "profile" / "backup-keys"
    current = EncryptionService(key_dir=new_place)._get_or_create_master_key()
    monkeypatch.setattr(encryption_service, "default_key_dir", lambda: new_place)

    assert EncryptionService()._get_or_create_master_key() == current
    assert current != (key_places / "master.key").read_bytes()


def test_an_explicit_key_folder_adopts_nothing(key_places, tmp_path):
    EncryptionService(key_dir=key_places)._get_or_create_master_key()

    service = EncryptionService(key_dir=tmp_path / "elsewhere")

    assert not service.master_key_path.exists()


def test_a_backup_made_with_another_key_says_so(tmp_path):
    # What an update of a Docker install used to do to every earlier backup. The error had no
    # text at all: the page showed "Failed to decrypt backup: ".
    sealed = EncryptionService(key_dir=tmp_path / "before-the-update").encrypt(b"grades")
    after = EncryptionService(key_dir=tmp_path / "after-the-update")

    with pytest.raises(BackupKeyMismatchError) as caught:
        after.decrypt(sealed)

    message = str(caught.value)
    assert "different key" in message
    assert str(after.master_key_path) in message


# --- psql: all of a script, or none of it -----------------------------------------------


def test_psql_is_told_to_stop_at_the_first_error_and_to_use_one_transaction(monkeypatch):
    """Without both, a pg_dump script applied to a live database restored nothing, moved every
    id counter back and was reported as a success. The real thing is in
    test_database_manager_restore_roundtrip.py; this holds the command line on machines
    without psql."""
    import subprocess

    from backend.services import database_manager

    seen: dict = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        seen["input"] = kwargs.get("input")
        return subprocess.CompletedProcess(cmd, 3, stdout=b"", stderr=b'psql:<stdin>:1: ERROR:  relation "users" already exists\n')

    monkeypatch.setattr(database_manager.subprocess, "run", fake_run)

    result = database_manager._restore_via_psql(
        {"host": "db", "port": 5432, "user": "sms", "password": "pw", "dbname": "sms"}, "CREATE TABLE users ();"
    )

    cmd = seen["cmd"]
    assert "ON_ERROR_STOP=1" in cmd
    assert "--single-transaction" in cmd
    # --single-transaction is ignored for plain standard input: the script must come as -f -.
    assert cmd[cmd.index("-f") + 1] == "-"
    assert seen["input"] == b"CREATE TABLE users ();"
    assert result["success"] is False
    assert "nothing was changed" in result["error"]
    assert 'relation "users" already exists' in result["error"]


def test_a_psql_restore_that_failed_is_answered_as_a_failure(client, control_admin_headers, tmp_path, monkeypatch):
    from unittest.mock import patch

    folder = tmp_path / "database"
    folder.mkdir(parents=True)
    (folder / "backup_20260101_000000.sql").write_text("CREATE TABLE users ();\n", encoding="utf-8")
    monkeypatch.setattr(
        "backend.services.database_manager.restore_sql_content",
        lambda instance, content: {
            "success": False,
            "method": "psql",
            "error": "This is a pg_dump script and psql could not apply it; nothing was changed.",
        },
    )

    with patch("backend.config.settings") as mock_settings:
        mock_settings.DATABASE_URL = "postgresql://u:p@db:5432/sms"
        mock_settings.BACKUPS_DIR = str(tmp_path)
        response = client.post(
            "/control/api/operations/database-restore",
            params={"backup_filename": "backup_20260101_000000.sql"},
            headers=control_admin_headers,
        )

    assert response.status_code == 500
    assert "nothing was changed" in response.text