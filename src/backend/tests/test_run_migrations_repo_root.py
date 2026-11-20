import secrets
from pathlib import Path


def test_run_migrations_writes_log(tmp_path, monkeypatch):
    """Run the migration runner with a temporary sqlite DB and assert that migrations.log is
    created in the folder the runner names, and that this folder is the repository's `logs/`.
    """
    # Ensure a secure SECRET_KEY for pydantic Settings validation
    monkeypatch.setenv("SECRET_KEY", secrets.token_urlsafe(32))

    # Use a temporary sqlite file for the test database
    # Use a local path inside the project to satisfy Settings validation
    local_tmp = Path("tmp_test_migrations")
    local_tmp.mkdir(exist_ok=True)
    db_file = (local_tmp / f"test_migrations_repo_root_{secrets.token_hex(8)}.db").resolve()
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file.as_posix()}")

    # Import the migration runner and run it
    import importlib

    rm = importlib.import_module("backend.run_migrations")

    # The repository root is the folder with the VERSION file: tests -> backend -> src -> root.
    # Until November 2026 this test took `parents[2]` for it, which is `src` since the code
    # moved under `src`, and so passed on the very bug it was written against: the runner
    # wrote src/logs/migrations.log, and the test looked for it there.
    repo_root = Path(__file__).resolve().parents[3]
    assert (repo_root / "VERSION").is_file()
    # The test run moves its logs elsewhere (SMS_LOG_DIR, conftest); this is about the default.
    monkeypatch.delenv("SMS_LOG_DIR", raising=False)
    assert rm.migrations_log_dir() == repo_root / "logs"

    # The run itself writes into a temporary folder. This test used to delete the tree's own
    # migrations.log before it ran, and then wrote a new one in its place.
    logs_dir = tmp_path / "logs"
    monkeypatch.setattr(rm, "migrations_log_dir", lambda: logs_dir)

    success = rm.run_migrations(verbose=True)

    assert success is True
    # Depending on logging configuration in the test runner the file may be zero-length
    # (stdout captured elsewhere) — existence is the signal that the runner used the folder.
    assert (logs_dir / "migrations.log").exists()
