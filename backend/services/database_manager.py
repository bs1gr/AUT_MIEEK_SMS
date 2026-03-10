"""Database instance management service.

Provides programmatic operations for PostgreSQL database instances:
- Connection health checking
- Database statistics and metadata
- Backup creation (via pg_dump subprocess or psycopg SQL COPY)
- Backup listing, downloading, and deletion
- Restore from SQL backup files

Designed for multi-instance management (local, QNAP, remote).
"""

from __future__ import annotations

import gzip
import json
import logging
import os
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


def _get_backup_dir() -> Path:
    """Resolve and create the PostgreSQL backup directory."""
    global _BACKUP_DIR
    if _BACKUP_DIR is not None:
        return _BACKUP_DIR

    settings = get_settings()
    # Docker uses /data volume; native uses project-root/backups/postgres
    if settings.SMS_EXECUTION_MODE == "docker":
        _BACKUP_DIR = Path("/data/backups/postgres")
    else:
        from backend.config import _PROJECT_ROOT

        _BACKUP_DIR = _PROJECT_ROOT / "backups" / "postgres"

    _BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return _BACKUP_DIR


def _validate_backup_filename(filename: str) -> str:
    """Validate a backup filename before any filesystem usage."""
    validate_filename(filename, _ALLOWED_BACKUP_EXTENSIONS)
    return filename


def _resolve_backup_path(filename: str) -> Path:
    """Resolve a validated backup filename within the backup directory."""
    backup_dir = _get_backup_dir().resolve()
    safe_filename = Path(_validate_backup_filename(filename)).name
    for candidate in backup_dir.iterdir():
        if not candidate.is_file() or candidate.name != safe_filename:
            continue

        resolved_candidate = candidate.resolve()
        try:
            resolved_candidate.relative_to(backup_dir)
        except (ValueError, OSError):
            continue
        return resolved_candidate

    return backup_dir / safe_filename


def _resolve_metadata_path(filepath: Path) -> Path:
    """Resolve the metadata sidecar path for a validated backup path."""
    backup_dir = _get_backup_dir().resolve()
    resolved_filepath = filepath.resolve()
    try:
        resolved_filepath.relative_to(backup_dir)
    except (ValueError, OSError) as exc:
        raise ValueError("Metadata path escaped backup directory") from exc

    meta_filename = Path(f"{resolved_filepath.name}.meta.json").name
    for candidate in backup_dir.iterdir():
        if not candidate.is_file() or candidate.name != meta_filename:
            continue

        resolved_candidate = candidate.resolve()
        try:
            resolved_candidate.relative_to(backup_dir)
        except (ValueError, OSError):
            continue
        return resolved_candidate

    return backup_dir / meta_filename


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

    Uses pg_dump (subprocess) when available, otherwise falls back to
    psycopg COPY-based SQL dump.
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
        _write_backup_metadata(filepath, instance, size, "pg_dump")

        return {
            "success": True,
            "filename": filename,
            "size_bytes": size,
            "size_human": _human_size(size),
            "method": "pg_dump",
            "compressed": compress,
            "timestamp": timestamp,
        }

    except Exception as exc:
        # Clean up partial file
        if filepath.exists():
            filepath.unlink()
        raise RuntimeError(f"pg_dump backup failed: {exc}") from exc


def _backup_via_psycopg(
    instance: dict[str, Any],
    backup_dir: Path,
    timestamp: str,
    compress: bool,
) -> dict[str, Any]:
    """Create backup using psycopg COPY TO STDOUT (no pg_dump needed)."""
    import psycopg

    inst_name = instance.get("name", "db")
    ext = ".sql.gz" if compress else ".sql"
    filename = f"{inst_name}_{instance['dbname']}_{timestamp}{ext}"
    filepath = backup_dir / filename

    dsn = (
        f"host={instance['host']} port={instance['port']} "
        f"dbname={instance['dbname']} user={instance['user']} "
        f"password={instance['password']} sslmode={instance.get('sslmode', 'prefer')} "
        f"connect_timeout=10"
    )

    try:
        open_fn = gzip.open if compress else open
        with psycopg.connect(dsn) as conn:
            with open_fn(filepath, "wt", encoding="utf-8") as f:  # type: ignore[call-overload]
                # Header
                f.write("-- SMS PostgreSQL Backup (psycopg COPY)\n")
                f.write(f"-- Instance: {inst_name}\n")
                f.write(f"-- Database: {instance['dbname']}\n")
                f.write(f"-- Timestamp: {timestamp}\n")
                f.write(f"-- Host: {instance['host']}:{instance['port']}\n\n")

                # Get all tables
                tables = conn.execute(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                    "ORDER BY table_name"
                ).fetchall()

                for (table_name,) in tables:
                    f.write(f"\n-- Table: {table_name}\n")

                    # Get column names
                    cols = conn.execute(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_schema = 'public' AND table_name = %s "
                        "ORDER BY ordinal_position",
                        (table_name,),
                    ).fetchall()
                    col_names = [c[0] for c in cols]

                    if not col_names:
                        continue

                    # COPY data out as CSV
                    copy_sql = f'COPY "{table_name}" ({", ".join(col_names)}) TO STDOUT WITH (FORMAT csv, HEADER true)'
                    with conn.cursor().copy(copy_sql) as copy:
                        f.write(f"-- COPY {table_name} ({len(col_names)} columns)\n")
                        for row_data in copy:
                            f.write(row_data.decode("utf-8") if isinstance(row_data, bytes) else str(row_data))

                    f.write("\n")

        size = filepath.stat().st_size
        _write_backup_metadata(filepath, instance, size, "psycopg_copy")

        return {
            "success": True,
            "filename": filename,
            "size_bytes": size,
            "size_human": _human_size(size),
            "method": "psycopg_copy",
            "compressed": compress,
            "timestamp": timestamp,
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
        backups.append(
            {
                "filename": f.name,
                "size_bytes": f.stat().st_size,
                "size_human": _human_size(f.stat().st_size),
                "created_at": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat(),
                "instance": meta.get("instance_name", "unknown"),
                "method": meta.get("method", "unknown"),
                "compressed": f.name.endswith(".gz"),
            }
        )

    return backups


def delete_backup(filename: str) -> bool:
    """Delete a backup file and its metadata."""
    try:
        filepath = _resolve_backup_path(filename)
    except ValueError:
        raise ValueError("Invalid backup filename")

    if not filepath.exists():
        return False

    filepath.unlink()
    meta_path = _resolve_metadata_path(filepath)
    if meta_path.exists():
        meta_path.unlink()

    return True


def get_backup_path(filename: str) -> Path | None:
    """Get the full path to a backup file for download."""
    try:
        filepath = _resolve_backup_path(filename)
    except ValueError:
        return None
    if not filepath.exists():
        return None
    return filepath


# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------


def restore_backup(instance: dict[str, Any], filename: str) -> dict[str, Any]:
    """Restore a SQL backup to a PostgreSQL instance.

    Uses psql subprocess when available, otherwise psycopg execute.
    Only supports uncompressed .sql files or .sql.gz (auto-decompressed).
    """
    try:
        filepath = _resolve_backup_path(filename)
    except ValueError:
        raise ValueError("Invalid backup filename")
    if not filepath.exists():
        raise FileNotFoundError(f"Backup file not found: {filename}")

    # Read SQL content
    if filename.endswith(".gz"):
        with gzip.open(filepath, "rt", encoding="utf-8") as f:
            sql_content = f.read()
    else:
        sql_content = filepath.read_text(encoding="utf-8")

    # Try psql first (more robust for large restores)
    if shutil.which("psql"):
        return _restore_via_psql(instance, sql_content)

    return _restore_via_psycopg(instance, sql_content)


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


def _restore_via_psycopg(instance: dict[str, Any], sql: str) -> dict[str, Any]:
    """Restore using psycopg execute (line-by-line for safety)."""
    import psycopg

    dsn = (
        f"host={instance['host']} port={instance['port']} "
        f"dbname={instance['dbname']} user={instance['user']} "
        f"password={instance['password']} sslmode={instance.get('sslmode', 'prefer')} "
        f"connect_timeout=10"
    )

    errors: list[str] = []
    executed = 0

    try:
        with psycopg.connect(dsn, autocommit=True) as conn:
            # Split on semicolons and execute statement by statement
            # Skip comments and COPY blocks (psycopg COPY format not directly executable)
            for statement in sql.split(";"):
                stmt = statement.strip()
                if not stmt or stmt.startswith("--"):
                    continue
                try:
                    conn.execute(stmt)
                    executed += 1
                except Exception as exc:
                    errors.append(f"Statement error: {str(exc)[:200]}")
                    if len(errors) > 50:
                        break

        return {
            "success": len(errors) == 0,
            "method": "psycopg",
            "statements_executed": executed,
            "errors": errors[:20],
        }

    except Exception as exc:
        return {
            "success": False,
            "method": "psycopg",
            "error": str(exc),
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
    instance: dict[str, Any],
    size: int,
    method: str,
) -> None:
    """Write a JSON metadata sidecar for a backup file."""
    meta = {
        "instance_name": instance.get("name", "unknown"),
        "host": instance.get("host", ""),
        "port": instance.get("port", 5432),
        "dbname": instance.get("dbname", ""),
        "method": method,
        "size_bytes": size,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    meta_path = _resolve_metadata_path(filepath)
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")


def _read_backup_metadata(filepath: Path) -> dict[str, Any]:
    """Read backup metadata sidecar if it exists."""
    try:
        meta_path = _resolve_metadata_path(filepath)
    except ValueError:
        return {}
    if meta_path.exists():
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}
