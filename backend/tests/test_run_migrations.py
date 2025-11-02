import importlib
import os
from pathlib import Path

import pytest


def test_run_migrations_creates_tables(tmp_path, monkeypatch):
    # Point DATABASE_URL to a temporary sqlite file inside the repository
    # (keeps the path within project root so the Settings validator accepts it)
    project_root = Path(__file__).resolve().parents[2]
    tmp_dir = project_root / "tmp_test_migrations"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    dbfile = tmp_dir / "test_migrations.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{dbfile}")

    # Clear cached settings so backend.config will pick up env change
    import backend.config as config_mod

    # Force reload of backend.config so the module-level `settings` is
    # re-created with the test's DATABASE_URL value.
    importlib.reload(config_mod)

    # Import run_migrations after env is set so it uses the new DATABASE_URL
    import backend.run_migrations as rm

    # Run migrations (should return True)
    # Run with verbose=True so test output shows Alembic logs when troubleshooting
    ok = rm.run_migrations(verbose=True)
    assert ok is True

    # Verify the database file was created and has at least the alembic_version table
    assert dbfile.exists()

    # Optionally, check alembic_version table exists by running sqlite
    import sqlite3

    con = sqlite3.connect(str(dbfile))
    cur = con.cursor()
    tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    assert "alembic_version" in tables or "courses" in tables
