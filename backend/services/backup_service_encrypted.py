"""
Backup Service with Encryption (v1.15.0)

Provides backup creation, restoration, and encryption management.

Features:
- Automatic backup encryption using AES-256
- Optional encryption password support
- Backup integrity verification
- Backup metadata management
- Encrypted backup restoration
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from backend.services.encryption_service import EncryptionService


class BackupServiceEncrypted:
    """Backup service with encryption support."""

    def __init__(self, backup_dir: Optional[Path] = None, enable_encryption: bool = True):
        """
        Initialize backup service.

        Args:
            backup_dir: Directory to store backups
            enable_encryption: Enable encryption for backups
        """
        self.backup_dir = backup_dir or Path(__file__).parent.parent.parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.enable_encryption = enable_encryption
        self.encryption_service = EncryptionService()
        self.metadata_dir = self.backup_dir / ".metadata"
        self.metadata_dir.mkdir(parents=True, exist_ok=True)

    def create_encrypted_backup(
        self,
        source_path: Path,
        backup_name: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Create an encrypted backup of a file.

        Args:
            source_path: Path to file to backup
            backup_name: Optional custom backup name
            metadata: Optional metadata to include

        Returns:
            Dictionary with backup information
        """
        if not source_path.exists():
            raise FileNotFoundError(f"Source file not found: {source_path}")

        # Generate backup filename
        if backup_name is None:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}"

        # Create encrypted backup
        backup_path = self.backup_dir / f"{backup_name}.enc"

        # Prepare metadata
        if metadata is None:
            metadata = {}

        metadata.update(
            {
                "source_file": source_path.name,
                "backup_type": "encrypted_database",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "version": "1.15.0",
            }
        )

        # Encrypt and save
        self.encryption_service.encrypt_file(
            input_path=source_path,
            output_path=backup_path,
            metadata=metadata,
        )

        # Save metadata
        metadata_path = self.metadata_dir / f"{backup_name}.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        # Get file info
        backup_size = backup_path.stat().st_size

        return {
            "success": True,
            "backup_name": backup_name,
            "backup_path": str(backup_path),
            "metadata_path": str(metadata_path),
            "original_size": source_path.stat().st_size,
            "encrypted_size": backup_size,
            "compression_ratio": f"{(backup_size / source_path.stat().st_size * 100):.1f}%",
            "encryption": "AES-256-GCM",
            "created_at": metadata.get("created_at"),
        }

    def restore_encrypted_backup(
        self,
        backup_name: str,
        output_path: Path,
    ) -> Dict:
        """
        Restore a file from an encrypted backup.

        Args:
            backup_name: Name of backup to restore
            output_path: Path to write restored file

        Returns:
            Dictionary with restoration information
        """
        # Validate backup_name to prevent path traversal
        if ".." in backup_name or "/" in backup_name or "\\" in backup_name:
            raise ValueError(f"Invalid backup name: {backup_name}")

        # Additional safety: Ensure resolved path is within backup_dir
        backup_path = self.backup_dir / f"{backup_name}.enc"
        try:
            backup_path.resolve().relative_to(self.backup_dir.resolve())
        except ValueError:
            raise ValueError(f"Backup path outside allowed directory: {backup_name}")

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_path}")

        # Decrypt and restore
        metadata = self.encryption_service.decrypt_file(
            input_path=backup_path,
            output_path=output_path,
        )

        # Verify output_path exists before returning
        if not output_path.exists():
            raise ValueError(f"Restored file not found at {output_path}")
        
        return {
            "success": True,
            "backup_name": backup_name,
            "restored_to": str(output_path.resolve()),
            "restored_size": output_path.stat().st_size,
            "encryption": "AES-256-GCM",
            "metadata": metadata,
        }

    def list_encrypted_backups(self) -> List[Dict]:
        """
        List all encrypted backups.

        Returns:
            List of backup information dictionaries
        """
        backups = []

        for backup_path in sorted(self.backup_dir.glob("*.enc"), reverse=True):
            # Get backup size
            size_bytes = backup_path.stat().st_size
            created_at = datetime.fromtimestamp(backup_path.stat().st_mtime, tz=timezone.utc)

            # Try to read metadata
            backup_name = backup_path.stem
            metadata_path = self.metadata_dir / f"{backup_name}.json"
            metadata = {}

            if metadata_path.exists():
                try:
                    with open(metadata_path, "r") as f:
                        metadata = json.load(f)
                except (json.JSONDecodeError, IOError):
                    pass

            backups.append(
                {
                    "name": backup_name,
                    "filename": backup_path.name,
                    "path": str(backup_path),
                    "size_bytes": size_bytes,
                    "size_human": self._format_size(size_bytes),
                    "created_at": created_at.isoformat(),
                    "encryption": "AES-256-GCM",
                    "metadata": metadata,
                }
            )

        return backups

    def delete_encrypted_backup(self, backup_name: str) -> Dict:
        """
        Delete an encrypted backup.

        Args:
            backup_name: Name of backup to delete

        Returns:
            Dictionary with deletion information
        """
        backup_path = self.backup_dir / f"{backup_name}.enc"
        metadata_path = self.metadata_dir / f"{backup_name}.json"

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_path}")

        # Delete backup
        backup_path.unlink()

        # Delete metadata if exists
        if metadata_path.exists():
            metadata_path.unlink()

        return {
            "success": True,
            "backup_name": backup_name,
            "message": f"Deleted backup: {backup_name}",
        }

    def verify_backup_integrity(self, backup_name: str) -> Dict:
        """
        Verify integrity of an encrypted backup.

        Args:
            backup_name: Name of backup to verify

        Returns:
            Dictionary with verification results
        """
        backup_path = self.backup_dir / f"{backup_name}.enc"

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_path}")

        try:
            # Try to read the encrypted file header and verify structure
            with open(backup_path, "rb") as f:
                # Read encrypted package size
                size_bytes = f.read(4)
                if len(size_bytes) < 4:
                    raise ValueError("Invalid encrypted file format: missing size header")

                encrypted_size = int.from_bytes(size_bytes, byteorder="big")

                # Read metadata length and metadata
                metadata_len_bytes = f.read(2)
                if len(metadata_len_bytes) < 2:
                    raise ValueError("Invalid encrypted file format: missing metadata length")

                metadata_len = int.from_bytes(metadata_len_bytes, byteorder="big")
                metadata_bytes = f.read(metadata_len)

                if len(metadata_bytes) != metadata_len:
                    raise ValueError("Invalid encrypted file format: incomplete metadata")

                # Check if encrypted data is available and complete
                remaining = backup_path.stat().st_size - 6 - metadata_len
                if remaining < encrypted_size:
                    raise ValueError(f"Encrypted data incomplete: expected {encrypted_size}, got {remaining}")

                # Try to parse metadata to ensure it's valid JSON
                json.loads(metadata_bytes.decode())

            return {
                "backup_name": backup_name,
                "valid": True,
                "size_bytes": backup_path.stat().st_size,
                "message": "Backup integrity verified",
            }

        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as e:
            return {
                "backup_name": backup_name,
                "valid": False,
                "error": str(e),
                "message": f"Backup integrity check failed: {e}",
            }
        except Exception as e:
            return {
                "backup_name": backup_name,
                "valid": False,
                "error": str(e),
                "message": f"Backup integrity check failed: {e}",
            }

    def cleanup_old_backups(self, keep_count: int = 10) -> Dict:
        """
        Delete old backups, keeping only the most recent ones.

        Args:
            keep_count: Number of recent backups to keep

        Returns:
            Dictionary with cleanup information
        """
        backups = list(self.backup_dir.glob("*.enc"))
        backups.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        deleted = []
        for backup_path in backups[keep_count:]:
            backup_name = backup_path.stem
            try:
                self.delete_encrypted_backup(backup_name)
                deleted.append(backup_name)
            except Exception:
                pass

        return {
            "success": True,
            "backups_deleted": len(deleted),
            "deleted_backups": deleted,
            "remaining_backups": len(backups[:keep_count]),
        }

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Format bytes to human readable size."""
        size: float = float(size_bytes)
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
