import io
import json


def test_database_test_connection_success(client, monkeypatch):
    from backend.routers.control import database as db_router

    monkeypatch.setattr(
        db_router,
        "check_instance_health",
        lambda instance: {
            "status": "healthy",
            "version": "PostgreSQL 14",
            "size_bytes": 123456,
            "size_human": "120 KB",
            "error": None,
        },
    )

    payload = {
        "host": "localhost",
        "port": 5432,
        "dbname": "student_management",
        "user": "sms_user",
        "password": "secret",
        "sslmode": "prefer",
    }

    resp = client.post("/control/api/database/test-connection", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert data["version"] == "PostgreSQL 14"


def test_import_credentials_json_test_only(client, monkeypatch):
    from backend.routers.control import database as db_router

    monkeypatch.setattr(
        db_router,
        "check_instance_health",
        lambda instance: {
            "status": "healthy",
            "version": "PostgreSQL 14",
            "size_bytes": 123456,
            "size_human": "120 KB",
            "error": None,
        },
    )

    payload = {
        "host": "127.0.0.1",
        "port": 5432,
        "dbname": "student_management",
        "user": "sms_user",
        "password": "P@ss!",
        "sslmode": "disable",
    }

    files = {
        "file": (
            "credentials.json",
            io.BytesIO(json.dumps(payload).encode("utf-8")),
            "application/json",
        )
    }

    resp = client.post("/control/api/database/import-credentials?auto_connect=false", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["credentials_saved"] is False
    assert data["connection_test"]["success"] is True


def test_import_credentials_json_auto_connect_updates_env(client, monkeypatch, tmp_path):
    from backend.routers.control import database as db_router

    monkeypatch.setattr(
        db_router,
        "check_instance_health",
        lambda instance: {
            "status": "healthy",
            "version": "PostgreSQL 14",
            "size_bytes": 123456,
            "size_human": "120 KB",
            "error": None,
        },
    )

    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("DATABASE_ENGINE=sqlite\n", encoding="utf-8")

    payload = {
        "host": "10.0.0.10",
        "port": 55433,
        "dbname": "student_management",
        "user": "sms_user",
        "password": "P@ss!",
        "sslmode": "disable",
    }

    files = {
        "file": (
            "credentials.json",
            io.BytesIO(json.dumps(payload).encode("utf-8")),
            "application/json",
        )
    }

    resp = client.post("/control/api/database/import-credentials?auto_connect=true", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["credentials_saved"] is True

    env_text = (tmp_path / ".env").read_text(encoding="utf-8")
    assert "SMS_DATABASE_PROFILE=remote" in env_text
    assert "DATABASE_ENGINE=postgresql" in env_text
    assert "POSTGRES_HOST=10.0.0.10" in env_text
    assert "POSTGRES_PORT=55433" in env_text
    assert "POSTGRES_DB=student_management" in env_text
    assert "POSTGRES_USER=sms_user" in env_text
    assert "POSTGRES_PASSWORD=P@ss!" in env_text
    assert "DATABASE_URL=postgresql://sms_user:P%40ss%21@10.0.0.10:55433/student_management?sslmode=disable" in env_text


def test_import_credentials_unsupported_format(client):
    files = {
        "file": (
            "credentials.txt",
            io.BytesIO(b"not a supported format"),
            "text/plain",
        )
    }

    resp = client.post("/control/api/database/import-credentials?auto_connect=false", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is False
    assert "Unsupported file format" in data["message"]


def test_download_backup_rejects_traversal_filename(client):
    resp = client.get("/control/api/database/backups/..%5Cevil.sql/download")
    assert resp.status_code == 400
    assert "Invalid character/pattern in filename" in resp.text
