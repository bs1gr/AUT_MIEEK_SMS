import io
from pathlib import Path

from fastapi.testclient import TestClient

import backend.main as main
from backend.errors import ErrorCode


def test_database_upload_valid():
    client = TestClient(main.app)
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


def test_database_upload_invalid_extension():
    client = TestClient(main.app)
    files = {"file": ("test.txt", io.BytesIO(b"not a db"), "application/octet-stream")}
    resp = client.post("/control/api/operations/database-upload", files=files)
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_INVALID_FILE_TYPE.value


def test_database_upload_invalid_magic():
    client = TestClient(main.app)
    files = {"file": ("test.db", io.BytesIO(b"not a sqlite file"), "application/octet-stream")}
    resp = client.post("/control/api/operations/database-upload", files=files)
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_INVALID_FILE_TYPE.value
