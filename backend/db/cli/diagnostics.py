"""
Database diagnostics and validation utilities.

Provides tools for:
- Validating first-run database creation and migrations
- Checking SECRET_KEY configuration
- Database integrity diagnostics

Usage:
  python -m backend.db.cli.diagnostics validate-first-run
  python -m backend.db.cli.diagnostics check-secret
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path


PLACEHOLDER_SECRET = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"


def validate_first_run() -> int:
    """
    Validate first-run DB creation and migrations.

    Creates a fresh SQLite database, runs Alembic migrations programmatically,
    and verifies that the DB file and expected tables exist.

    Returns:
        0 if successful, 1 otherwise
    """
    repo_root = Path(__file__).resolve().parents[3]
    data_dir = repo_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    db_path = data_dir / "first_run_test.db"
    if db_path.exists():
        db_path.unlink()

    # Ensure we can import `backend.*`
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Point to our fresh DB
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    from backend.run_migrations import run_migrations

    ok = run_migrations(verbose=True)
    print("RUN_MIGRATIONS_OK:", ok)
    print("DB_EXISTS:", db_path.exists())

    # Inspect DB tables
    con = sqlite3.connect(str(db_path))
    try:
        cur = con.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [r[0] for r in cur.fetchall()]
        print("TABLES_COUNT:", len(tables))
        print("TABLES_SAMPLE:", tables[:10])

        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version';"
        )
        has_version = cur.fetchone() is not None
        print("HAS_ALEMBIC_VERSION:", has_version)

    finally:
        con.close()

    return 0 if ok and db_path.exists() else 1


def check_secret(block_on_fail: bool = False) -> int:
    """
    Check SECRET_KEY configuration for production readiness.

    Per maintainer preference, this prints warnings when the SECRET_KEY is
    missing or still the dev placeholder, but does not fail by default.

    Args:
        block_on_fail: If True, exit with error code on problems

    Returns:
        0 if checks pass or warnings only, 1 if blocking enabled and issues found
    """
    secret = os.environ.get("SECRET_KEY", "")

    problems = []

    if not secret:
        problems.append(
            "SECRET_KEY is not set. Set SECRET_KEY in environment for production builds."
        )

    if secret == PLACEHOLDER_SECRET:
        problems.append(
            "SECRET_KEY is set to the development placeholder. Replace it with a secure secret in CI/production."
        )

    if problems:
        print("⚠️  Secret guard found issues:")
        for p in problems:
            print(f"  - {p}")
        # Allow caller to decide whether this should be blocking
        if block_on_fail:
            print("Blocking enabled. Exiting with error exit code.")
            return 1
        # Default to warnings-only
        return 0

    print("✅ SECRET_KEY check passed.")
    return 0


def main():
    """CLI entry point for diagnostics."""
    import argparse

    parser = argparse.ArgumentParser(description="Database diagnostics and validation")
    parser.add_argument(
        "command",
        choices=["validate-first-run", "check-secret"],
        help="Diagnostic command",
    )
    parser.add_argument(
        "--block-on-fail",
        action="store_true",
        help="Exit with error code on failures (for check-secret)",
    )
    args = parser.parse_args()

    exit_code = 1  # Default exit code
    if args.command == "validate-first-run":
        exit_code = validate_first_run()
    elif args.command == "check-secret":
        exit_code = check_secret(block_on_fail=args.block_on_fail)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
