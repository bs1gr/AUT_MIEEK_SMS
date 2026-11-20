"""The Database panel's backups are the application's encrypted backups (2026-11-20).

Until then the panel wrote pg_dump scripts and data-only COPY files in the clear, some gzipped,
into <BACKUPS_DIR>/postgres, with a list of their own. Now it makes, lists, downloads, deletes and
restores the same encrypted backups as Manage Backups, and its old plain files are encrypted
where they lie, with a byte-for-byte check before the plain file goes.
"""

from __future__ import annotations

import gzip
import json
import os
import time
from pathlib import Path

import pytest

from backend.services import database_backup, database_panel_backups, encryption_service
from backend.services.backup_service_encrypted import BackupServiceEncrypted

DATA_ONLY = (
    "-- SMS PostgreSQL data-only backup (psycopg COPY) alembic_version=abc123\n"
    "COPY public.students (id, first_name) FROM stdin;\n1\tΜαρία\n\\.\n"
)
PRIMARY = {
    "name": "primary",
    "label": "Primary PostgreSQL",
    "is_primary": True,
    "host": "db",
    "port": 5432,
    "dbname": "sms",
    "user": "u",
    "password": "p",
}


class _Settings:
    BACKUP_KEYS_DIR = ""
    AUTO_BACKUP_ENABLED = False
    AUTO_BACKUP_INTERVAL_HOURS = 24
    AUTO_BACKUP_KEEP = 30
    DATABASE_URL = "postgresql://u:p@db:5432/sms"

    def __init__(self, backups_dir: Path):
        self.BACKUPS_DIR = str(backups_dir)


@pytest.fixture
def place(tmp_path, monkeypatch):
    settings = _Settings(tmp_path / "backups")
    monkeypatch.setattr(database_backup, "get_settings", lambda: settings)
    monkeypatch.setattr(database_panel_backups, "get_settings", lambda: settings)
    monkeypatch.setattr(encryption_service, "default_key_dir", lambda: tmp_path / "keys")
    monkeypatch.setattr(encryption_service, "legacy_key_dir", lambda: tmp_path / "no-legacy-keys")

    class Place:
        pass

    p = Place()
    p.database = tmp_path / "backups" / "database"
    p.legacy = tmp_path / "backups" / "postgres"
    p.database.mkdir(parents=True)
    p.legacy.mkdir(parents=True)
    p.tmp_path = tmp_path
    return p


def _encrypted(place, stem: str, content: str, **meta) -> Path:
    plain = place.tmp_path / f"{stem}.sql"
    plain.write_bytes(content.encode("utf-8"))
    BackupServiceEncrypted(backup_dir=place.database).create_encrypted_backup(
        source_path=plain, backup_name=stem, metadata={"database_type": "postgresql", **meta}
    )
    plain.unlink()
    return place.database / f"{stem}.enc"


def _old(path: Path, seconds: float = 3600) -> None:
    then = time.time() - seconds
    os.utime(path, (then, then))


# --- making one -----------------------------------------------------------------------------


def test_a_backup_from_the_panel_is_encrypted_into_the_common_folder(place, monkeypatch):
    seen = {}

    def _fake(*, encrypt, prefix, instance=None):
        seen.update(encrypt=encrypt, instance=instance)
        return {
            "details": {
                "filename": "backup_x.enc",
                "encrypted_size": 2048,
                "backup_method": "psycopg_copy",
                "timestamp": "t",
                "restorable_in_app": True,
                "tables": 1,
                "rows": 1,
            }
        }

    monkeypatch.setattr(database_backup, "create_database_backup", _fake)
    result = database_panel_backups.make_backup(PRIMARY)

    # The primary instance: the configured DATABASE_URL, like every other backup.
    assert seen == {"encrypt": True, "instance": None}
    assert result["encrypted"] is True and result["filename"] == "backup_x.enc"
    assert result["size_human"] == "2.0 KB"


def test_an_extra_instance_is_backed_up_by_its_own_settings(place, monkeypatch):
    extra = {"name": "other", "host": "h", "port": 6543, "dbname": "d", "user": "a", "password": "p"}
    made = {}

    def _data_only(instance, compress=False):
        made.update(instance)
        path = place.tmp_path / "backups" / "postgres" / "other_1.sql"
        path.write_bytes(DATA_ONLY.encode("utf-8"))
        return {"filename": path.name, "method": "psycopg_copy", "tables": 1, "rows": 1}

    monkeypatch.setattr("backend.services.database_manager.create_data_only_backup", _data_only)
    monkeypatch.setattr(
        "backend.services.database_manager.get_backup_path",
        lambda name: place.tmp_path / "backups" / "postgres" / name,
    )

    result = database_panel_backups.make_backup(extra)

    assert made["host"] == "h" and made["dbname"] == "d" and made["password"] == "p"
    enc = place.database / result["filename"]
    assert enc.suffix == ".enc" and "Μαρία".encode() not in enc.read_bytes()
    meta = json.loads((place.database / ".metadata" / f"{enc.stem}.json").read_text(encoding="utf-8"))
    # Host and database name are recorded, the credentials are not.
    assert meta["database_host"] == "h" and meta["database_name"] == "d"
    assert "p" not in (meta.get("password"), meta.get("user"))
    assert database_panel_backups.list_backups([extra])[0]["instance"] == "other"


# --- the list, download, delete ----------------------------------------------------------------


def test_the_list_shows_the_encrypted_postgresql_backups_only(place):
    _encrypted(
        place,
        "backup_20261120_100000",
        DATA_ONLY,
        database_host="db",
        database_name="sms",
        backup_method="psycopg_copy",
    )
    _encrypted(place, "auto_backup_20261120_110000", DATA_ONLY)
    sqlite = _encrypted(place, "backup_sqlite", "x")
    meta = place.database / ".metadata" / "backup_sqlite.json"
    meta.write_text(json.dumps({"database_type": "sqlite"}), encoding="utf-8")
    (place.database / "backup_plain.sql").write_text("x", encoding="utf-8")

    rows = database_panel_backups.list_backups([PRIMARY])

    names = sorted(row["filename"] for row in rows)
    assert names == ["auto_backup_20261120_110000.enc", "backup_20261120_100000.enc"]
    assert all(row["encrypted"] and row["instance"] == "primary" for row in rows)
    assert sqlite.exists()


@pytest.mark.parametrize("name", ["../x.enc", "x.sql", "", "a/b.enc", ".enc"])
def test_only_plain_enc_names_are_accepted(place, name):
    with pytest.raises(ValueError):
        database_panel_backups.find_backup(name)


def test_delete_removes_the_file_and_its_metadata(place):
    path = _encrypted(place, "backup_del", DATA_ONLY)
    assert database_panel_backups.delete_backup("backup_del.enc") is True
    assert not path.exists()
    assert not (place.database / ".metadata" / "backup_del.json").exists()
    assert database_panel_backups.delete_backup("backup_del.enc") is False


# --- restore ------------------------------------------------------------------------------------


def test_restore_decrypts_and_uses_the_same_engine(place, monkeypatch):
    _encrypted(place, "backup_r", DATA_ONLY)
    seen = {}

    def _engine(instance, content):
        seen.update(instance=instance["name"], content=content)
        return {"success": True, "method": "psycopg_copy"}

    monkeypatch.setattr("backend.services.database_manager.restore_sql_content", _engine)

    assert database_panel_backups.restore_backup(PRIMARY, "backup_r.enc")["success"] is True
    assert seen == {"instance": "primary", "content": DATA_ONLY}
    # Nothing decrypted is left behind.
    assert sorted(p.name for p in place.database.iterdir() if p.name.startswith(".restore")) == []


def test_a_sqlite_backup_is_not_restored_here(place):
    _encrypted(place, "backup_lite", "x")
    (place.database / ".metadata" / "backup_lite.json").write_text(json.dumps({"database_type": "sqlite"}))
    with pytest.raises(ValueError, match="Manage Backups"):
        database_panel_backups.restore_backup(PRIMARY, "backup_lite.enc")


# --- the old plain files -------------------------------------------------------------------------


def test_old_plain_backups_are_encrypted_checked_and_then_removed(place):
    plain = place.legacy / "primary_20261101_090000.sql"
    plain.write_bytes(DATA_ONLY.encode("utf-8"))
    (place.legacy / "primary_20261101_090000.sql.meta.json").write_text(json.dumps({"method": "psycopg_copy"}))
    zipped = place.legacy / "primary_20261102_090000.sql.gz"
    zipped.write_bytes(gzip.compress(DATA_ONLY.encode("utf-8")))
    for path in place.legacy.iterdir():
        _old(path)

    converted = database_panel_backups.encrypt_legacy_plaintext()

    assert sorted(converted) == ["primary_20261101_090000.sql", "primary_20261102_090000.sql.gz"]
    assert list(place.legacy.iterdir()) == []
    for stem in ("primary_20261101_090000", "primary_20261102_090000"):
        enc = place.database / f"{stem}.enc"
        assert "Μαρία".encode() not in enc.read_bytes()
        assert database_panel_backups._decrypted_text(enc) == DATA_ONLY
    meta = json.loads((place.database / ".metadata" / "primary_20261101_090000.json").read_text())
    assert meta["converted_from"] == "primary_20261101_090000.sql" and meta["backup_method"] == "psycopg_copy"
    # Listed by the panel from now on, nothing decrypted left behind.
    assert len(database_panel_backups.list_backups([PRIMARY])) == 2
    assert [p for p in place.database.iterdir() if p.name.startswith(".encrypt")] == []


def test_a_file_still_being_written_is_left_for_the_next_check(place):
    young = place.legacy / "primary_now.sql"
    young.write_bytes(DATA_ONLY.encode("utf-8"))
    assert database_panel_backups.encrypt_legacy_plaintext() == []
    assert young.exists()


def test_a_copy_that_does_not_match_keeps_the_plain_file(place, monkeypatch):
    plain = place.legacy / "primary_bad.sql"
    plain.write_bytes(DATA_ONLY.encode("utf-8"))
    _old(plain)
    monkeypatch.setattr(database_panel_backups, "_sha256", lambda data: os.urandom(8).hex())

    assert database_panel_backups.encrypt_legacy_plaintext() == []
    assert plain.exists()
    assert not (place.database / "primary_bad.enc").exists()


def test_the_automatic_check_does_it(place):
    plain = place.legacy / "primary_auto.sql"
    plain.write_bytes(DATA_ONLY.encode("utf-8"))
    _old(plain)

    assert database_backup.run_automatic_backup()["status"] == "disabled"
    assert not plain.exists()
    assert (place.database / "primary_auto.enc").exists()


# --- through the panel's endpoints --------------------------------------------------------------


def test_the_endpoints_list_download_and_delete_the_encrypted_backups(
    client, control_admin_headers, place, monkeypatch
):
    monkeypatch.setattr("backend.routers.control.database.get_configured_instances", lambda: [PRIMARY])
    path = _encrypted(place, "backup_api", DATA_ONLY)

    listed = client.get("/control/api/database/backups", headers=control_admin_headers)
    assert listed.status_code == 200
    assert [row["filename"] for row in listed.json()] == ["backup_api.enc"]
    assert listed.json()[0]["encrypted"] is True

    download = client.get("/control/api/database/backups/backup_api.enc/download", headers=control_admin_headers)
    assert download.status_code == 200
    assert download.content == path.read_bytes()
    assert "Μαρία".encode() not in download.content

    gone = client.delete("/control/api/database/backups/backup_api.enc", headers=control_admin_headers)
    assert gone.status_code == 200 and not path.exists()
