"""Database Migration Runner

This module runs Alembic migrations programmatically and ensures they are
applied against the same `DATABASE_URL` that the application uses. Using the
Alembic command-line via subprocess may accidentally run against a different
environment; here we use the Alembic API and explicitly set the SQLAlchemy URL
from `backend.config.settings` so migrations target the expected database.
"""

from __future__ import annotations

from pathlib import Path
import sys
import logging

from alembic import command
from alembic.config import Config

from backend.config import settings

logger = logging.getLogger(__name__)


def _alembic_config(backend_dir: Path) -> Config:
    """Create an Alembic Config configured to use the project's alembic.ini and
    the application's DATABASE_URL.
    """
    cfg_path = backend_dir / "alembic.ini"
    cfg = Config(str(cfg_path))
    # Ensure Alembic uses the same DB URL as application settings
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    # Ensure Alembic uses the correct absolute script_location so the
    # migrations folder is resolved correctly regardless of the current
    # working directory (fixes Windows and CI behaviors).
    try:
        cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    except Exception:
        # Non-fatal; alembic will fall back to the value in alembic.ini
        pass
    return cfg


def run_migrations(verbose: bool = False) -> bool:
    """Run Alembic migrations (upgrade head) using the Alembic API.

    Returns True on success, False on failure.
    """
    try:
        backend_dir = Path(__file__).parent
        cfg = _alembic_config(backend_dir)

        if verbose:
            print("=" * 60)
            print("DATABASE MIGRATION CHECK")
            print("=" * 60)
            print(f"Backend directory: {backend_dir}")
            print(f"Using DATABASE_URL: {settings.DATABASE_URL}")

        # Ensure logs directory exists and add a file handler for migration logs.
        # Resolve repository root robustly (walk upwards for a .git or a project marker).
        try:
            def _find_repo_root(start: Path) -> Path:
                for p in (start, *start.parents):
                    if (p / ".git").exists() or (p / "backend").exists() and (p / "backend").is_dir():
                        return p
                # Fallback to two levels up (legacy layout) or cwd
                fallback = start.parents[2] if len(start.parents) >= 3 else Path.cwd()
                return fallback

            repo_root = _find_repo_root(Path(__file__).resolve().parent)
            logs_dir = repo_root / "logs"
            logs_dir.mkdir(parents=True, exist_ok=True)
            fh = logging.FileHandler(logs_dir / "migrations.log")
            fh.setLevel(logging.INFO)
            fmt = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
            fh.setFormatter(fmt)
            if not any(isinstance(h, logging.FileHandler) for h in logger.handlers):
                logger.addHandler(fh)
        except Exception:
            # Non-fatal: migration logging is best-effort
            pass

        # Run upgrade head
        command.upgrade(cfg, "head")

        if verbose:
            print("\nOK: Database migrations applied successfully")
            print("=" * 60)
        logger.info("Alembic migrations applied successfully")
        return True
    except Exception as e:
        logger.exception("Failed to apply Alembic migrations: %s", e)
        if verbose:
            print(f"ERROR: Migration error: {e}", file=sys.stderr)
        return False


def check_migration_status(verbose: bool = False) -> str:
    """Return the current Alembic revision (or empty string on error)."""
    try:
        backend_dir = Path(__file__).parent
        cfg = _alembic_config(backend_dir)
        # Alembic's `current` prints info; it does not return a value in some
        # Alembic versions, so treat it as informational. Return an empty
        # string when no programmatic value is available. For type-checkers
        # explicitly annotate the result as Any to avoid errors.
        from typing import Any, cast

        current = cast(Any, command.current(cfg, verbose=verbose))
        # If Alembic returned something usable, convert to string, otherwise
        # return the empty string to indicate unknown.
        return str(current) if current else ""
    except Exception as e:
        if verbose:
            print(f"Could not check migration status: {e}", file=sys.stderr)
        logger.debug("Could not check migration status: %s", e)
        return ""


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run database migrations")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--check", action="store_true", help="Check migration status only")
    args = parser.parse_args()

    if args.check:
        version = check_migration_status(verbose=True)
        sys.exit(0 if version else 1)
    else:
        success = run_migrations(verbose=args.verbose)
        sys.exit(0 if success else 1)
