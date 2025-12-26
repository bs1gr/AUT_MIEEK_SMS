"""Backend scripts and utilities for admin, import, and migration operations."""

# Re-export from submodules for convenient access
from backend.scripts.admin import ensure_default_admin_account
from backend.scripts.import_ import check_and_import_courses, wait_for_server
from backend.scripts.migrate import check_migration_status, run_migrations

__all__ = [
    "ensure_default_admin_account",
    "check_and_import_courses",
    "wait_for_server",
    "run_migrations",
    "check_migration_status",
]
