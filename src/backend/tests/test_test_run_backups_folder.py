"""A test run has a backups folder of its own (conftest.py sets BACKUPS_DIR before any import).

Before that the settings pointed at the installation's real folder, `<project>/backups`: the
tests that go through the backup endpoints wrote their files next to the developer's real
backups (and removed them again only when they got that far), and the tests that list backups
listed the real ones.
"""

import io
from pathlib import Path

from backend import config as backend_config
from backend.tests import conftest as test_conftest

REAL_BACKUPS_DIR = Path(backend_config._DEFAULT_BACKUPS_DIR).resolve()
PROJECT_ROOT = Path(backend_config._PROJECT_ROOT).resolve()


def _own_folder() -> Path:
    return Path(test_conftest.TEST_BACKUPS_DIR)


def test_the_settings_point_at_the_test_runs_own_folder():
    configured = Path(backend_config.settings.BACKUPS_DIR).resolve()

    assert configured == _own_folder().resolve()
    assert configured != REAL_BACKUPS_DIR
    assert not configured.is_relative_to(PROJECT_ROOT)
    assert _own_folder().is_dir()


def test_the_modules_that_read_the_folder_when_imported_have_it_too():
    from backend.routers import routers_adminops
    from backend.services import database_manager, semester_export_service

    own = _own_folder().resolve()

    assert Path(routers_adminops.BACKUPS_DIR).resolve() == own
    assert semester_export_service.SEMESTER_ARCHIVE_DIR.resolve() == own / "semester_archives"
    assert semester_export_service._STAGING_DIR.resolve().is_relative_to(own)
    # Resolved at first use and kept; a test may have pointed it at its own tmp_path meanwhile.
    assert not database_manager._get_backup_dir().resolve().is_relative_to(PROJECT_ROOT)


def test_a_backup_file_written_through_the_api_lands_in_the_own_folder(client):
    content = b"SQLite format 3\x00" + b"\x00" * 8 + b"own-folder"
    files = {"file": ("own_folder_check.db", io.BytesIO(content), "application/octet-stream")}

    resp = client.post("/control/api/operations/database-upload", files=files)

    assert resp.status_code == 200, resp.text
    filename = resp.json()["details"]["filename"]
    written = _own_folder() / "database" / filename
    try:
        assert written.read_bytes() == content
        assert not (REAL_BACKUPS_DIR / "database" / filename).exists()

        listed = client.get("/control/api/operations/database-backups").json()["backups"]
        assert filename in [item["filename"] for item in listed]
    finally:
        written.unlink(missing_ok=True)
