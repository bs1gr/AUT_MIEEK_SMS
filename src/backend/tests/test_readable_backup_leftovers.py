"""The readable copies that builds up to v1.18.70 left beside encrypted backups are removed.

On Windows an encrypted backup of a SQLite database left its unencrypted ``<name>.db`` next to
``<name>.enc`` (fixed in v1.18.71); the release notes asked people to delete them by hand. The
automatic backup check now does it, and only where the encrypted twin is there.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pytest

from backend.services import database_backup


class _Settings:
    AUTO_BACKUP_ENABLED = False  # the clean-up must not depend on the automatic backup
    AUTO_BACKUP_INTERVAL_HOURS = 24
    AUTO_BACKUP_KEEP = 30
    BACKUP_KEYS_DIR = ""

    def __init__(self, backups_dir: Path):
        self.DATABASE_URL = "sqlite:///:memory:"
        self.BACKUPS_DIR = str(backups_dir)


@pytest.fixture
def folder(tmp_path, monkeypatch):
    monkeypatch.setattr(database_backup, "get_settings", lambda: _Settings(tmp_path / "backups"))
    path = tmp_path / "backups" / "database"
    path.mkdir(parents=True)
    return path


def _file(folder: Path, name: str, content: bytes = b"x") -> Path:
    path = folder / name
    path.write_bytes(content)
    return path


def test_a_readable_copy_beside_its_encrypted_twin_is_removed(folder, caplog):
    _file(folder, "backup_20261001_100000.enc", b"sealed")
    _file(folder, "backup_20261001_100000.db", b"SQLite format 3\x00 all the data")

    with caplog.at_level(logging.INFO, logger="backend.services.database_backup"):
        removed = database_backup.remove_readable_leftovers(folder)

    assert removed == ["backup_20261001_100000.db"]
    assert sorted(p.name for p in folder.iterdir()) == ["backup_20261001_100000.enc"]
    assert "backup_20261001_100000.db" in caplog.text


def test_a_backup_made_unencrypted_on_purpose_stays(folder):
    _file(folder, "backup_20261002_100000.db")
    assert database_backup.remove_readable_leftovers(folder) == []
    assert (folder / "backup_20261002_100000.db").exists()


def test_an_empty_twin_does_not_count(folder):
    _file(folder, "backup_20261003_100000.enc", b"")
    _file(folder, "backup_20261003_100000.db")
    assert database_backup.remove_readable_leftovers(folder) == []
    assert (folder / "backup_20261003_100000.db").exists()


def test_other_files_are_never_touched(folder):
    _file(folder, "backup_20261004_100000.enc", b"sealed")
    _file(folder, "backup_20261004_100000.sql")
    _file(folder, "notes.db")
    assert database_backup.remove_readable_leftovers(folder) == []
    assert sorted(p.name for p in folder.iterdir()) == [
        "backup_20261004_100000.enc",
        "backup_20261004_100000.sql",
        "notes.db",
    ]


def test_no_folder_is_no_error(tmp_path):
    assert database_backup.remove_readable_leftovers(tmp_path / "missing") == []


def test_the_automatic_check_does_it_even_when_switched_off(folder):
    _file(folder, "backup_20261005_100000.enc", b"sealed")
    _file(folder, "backup_20261005_100000.db")

    assert database_backup.run_automatic_backup()["status"] == "disabled"
    assert not (folder / "backup_20261005_100000.db").exists()
