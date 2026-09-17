"""The Dev Tools restore must accept PostgreSQL backups, not SQLite ones only.

`/operations/database-restore` used to require a file starting "SQLite format 3", so every
PostgreSQL backup its own `/operations/database-backup` produced was unrestorable anywhere in
the app - including on Docker, where pg_dump is installed. It now routes PostgreSQL files
through the same engine the Database panel uses (database_manager.restore_sql_content).

These tests cover the routing and the refusals. The engine itself is covered by
test_database_manager_restore_safety.py and, against a real server,
test_database_manager_restore_roundtrip.py.
"""

from unittest.mock import patch

DATA_ONLY_BACKUP = (
    "-- SMS PostgreSQL data-only backup (COPY format) v1\n"
    "-- Timestamp: 20260917_120000\n"
    "-- Alembic version: abc123\n"
    "\nBEGIN;\n\n"
    'TRUNCATE TABLE "students" RESTART IDENTITY CASCADE;\n'
    '\nCOPY "students" ("id", "first_name") FROM stdin;\n'
    "1\tx;DELETE FROM users;y\n"
    "\\.\n"
    "\nCOMMIT;\n"
)

LEGACY_CSV_EXPORT = (
    "-- SMS PostgreSQL data export (psycopg COPY)\n"
    "-- Timestamp: 20260917_120000\n"
    "\n-- Table: students\nid,first_name\n1,x;DELETE FROM users;y\n"
)

PG_URL = "postgresql://u:p@db:5432/sms"


def _write_backup(tmp_path, name: str, content: str):
    backup_dir = tmp_path / "database"
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / name).write_text(content, encoding="utf-8")
    return name


def _restore(client, admin_token, tmp_path, filename: str, database_url: str = PG_URL):
    with patch("backend.config.settings") as mock_settings:
        mock_settings.DATABASE_URL = database_url
        mock_settings.BACKUPS_DIR = str(tmp_path)
        return client.post(
            "/control/api/operations/database-restore",
            params={"backup_filename": filename},
            headers={"Authorization": f"Bearer {admin_token}"},
        )


def test_postgres_data_only_backup_is_routed_to_the_restore_engine(client, admin_token, tmp_path):
    name = _write_backup(tmp_path, "backup_20260917_120000.sql", DATA_ONLY_BACKUP)
    captured = {}

    def _fake_restore(instance, content):
        captured["instance"] = instance
        captured["content"] = content
        return {"success": True, "method": "psycopg_copy", "tables": 1, "rows": 1, "alembic_version": "abc123"}

    with patch("backend.services.database_manager.restore_sql_content", _fake_restore):
        response = _restore(client, admin_token, tmp_path, name)

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert data["details"]["restore_method"] == "psycopg_copy"
    assert data["details"]["rows"] == 1
    # The connection details come from DATABASE_URL, and the file content is passed through.
    assert captured["instance"]["dbname"] == "sms"
    assert captured["instance"]["host"] == "db"
    assert captured["instance"]["user"] == "u"
    assert captured["content"] == DATA_ONLY_BACKUP


def test_a_failed_postgres_restore_is_reported_as_a_failure(client, admin_token, tmp_path):
    name = _write_backup(tmp_path, "backup_20260917_130000.sql", DATA_ONLY_BACKUP)

    def _fake_restore(_instance, _content):
        return {"success": False, "error": "Restore failed and was rolled back; nothing was changed."}

    with patch("backend.services.database_manager.restore_sql_content", _fake_restore):
        response = _restore(client, admin_token, tmp_path, name)

    assert response.status_code == 500
    assert "nothing was changed" in response.text.lower()


def test_legacy_csv_export_is_refused_by_the_dev_tools_restore(client, admin_token, tmp_path):
    """The unrestorable CSV exports must be refused here too, not executed."""
    name = _write_backup(tmp_path, "backup_20260917_140000.sql", LEGACY_CSV_EXPORT)

    def _must_not_run(*_a, **_k):
        raise AssertionError("restore reached the database for an unrestorable export")

    with patch("psycopg.connect", _must_not_run):
        response = _restore(client, admin_token, tmp_path, name)

    assert response.status_code == 400
    assert "CSV data export" in response.text


def test_postgres_backup_is_refused_on_a_sqlite_deployment(client, admin_token, tmp_path):
    name = _write_backup(tmp_path, "backup_20260917_150000.sql", DATA_ONLY_BACKUP)

    response = _restore(client, admin_token, tmp_path, name, database_url="sqlite:///./sms.db")

    assert response.status_code == 400
    assert "Nothing was changed" in response.text


def test_a_file_that_is_neither_sqlite_nor_readable_text_is_refused(client, admin_token, tmp_path):
    backup_dir = tmp_path / "database"
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / "backup_binary.sql").write_bytes(b"\x89PNG\r\n\x1a\n\xff\xfe\xfd binary junk")

    response = _restore(client, admin_token, tmp_path, "backup_binary.sql")

    assert response.status_code == 400
    assert "Nothing was changed" in response.text
