import io
from pathlib import Path

from backend import config as backend_config
from backend.scripts import migrate_sqlite_to_postgres as sqlite_to_pg
from backend.errors import ErrorCode
from backend.tests.conftest import get_error_detail


def test_database_upload_valid(client):
    # Create a valid SQLite file in memory
    sqlite_header = b"SQLite format 3\x00" + b"\x00" * 8
    file_content = sqlite_header + b"testdata"
    files = {"file": ("test.db", io.BytesIO(file_content), "application/octet-stream")}
    resp = client.post("/control/api/operations/database-upload", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["details"]["filename"].endswith("test.db")
    # Clean up uploaded file
    uploaded = Path("backups/database") / data["details"]["filename"]
    if uploaded.exists():
        uploaded.unlink()


def test_database_upload_invalid_extension(client):
    files = {"file": ("test.txt", io.BytesIO(b"not a db"), "application/octet-stream")}
    resp = client.post("/control/api/operations/database-upload", files=files)
    assert resp.status_code == 400
    detail = get_error_detail(resp.json())
    assert detail["error_id"] == ErrorCode.CONTROL_INVALID_FILE_TYPE.value


def test_database_upload_invalid_magic(client):
    files = {
        "file": (
            "test.db",
            io.BytesIO(b"not a sqlite file"),
            "application/octet-stream",
        )
    }
    resp = client.post("/control/api/operations/database-upload", files=files)
    assert resp.status_code == 400
    detail = get_error_detail(resp.json())
    assert detail["error_id"] == ErrorCode.CONTROL_INVALID_FILE_TYPE.value


def test_database_restore_auto_migrates_on_postgres(client, monkeypatch):
    monkeypatch.setattr(
        backend_config.settings,
        "DATABASE_URL",
        "postgresql://sms_user:pw@localhost:5432/student_management",
        raising=False,
    )

    backups_dir = Path(__file__).resolve().parents[2] / "backups" / "database"
    backups_dir.mkdir(parents=True, exist_ok=True)
    backup_name = "uploaded_test_restore.db"
    backup_path = backups_dir / backup_name
    backup_path.write_bytes(b"SQLite format 3\x00" + b"\x00" * 256)

    monkeypatch.setattr(sqlite_to_pg, "main", lambda argv: 0, raising=False)

    try:
        resp = client.post(f"/control/api/operations/database-restore?backup_filename={backup_name}")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["success"] is True
        assert data["details"]["migration_mode"] == "sqlite_to_postgresql"
    finally:
        backup_path.unlink(missing_ok=True)


def test_database_restore_returns_error_when_migration_fails(client, monkeypatch):
    monkeypatch.setattr(
        backend_config.settings,
        "DATABASE_URL",
        "postgresql://sms_user:pw@localhost:5432/student_management",
        raising=False,
    )

    backups_dir = Path(__file__).resolve().parents[2] / "backups" / "database"
    backups_dir.mkdir(parents=True, exist_ok=True)
    backup_name = "uploaded_test_restore_fail.db"
    backup_path = backups_dir / backup_name
    backup_path.write_bytes(b"SQLite format 3\x00" + b"\x00" * 256)

    monkeypatch.setattr(sqlite_to_pg, "main", lambda argv: 3, raising=False)

    try:
        resp = client.post(f"/control/api/operations/database-restore?backup_filename={backup_name}")
        assert resp.status_code == 500
        detail = get_error_detail(resp.json())
        assert detail["error_id"] == ErrorCode.CONTROL_RESTORE_FAILED.value
    finally:
        backup_path.unlink(missing_ok=True)
