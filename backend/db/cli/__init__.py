"""
Database CLI tools module - administrative utilities for database management.

Provides:
- admin: User administration (create_admin)
- schema: Schema management (verify_schema, inspect_schema, check_schema_drift)
- diagnostics: Database diagnostics (validate_first_run, check_secret)
"""

from backend.db.cli.admin import create_admin
from backend.db.cli.admin import main as admin_main
from backend.db.cli.diagnostics import check_secret, validate_first_run
from backend.db.cli.schema import check_schema_drift, inspect_schema, verify_schema

__all__ = [
    # Admin
    "create_admin",
    "admin_main",
    # Schema
    "verify_schema",
    "inspect_schema",
    "check_schema_drift",
    # Diagnostics
    "validate_first_run",
    "check_secret",
]
