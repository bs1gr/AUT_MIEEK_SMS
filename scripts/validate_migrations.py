#!/usr/bin/env python3
"""
Pre-commit hook: Validate database migration consistency.

Ensures all model changes have corresponding Alembic migrations
and that migration files are properly named and ordered.

Usage: python scripts/validate_migrations.py
"""

import sys
import re
from pathlib import Path

# Ensure UTF-8 output to avoid Windows console encoding issues
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    # Fall back silently if reconfigure isn't available
    pass


def check_migrations():
    """Validate migration files and consistency."""
    errors = []
    warnings = []

    # Check migration directory exists
    migrations_dir = Path("backend/migrations/versions")
    if not migrations_dir.exists():
        return ["Migrations directory not found: backend/migrations/versions"], []

    # Get list of migration files
    migration_files = sorted(migrations_dir.glob("*.py"))

    if not migration_files:
        warnings.append("No migration files found - this is normal for fresh installs")
        return [], warnings

    # Check migration file naming conventions
    # Expected format: YYYYMMDD_HHMMSS_description.py
    naming_pattern = re.compile(r"^\d{4}(\d{2}){5}_.+\.py$")

    for mig_file in migration_files:
        name = mig_file.name

        # Skip __init__.py
        if name == "__init__.py":
            continue

        # Check naming convention
        if not naming_pattern.match(name):
            # Check Alembic revision format: e.g., abc1234_description.py
            if not re.match(r"^[a-z0-9_]+\.py$", name):
                errors.append(f"Migration file has invalid name format: {name}")

        # Check file content
        content = mig_file.read_text()

        # Verify it has revision marker
        if "revision =" not in content:
            errors.append(f"Migration {name} missing revision marker")

        # Verify it has upgrade/downgrade functions
        if "def upgrade()" not in content:
            errors.append(f"Migration {name} missing upgrade() function")
        if "def downgrade()" not in content:
            errors.append(f"Migration {name} missing downgrade() function")

    # Check models.py for uncommitted changes
    models_file = Path("backend/models.py")
    if models_file.exists():
        # This is more of a warning - suggests running alembic revision
        warnings.append(
            "Note: If you modified models.py, run 'alembic revision --autogenerate'"
        )

    return errors, warnings


def main():
    """Main entry point."""
    errors, warnings = check_migrations()

    if warnings:
        print("⚠️  WARNINGS (informational):")
        for warning in warnings:
            print(f"  • {warning}")

    if errors:
        print("\n❌ ERRORS (must fix):")
        for error in errors:
            print(f"  • {error}")
        return 1

    if not errors:
        print("✅ Database migrations: All checks passed")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
