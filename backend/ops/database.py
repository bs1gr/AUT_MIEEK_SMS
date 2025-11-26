"""
Database operations including migrations, backup, and restore.

This module provides:
- Database migration execution
- Backup creation (Docker volume or native file)
- Backup restoration
- Backup management (list, delete, cleanup)
"""

import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .base import (
    BackupInfo,
    Operation,
    OperationResult,
    OperationTimeouts,
    format_size,
    get_project_root,
    get_python_executable,
)

# ============================================================================
#  DATABASE OPERATIONS
# ============================================================================


class DatabaseOperations(Operation):
    """Database backup, restore, and management operations"""

    def __init__(self, root_dir: Optional[Path] = None):
        super().__init__(root_dir or get_project_root())
        self.backend_dir = self.root_dir / "backend"
        self.data_dir = self.root_dir / "data"
        self.backup_dir = self.root_dir / "backups"
        self.db_name = "student_management.db"

    def get_python_path(self) -> str:
        """Get path to Python executable (venv if exists)."""
        return get_python_executable(self.root_dir)

    def run_migrations(self) -> OperationResult:
        """
        Run database migrations using Alembic.

        Returns:
            OperationResult indicating success or failure
        """
        from .setup import MigrationRunner

        runner = MigrationRunner(self.root_dir)
        return runner.execute()

    def backup_database_native(self, version: str = "unknown") -> OperationResult:
        """
        Backup database from native file system.

        Args:
            version: Version tag for backup filename

        Returns:
            OperationResult with backup information
        """
        db_path = self.data_dir / self.db_name

        if not db_path.exists():
            return OperationResult.failure_result("Database file not found")

        try:
            # Ensure backup directory exists
            self.backup_dir.mkdir(parents=True, exist_ok=True)

            # Create backup filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"sms_backup_v{version}_{timestamp}.db"
            backup_path = self.backup_dir / backup_filename

            # Copy database file
            self.log_info(f"Creating backup: {backup_filename}")
            shutil.copy2(db_path, backup_path)

            # Get backup info
            size_bytes = backup_path.stat().st_size
            backup_info = BackupInfo(
                filename=backup_filename,
                path=backup_path,
                size_bytes=size_bytes,
                created_at=datetime.now(),
                version=version,
            )

            self.log_success(f"Backup created: {backup_filename} ({format_size(size_bytes)})")
            return OperationResult.success_result(
                "Backup created successfully", data={"backup": backup_info.__dict__, "path": str(backup_path)}
            )

        except Exception as e:
            return OperationResult.failure_result("Failed to create backup", e)

    def backup_database_docker(self, volume_name: str, version: str = "unknown") -> OperationResult:
        """
        Backup database from Docker volume.

        Args:
            volume_name: Name of Docker volume containing database
            version: Version tag for backup filename

        Returns:
            OperationResult with backup information
        """
        try:
            # Ensure backup directory exists
            self.backup_dir.mkdir(parents=True, exist_ok=True)

            # Create backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"sms_backup_v{version}_{timestamp}.db"
            backup_path = self.backup_dir / backup_filename

            # Windows: Docker volume copy using docker run with alpine
            # Convert Windows path to Unix-style for Docker
            backup_dir_unix = str(self.backup_dir).replace("\\", "/")
            if backup_dir_unix[1] == ":":
                # Convert C:\path to /c/path
                backup_dir_unix = f"/{backup_dir_unix[0].lower()}{backup_dir_unix[2:]}"

            self.log_info(f"Creating Docker backup: {backup_filename}")

            # Copy file from volume to host using docker run
            result = subprocess.run(
                [
                    "docker",
                    "run",
                    "--rm",
                    "-v",
                    f"{volume_name}:/data:ro",
                    "-v",
                    f"{backup_dir_unix}:/backup",
                    "alpine",
                    "sh",
                    "-c",
                    f"cp /data/{self.db_name} /backup/{backup_filename}",
                ],
                capture_output=True,
                text=True,
                timeout=OperationTimeouts.DOCKER_VOLUME_OP,
            )

            if result.returncode != 0:
                return OperationResult.failure_result(
                    f"Docker backup failed (exit code {result.returncode})", data={"stderr": result.stderr}
                )

            # Verify backup was created
            if not backup_path.exists():
                return OperationResult.failure_result("Backup file not created")

            # Get backup info
            size_bytes = backup_path.stat().st_size
            backup_info = BackupInfo(
                filename=backup_filename,
                path=backup_path,
                size_bytes=size_bytes,
                created_at=datetime.now(),
                version=version,
            )

            self.log_success(f"Docker backup created: {backup_filename} ({format_size(size_bytes)})")
            return OperationResult.success_result(
                "Docker backup created successfully", data={"backup": backup_info.__dict__, "path": str(backup_path)}
            )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Docker backup timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to create Docker backup", e)

    def restore_database_native(self, backup_path: Path) -> OperationResult:
        """
        Restore database to native file system.

        Args:
            backup_path: Path to backup file

        Returns:
            OperationResult indicating success or failure
        """
        if not backup_path.exists():
            return OperationResult.failure_result(f"Backup file not found: {backup_path}")

        db_path = self.data_dir / self.db_name

        try:
            # Ensure data directory exists
            self.data_dir.mkdir(parents=True, exist_ok=True)

            # Copy backup to database location
            self.log_info(f"Restoring from: {backup_path.name}")
            shutil.copy2(backup_path, db_path)

            self.log_success("Database restored successfully")
            return OperationResult.success_result(
                "Database restored", data={"backup": str(backup_path), "target": str(db_path)}
            )

        except Exception as e:
            return OperationResult.failure_result("Failed to restore database", e)

    def restore_database_docker(self, backup_path: Path, volume_name: str) -> OperationResult:
        """
        Restore database to Docker volume.

        Args:
            backup_path: Path to backup file
            volume_name: Name of Docker volume

        Returns:
            OperationResult indicating success or failure
        """
        if not backup_path.exists():
            return OperationResult.failure_result(f"Backup file not found: {backup_path}")

        try:
            # Convert paths for Docker
            backup_dir_unix = str(backup_path.parent).replace("\\", "/")
            if backup_dir_unix[1] == ":":
                backup_dir_unix = f"/{backup_dir_unix[0].lower()}{backup_dir_unix[2:]}"

            self.log_info(f"Restoring to Docker volume: {volume_name}")

            # Copy file from host to volume
            result = subprocess.run(
                [
                    "docker",
                    "run",
                    "--rm",
                    "-v",
                    f"{volume_name}:/data",
                    "-v",
                    f"{backup_dir_unix}:/backup:ro",
                    "alpine",
                    "sh",
                    "-c",
                    f"cp /backup/{backup_path.name} /data/{self.db_name}",
                ],
                capture_output=True,
                text=True,
                timeout=OperationTimeouts.DOCKER_VOLUME_OP,
            )

            if result.returncode != 0:
                return OperationResult.failure_result(
                    f"Docker restore failed (exit code {result.returncode})", data={"stderr": result.stderr}
                )

            self.log_success("Database restored to Docker volume")
            return OperationResult.success_result(
                "Database restored to Docker volume", data={"backup": str(backup_path), "volume": volume_name}
            )

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Docker restore timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to restore to Docker volume", e)

    def list_backups(self, limit: Optional[int] = None, offset: int = 0) -> List[BackupInfo]:
        """
        List all available backups with optional pagination.

        Args:
            limit: Maximum number of backups to return (None = all)
            offset: Number of backups to skip (for pagination)

        Returns:
            List of BackupInfo objects, sorted by creation time (newest first)

        Note:
            Pagination helps prevent memory issues when many backups exist.
            Use limit=50 for typical CLI display, limit=10 for API responses.
        """
        # Validate parameters
        if offset < 0:
            offset = 0
        if limit is not None and limit < 1:
            limit = 1

        if not self.backup_dir.exists():
            return []

        backups = []
        for backup_file in self.backup_dir.glob("*.db"):
            try:
                # Parse filename to extract version
                # Format: sms_backup_v{version}_{timestamp}.db
                parts = backup_file.stem.split("_")
                version = "unknown"
                for i, part in enumerate(parts):
                    if part.startswith("v") and i < len(parts) - 1:
                        version = part[1:]  # Remove 'v' prefix
                        break

                backups.append(
                    BackupInfo(
                        filename=backup_file.name,
                        path=backup_file,
                        size_bytes=backup_file.stat().st_size,
                        created_at=datetime.fromtimestamp(backup_file.stat().st_mtime),
                        version=version,
                    )
                )
            except Exception as e:
                self.log_warning(f"Could not parse backup: {backup_file.name}: {e}")

        # Sort by creation time, newest first
        backups.sort(key=lambda b: b.created_at, reverse=True)

        # Apply pagination
        if limit is not None:
            return backups[offset : offset + limit]
        return backups[offset:]

    def delete_backup(self, backup_path: Path) -> OperationResult:
        """
        Delete a backup file with comprehensive validation.

        Args:
            backup_path: Path to backup file

        Returns:
            OperationResult indicating success or failure
        """
        # Validate input type
        if not isinstance(backup_path, Path):
            return OperationResult.failure_result(
                f"Invalid backup_path type: expected Path, got {type(backup_path).__name__}"
            )

        # Check if file exists
        if not backup_path.exists():
            return OperationResult.failure_result(f"Backup not found: {backup_path}")

        # Security check: ensure backup is within backup directory
        try:
            backup_path_resolved = backup_path.resolve()
            backup_dir_resolved = self.backup_dir.resolve()
            backup_path_resolved.relative_to(backup_dir_resolved)
        except ValueError:
            return OperationResult.failure_result(
                f"Security error: Backup must be within backup directory\n"
                f"Backup path: {backup_path}\n"
                f"Backup dir: {self.backup_dir}"
            )

        # Verify it's a file (not a directory)
        if not backup_path.is_file():
            return OperationResult.failure_result(f"Not a file: {backup_path} (cannot delete directories)")

        # Verify it's a .db file
        if backup_path.suffix != ".db":
            return OperationResult.failure_result(f"Invalid backup file: {backup_path.name} (must be .db file)")

        try:
            backup_path.unlink()
            self.log_success(f"Deleted backup: {backup_path.name}")
            return OperationResult.success_result(f"Backup deleted: {backup_path.name}")
        except PermissionError as e:
            return OperationResult.failure_result(f"Permission denied: Cannot delete {backup_path.name}", e)
        except Exception as e:
            return OperationResult.failure_result("Failed to delete backup", e)

    def clean_old_backups(self, keep_count: int = 10) -> OperationResult:
        """
        Delete old backups, keeping only the most recent ones.

        Args:
            keep_count: Number of recent backups to keep (must be >= 1)

        Returns:
            OperationResult with cleanup information
        """
        # Validate keep_count
        if not isinstance(keep_count, int):
            return OperationResult.failure_result(
                f"Invalid keep_count type: expected int, got {type(keep_count).__name__}"
            )

        if keep_count < 1:
            return OperationResult.failure_result(f"keep_count must be at least 1 (got: {keep_count})")

        backups = self.list_backups()

        if len(backups) <= keep_count:
            return OperationResult.success_result(f"Only {len(backups)} backup(s) exist - nothing to clean")

        to_delete = backups[keep_count:]
        deleted_count = 0
        failed_count = 0

        for backup in to_delete:
            result = self.delete_backup(backup.path)
            if result.success:
                deleted_count += 1
            else:
                failed_count += 1

        if failed_count > 0:
            return OperationResult.warning_result(f"Deleted {deleted_count} backup(s), {failed_count} failed")
        else:
            return OperationResult.success_result(
                f"Deleted {deleted_count} old backup(s), kept {keep_count} most recent"
            )

    def get_database_size(self) -> Optional[int]:
        """
        Get size of database in bytes.

        Returns:
            Size in bytes, or None if database doesn't exist
        """
        db_path = self.data_dir / self.db_name
        if db_path.exists():
            return db_path.stat().st_size
        return None

    def check_schema_version(self) -> OperationResult:
        """
        Check current database schema version using Alembic.

        Returns:
            OperationResult with version information
        """
        try:
            python_path = self.get_python_path()

            result = subprocess.run(
                [python_path, "-m", "alembic", "current"],
                cwd=str(self.backend_dir),
                capture_output=True,
                text=True,
                timeout=OperationTimeouts.QUICK_COMMAND,
            )

            if result.returncode == 0:
                current_version = result.stdout.strip()
                return OperationResult.success_result(
                    f"Schema version: {current_version}", data={"version": current_version, "output": result.stdout}
                )
            else:
                return OperationResult.failure_result("Failed to get schema version", data={"stderr": result.stderr})

        except subprocess.TimeoutExpired:
            return OperationResult.failure_result("Schema version check timed out")
        except Exception as e:
            return OperationResult.failure_result("Failed to check schema version", e)

    def initialize_database(self) -> OperationResult:
        """
        Initialize empty database schema.

        Returns:
            OperationResult indicating success or failure
        """
        try:
            # First run migrations to create schema
            migration_result = self.run_migrations()

            if not migration_result.success:
                return migration_result

            self.log_success("Database initialized")
            return OperationResult.success_result("Database initialized successfully")

        except Exception as e:
            return OperationResult.failure_result("Failed to initialize database", e)

    def execute(self, operation: str = "list_backups", **kwargs) -> OperationResult:
        """
        Execute database operation.

        Args:
            operation: Operation to perform
            **kwargs: Operation-specific arguments

        Returns:
            OperationResult
        """
        if operation == "list_backups":
            backups = self.list_backups()
            return OperationResult.success_result(
                f"Found {len(backups)} backup(s)", data={"backups": [b.__dict__ for b in backups]}
            )
        elif operation == "backup_native":
            return self.backup_database_native(**kwargs)
        elif operation == "backup_docker":
            return self.backup_database_docker(**kwargs)
        elif operation == "restore_native":
            return self.restore_database_native(**kwargs)
        elif operation == "restore_docker":
            return self.restore_database_docker(**kwargs)
        elif operation == "clean_old":
            return self.clean_old_backups(**kwargs)
        elif operation == "schema_version":
            return self.check_schema_version()
        elif operation == "initialize":
            return self.initialize_database()
        else:
            return OperationResult.failure_result(f"Unknown operation: {operation}")
