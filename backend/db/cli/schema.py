"""
Database schema management utilities - verify, inspect, and maintain schema integrity.

Usage:
  python -m backend.db.cli.schema verify
  python -m backend.db.cli.schema inspect
  python -m backend.db.cli.schema check-drift
"""

import sys
from pathlib import Path

from sqlalchemy import inspect, text

# Ensure repository root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.db import engine, ensure_schema


def verify_schema() -> bool:
    """
    Verify database schema is valid and has required tables.

    Returns:
        True if schema is valid, False otherwise
    """
    try:
        ensure_schema(engine)
        print("✅ Schema verification passed")
        return True
    except Exception as e:
        print(f"❌ Schema verification failed: {e}")
        return False


def inspect_schema() -> None:
    """Inspect and display current database schema."""
    inspector = inspect(engine)

    print("\n📋 Database Schema Inspection")
    print("=" * 60)

    tables = inspector.get_table_names()
    print(f"\nTables ({len(tables)}):")
    for table in tables:
        columns = inspector.get_columns(table)
        print(f"\n  {table}:")
        for col in columns:
            nullable = "NULL" if col["nullable"] else "NOT NULL"
            print(f"    - {col['name']}: {col['type']} [{nullable}]")


def check_schema_drift() -> bool:
    """
    Check for schema drift (differences between code models and database).

    Returns:
        True if no drift detected, False otherwise
    """
    try:
        # Verify critical tables exist
        inspector = inspect(engine)
        required_tables = ["students", "courses", "grades", "attendance"]

        missing = [t for t in required_tables if t not in inspector.get_table_names()]
        if missing:
            print(f"❌ Missing required tables: {missing}")
            return False

        # Check critical columns
        with engine.connect() as conn:
            # Example: verify courses has absence_penalty
            res = conn.execute(text("PRAGMA table_info('courses')"))
            cols = [row[1] for row in res]

            if "absence_penalty" not in cols:
                print("❌ Schema drift: courses.absence_penalty missing")
                return False

        print("✅ No schema drift detected")
        return True
    except Exception as e:
        print(f"❌ Schema drift check failed: {e}")
        return False


def main():
    """CLI entry point for schema management."""
    import argparse

    parser = argparse.ArgumentParser(description="Database schema management")
    parser.add_argument(
        "command",
        choices=["verify", "inspect", "check-drift"],
        help="Schema management command",
    )
    args = parser.parse_args()

    if args.command == "verify":
        success = verify_schema()
    elif args.command == "inspect":
        inspect_schema()
        success = True
    elif args.command == "check-drift":
        success = check_schema_drift()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
