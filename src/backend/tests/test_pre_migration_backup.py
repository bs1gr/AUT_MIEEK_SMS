"""A backup of the database right before a migration changes it (plan todo 58).

An update that migrated the shared database left every earlier backup restorable only with the
earlier release, and the rows the v1.18.70 migration rewrote had to be saved by hand. Both
migration runners now make an encrypted ``pre_migration_*.enc`` backup first, and migrate
nothing when that backup fails.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

from backend.services import database_backup, encryption_service, pre_migration_backup
from backend.services.backup_service_encrypted import BackupServiceEncrypted

BACKEND_DIR = Path(__file__).resolve().parents[1]
OLDER_REVISION = "f6c3d8b1a2e4"  # a real revision some releases back


class _Settings:
    BACKUP_KEYS_DIR = ""

    def __init__(self, database_url: str, backups_dir: Path):
        self.DATABASE_URL = database_url
        self.BACKUPS_DIR = str(backups_dir)


def _cfg(url: str) -> Config:
    # No alembic.ini: with a config file name, migrations/env.py reconfigures logging for the
    # whole test run (see test_lesson_logs_migration).
    cfg = Config()
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture
def place(tmp_path, monkeypatch):
    """A database file of its own, a backups folder and a key folder; never the tree's own."""
    db_file = tmp_path / "data" / "school.db"
    db_file.parent.mkdir()
    url = f"sqlite:///{db_file.as_posix()}"
    # The settings name another database on purpose: the backup must take the one being
    # migrated, which is the runner's config, not DATABASE_URL.
    settings = _Settings("sqlite:///" + (tmp_path / "other.db").as_posix(), tmp_path / "backups")
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)
    monkeypatch.setattr(encryption_service, "default_key_dir", lambda: tmp_path / "keys")
    monkeypatch.setattr(encryption_service, "legacy_key_dir", lambda: tmp_path / "no-legacy-keys")
    monkeypatch.delenv(pre_migration_backup.SKIP_ENV, raising=False)
    notices: list[str] = []
    monkeypatch.setattr(
        database_backup, "notify_administrators_of_failure", lambda error, *a, **k: notices.append(error)
    )

    class Place:
        pass

    p = Place()
    p.url, p.db_file, p.cfg = url, db_file, _cfg(url)
    p.backup_dir = tmp_path / "backups" / "database"
    p.tmp_path, p.notices = tmp_path, notices
    return p


def _backups(place) -> list[str]:
    if not place.backup_dir.exists():
        return []
    return sorted(p.name for p in place.backup_dir.iterdir() if p.is_file())


def _revision(url: str) -> str:
    from sqlalchemy import create_engine, text

    engine = create_engine(url)
    try:
        with engine.connect() as conn:
            return conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    finally:
        engine.dispose()


def _older_database_with_a_row(place) -> None:
    command.upgrade(place.cfg, OLDER_REVISION)
    with sqlite3.connect(place.db_file) as conn:
        conn.execute(
            "INSERT INTO students (id, first_name, last_name, email, student_id, is_active) "
            "VALUES (1, 'Μαρία', 'Παπά', 'maria@example.com', 'S1', 1)"
        )
    conn.close()


def test_pending_migrations_are_preceded_by_a_backup_that_restores(place):
    _older_database_with_a_row(place)

    outcome = pre_migration_backup.backup_before_migrating(place.cfg)

    assert outcome["status"] == "created"
    assert outcome["current"] == [OLDER_REVISION]
    (name,) = _backups(place)
    assert name.startswith("pre_migration_") and name.endswith(".enc")
    assert "Μαρία".encode() not in (place.backup_dir / name).read_bytes()
    restored = BackupServiceEncrypted(backup_dir=place.backup_dir).restore_encrypted_backup(
        backup_name=name[: -len(".enc")], output_path=place.tmp_path / "restored" / "school.db"
    )
    with sqlite3.connect(restored["restored_to"]) as conn:
        assert conn.execute("SELECT first_name FROM students").fetchall() == [("Μαρία",)]
        assert conn.execute("SELECT version_num FROM alembic_version").fetchall() == [(OLDER_REVISION,)]
    conn.close()


def test_a_new_empty_database_needs_no_backup(place):
    assert pre_migration_backup.backup_before_migrating(place.cfg)["status"] == "not_needed"
    assert _backups(place) == []


def test_a_database_at_the_newest_revision_needs_no_backup(place):
    command.upgrade(place.cfg, "head")
    assert pre_migration_backup.backup_before_migrating(place.cfg)["status"] == "not_needed"
    assert _backups(place) == []


def test_a_database_a_newer_release_migrated_is_left_alone(place):
    command.upgrade(place.cfg, "head")
    with sqlite3.connect(place.db_file) as conn:
        conn.execute("UPDATE alembic_version SET version_num = 'ffffffffffff'")
    conn.close()

    assert pre_migration_backup.migration_state(place.cfg).known is False
    assert pre_migration_backup.backup_before_migrating(place.cfg)["status"] == "not_needed"
    assert _backups(place) == []


def test_a_failed_backup_stops_the_migration_and_tells_the_administrators(place, monkeypatch):
    from backend.scripts.migrate import runner

    _older_database_with_a_row(place)

    def _broken(**_kwargs):
        raise database_backup.DatabaseBackupError("disk full", 500)

    monkeypatch.setattr(database_backup, "create_database_backup", _broken)
    monkeypatch.setattr(runner, "_alembic_config", lambda _backend_dir: place.cfg)

    assert runner.run_migrations(False) is False
    assert _revision(place.url) == OLDER_REVISION  # nothing was migrated
    assert place.notices and "disk full" in place.notices[0]


def test_the_operator_can_migrate_without_it_once(place, monkeypatch):
    _older_database_with_a_row(place)
    monkeypatch.setenv(pre_migration_backup.SKIP_ENV, "1")

    assert pre_migration_backup.backup_before_migrating(place.cfg)["status"] == "skipped"
    assert _backups(place) == []


def test_a_database_the_backup_cannot_handle_is_not_a_failure(place, monkeypatch):
    _older_database_with_a_row(place)

    def _unsupported(**_kwargs):
        raise database_backup.DatabaseBackupError("Unsupported database type: oracle", 400)

    monkeypatch.setattr(database_backup, "create_database_backup", _unsupported)
    assert pre_migration_backup.backup_before_migrating(place.cfg)["status"] == "skipped"
    assert place.notices == []


@pytest.mark.parametrize("module_name", ["backend.scripts.migrate.runner", "backend.run_migrations"])
def test_both_runners_back_up_then_migrate(place, monkeypatch, module_name):
    import importlib

    runner = importlib.import_module(module_name)
    _older_database_with_a_row(place)
    monkeypatch.setattr(runner, "_alembic_config", lambda _backend_dir: place.cfg)

    assert runner.run_migrations(False) is True

    (name,) = _backups(place)
    assert name.startswith("pre_migration_")
    assert _revision(place.url) != OLDER_REVISION
