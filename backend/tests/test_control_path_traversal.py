from fastapi.testclient import TestClient

import backend.main as main

client = TestClient(main.app)


def test_save_backups_zip_to_path_traversal():
    # Attempt to traverse outside allowed export dir
    payload = {"destination": "../../../../etc/passwd"}
    resp = client.post("/operations/database-backups/archive/save-to-path", json=payload)
    assert resp.status_code in (400, 404)
    # Accept either error: 400 for invalid path, 404 for missing dir/file
    if resp.status_code == 400:
        assert "Invalid destination path" in resp.text


def test_save_selected_backups_zip_to_path_traversal():
    payload = {"destination": "../foo.zip", "filenames": ["fake.db"]}
    resp = client.post("/operations/database-backups/archive/selected/save-to-path", json=payload)
    assert resp.status_code in (400, 404)
    if resp.status_code == 400:
        assert "Invalid destination path" in resp.text


def test_save_database_backup_to_path_traversal():
    payload = {"destination": "../../../evil.db"}
    resp = client.post("/operations/database-backups/fake.db/save-to-path", json=payload)
    assert resp.status_code in (400, 404)
    if resp.status_code == 400:
        assert "Invalid destination path" in resp.text
