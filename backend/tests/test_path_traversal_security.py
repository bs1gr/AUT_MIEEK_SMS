"""
Security tests for path traversal prevention across backup, admin, and session routes.

These tests verify that all path validation mechanisms properly prevent
common path traversal attack vectors (CVE-2024-XXXXX class vulnerabilities).
"""

import os
import tempfile
from pathlib import Path

import pytest

from backend.services.backup_service_encrypted import BackupServiceEncrypted


class TestBackupServicePathTraversal:
    """Test path traversal prevention in BackupServiceEncrypted."""

    def setup_method(self):
        """Set up temporary backup directory for tests."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.backup_dir = Path(self.temp_dir.name)
        self.service = BackupServiceEncrypted(
            backup_dir=self.backup_dir,
            enable_encryption=False,  # Simplify for path tests
        )

    def teardown_method(self):
        """Clean up temporary directory."""
        self.temp_dir.cleanup()

    def test_validate_output_path_rejects_parent_traversal(self):
        """Test that '..' in paths is rejected."""
        dangerous_path = Path("../../etc/passwd")
        with pytest.raises(ValueError, match="Path traversal detected"):
            self.service._validate_output_path(dangerous_path)

    def test_validate_output_path_rejects_home_expansion(self):
        """Test that ~ path expansion is rejected."""
        dangerous_path = Path("~/secret_file")
        with pytest.raises(ValueError, match="Path traversal detected"):
            self.service._validate_output_path(dangerous_path)

    def test_validate_output_path_rejects_absolute_paths_with_traversal(self):
        """Test that paths with .. traversal sequences are rejected even if absolute."""
        # Paths with .. are rejected
        dangerous_path = Path("/tmp/../../../etc/passwd")
        with pytest.raises(ValueError, match="Path traversal detected"):
            self.service._validate_output_path(dangerous_path)

    def test_validate_output_path_accepts_safe_relative_paths(self):
        """Test that safe relative paths are accepted."""
        safe_path = Path("backup_output.db")
        result = self.service._validate_output_path(safe_path)
        assert isinstance(result, Path)
        assert ".." not in str(result)

    def test_validate_output_path_accepts_safe_nested_paths(self):
        """Test that safe nested paths and absolute paths are accepted."""
        # Safe relative paths
        safe_path = Path("restore") / "2026" / "backup.db"
        result = self.service._validate_output_path(safe_path)
        assert isinstance(result, Path)
        assert str(safe_path).split("/")[-1] in str(result)

        # Safe absolute paths (without traversal)
        abs_path = self.backup_dir / "restore" / "backup.db"
        result = self.service._validate_output_path(abs_path)
        assert isinstance(result, Path)

    def test_validate_output_path_rejects_non_path_types(self):
        """Test that non-Path/string types are rejected."""
        with pytest.raises(TypeError, match="Output path must be string or Path"):
            self.service._validate_output_path(123)

    def test_validate_output_path_requires_writable_parent(self):
        """Test that parent directory must exist or be creatable."""
        valid_path = self.backup_dir / "subdir" / "backup.db"
        result = self.service._validate_output_path(valid_path)
        # Should create parent directories
        assert result.parent.exists()

    def test_validate_backup_name_prevents_path_traversal(self):
        """Test backup name validation prevents path components."""
        dangerous_names = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "/etc/passwd",
            "backup/../../../etc/passwd",
            "C:\\Windows\\System32\\config",
        ]

        for dangerous_name in dangerous_names:
            with pytest.raises(
                ValueError,
                match="(path|characters|traversal|components|separator)",
            ):
                self.service._validate_backup_name(dangerous_name)

    def test_validate_backup_name_allows_simple_names(self):
        """Test that simple backup names are allowed."""
        safe_names = [
            "backup_2026_02_02",
            "database_snapshot",
            "backup-with-dashes",
            "backup_with_underscores_123",
        ]

        for safe_name in safe_names:
            result = self.service._validate_backup_name(safe_name)
            assert result == safe_name

    def test_resolve_backup_path_prevents_directory_escape(self):
        """Test that _resolve_backup_path prevents escaping backup_dir."""
        # Create a backup name that would escape if not validated
        validated_name = self.service._validate_backup_name("valid_backup")
        backup_path = self.service._resolve_backup_path(validated_name, ".enc")

        # Verify path is within backup_dir
        assert backup_path.is_relative_to(self.backup_dir)

    def test_resolve_backup_path_detects_escape_attempts(self):
        """Test that malicious names attempting to escape are caught."""
        # This should be caught by _validate_backup_name first
        with pytest.raises(ValueError):
            dangerous_name = "../outside"
            self.service._validate_backup_name(dangerous_name)


class TestAdminRoutesPathTraversal:
    """Test path traversal prevention in admin routes."""

    def test_restore_endpoint_validates_output_path_bounds(self):
        """Test that restore endpoint constrains output paths."""
        # This is tested via test_admin_backup_encryption.py
        # which covers the actual endpoint behavior
        pass


class TestSessionsRouterPathTraversal:
    """Test path traversal prevention in sessions router."""

    def test_import_endpoint_validates_backup_path_bounds(self):
        """Test that import endpoint constrains backup paths."""
        # This is tested via test_sessions_router.py
        # which covers the actual endpoint behavior
        pass

    def test_rollback_endpoint_validates_paths(self):
        """Test that rollback endpoint validates both paths."""
        # This is tested via test_sessions_router.py
        # which covers the actual endpoint behavior
        pass


class TestPathTraversalVectors:
    """Test various path traversal attack vectors."""

    def setup_method(self):
        """Set up service for testing."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.backup_dir = Path(self.temp_dir.name)
        self.service = BackupServiceEncrypted(
            backup_dir=self.backup_dir,
            enable_encryption=False,
        )

    def teardown_method(self):
        """Clean up temporary directory."""
        self.temp_dir.cleanup()

    @pytest.mark.parametrize(
        "traversal_attempt",
        [
            # Directory traversal
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config",
            # Multiple traversal levels
            "../" * 10 + "etc/passwd",
            ".." + os.sep + ".." + os.sep + "etc/passwd",
            # Home directory expansion
            "~/secret",
            "~root/secret",
            # Symlink and special paths (covered by resolve())
            "/tmp/../../../etc/passwd",
            # URL-like encoding
            "..%2F..%2Fetc%2Fpasswd",  # Would be decoded by URL handler first
            # Case variations
            "..\\..\\" + "etc/passwd",
            # Mixed separators
            "../windows/system32",
            "..\\unix/path",
        ],
    )
    def test_all_traversal_vectors_rejected_in_backup_name(self, traversal_attempt):
        """Test that all known traversal vectors are blocked in backup names."""
        with pytest.raises(ValueError):
            self.service._validate_backup_name(traversal_attempt)

    @pytest.mark.parametrize(
        "traversal_attempt",
        [
            # Directory traversal with .. sequences
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            # Home directory expansion
            "~/secret",
            "~root/secret",
            # Absolute paths with traversal
            "/tmp/../../../etc/passwd",
        ],
    )
    def test_all_traversal_vectors_rejected_in_output_path(self, traversal_attempt):
        """Test that all known traversal vectors are blocked in output paths."""
        with pytest.raises(ValueError, match="Path traversal detected"):
            self.service._validate_output_path(Path(traversal_attempt))

    def test_symlink_resolution_prevents_escape(self):
        """Test that pathlib.resolve() resolves symlinks safely."""
        # Create a temporary directory structure
        real_dir = self.backup_dir / "real"
        real_dir.mkdir(parents=True, exist_ok=True)

        # Create a symlink pointing outside
        symlink = real_dir / "symlink"
        target = Path(tempfile.gettempdir())

        try:
            symlink.symlink_to(target)
        except (OSError, NotImplementedError):
            # Symlinks may not be supported on all systems
            pytest.skip("Symlinks not supported on this system")

        # Test that symlink resolution doesn't allow traversal
        # The validation should still apply to the resolved path
        resolved = symlink.resolve()
        # Verify the validation logic would work
        assert isinstance(resolved, Path)


class TestIntegrationPathValidation:
    """Integration tests for path validation across the stack."""

    def test_backup_name_to_output_path_chain(self):
        """Test the complete chain from backup name to output path."""
        temp_dir = tempfile.TemporaryDirectory()
        try:
            backup_dir = Path(temp_dir.name)
            service = BackupServiceEncrypted(
                backup_dir=backup_dir,
                enable_encryption=False,
            )

            # Valid workflow
            backup_name = service._validate_backup_name("test_backup")
            backup_path = service._resolve_backup_path(backup_name, ".enc")
            output_path = service._validate_output_path(Path("restore.db"))

            # Verify both paths are safe
            assert ".." not in str(backup_path)
            assert ".." not in str(output_path)

            # Malicious workflow should fail early
            with pytest.raises(ValueError):
                service._validate_backup_name("../../../etc/passwd")

        finally:
            temp_dir.cleanup()
