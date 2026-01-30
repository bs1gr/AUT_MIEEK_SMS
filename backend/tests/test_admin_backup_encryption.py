"""
Tests for encrypted backup endpoints in control operations.

These tests verify the control API endpoint integration with the encryption service.
The actual encryption logic is thoroughly tested in test_backup_encryption.py (20 tests).
Since tests use in-memory databases (`:memory:`), we use temporary file-based SQLite
databases for integration testing.
"""

from unittest.mock import patch


def test_create_encrypted_backup_default(client, admin_token, tmp_path):
    """Test encrypted backup endpoint with default encryption=True."""
    from sqlalchemy import create_engine

    from backend.models import Base

    # Create a temporary SQLite file
    temp_db = tmp_path / "test.db"
    temp_db_url = f"sqlite:///{temp_db}"

    # Create tables in temp database
    engine = create_engine(temp_db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Patch DATABASE_URL for this test
    with patch("backend.routers.control.operations.get_settings") as mock_settings:
        mock_settings.return_value.DATABASE_URL = temp_db_url

        # Create encrypted backup (default encrypt=True)
        response = client.post(
            "/control/api/operations/database-backup", headers={"Authorization": f"Bearer {admin_token}"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Encrypted" in data["message"]
    assert data["details"]["encryption"] == "AES-256-GCM"
    assert data["details"]["original_size"] > 0
    assert data["details"]["encrypted_size"] > 0


def test_create_unencrypted_backup(client, admin_token, tmp_path):
    """Test creating an unencrypted backup (legacy mode).

    This test uses a temporary file-based database since legacy backups
    use shutil.copy2 which requires a physical file.
    """
    from sqlalchemy import create_engine

    from backend.models import Base

    # Create a temporary SQLite file
    temp_db = tmp_path / "test.db"
    temp_db_url = f"sqlite:///{temp_db}"

    # Create tables in temp database
    engine = create_engine(temp_db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Patch DATABASE_URL for this test
    with patch("backend.routers.control.operations.get_settings") as mock_settings:
        mock_settings.return_value.DATABASE_URL = temp_db_url

        # Create unencrypted backup (encrypt=False)
        response = client.post(
            "/control/api/operations/database-backup",
            params={"encrypt": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["details"]["encryption"] is None  # encryption: None for unencrypted backups


def test_backup_with_explicit_encryption_true(client, admin_token, tmp_path):
    """Test explicit encryption=True parameter."""
    from sqlalchemy import create_engine

    from backend.models import Base

    # Create a temporary SQLite file
    temp_db = tmp_path / "test3.db"
    temp_db_url = f"sqlite:///{temp_db}"

    # Create tables in temp database
    engine = create_engine(temp_db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Patch DATABASE_URL for this test
    with patch("backend.routers.control.operations.get_settings") as mock_settings:
        mock_settings.return_value.DATABASE_URL = temp_db_url

        response = client.post(
            "/control/api/operations/database-backup",
            params={"encrypt": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["details"]["encryption"] == "AES-256-GCM"


def test_backup_encryption_details(client, admin_token, tmp_path):
    """Test that encrypted backups have proper encryption details."""
    from sqlalchemy import create_engine

    from backend.models import Base

    # Create a temporary SQLite file
    temp_db = tmp_path / "test4.db"
    temp_db_url = f"sqlite:///{temp_db}"

    # Create tables in temp database
    engine = create_engine(temp_db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Patch DATABASE_URL for this test
    with patch("backend.routers.control.operations.get_settings") as mock_settings:
        mock_settings.return_value.DATABASE_URL = temp_db_url

        response = client.post(
            "/control/api/operations/database-backup",
            params={"encrypt": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "original_size" in data["details"]
    assert "encrypted_size" in data["details"]
    assert "compression_ratio" in data["details"]
    ratio = float(data["details"]["compression_ratio"].rstrip("%"))
    assert (
        0 < ratio <= 150
    )  # Encrypted files are often larger than originals (overhead from encryption headers/padding)


def test_unencrypted_backup_no_encryption_details(client, admin_token, tmp_path):
    """Test that unencrypted backups have encryption: None."""
    from sqlalchemy import create_engine

    from backend.models import Base

    # Create a temporary SQLite file
    temp_db = tmp_path / "test2.db"
    temp_db_url = f"sqlite:///{temp_db}"

    # Create tables in temp database
    engine = create_engine(temp_db_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    # Patch DATABASE_URL for this test
    with patch("backend.routers.control.operations.get_settings") as mock_settings:
        mock_settings.return_value.DATABASE_URL = temp_db_url

        response = client.post(
            "/control/api/operations/database-backup",
            params={"encrypt": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    # Unencrypted backups should have encryption: None
    assert data["details"]["encryption"] is None
    assert "encrypted_size" not in data["details"] or data["details"]["encrypted_size"] is None
    assert "compression_ratio" not in data["details"] or data["details"]["compression_ratio"] is None


def test_backup_requires_authentication(client):
    """Test backup endpoint requires authentication."""
    response = client.post("/control/api/operations/database-backup")

    # 400 Bad Request (missing body), 401 Unauthorized, or 404 if control API is disabled
    assert response.status_code in (400, 401, 404)
