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


def _safe_print(msg: str) -> None:
    """Print safely - in bundled/GUI mode, print may fail."""
    try:
        print(msg)
    except (OSError, ValueError):
        # In bundled GUI mode, stdout/stderr may not be writable
        pass


def run_migrations(verbose: bool = False) -> bool:
    """Run Alembic migrations (upgrade head) using the Alembic API.

    Returns True on success, False on failure.
    """
    _safe_print("[run_migrations] ENTER")
    logger.info("[run_migrations] ENTER")
    try:
        backend_dir = Path(__file__).parent.parent.parent
        cfg = _alembic_config(backend_dir)
        if verbose:
            _safe_print("=" * 60)
            _safe_print("DATABASE MIGRATION CHECK")
            _safe_print("=" * 60)
            _safe_print(f"Backend directory: {backend_dir}")
            try:
                url = cfg.get_main_option("sqlalchemy.url")
            except Exception:
                url = None
            _safe_print(f"Using DATABASE_URL: {url}")

        try:

            def _find_repo_root(start: Path) -> Path:
                for p in (start, *start.parents):
                    if (p / ".git").exists() or ((p / "backend").exists() and (p / "backend").is_dir()):
                        return p
                fallback = start.parents[2] if len(start.parents) >= 3 else Path.cwd()
                return fallback

            repo_root = _find_repo_root(backend_dir)
            # Use AppData for logs in bundled/native-lite mode
            import sys as _sys_migrate
            if getattr(_sys_migrate, 'frozen', False):
                logs_dir = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite'
            else:
                logs_dir = repo_root / "logs"
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
                        root_logger.setLevel(logging.INFO)
                except Exception:
                    pass
                root_logger.addHandler(fh)
        except Exception as log_ex:
            _safe_print(f"[run_migrations] Logging setup failed: {log_ex}")
            logger.warning(f"[run_migrations] Logging setup failed: {log_ex}")

        try:
            command.upgrade(cfg, "head")
        except Exception as e:
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
                    _safe_print(f"WARNING: Migration raised benign error: {e}")
                _safe_print(f"[run_migrations] benign error: {e}")
                return True

            logger.warning("Initial Alembic upgrade(head) failed: %s", e)
            _safe_print(f"[run_migrations] upgrade(head) failed: {e}")
            try:
                logger.info("Attempting Alembic upgrade to 'heads' as a fallback")
                _safe_print("[run_migrations] Attempting upgrade to 'heads'")
                command.upgrade(cfg, "heads")
            except Exception as e2:
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
                        _safe_print(f"WARNING: Migration raised benign error on fallback: {e2}")
                    _safe_print(f"[run_migrations] benign error on fallback: {e2}")
                    return True
                logger.exception("Fallback upgrade to 'heads' also failed: %s", e2)
                _safe_print(f"[run_migrations] Fallback upgrade to 'heads' failed: {e2}")
                raise

        if verbose:
            _safe_print("\nOK: Database migrations applied successfully")
            _safe_print("=" * 60)
        _safe_print("[run_migrations] DEBUG: About to log Alembic migrations applied successfully")
        logger.info("Alembic migrations applied successfully")
        _safe_print("[run_migrations] DEBUG: Logged Alembic migrations applied successfully")

        # Bootstrap default admin account if credentials are configured
        try:
            from backend.scripts.admin.bootstrap import ensure_default_admin_account
            from backend.db import SessionLocal

            _safe_print("[run_migrations] Bootstrapping admin account...")
            ensure_default_admin_account(
                settings=Settings(),
                session_factory=SessionLocal,
                logger=logger,
                close_session=True,
            )
            _safe_print("[run_migrations] Admin bootstrap complete")
        except Exception as e:
            logger.warning(f"Admin bootstrap failed (non-critical): {e}")
            _safe_print(f"[run_migrations] Admin bootstrap warning: {e}")

        _safe_print("[run_migrations] EXIT OK")
        return True
    except Exception as e:
        logger.exception("Failed to apply Alembic migrations: %s", e)
        _safe_print(f"[run_migrations] EXCEPTION: {e}")
        import traceback

        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        if verbose:
            _safe_print(f"ERROR: Migration error: {e}", file=sys.stderr)
        return False


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
