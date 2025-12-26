"""
DEPRECATED: backend.tools module is being consolidated into backend.db.cli.

This package is kept for backward compatibility only. All functionality has been
moved to backend.db.cli submodules (admin, schema, diagnostics).

MIGRATION GUIDE:
    from backend.tools import create_admin
    ↓
    from backend.db.cli import create_admin

    from backend.tools import verify_schema, check_schema_drift
    ↓
    from backend.db.cli import verify_schema, check_schema_drift

    from backend.tools import validate_first_run, check_secret
    ↓
    from backend.db.cli import validate_first_run, check_secret

All individual modules in this package will show deprecation warnings when imported.
Please update your imports to use backend.db.cli instead.
"""

# Re-export for backward compatibility (with deprecation warnings)
from backend.db.cli import (
    check_schema_drift,
    check_secret,
    create_admin,
    validate_first_run,
    verify_schema,
)

__all__ = [
    "create_admin",
    "verify_schema",
    "check_schema_drift",
    "validate_first_run",
    "check_secret",
]
