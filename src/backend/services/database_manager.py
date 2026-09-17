"""Database instance management service.

Provides programmatic operations for PostgreSQL database instances:
- Connection health checking
- Database statistics and metadata
- Backup creation (via pg_dump subprocess, or a data-only COPY-format backup over psycopg)
- Backup listing, downloading, and deletion
- Restore: data-only backups are restored in-app over psycopg without needing any PostgreSQL
  client tools; pg_dump scripts are handed to psql

Designed for multi-instance management (local, QNAP, remote).
"""

from __future__ import annotations

import gzip
import json
import logging
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.config import get_settings
from backend.security.path_validation import validate_filename

logger = logging.getLogger(__name__)

# Backup storage directory
_BACKUP_DIR: Path | None = None
_ALLOWED_BACKUP_EXTENSIONS = [".sql", ".sql.gz"]

# Marker carried on the first line of the CSV data exports this module used to write, in both
# the "-- SMS PostgreSQL data export (psycopg COPY)" header and the original
# "-- SMS PostgreSQL Backup (psycopg COPY)" one. Those files are not restorable by anything -
# they are bare CSV under comment headers - so restore still refuses them on sight.
_PSYCOPG_EXPORT_MARKER = "(psycopg COPY)"

# Marker carried on the first line of every file _backup_via_psycopg writes now: a data-only
# backup in PostgreSQL's COPY text format, restorable by this app and by `psql -f`.
_DATA_BACKUP_MARKER = "(COPY format)"
_DATA_BACKUP_HEADER = "-- SMS PostgreSQL data-only backup (COPY format) v1"

PSYCOPG_EXPORT_WARNING = (
    "This file is an old CSV data export, not a backup: it holds table rows as CSV with no "
    "schema and no SQL, and nothing can restore it. Take a fresh backup - backups made now are "
    "restorable both in the app and with psql."
)

# Owned by Alembic, and deliberately neither backed up nor restored: a data-only restore goes
# into whatever schema the target database already has, so carrying the source's schema
# revision across would misreport it. The revision is recorded in the header and checked.
_EXCLUDED_TABLES = frozenset({"alembic_version"})

_COPY_BLOCK_RE = re.compile(r'^COPY "([^"]+)" \((.+)\) FROM stdin;$')
_SETVAL_RE = re.compile(r"^SELECT pg_catalog\.setval\('([^']+)', (-?\d+), (true|false)\);$")
_ALEMBIC_HEADER_RE = re.compile(r"^-- Alembic version: (.*)$", re.MULTILINE)


def _is_psycopg_data_export(content: str) -> bool:
    """True when `content` is one of the old CSV data exports rather than restorable SQL."""
    first_line = content.lstrip("﻿").split("\n", 1)[0]
    return first_line.startswith("-- SMS PostgreSQL") and _PSYCOPG_EXPORT_MARKER in first_line


def _is_data_only_backup(content: str) -> bool:
    """True when `content` is a data-only COPY-format backup written by _backup_via_psycopg."""
    first_line = content.lstrip("﻿").split("\n", 1)[0]
    return first_line.startswith("-- SMS PostgreSQL data-only backup") and _DATA_BACKUP_MARKER in first_line


def _get_backup_dir() -> Path:
    """Resolve and create the PostgreSQL backup directory."""
    global _BACKUP_DIR
    if _BACKUP_DIR is not None:
        return _BACKUP_DIR

    settings = get_settings()
    _BACKUP_DIR = Path(settings.BACKUPS_DIR) / "postgres"
    _BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return _BACKUP_DIR


def _validate_backup_filename(filename: str) -> str:
    """Validate a backup filename before any filesystem usage. Returns the validated filename."""
    return validate_filename(filename, _ALLOWED_BACKUP_EXTENSIONS)


def _find_existing_backup_path(filename: str) -> Path | None:
    """Find an existing validated backup file within the backup directory."""
    backup_dir = _get_backup_dir().resolve()
    safe_filename = _validate_backup_filename(filename)
    for candidate in backup_dir.iterdir():
        if not candidate.is_file() or candidate.name != safe_filename:
            continue

        resolved_candidate = candidate.resolve()
        try:
            resolved_candidate.relative_to(backup_dir)
        except (ValueError, OSError):
            continue
        return resolved_candidate

    return None


def _build_metadata_path(filepath: Path) -> Path:
    """Build a metadata sidecar path for a validated backup path."""
    backup_dir = _get_backup_dir().resolve()
    resolved_filepath = filepath.resolve()
    try:
        resolved_filepath.relative_to(backup_dir)
    except (ValueError, OSError) as exc:
        raise ValueError("Metadata path escaped backup directory") from exc

    meta_filename = Path(f"{resolved_filepath.name}.meta.json").name
    return backup_dir / meta_filename


def _find_metadata_path(filepath: Path) -> Path | None:
    """Find an existing metadata sidecar path for a validated backup path."""
    backup_dir = _get_backup_dir().resolve()
    meta_path = _build_metadata_path(filepath)
    meta_filename = meta_path.name

    for candidate in backup_dir.iterdir():
        if not candidate.is_file() or candidate.name != meta_filename:
            continue

        resolved_candidate = candidate.resolve()
        try:
            resolved_candidate.relative_to(backup_dir)
        except (ValueError, OSError):
            continue
        return resolved_candidate

    return None


def _pg_dump_available() -> bool:
    """Check whether pg_dump is available on PATH."""
    return shutil.which("pg_dump") is not None


def _parse_db_url(url: str) -> dict[str, Any]:
    """Extract host, port, user, password, dbname from a DATABASE_URL."""
    from urllib.parse import urlparse, unquote

    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "dbname": (parsed.path or "/").lstrip("/"),
        "sslmode": dict(item.split("=", 1) for item in (parsed.query or "").split("&") if "=" in item).get(
            "sslmode", "prefer"
        ),
    }


def _build_connection_url(instance: dict[str, Any]) -> str:
    """Build a psycopg connection string from instance config dict."""
    from urllib.parse import quote_plus

    host = instance.get("host", "localhost")
    port = instance.get("port", 5432)
    user = instance.get("user", "")
    password = instance.get("password", "")
    dbname = instance.get("dbname", "student_management")
    sslmode = instance.get("sslmode", "prefer")
    return (
        f"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(dbname)}?sslmode={sslmode}"
    )


# ---------------------------------------------------------------------------
# Instance discovery
# ---------------------------------------------------------------------------


def get_configured_instances() -> list[dict[str, Any]]:
    """Return all configured database instances.

    Currently reads the primary instance from settings. Additional instances
    can be registered via the EXTRA_DB_INSTANCES env var (JSON array of
    {name, host, port, user, password, dbname} objects).
    """
    settings = get_settings()
    instances: list[dict[str, Any]] = []

    # Primary instance (from DATABASE_URL / DATABASE_ENGINE settings)
    if settings.DATABASE_ENGINE == "postgresql":
        primary = _parse_db_url(settings.DATABASE_URL)
        primary["name"] = "primary"
        primary["label"] = "Primary PostgreSQL"
        primary["is_primary"] = True
        instances.append(primary)
    elif settings.DATABASE_URL.startswith("postgresql"):
        primary = _parse_db_url(settings.DATABASE_URL)
        primary["name"] = "primary"
        primary["label"] = "Primary PostgreSQL"
        primary["is_primary"] = True
        instances.append(primary)

    # Extra instances from env var (JSON array)
    extra_raw = os.environ.get("EXTRA_DB_INSTANCES", "").strip()
    if extra_raw:
        try:
            extras = json.loads(extra_raw)
            if isinstance(extras, list):
                for idx, ext in enumerate(extras):
                    if not isinstance(ext, dict):
                        continue
                    ext.setdefault("name", f"extra-{idx}")
                    ext.setdefault("label", ext.get("name", f"Instance {idx}"))
                    ext.setdefault("is_primary", False)
                    instances.append(ext)
        except json.JSONDecodeError:
            logger.warning("EXTRA_DB_INSTANCES env var is not valid JSON")

    return instances


def _find_instance(name: str) -> dict[str, Any]:
    """Look up a configured instance by name."""
    for inst in get_configured_instances():
        if inst["name"] == name:
            return inst
    raise ValueError(f"Database instance '{name}' not found")


# ---------------------------------------------------------------------------
# Health / status
# ---------------------------------------------------------------------------


def check_instance_health(instance: dict[str, Any]) -> dict[str, Any]:
    """Test connection to a PostgreSQL instance and return status info."""
    import psycopg

    dsn = (
        f"host={instance['host']} port={instance['port']} "
        f"dbname={instance['dbname']} user={instance['user']} "
        f"password={instance['password']} sslmode={instance.get('sslmode', 'prefer')} "
        f"connect_timeout=5"
    )
    result: dict[str, Any] = {
        "name": instance.get("name", "unknown"),
        "label": instance.get("label", ""),
        "host": instance["host"],
        "port": instance["port"],
        "dbname": instance["dbname"],
        "is_primary": instance.get("is_primary", False),
    }

    try:
        with psycopg.connect(dsn, autocommit=True) as conn:
            row = conn.execute("SELECT version()").fetchone()
            result["status"] = "healthy"
            result["version"] = row[0] if row else "unknown"

            # Uptime
            row = conn.execute("SELECT pg_postmaster_start_time()").fetchone()
            if row and row[0]:
                result["started_at"] = str(row[0])

            # Database size
            row = conn.execute("SELECT pg_database_size(current_database())").fetchone()
            if row:
                result["size_bytes"] = row[0]
                result["size_human"] = _human_size(row[0])

    except Exception as exc:
        result["status"] = "unreachable"
        result["error"] = str(exc)

    return result


def get_instance_stats(instance: dict[str, Any]) -> dict[str, Any]:
    """Gather detailed statistics for a PostgreSQL instance."""
    import psycopg

    dsn = (
        f"host={instance['host']} port={instance['port']} "
        f"dbname={instance['dbname']} user={instance['user']} "
        f"password={instance['password']} sslmode={instance.get('sslmode', 'prefer')} "
        f"connect_timeout=5"
    )
    stats: dict[str, Any] = {"name": instance.get("name", "unknown")}

    try:
        with psycopg.connect(dsn, autocommit=True) as conn:
            # Table count
            row = conn.execute(
                "SELECT count(*) FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            ).fetchone()
            stats["table_count"] = row[0] if row else 0

            # Row counts for key tables
            tables_row = conn.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            ).fetchall()
            table_sizes = []
            for (tname,) in tables_row:
                try:
                    cnt = conn.execute(
                        f'SELECT count(*) FROM "{tname}"'  # noqa: S608
                    ).fetchone()
                    tsize = conn.execute(
                        f"SELECT pg_total_relation_size('\"{tname}\"')"  # noqa: S608
                    ).fetchone()
                    table_sizes.append(
                        {
                            "name": tname,
                            "rows": cnt[0] if cnt else 0,
                            "size_bytes": tsize[0] if tsize else 0,
                            "size_human": _human_size(tsize[0]) if tsize else "0 B",
                        }
                    )
                except Exception:
                    table_sizes.append({"name": tname, "rows": -1, "size_bytes": 0})
            stats["tables"] = table_sizes

            # Active connections
            row = conn.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()").fetchone()
            stats["active_connections"] = row[0] if row else 0

            # Database size
            row = conn.execute("SELECT pg_database_size(current_database())").fetchone()
            if row:
                stats["size_bytes"] = row[0]
                stats["size_human"] = _human_size(row[0])

    except Exception as exc:
        stats["error"] = str(exc)

    return stats


# ---------------------------------------------------------------------------
# Backup operations
# ---------------------------------------------------------------------------


def create_backup(instance: dict[str, Any], *, compress: bool = True) -> dict[str, Any]:
    """Create a backup of a PostgreSQL instance.

    Uses pg_dump (subprocess) when available, otherwise writes a data-only backup in COPY
    format over psycopg. Both are restorable; the psycopg one carries data but not schema,
    which Alembic owns.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    backup_dir = _get_backup_dir()

    if _pg_dump_available():
        return _backup_via_pg_dump(instance, backup_dir, timestamp, compress)
    else:
        return _backup_via_psycopg(instance, backup_dir, timestamp, compress)


def _backup_via_pg_dump(
    instance: dict[str, Any],
    backup_dir: Path,
    timestamp: str,
    compress: bool,
) -> dict[str, Any]:
    """Create backup using pg_dump subprocess."""
    inst_name = instance.get("name", "db")
    ext = ".sql.gz" if compress else ".sql"
    filename = f"{inst_name}_{instance['dbname']}_{timestamp}{ext}"
    filepath = backup_dir / filename

    env = os.environ.copy()
    env["PGPASSWORD"] = instance.get("password", "")

    cmd = [
        "pg_dump",
        "-h",
        str(instance["host"]),
        "-p",
        str(instance["port"]),
        "-U",
        instance["user"],
        "-d",
        instance["dbname"],
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
    ]

    try:
        if compress:
            result = subprocess.run(cmd, capture_output=True, env=env, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.decode(errors="replace"))
            with gzip.open(filepath, "wb") as f:
                f.write(result.stdout)
        else:
            cmd.extend(["-f", str(filepath)])
            result = subprocess.run(cmd, capture_output=True, env=env, timeout=300)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.decode(errors="replace"))

        size = filepath.stat().st_size
        _write_backup_metadata(filepath, size, "pg_dump")

        return {
            "success": True,
            "filename": filename,
            "size_bytes": size,
            "size_human": _human_size(size),
            "method": "pg_dump",
            "compressed": compress,
            "timestamp": timestamp,
            "restorable": True,
        }

    except Exception as exc:
        # Clean up partial file
        if filepath.exists():
            filepath.unlink()
        raise RuntimeError(f"pg_dump backup failed: {exc}") from exc


def _build_dsn(instance: dict[str, Any]) -> str:
    """Build a psycopg connection string for an instance."""
    return (
        f"host={instance['host']} port={instance['port']} "
        f"dbname={instance['dbname']} user={instance['user']} "
        f"password={instance['password']} sslmode={instance.get('sslmode', 'prefer')} "
        f"connect_timeout=10"
    )


def _public_tables(conn: Any) -> list[str]:
    """Names of the public base tables that carry application data, alphabetically."""
    rows = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
        "ORDER BY table_name"
    ).fetchall()
    return [name for (name,) in rows if name not in _EXCLUDED_TABLES]


def _table_columns(conn: Any, table: str) -> list[str]:
    """Column names of a public table, in ordinal order."""
    rows = conn.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = %s "
        "ORDER BY ordinal_position",
        (table,),
    ).fetchall()
    return [name for (name,) in rows]


def _fk_dependency_order(conn: Any, tables: list[str]) -> list[str]:
    """Order `tables` so every table follows the tables its foreign keys point at.

    Data-only restore inserts into the live schema with its constraints enabled, so parents
    must be loaded before children. Self-references are ignored for ordering, and if the
    foreign keys form a cycle the remaining tables keep alphabetical order - the restore runs
    in one transaction, so a genuine ordering failure rolls back rather than half-loading.
    """
    rows = conn.execute(
        "SELECT src.relname, tgt.relname "
        "FROM pg_constraint c "
        "JOIN pg_class src ON src.oid = c.conrelid "
        "JOIN pg_class tgt ON tgt.oid = c.confrelid "
        "JOIN pg_namespace n ON n.oid = src.relnamespace "
        "WHERE c.contype = 'f' AND n.nspname = 'public'"
    ).fetchall()

    known = set(tables)
    parents: dict[str, set[str]] = {t: set() for t in tables}
    for child, parent in rows:
        if child in known and parent in known and child != parent:
            parents[child].add(parent)

    ordered: list[str] = []
    placed: set[str] = set()
    remaining = sorted(tables)
    while remaining:
        ready = [t for t in remaining if parents[t] <= placed]
        if not ready:  # cycle - emit the rest in a stable order and let the transaction judge
            logger.warning("Foreign-key cycle among tables %s; using alphabetical order", remaining)
            ordered.extend(remaining)
            break
        ordered.extend(ready)
        placed.update(ready)
        remaining = [t for t in remaining if t not in placed]
    return ordered


def _sequence_states(conn: Any) -> list[tuple[str, int, bool]]:
    """Every public sequence with its current value, so restore can resume the same ids."""
    from psycopg import sql as pgsql

    rows = conn.execute(
        "SELECT sequence_name FROM information_schema.sequences "
        "WHERE sequence_schema = 'public' ORDER BY sequence_name"
    ).fetchall()

    states: list[tuple[str, int, bool]] = []
    for (seq_name,) in rows:
        # is_called lives on the sequence relation itself - pg_sequences does not have it, and
        # without it a restored sequence hands out its last used id again. The name comes from
        # the catalog and goes through Identifier, so it is quoted, never interpolated.
        row = conn.execute(
            pgsql.SQL("SELECT last_value, is_called FROM {}").format(pgsql.Identifier("public", seq_name))
        ).fetchone()
        if not row or row[0] is None:
            continue
        states.append((seq_name, int(row[0]), bool(row[1])))
    return states


def _alembic_revision(conn: Any) -> str:
    """The database's current Alembic revision, or "" when the table is absent or empty.

    Checks for the table with to_regclass rather than querying it and catching the failure:
    in PostgreSQL a failed statement aborts the whole transaction, so catching the error would
    leave the connection unusable for the backup or restore that follows.
    """
    exists = conn.execute("SELECT to_regclass('public.alembic_version')").fetchone()
    if not exists or exists[0] is None:
        return ""

    row = conn.execute("SELECT version_num FROM alembic_version LIMIT 1").fetchone()
    return str(row[0]) if row and row[0] else ""


def _backup_via_psycopg(
    instance: dict[str, Any],
    backup_dir: Path,
    timestamp: str,
    compress: bool,
) -> dict[str, Any]:
    """Write a data-only backup over psycopg when pg_dump is not installed.

    The output is PostgreSQL's COPY text format - the same shape pg_dump's plain format uses
    for data - wrapped in a single transaction, so it is restorable both by `restore_backup`
    and by `psql -f`. The schema is owned by Alembic and is deliberately not included: the
    backup records the revision it was taken at, and restore refuses a mismatched target.

    This replaces the CSV "data export" this function used to write, which nothing could
    restore. Data is streamed as bytes throughout - decoding each COPY chunk as text would
    split multi-byte characters (Greek names) across chunk boundaries.
    """
    import psycopg

    inst_name = instance.get("name", "db")
    ext = ".sql.gz" if compress else ".sql"
    filename = f"{inst_name}_{instance['dbname']}_{timestamp}{ext}"
    filepath = backup_dir / filename

    try:
        open_fn = gzip.open if compress else open
        row_counts: dict[str, int] = {}
        with psycopg.connect(_build_dsn(instance)) as conn:
            tables = _fk_dependency_order(conn, _public_tables(conn))
            revision = _alembic_revision(conn)
            sequences = _sequence_states(conn)

            with open_fn(filepath, "wb") as f:  # type: ignore[call-overload]

                def emit(text: str) -> None:
                    f.write(text.encode("utf-8"))

                # Header. The first line is what _is_data_only_backup recognises; keep its
                # "(COPY format)" marker if it is ever reworded.
                emit(f"{_DATA_BACKUP_HEADER}\n")
                emit("-- Restorable: by this app, or with: psql -f <file>\n")
                emit("-- The schema is owned by Alembic migrations; this file carries data only.\n")
                emit("-- Restoring REPLACES the contents of every table listed below.\n")
                emit(f"-- Timestamp: {timestamp}\n")
                emit(f"-- Database: {instance['dbname']}\n")
                emit(f"-- Alembic version: {revision}\n")
                emit("\nBEGIN;\n\n")

                if tables:
                    quoted = ", ".join(f'"{t}"' for t in tables)
                    emit(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE;\n")

                for table_name in tables:
                    col_names = _table_columns(conn, table_name)
                    if not col_names:
                        continue

                    cols_sql = ", ".join(f'"{c}"' for c in col_names)
                    emit(f'\nCOPY "{table_name}" ({cols_sql}) FROM stdin;\n')

                    rows = 0
                    trailing_newline = True
                    copy_sql = f'COPY "{table_name}" ({cols_sql}) TO STDOUT'
                    with conn.cursor().copy(copy_sql) as copy:
                        for chunk in copy:
                            data = bytes(chunk) if not isinstance(chunk, bytes) else chunk
                            if not data:
                                continue
                            rows += data.count(b"\n")
                            trailing_newline = data.endswith(b"\n")
                            f.write(data)
                    if not trailing_newline:
                        emit("\n")
                    emit("\\.\n")
                    row_counts[table_name] = rows

                if sequences:
                    emit("\n")
                    for seq_name, last_value, is_called in sequences:
                        emit(
                            f"SELECT pg_catalog.setval('{seq_name}', {last_value}, "
                            f"{'true' if is_called else 'false'});\n"
                        )

                emit("\nCOMMIT;\n")

        size = filepath.stat().st_size
        _write_backup_metadata(filepath, size, "psycopg_copy")

        return {
            "success": True,
            "filename": filename,
            "size_bytes": size,
            "size_human": _human_size(size),
            "method": "psycopg_copy",
            "compressed": compress,
            "timestamp": timestamp,
            "restorable": True,
            "tables": len(row_counts),
            "rows": sum(row_counts.values()),
            "alembic_version": revision,
        }

    except Exception as exc:
        if filepath.exists():
            filepath.unlink()
        raise RuntimeError(f"psycopg backup failed: {exc}") from exc


def list_backups(instance_name: str | None = None) -> list[dict[str, Any]]:
    """List available PostgreSQL backups, optionally filtered by instance."""
    backup_dir = _get_backup_dir()
    backups: list[dict[str, Any]] = []

    if not backup_dir.exists():
        return backups

    for f in sorted(backup_dir.iterdir(), reverse=True):
        if not f.is_file():
            continue
        if not (f.suffix in (".gz", ".sql") or f.name.endswith(".sql.gz")):
            continue
        if f.suffix == ".json":
            continue  # skip metadata files

        # Filter by instance name if provided
        if instance_name and not f.name.startswith(f"{instance_name}_"):
            continue

        meta = _read_backup_metadata(f)
        inferred_instance = f.name.split("_", 1)[0] if "_" in f.name else "unknown"
        backups.append(
            {
                "filename": f.name,
                "size_bytes": f.stat().st_size,
                "size_human": _human_size(f.stat().st_size),
                "created_at": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat(),
                "instance": meta.get("instance_name", inferred_instance),
                "method": meta.get("method", "unknown"),
                "compressed": f.name.endswith(".gz"),
            }
        )

    return backups


def delete_backup(filename: str) -> bool:
    """Delete a backup file and its metadata."""
    # CodeQL [python/path-injection]: Safe - validate route input at boundary,
    # then resolve strictly within backup directory.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError as exc:
        raise ValueError("Invalid backup filename") from exc
    try:
        filepath = _find_existing_backup_path(safe_filename)
    except ValueError:
        raise ValueError("Invalid backup filename")

    if filepath is None or not filepath.exists():
        return False

    filepath.unlink()
    meta_path = _find_metadata_path(filepath)
    if meta_path is not None and meta_path.exists():
        meta_path.unlink()

    return True


def get_backup_path(filename: str) -> Path | None:
    """Get the full path to a backup file for download."""
    # CodeQL [python/path-injection]: Safe - validate route input at boundary,
    # then resolve strictly within backup directory.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError:
        return None
    try:
        filepath = _find_existing_backup_path(safe_filename)
    except ValueError:
        return None
    if filepath is None or not filepath.exists():
        return None
    return filepath


# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------


def restore_backup(instance: dict[str, Any], filename: str) -> dict[str, Any]:
    """Restore a backup to a PostgreSQL instance.

    Data-only backups (this module's COPY format) are restored in-app over psycopg, so they
    work without the PostgreSQL client tools. pg_dump scripts need psql. The old CSV data
    exports are refused. Supports .sql and .sql.gz (auto-decompressed).
    """
    # CodeQL [python/path-injection]: Safe - validate route input at boundary,
    # then resolve strictly within backup directory.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError as exc:
        raise ValueError("Invalid backup filename") from exc

    try:
        filepath = _find_existing_backup_path(safe_filename)
    except ValueError:
        raise ValueError("Invalid backup filename")
    if filepath is None or not filepath.exists():
        raise FileNotFoundError(f"Backup file not found: {safe_filename}")

    # Read SQL content
    if filepath.name.endswith(".gz"):
        with gzip.open(filepath, "rt", encoding="utf-8") as f:
            sql_content = f.read()
    else:
        sql_content = filepath.read_text(encoding="utf-8")

    return restore_sql_content(instance, sql_content)


def restore_sql_content(instance: dict[str, Any], sql_content: str) -> dict[str, Any]:
    """Restore already-read backup content, choosing an engine by the file's format.

    Split out from `restore_backup` so callers holding the content themselves - the Dev Tools
    restore, which keeps its backups in its own directory and may have just decrypted one -
    go through exactly the same dispatch and the same safety checks.
    """
    # The old CSV "data exports" are bare CSV under a comment header - not SQL, and not this
    # module's COPY format either. Nothing can restore one, so refuse before anything runs;
    # psql would otherwise try to execute their data lines.
    if _is_psycopg_data_export(sql_content):
        raise ValueError(
            "This file is an old CSV data export, not a backup: it holds table rows as CSV, not "
            "SQL, and cannot be restored. Take a fresh backup. Nothing was changed."
        )

    # Our own data-only backups are restored by the format-aware engine below, with or without
    # psql. It parses the COPY blocks and streams their bytes through COPY ... FROM STDIN, so
    # backup data is never handed to the server as SQL.
    if _is_data_only_backup(sql_content):
        return _restore_via_psycopg(instance, sql_content)

    # Anything else is a pg_dump script: real SQL, which only psql can apply.
    if shutil.which("psql"):
        return _restore_via_psql(instance, sql_content)

    # No psql and not our format: refuse rather than execute. There used to be a psycopg
    # fallback here that split the file on ";" and executed every fragment on an autocommit
    # connection. It could not restore anything this module writes, and a stored text value
    # such as "x;DELETE FROM users;y" was split out and executed verbatim. Removed 2026-09-17.
    return {
        "success": False,
        "method": "none",
        "error": (
            "This is a pg_dump script, and restoring one needs the PostgreSQL client tools "
            "(psql), which are not installed on this machine. Nothing was changed."
        ),
    }


def _parse_data_only_backup(
    content: str,
) -> tuple[str, list[tuple[str, list[str], bytes]], list[tuple[str, int, bool]]]:
    """Parse a data-only backup into its revision, COPY blocks and sequence values.

    Only the file's *structure* is interpreted. Row data is collected verbatim and handed to
    COPY as bytes; it is never parsed as SQL, so a value such as "x;DELETE FROM users;y" is
    just a value. COPY text format makes this unambiguous: a newline inside a value is
    escaped as "\\n", and a row whose only content is "\\." is escaped as "\\\\.", so the
    terminator can never be forged from data.
    """
    revision_match = _ALEMBIC_HEADER_RE.search(content)
    revision = revision_match.group(1).strip() if revision_match else ""

    blocks: list[tuple[str, list[str], bytes]] = []
    sequences: list[tuple[str, int, bool]] = []

    current: tuple[str, list[str]] | None = None
    rows: list[str] = []

    for line in content.split("\n"):
        if current is not None:
            if line == "\\.":
                data = "".join(f"{row}\n" for row in rows).encode("utf-8")
                blocks.append((current[0], current[1], data))
                current, rows = None, []
            else:
                rows.append(line)
            continue

        copy_match = _COPY_BLOCK_RE.match(line)
        if copy_match:
            table = copy_match.group(1)
            columns = [c.strip().strip('"') for c in copy_match.group(2).split(",")]
            current, rows = (table, columns), []
            continue

        setval_match = _SETVAL_RE.match(line)
        if setval_match:
            sequences.append(
                (setval_match.group(1), int(setval_match.group(2)), setval_match.group(3) == "true")
            )

    if current is not None:
        raise ValueError(
            f'Backup is truncated: the COPY block for "{current[0]}" has no end marker. '
            "Nothing was changed."
        )

    return revision, blocks, sequences


def _restore_via_psycopg(instance: dict[str, Any], content: str) -> dict[str, Any]:
    """Restore a data-only backup over psycopg, in one transaction.

    Every identifier is checked against the live catalog and re-quoted from the catalog's own
    spelling before it reaches a statement, and row data only ever travels through COPY's data
    stream. On any failure the transaction rolls back, so the database is left untouched.
    """
    import psycopg
    from psycopg import sql as pgsql

    revision, blocks, sequences = _parse_data_only_backup(content)

    if not blocks:
        return {
            "success": False,
            "method": "none",
            "error": "Backup contains no table data. Nothing was changed.",
        }

    try:
        with psycopg.connect(_build_dsn(instance)) as conn:
            live_revision = _alembic_revision(conn)
            if revision and live_revision and revision != live_revision:
                return {
                    "success": False,
                    "method": "none",
                    "error": (
                        f"Backup was taken at Alembic revision {revision}, but this database is "
                        f"at {live_revision}. A data-only backup restores into the existing "
                        "schema, so the revisions must match. Run `alembic upgrade head` on a "
                        "database at the backup's revision, or use a matching backup. Nothing "
                        "was changed."
                    ),
                }

            live_tables = set(_public_tables(conn))
            unknown = [t for t, _c, _d in blocks if t not in live_tables]
            if unknown:
                return {
                    "success": False,
                    "method": "none",
                    "error": (
                        f"Backup refers to tables this database does not have: "
                        f"{', '.join(sorted(unknown))}. Nothing was changed."
                    ),
                }

            for table, columns, _data in blocks:
                live_columns = set(_table_columns(conn, table))
                missing = [c for c in columns if c not in live_columns]
                if missing:
                    return {
                        "success": False,
                        "method": "none",
                        "error": (
                            f'Backup refers to columns table "{table}" does not have: '
                            f"{', '.join(missing)}. Nothing was changed."
                        ),
                    }

            live_sequences = {name for name, _v, _c in _sequence_states(conn)}
            restored_rows = 0

            with conn.transaction():
                targets = [t for t, _c, _d in blocks]
                conn.execute(
                    pgsql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(
                        pgsql.SQL(", ").join(pgsql.Identifier(t) for t in targets)
                    )
                )

                for table, columns, data in blocks:
                    if not data:
                        continue
                    copy_stmt = pgsql.SQL("COPY {} ({}) FROM STDIN").format(
                        pgsql.Identifier(table),
                        pgsql.SQL(", ").join(pgsql.Identifier(c) for c in columns),
                    )
                    with conn.cursor().copy(copy_stmt) as copy:
                        copy.write(data)
                    restored_rows += data.count(b"\n")

                for seq_name, last_value, is_called in sequences:
                    if seq_name not in live_sequences:
                        continue
                    conn.execute(
                        "SELECT pg_catalog.setval(%s, %s, %s)", (seq_name, last_value, is_called)
                    )

        return {
            "success": True,
            "method": "psycopg_copy",
            "tables": len(blocks),
            "rows": restored_rows,
            "alembic_version": revision,
        }

    except Exception as exc:
        logger.error("Data-only restore failed and was rolled back: %s", exc)
        return {
            "success": False,
            "method": "psycopg_copy",
            "error": f"Restore failed and was rolled back; nothing was changed. Details: {exc}",
        }


def _restore_via_psql(instance: dict[str, Any], sql: str) -> dict[str, Any]:
    """Restore using psql subprocess."""
    env = os.environ.copy()
    env["PGPASSWORD"] = instance.get("password", "")

    cmd = [
        "psql",
        "-h",
        str(instance["host"]),
        "-p",
        str(instance["port"]),
        "-U",
        instance["user"],
        "-d",
        instance["dbname"],
        "--quiet",
    ]

    result = subprocess.run(
        cmd,
        input=sql.encode("utf-8"),
        capture_output=True,
        env=env,
        timeout=600,
    )

    return {
        "success": result.returncode == 0,
        "method": "psql",
        "stdout": result.stdout.decode(errors="replace")[:2000],
        "stderr": result.stderr.decode(errors="replace")[:2000],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _human_size(size_bytes: int | None) -> str:
    """Format byte count as human-readable string."""
    if size_bytes is None or size_bytes < 0:
        return "0 B"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(size_bytes) < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024  # type: ignore[assignment]
    return f"{size_bytes:.1f} PB"


def _write_backup_metadata(
    filepath: Path,
    size: int,
    method: str,
) -> None:
    """Write a JSON metadata sidecar for a backup file."""
    meta = {
        "method": method,
        "size_bytes": size,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    meta_path = _build_metadata_path(filepath)
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")


def _read_backup_metadata(filepath: Path) -> dict[str, Any]:
    """Read backup metadata sidecar if it exists."""
    try:
        meta_path = _find_metadata_path(filepath)
    except ValueError:
        return {}
    if meta_path is not None and meta_path.exists():
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}
