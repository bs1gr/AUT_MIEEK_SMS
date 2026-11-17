"""Database Migration Runner.

This module runs Alembic migrations programmatically and ensures they are
applied against the same `DATABASE_URL` that the application uses.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from alembic import command
from alembic.config import Config

from backend.config import Settings

logger = logging.getLogger(__name__)
try:
    settings: Any = Settings()
except Exception:
    from types import SimpleNamespace

    env_db = os.environ.get("DATABASE_URL", "")
    settings = SimpleNamespace(DATABASE_URL=env_db)


def _alembic_config(backend_dir: Path) -> Config:
    """Create an Alembic Config configured to use the project's alembic.ini and
    the application's DATABASE_URL.
    """

    def _escape_for_configparser(url: str) -> str:
        # Alembic Config uses ConfigParser interpolation; '%' must be escaped.
        # This preserves URLs containing percent-encoded values (e.g. %21).
        return url.replace("%", "%%")

    cfg_path = backend_dir / "alembic.ini"
    cfg = Config(str(cfg_path))
    try:
        current_settings = Settings()
        cfg.set_main_option("sqlalchemy.url", _escape_for_configparser(current_settings.DATABASE_URL))
    except Exception:
        env_db = os.environ.get("DATABASE_URL")
        if env_db:
            cfg.set_main_option("sqlalchemy.url", _escape_for_configparser(env_db))
    try:
        cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    except Exception:
        pass
    return cfg


def project_root(start: Path) -> Path:
    """The folder that holds `logs/`, found by going up from `start`.

    It is the first folder with a `VERSION` file in it: the root of a checkout, and `/app` in
    the Docker image. Until November 2026 it was the first folder with a `backend` folder in
    it, which in a checkout is `src` (the code moved under `src` in June 2026), so
    migrations.log was written to `src/logs/` while every other log is in `logs/`. That rule
    is kept for a layout that has neither the file nor a `.git`.
    """
    candidates = (start, *start.parents)
    for marker in ("VERSION", ".git"):
        for folder in candidates:
            if (folder / marker).exists():
                return folder
    for folder in candidates:
        if (folder / "backend").is_dir():
            return folder
    return start.parents[2] if len(start.parents) >= 3 else Path.cwd()


def migrations_log_dir() -> Path:
    """Where migrations.log is written: the project's `logs/`; for the packaged SMS Lite,
    the user's profile (the program folder may be read-only)."""
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple' / 'logs'
    backend_dir = Path(__file__).resolve().parent.parent.parent
    return project_root(backend_dir) / "logs"


def run_migrations(verbose: bool = False) -> bool:
    """Run Alembic migrations (upgrade head) using the Alembic API.

    Returns True on success, False on failure.
    """
    print("[run_migrations] ENTER", flush=True)
    logger.info("[run_migrations] ENTER")
    # logs/migrations.log is attached to the root logger for the length of this run only (see
    # the finally below): left there, it would receive every later log record of the process.
    migrations_handler: logging.Handler | None = None
    root_level_before: int | None = None
    try:
        backend_dir = Path(__file__).parent.parent.parent
        cfg = _alembic_config(backend_dir)
        if verbose:
            print("=" * 60, flush=True)
            print("DATABASE MIGRATION CHECK", flush=True)
            print("=" * 60, flush=True)
            print(f"Backend directory: {backend_dir}", flush=True)
            try:
                url = cfg.get_main_option("sqlalchemy.url")
            except Exception:
                url = None
            print(f"Using DATABASE_URL: {url}", flush=True)

        try:
            logs_dir = migrations_log_dir()
            logs_dir.mkdir(parents=True, exist_ok=True)
            fh = logging.FileHandler(logs_dir / "migrations.log", mode="a")
            fh.setLevel(logging.INFO)
            fmt = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
            fh.setFormatter(fmt)
            root_logger = logging.getLogger()
            existing = False
            for h in root_logger.handlers:
                try:
                    if isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", None) == str(
                        (logs_dir / "migrations.log")
                    ):
                        existing = True
                        break
                except Exception:
                    continue
            if not existing:
                try:
                    if root_logger.level > logging.INFO:
                        root_level_before = root_logger.level
                        root_logger.setLevel(logging.INFO)
                except Exception:
                    pass
                root_logger.addHandler(fh)
                migrations_handler = fh
            else:
                fh.close()
        except Exception as log_ex:
            print(f"[run_migrations] Logging setup failed: {log_ex}", flush=True)
            logger.warning(f"[run_migrations] Logging setup failed: {log_ex}")

        try:
            command.upgrade(cfg, "head")
        except Exception as e:
            import traceback
            msg = str(e).lower()
            if any(
                substr in msg
                for substr in (
                    "already exists",
                    "duplicate column",
                    "index already exists",
                    "table already exists",
                )
            ):
                logger.warning(
                    "Alembic upgrade raised benign duplicate-DDL error; treating as success: %s",
                    e,
                )
                if verbose:
                    print(f"WARNING: Migration raised benign error: {e}", flush=True)
                print(f"[run_migrations] benign error: {e}", flush=True)
                return True

            logger.warning("Initial Alembic upgrade(head) failed: %s", e)
            logger.warning("Full traceback: %s", traceback.format_exc())
            print(f"[run_migrations] upgrade(head) failed: {e}", flush=True)
            print(f"[run_migrations] Full traceback:\n{traceback.format_exc()}", flush=True)
            try:
                logger.info("Attempting Alembic upgrade to 'heads' as a fallback")
                print("[run_migrations] Attempting upgrade to 'heads'", flush=True)
                command.upgrade(cfg, "heads")
            except Exception as e2:
                import traceback
                msg2 = str(e2).lower()
                if any(
                    substr in msg2
                    for substr in (
                        "already exists",
                        "duplicate column",
                        "index already exists",
                        "table already exists",
                    )
                ):
                    logger.warning(
                        "Alembic fallback upgrade raised benign duplicate-DDL error; treating as success: %s",
                        e2,
                    )
                    if verbose:
                        print(
                            f"WARNING: Migration raised benign error on fallback: {e2}",
                            flush=True,
                        )
                    print(f"[run_migrations] benign error on fallback: {e2}", flush=True)
                    return True
                logger.exception("Fallback upgrade to 'heads' also failed: %s", e2)
                logger.warning("Full traceback: %s", traceback.format_exc())
                print(
                    f"[run_migrations] Fallback upgrade to 'heads' failed: {e2}",
                    flush=True,
                )
                print(f"[run_migrations] Full traceback:\n{traceback.format_exc()}", flush=True)
                raise

        if verbose:
            print("\nOK: Database migrations applied successfully", flush=True)
            print("=" * 60, flush=True)
        logger.info("Alembic migrations applied successfully")
        print("[run_migrations] EXIT OK", flush=True)
        return True
    except Exception as e:
        logger.exception("Failed to apply Alembic migrations: %s", e)
        print(f"[run_migrations] EXCEPTION: {e}", flush=True)
        import traceback

        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        if verbose:
            print(f"ERROR: Migration error: {e}", file=sys.stderr, flush=True)
        return False
    finally:
        if migrations_handler is not None:
            logging.getLogger().removeHandler(migrations_handler)
            migrations_handler.close()
        if root_level_before is not None:
            logging.getLogger().setLevel(root_level_before)


def check_migration_status(verbose: bool = False) -> str:
    """Return the current Alembic revision (or empty string on error)."""
    try:
        backend_dir = Path(__file__).parent.parent.parent
        cfg = _alembic_config(backend_dir)
        from typing import Any, cast

        current = cast(Any, command.current(cfg, verbose=verbose))
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
