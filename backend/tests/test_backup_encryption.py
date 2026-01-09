"""
Test suite for Backup Encryption (v1.15.0)

Tests AES-256 encryption, backup encryption/decryption, and backup management.
"""

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from backend.services.backup_service_encrypted import BackupServiceEncrypted
from backend.services.encryption_service import EncryptionService


@pytest.fixture
def encryption_service():
    """Create encryption service with temp key directory."""
    with TemporaryDirectory() as tmpdir:
        service = EncryptionService(key_dir=Path(tmpdir))
        yield service


@pytest.fixture
def backup_service():
    """Create backup service with temp directories."""
    with TemporaryDirectory() as tmpdir:
        service = BackupServiceEncrypted(backup_dir=Path(tmpdir))
        yield service


@pytest.fixture
def sample_data():
    """Generate sample data for testing."""
    return b"This is sample data for encryption testing. " * 100


@pytest.fixture
def sample_file(tmp_path, sample_data):
    """Create a sample file for testing."""
    file_path = tmp_path / "sample.txt"
    with open(file_path, "wb") as f:
        f.write(sample_data)
    return file_path


class TestEncryptionService:
    """Tests for EncryptionService."""

    def test_master_key_creation(self, encryption_service):
        """Test that master key is created on first use."""
        assert not encryption_service.master_key_path.exists()

        # Trigger key creation
        key = encryption_service._get_or_create_master_key()

        assert len(key) == EncryptionService.KEY_LENGTH
        assert encryption_service.master_key_path.exists()

    def test_master_key_reuse(self, encryption_service):
        """Test that same master key is reused."""
        key1 = encryption_service._get_or_create_master_key()
        key2 = encryption_service._get_or_create_master_key()

        assert key1 == key2

    def test_encrypt_decrypt_roundtrip(self, encryption_service, sample_data):
        """Test encryption and decryption roundtrip."""
        encrypted = encryption_service.encrypt(sample_data)
        decrypted = encryption_service.decrypt(encrypted)

        assert decrypted == sample_data

    def test_encrypt_produces_different_output(self, encryption_service, sample_data):
        """Test that encryption produces different output each time (random nonce)."""
        encrypted1 = encryption_service.encrypt(sample_data)
        encrypted2 = encryption_service.encrypt(sample_data)

        # Different nonces mean different ciphertexts
        assert encrypted1 != encrypted2

        # But both decrypt to same plaintext
        assert encryption_service.decrypt(encrypted1) == sample_data
        assert encryption_service.decrypt(encrypted2) == sample_data

    def test_encrypt_with_associated_data(self, encryption_service, sample_data):
        """Test encryption with authenticated associated data."""
        aad = b"metadata"

        encrypted = encryption_service.encrypt(sample_data, associated_data=aad)
        decrypted = encryption_service.decrypt(encrypted, associated_data=aad)

        assert decrypted == sample_data

    def test_decrypt_with_wrong_associated_data_fails(self, encryption_service, sample_data):
        """Test that decryption fails with wrong associated data."""
        aad1 = b"metadata1"
        aad2 = b"metadata2"

        encrypted = encryption_service.encrypt(sample_data, associated_data=aad1)

        # Should fail with wrong AAD
        with pytest.raises(Exception):  # cryptography.exceptions.InvalidTag
            encryption_service.decrypt(encrypted, associated_data=aad2)

    def test_encrypt_corrupted_data_fails(self, encryption_service, sample_data):
        """Test that decryption fails with corrupted data."""
        encrypted = encryption_service.encrypt(sample_data)

        # Corrupt the encrypted data (flip a bit in the middle)
        corrupted = bytearray(encrypted)
        corrupted[len(corrupted) // 2] ^= 0xFF

        with pytest.raises(Exception):  # cryptography.exceptions.InvalidTag
            encryption_service.decrypt(bytes(corrupted))

    def test_invalid_encrypted_data_length(self, encryption_service):
        """Test that invalid data length is rejected."""
        with pytest.raises(ValueError):
            encryption_service.decrypt(b"too_short")

    def test_encrypt_file_roundtrip(self, encryption_service, sample_file, tmp_path):
        """Test file encryption and decryption."""
        encrypted_path = tmp_path / "sample.enc"
        decrypted_path = tmp_path / "sample_decrypted.txt"

        # Encrypt file
        encryption_service.encrypt_file(
            input_path=sample_file,
            output_path=encrypted_path,
            metadata={"source": "test"},
        )

        assert encrypted_path.exists()

        # Decrypt file
        metadata = encryption_service.decrypt_file(
            input_path=encrypted_path,
            output_path=decrypted_path,
        )

        # Verify decrypted content matches original
        with open(sample_file, "rb") as f:
            original = f.read()
        with open(decrypted_path, "rb") as f:
            decrypted = f.read()

        assert original == decrypted
        assert metadata["source"] == "test"
        assert metadata["original_name"] == "sample.txt"

    def test_get_key_info(self, encryption_service):
        """Test key info retrieval."""
        info = encryption_service.get_key_info()

        assert info["key_length_bits"] == 256
        assert info["algorithm"] == "AES-256-GCM"
        assert "key_dir" in info
        assert info["salt_length_bytes"] == 16
        assert info["nonce_length_bytes"] == 12

    def test_rotate_master_key(self, encryption_service, sample_data):
        """Test master key rotation."""
        # Encrypt with original key
        encrypted1 = encryption_service.encrypt(sample_data)

        # Rotate key (returns new key but we don't need to use it)
        encryption_service.rotate_master_key()

        # Data encrypted with old key should not decrypt with new key
        with pytest.raises(Exception):
            encryption_service.decrypt(encrypted1)

        # But new key should work for new encryptions
        encrypted2 = encryption_service.encrypt(sample_data)
        decrypted2 = encryption_service.decrypt(encrypted2)

        assert decrypted2 == sample_data


class TestBackupServiceEncrypted:
    """Tests for BackupServiceEncrypted."""

    def test_create_encrypted_backup(self, backup_service, sample_file):
        """Test encrypted backup creation."""
        result = backup_service.create_encrypted_backup(
            source_path=sample_file,
            backup_name="test_backup",
            metadata={"version": "1.0"},
        )

        assert result["success"] is True
        assert result["backup_name"] == "test_backup"
        assert result["encryption"] == "AES-256-GCM"
        assert Path(result["backup_path"]).exists()
        assert Path(result["metadata_path"]).exists()

    def test_restore_encrypted_backup(self, backup_service, sample_file, tmp_path):
        """Test encrypted backup restoration."""
        # Create backup
        backup_service.create_encrypted_backup(
            source_path=sample_file,
            backup_name="test_backup",
        )

        # Restore backup
        restore_path = tmp_path / "restored.txt"
        restore_result = backup_service.restore_encrypted_backup(
            backup_name="test_backup",
            output_path=restore_path,
        )

        assert restore_result["success"] is True
        assert restore_path.exists()

        # Verify content matches
        with open(sample_file, "rb") as f:
            original = f.read()
        with open(restore_path, "rb") as f:
            restored = f.read()

        assert original == restored

    def test_list_encrypted_backups(self, backup_service, sample_file):
        """Test listing encrypted backups."""
        # Create multiple backups
        for i in range(3):
            backup_service.create_encrypted_backup(
                source_path=sample_file,
                backup_name=f"backup_{i}",
            )

        # List backups
        backups = backup_service.list_encrypted_backups()

        assert len(backups) == 3
        assert all(b["encryption"] == "AES-256-GCM" for b in backups)
        assert all("created_at" in b for b in backups)
        assert all("size_bytes" in b for b in backups)

    def test_delete_encrypted_backup(self, backup_service, sample_file):
        """Test encrypted backup deletion."""
        # Create backup
        backup_service.create_encrypted_backup(
            source_path=sample_file,
            backup_name="test_backup",
        )

        # Verify it exists
        backups = backup_service.list_encrypted_backups()
        assert len(backups) == 1

        # Delete backup
        result = backup_service.delete_encrypted_backup("test_backup")

        assert result["success"] is True

        # Verify it's gone
        backups = backup_service.list_encrypted_backups()
        assert len(backups) == 0

    def test_verify_backup_integrity(self, backup_service, sample_file):
        """Test backup integrity verification."""
        # Create backup
        backup_service.create_encrypted_backup(
            source_path=sample_file,
            backup_name="test_backup",
        )

        # Verify integrity
        result = backup_service.verify_backup_integrity("test_backup")

        assert result["valid"] is True
        assert "size_bytes" in result

    def test_verify_corrupted_backup_fails(self, backup_service, sample_file):
        """Test that integrity check fails for corrupted backup."""
        # Create backup
        backup_result = backup_service.create_encrypted_backup(
            source_path=sample_file,
            backup_name="test_backup",
        )

        # Corrupt the backup file
        backup_path = Path(backup_result["backup_path"])
        with open(backup_path, "r+b") as f:
            f.seek(50)
            f.write(b"corrupted data")

        # Verify should fail
        result = backup_service.verify_backup_integrity("test_backup")

        assert result["valid"] is False
        assert "error" in result

    def test_cleanup_old_backups(self, backup_service, sample_file):
        """Test cleanup of old backups."""
        # Create multiple backups
        for i in range(15):
            backup_service.create_encrypted_backup(
                source_path=sample_file,
                backup_name=f"backup_{i}",
            )

        # Cleanup, keep 10
        result = backup_service.cleanup_old_backups(keep_count=10)

        assert result["success"] is True
        assert result["backups_deleted"] == 5
        assert result["remaining_backups"] == 10

        # Verify count
        backups = backup_service.list_encrypted_backups()
        assert len(backups) == 10

    def test_backup_not_found(self, backup_service):
        """Test error handling for non-existent backup."""
        with pytest.raises(FileNotFoundError):
            backup_service.restore_encrypted_backup(
                backup_name="nonexistent",
                output_path=Path("/tmp/restore"),
            )

    def test_source_file_not_found(self, backup_service):
        """Test error handling for non-existent source file."""
        with pytest.raises(FileNotFoundError):
            backup_service.create_encrypted_backup(
                source_path=Path("/nonexistent/file.txt"),
            )
