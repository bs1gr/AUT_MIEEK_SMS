import secrets
from pathlib import Path
import os


def test_run_migrations_writes_log(tmp_path, monkeypatch):
    """Run the migration runner with a temporary sqlite DB and assert the
    repository `logs/migrations.log` file is created and non-empty.
    """
    # Ensure a secure SECRET_KEY for pydantic Settings validation
    monkeypatch.setenv("SECRET_KEY", secrets.token_urlsafe(32))

    # Use a temporary sqlite file for the test database
    db_file = tmp_path / "test_migrations.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file.as_posix()}")

    # Import the migration runner and run it
    import importlib

    rm = importlib.import_module("backend.run_migrations")

    # Ensure logs file is removed before test
    repo_root = Path(__file__).resolve().parents[2]
    logs_file = repo_root / "logs" / "migrations.log"
    try:
        if logs_file.exists():
            logs_file.unlink()
    except Exception:
        pass

    success = rm.run_migrations(verbose=True)

    assert success is True
    assert logs_file.exists()
    assert logs_file.stat().st_size > 0
