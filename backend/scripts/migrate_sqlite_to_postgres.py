"""Utility to migrate SMS data from SQLite to PostgreSQL.

This script copies every SQLAlchemy model defined in ``backend.models`` from a
source SQLite database into a PostgreSQL database. It is intended to be run
once when upgrading an existing installation from the default SQLite store to a
managed PostgreSQL instance.

Typical usage::

    cd backend
    python -m backend.scripts.migrate_sqlite_to_postgres \
        --sqlite-path ../data/student_management.db \
        --postgres-url postgresql+psycopg://user:pass@host:5432/student_db # pragma: allowlist secret

If ``--postgres-url`` is omitted the script falls back to ``DATABASE_URL`` from
the environment. When that URL already points to PostgreSQL, running the script
without extra arguments is enough.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Iterable, Sequence

import sqlalchemy as sa
from backend import models
from backend.run_migrations import run_migrations
from sqlalchemy import create_engine, func, text
from sqlalchemy.engine import Connection
from sqlalchemy.schema import Table

LOGGER = logging.getLogger("sqlite_to_postgres")
DEFAULT_SQLITE_PATH = Path(__file__).resolve().parents[1] / "data" / "student_management.db"
POSTGRES_PREFIXES = ("postgresql://", "postgresql+psycopg://", "postgresql+asyncpg://")


def _quote_ident(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'


def _parse_arguments(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate SMS data from SQLite to PostgreSQL")
    parser.add_argument(
        "--sqlite-path",
        dest="sqlite_path",
        default=str(DEFAULT_SQLITE_PATH),
        help="Path to the source SQLite database (default: %(default)s)",
    )
    parser.add_argument(
        "--postgres-url",
        dest="postgres_url",
        default=None,
        help="Target PostgreSQL SQLAlchemy URL. Defaults to DATABASE_URL when omitted.",
    )
    parser.add_argument(
        "--batch-size",
        dest="batch_size",
        type=int,
        default=1000,
        help="Rows per insert batch (default: %(default)s)",
    )
    parser.add_argument(
        "--tables",
        dest="tables",
        nargs="*",
        help="Optional list of table names to migrate (defaults to all tables)",
    )
    parser.add_argument(
        "--no-truncate",
        dest="no_truncate",
        action="store_true",
        help="Append-only mode. Skip truncating target tables before copying data.",
    )
    parser.add_argument(
        "--skip-migrations",
        dest="skip_migrations",
        action="store_true",
        help="Assume PostgreSQL already has the latest schema (skip Alembic runner)",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Show what would happen without writing to PostgreSQL",
    )
    parser.add_argument(
        "--log-level",
        dest="log_level",
        default="INFO",
        choices=["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"],
        help="Logging verbosity (default: %(default)s)",
    )
    return parser.parse_args(argv)


def _validate_postgres_url(url: str | None) -> str:
    candidate = (url or os.environ.get("DATABASE_URL") or "").strip()
    if not candidate:
        raise ValueError("PostgreSQL URL not provided. Use --postgres-url or set DATABASE_URL.")
    lowered = candidate.lower()
    if not any(lowered.startswith(prefix) for prefix in POSTGRES_PREFIXES):
        raise ValueError("PostgreSQL URL must start with 'postgresql://' or 'postgresql+psycopg://'.")
    return candidate


def _resolve_sqlite_path(path_value: str) -> Path:
    path = Path(path_value).expanduser()
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"SQLite database not found: {path}")
    return path


def _ensure_migrations(postgres_url: str) -> None:
    os.environ["DATABASE_URL"] = postgres_url
    LOGGER.info("Running Alembic migrations against target PostgreSQL database...")
    ok = run_migrations(verbose=True)
    if not ok:
        raise RuntimeError("Alembic migrations failed. Aborting migration.")


def _truncate_tables(conn: Connection, tables: Sequence[Table]) -> None:
    if not tables:
        return
    quoted = ", ".join(_quote_ident(table.name) for table in tables)
    LOGGER.info("Truncating destination tables: %s", quoted)
    conn.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))


def _chunked(result: sa.engine.Result, batch_size: int) -> Iterable[list[dict[str, object]]]:
    while True:
        rows = result.fetchmany(batch_size)
        if not rows:
            break
        yield [dict(row._mapping) for row in rows]


def _copy_table(
    table: Table,
    source_conn: Connection,
    dest_conn: Connection | None,
    batch_size: int,
    dry_run: bool,
) -> None:
    total = source_conn.execute(sa.select(func.count()).select_from(table)).scalar_one()
    if total == 0:
        LOGGER.info("%s: no rows to migrate", table.name)
        return

    LOGGER.info("%s: migrating %s rows", table.name, total)
    if dry_run:
        return

    result = source_conn.execution_options(stream_results=True).execute(sa.select(table))
    migrated = 0
    try:
        for chunk in _chunked(result, batch_size):
            if dest_conn is None:
                continue
            dest_conn.execute(sa.insert(table), chunk)
            migrated += len(chunk)
            LOGGER.debug("%s: migrated %s/%s rows", table.name, migrated, total)
    finally:
        result.close()
    LOGGER.info("%s: migration complete (%s rows)", table.name, migrated)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_arguments(argv or sys.argv[1:])
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(levelname)s - %(message)s",
    )

    try:
        sqlite_path = _resolve_sqlite_path(args.sqlite_path)
        postgres_url = _validate_postgres_url(args.postgres_url)
    except (ValueError, FileNotFoundError) as exc:
        LOGGER.error(str(exc))
        return 2

    tables = [t for t in models.Base.metadata.sorted_tables if not args.tables or t.name in args.tables]
    if args.tables:
        missing = sorted(set(args.tables) - {t.name for t in tables})
        if missing:
            LOGGER.warning("Ignoring unknown tables: %s", ", ".join(missing))
    if not tables:
        LOGGER.warning("No tables selected for migration. Nothing to do.")
        return 0

    LOGGER.info("Source SQLite database: %s", sqlite_path)
    LOGGER.info("Target PostgreSQL URL: %s", postgres_url.split("@", 1)[-1])
    if args.dry_run:
        LOGGER.info("Dry-run enabled. No changes will be written to PostgreSQL.")
    if not args.no_truncate and not args.dry_run:
        LOGGER.info("Destination tables will be truncated before copying data.")

    if not args.skip_migrations and not args.dry_run:
        try:
            _ensure_migrations(postgres_url)
        except RuntimeError as exc:
            LOGGER.error(str(exc))
            return 3

    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
    postgres_engine = None if args.dry_run else create_engine(postgres_url)

    with sqlite_engine.connect() as source_conn:
        if postgres_engine is None:
            for table in tables:
                _copy_table(table, source_conn, None, args.batch_size, True)
            LOGGER.info("Dry-run complete. No data was written to PostgreSQL.")
            return 0

        with postgres_engine.begin() as dest_conn:
            if not args.no_truncate:
                _truncate_tables(dest_conn, tables)
            for table in tables:
                _copy_table(table, source_conn, dest_conn, args.batch_size, args.dry_run)

    LOGGER.info("Migration complete")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
