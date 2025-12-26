"""
DEPRECATED: Use backend.db.cli.diagnostics instead.

This module is kept for backward compatibility only. All functionality has been
moved to backend.db.cli.diagnostics.

Migration guide:
  OLD: from backend.tools import validate_first_run
  NEW: from backend.db.cli import validate_first_run
"""

import sys
import os
import sqlite3
from pathlib import Path

# Ensure repository root on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import from new location


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
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


if __name__ == "__main__":
    raise SystemExit(main())
