#!/usr/bin/env python3
"""Container entrypoint (Python) — runs migrations then starts the app server.

This script replaces the previous shell entrypoint to provide structured
logging, better error handling, and consistent exit codes. It imports the
programmatic migration runner from `backend.run_migrations` and executes it.

On success it execs Uvicorn. On failure it prints diagnostics and exits with
non-zero code so orchestrators detect the failure.
"""

from __future__ import annotations

import logging
import os
import sys
import traceback
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.environment import get_runtime_context

# Ensure production defaults inside the container runtime. Operators can still
# override these before the process starts if necessary, but the defaults keep
# release images aligned with the Docker-only execution policy.
os.environ.setdefault("SMS_ENV", "production")
os.environ.setdefault("SMS_EXECUTION_MODE", "docker")


def setup_logging() -> logging.Logger:
    # Basic structured-ish logging for container startup
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    logger = logging.getLogger("entrypoint")
    return logger


def dump_migrations_log(logger: logging.Logger) -> None:
    log_path = Path(__file__).resolve().parent / "migrations.log"
    # fallback location used by the runner
    if not log_path.exists():
        # Also check backend/migrations.log as some runners write there
        alt = Path(__file__).resolve().parent / "run_migrations.log"
        if alt.exists():
            log_path = alt

    if log_path.exists():
        try:
            logger.error("--- BEGIN migrations.log ---")
            with open(log_path, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    # Print lines directly to help container log aggregation
                    sys.stderr.write(line)
            logger.error("--- END migrations.log ---")
        except Exception:
            logger.exception("Failed to read migrations.log")


def main() -> int:
    logger = setup_logging()

    logger.info("entrypoint: starting migration check")

    context = get_runtime_context()
    try:
        context.assert_valid()
    except RuntimeError as exc:
        logger.error(str(exc))
        return 1
    logger.info("Runtime context: %s", context.summary())

    # Ensure project root is available on sys.path (same as main.py behavior)
    try:
        proj_root = Path(__file__).resolve().parent.parent
        if str(proj_root) not in sys.path:
            sys.path.insert(0, str(proj_root))
    except Exception:
        logger.debug("Could not adjust sys.path for project root")

    # Run the programmatic migration runner
    try:
        from backend.run_migrations import run_migrations

        ok = False
        try:
            ok = run_migrations(verbose=True)
        except TypeError:
            # Older signatures: run_migrations() without args
            ok = run_migrations()

        if not ok:
            logger.error("Migration runner reported failure")
            dump_migrations_log(logger)
            return 2

        logger.info("Migrations applied successfully")

    except Exception as exc:  # pragma: no cover - operational code path
        logger.error(f"Migration runner failed with exception: {exc}")
        logger.debug(traceback.format_exc())
        dump_migrations_log(logger)
        return 3

    # Start the server by replacing the current process (PID 1) with uvicorn
    try:
        logger.info("Starting Uvicorn server (exec)")
        # exec into uvicorn so signals are delivered to it
        os.execvp(
            "python", ["python", "-u", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
        )

    except Exception as exc:  # pragma: no cover - operational code path
        logger.error(f"Failed to exec uvicorn: {exc}")
        logger.debug(traceback.format_exc())
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
