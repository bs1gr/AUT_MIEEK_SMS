"""Database backups: the one way to make one, and the automatic backup.

Until November 2026 a backup existed only when somebody asked for one in Operations (and
before a session import, a restore or a semester archive), while the in-app help said
"Automated backups happen daily". The code that makes a backup lived inside the control
endpoint. It is here now, so the endpoint and the scheduler make the same file the same way.

The automatic backup
--------------------
Every real server checks once an hour (first a minute after it started) whether its newest
automatic backup is older than ``AUTO_BACKUP_INTERVAL_HOURS`` and makes one if so. A check by
the age of the newest file, not a clock time, on purpose: an edition that only runs while
somebody works with it (SMS Lite, a PC that is switched off at night) would never be up at
"02:00", and a server that restarts often must not make a backup at every start.

Automatic backups are always encrypted, are named ``auto_backup_<timestamp>.enc`` and are the
only files the retention rule deletes: backups somebody made by hand are never removed here.

Each server keeps its backups in its own ``BACKUPS_DIR``. Two servers on one shared database
(the cloud host and a PC) each make their own, which is the point: two copies in two places,
neither of them on the machine that holds the database.
"""

from __future__ import annotations

import logging
import shutil
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlparse

from backend.config import get_settings
from backend.services.backup_service_encrypted import BackupServiceEncrypted

logger = logging.getLogger(__name__)

MANUAL_PREFIX = "backup"
AUTOMATIC_PREFIX = "auto_backup"

# Suffixes of the plaintext file a backup goes through before it is encrypted.
_PLAINTEXT_SUFFIXES = (".sql", ".db")


class DatabaseBackupError(Exception):
    """A backup that could not be made, with the HTTP status the endpoint answers with."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def file_time_iso(path: Path) -> str:
    """When a file was written, with its UTC offset.

    Without the offset a browser reads the time as its own local time: a backup made on a
    server whose clock is UTC (a container, the cloud host) showed two or three hours early
    in Cyprus.
    """
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).astimezone().isoformat(timespec="seconds")


def database_backup_dir() -> Path:
    """The folder the Operations page lists: ``<BACKUPS_DIR>/database``."""
    return Path(get_settings().BACKUPS_DIR) / "database"


def _sqlite_database_path(db_url: str) -> Path:
    """The SQLite file a URL names, or raise ``DatabaseBackupError`` (400)."""
    parsed = urlparse(db_url)
    if db_url.endswith(":memory:") or parsed.path in (":memory:", "/:memory:"):
        raise DatabaseBackupError("Cannot create file backup from in-memory SQLite database", 400)

    db_path_str = parsed.path or ""
    # sqlite:///C:/... may parse as /C:/... on Windows
    if len(db_path_str) >= 3 and db_path_str[0] == "/" and db_path_str[2] == ":":
        db_path_str = db_path_str[1:]

    db_path = Path(db_path_str)
    if not db_path.is_absolute():
        # The folder that holds the `backend` package: what this always resolved against.
        db_path = (Path(__file__).resolve().parents[2] / db_path).resolve()

    if not db_path.exists():
        # A relative URL (sqlite:///./data/x.db) means "relative to where the server was
        # started", which is how the engine itself opens it.
        try:
            from sqlalchemy.engine import make_url

            engine_path = make_url(db_url).database
        except Exception:
            engine_path = None
        if engine_path and Path(engine_path).resolve().exists():
            return Path(engine_path).resolve()
        raise DatabaseBackupError(f"SQLite database file not found: {db_path}", 400)

    return db_path


def _encrypt_and_remove_plaintext(
    backup_dir: Path, plaintext_path: Path, backup_name: str, metadata: dict[str, Any]
) -> dict[str, Any]:
    backup_service = BackupServiceEncrypted(backup_dir=backup_dir, enable_encryption=True)
    backup_info = backup_service.create_encrypted_backup(
        source_path=plaintext_path,
        backup_name=backup_name,
        metadata=metadata,
    )
    # Best effort; on Windows a handle can linger for a moment. A leftover of an automatic
    # backup is removed by the next automatic run.
    try:
        plaintext_path.unlink(missing_ok=True)
    except PermissionError:
        logger.warning("Could not remove the temporary dump (file in use): %s", plaintext_path)
    return backup_info


def _backup_postgresql(
    db_url: str,
    backup_dir: Path,
    timestamp: str,
    encrypt: bool,
    prefix: str,
    instance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """A PostgreSQL backup in the application's own data-only format, on every edition.

    Until November 2026 this ran ``pg_dump`` where the client tools were installed (the Docker
    editions, the cloud host) and wrote the data-only format elsewhere. The pg_dump file could
    not be restored by the application into the database it came from: psql failed at every
    CREATE TABLE and COPY, restored nothing, moved the id counters back and was reported as a
    success (seen on PostgreSQL 14, 2026-11-16). The data-only format is the one the
    application restores itself, in one transaction, and the one its round-trip tests cover.
    """
    if instance is None:
        parsed = urlparse(db_url)
        pg_user = unquote(parsed.username) if parsed.username else None
        instance = {
            "name": "primary",
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 5432,
            "user": pg_user,
            "password": unquote(parsed.password) if parsed.password else "",
            "dbname": parsed.path.lstrip("/"),
            "sslmode": dict(item.split("=", 1) for item in (parsed.query or "").split("&") if "=" in item).get(
                "sslmode", "prefer"
            ),
        }
    # Only these two go into the metadata written beside the backup; the credentials stay in
    # the instance and are used for the connection only.
    pg_host = str(instance.get("host") or "localhost")
    pg_database = str(instance.get("dbname") or "")

    if not instance.get("user"):
        raise DatabaseBackupError("PostgreSQL username missing in DATABASE_URL", 400)

    backup_name = f"{prefix}_{timestamp}"
    backup_filename = f"{backup_name}.sql"
    backup_path = backup_dir / backup_filename

    from backend.services.database_manager import create_data_only_backup, get_backup_path

    made = create_data_only_backup(instance, compress=False)
    made_filename = str(made.get("filename", ""))
    made_path = get_backup_path(made_filename) if made_filename else None
    if made_path is None or not made_path.exists():
        raise RuntimeError("The PostgreSQL backup did not produce an output file")
    # It is written into the Database panel's folder; this backup belongs in this one.
    shutil.move(str(made_path), str(backup_path))
    (made_path.parent / f"{made_path.name}.meta.json").unlink(missing_ok=True)
    backup_method = str(made.get("method") or "psycopg_copy")

    file_size = backup_path.stat().st_size
    pg_kind = "PostgreSQL data-only backup"
    pg_warning = (
        "It carries table data, not the schema, which Alembic owns: restore it into "
        "a database at the same migration revision. Restorable here or with psql."
    )
    contents = {
        "tables": made.get("tables"),
        "rows": made.get("rows"),
        "alembic_version": made.get("alembic_version"),
    }

    if encrypt:
        backup_info = _encrypt_and_remove_plaintext(
            backup_dir,
            backup_path,
            backup_name,
            {
                "database_type": "postgresql",
                "database_host": pg_host,
                "database_name": pg_database,
                "backup_method": backup_method,
                "encryption_enabled": True,
                **contents,
            },
        )
        return {
            "message": f"Encrypted {pg_kind} created. {pg_warning}",
            "details": {
                "filename": f"{backup_name}.enc",
                "path": backup_info["backup_path"],
                "original_size": backup_info["original_size"],
                "encrypted_size": backup_info["encrypted_size"],
                "encryption": "AES-256-GCM",
                "timestamp": timestamp,
                "compression_ratio": backup_info["compression_ratio"],
                "database_type": "postgresql",
                "backup_method": backup_method,
                "restorable_in_app": True,
                "warning": pg_warning,
                **contents,
            },
        }

    return {
        "message": f"{pg_kind} created. {pg_warning}",
        "details": {
            "filename": backup_filename,
            "path": str(backup_path),
            "size": file_size,
            "timestamp": timestamp,
            "encryption": None,
            "backup_method": backup_method,
            "database_type": "postgresql",
            "restorable_in_app": True,
            "warning": pg_warning,
            **contents,
        },
    }

def _backup_sqlite(db_url: str, backup_dir: Path, timestamp: str, encrypt: bool, prefix: str) -> dict[str, Any]:
    import sqlite3

    db_path = _sqlite_database_path(db_url)

    backup_name = f"{prefix}_{timestamp}"
    backup_filename = f"{backup_name}.db"
    backup_path = backup_dir / backup_filename

    # SQLite online backup API: a consistent snapshot, safe while the server writes (WAL).
    source_conn = sqlite3.connect(str(db_path))
    try:
        target_conn = sqlite3.connect(str(backup_path))
        try:
            source_conn.backup(target_conn)
        finally:
            target_conn.close()
    finally:
        source_conn.close()

    file_size = backup_path.stat().st_size

    if encrypt:
        backup_info = _encrypt_and_remove_plaintext(
            backup_dir,
            backup_path,
            backup_name,
            {
                "database_type": "sqlite",
                "database_path": str(db_path),
                "backup_method": "sqlite_backup_api",
                "encryption_enabled": True,
            },
        )
        return {
            "message": "Encrypted SQLite backup created successfully",
            "details": {
                "filename": f"{backup_name}.enc",
                "path": backup_info["backup_path"],
                "original_size": backup_info["original_size"],
                "encrypted_size": backup_info["encrypted_size"],
                "encryption": "AES-256-GCM",
                "timestamp": timestamp,
                "compression_ratio": backup_info["compression_ratio"],
                "database_type": "sqlite",
            },
        }

    return {
        "message": "SQLite backup created successfully",
        "details": {
            "filename": backup_filename,
            "path": str(backup_path),
            "size": file_size,
            "timestamp": timestamp,
            "encryption": None,
            "database_type": "sqlite",
        },
    }


def create_database_backup(
    *,
    encrypt: bool = True,
    prefix: str = MANUAL_PREFIX,
    db_url: str | None = None,
    instance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Back up the configured database into ``<BACKUPS_DIR>/database``.

    PostgreSQL: the data-only COPY-format backup the application restores itself. SQLite: a
    consistent snapshot of the file. Returns ``{"message": ..., "details": {...}}``; raises
    ``DatabaseBackupError`` for a database that cannot be backed up this way.

    ``db_url`` names another database than ``DATABASE_URL``: the backup before a migration
    takes the very database the migration runner was given. ``instance`` names another
    PostgreSQL database by its settings (host, port, user, password, dbname, sslmode), as the
    Database panel knows its extra instances; the credentials are used for the connection only.
    """
    settings = get_settings()
    db_url = db_url or settings.DATABASE_URL

    backup_dir = Path(settings.BACKUPS_DIR) / "database"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if instance is not None:
        return _backup_postgresql("", backup_dir, timestamp, encrypt, prefix, instance=instance)
    if db_url.startswith("postgresql"):
        return _backup_postgresql(db_url, backup_dir, timestamp, encrypt, prefix)
    if db_url.startswith("sqlite"):
        return _backup_sqlite(db_url, backup_dir, timestamp, encrypt, prefix)
    raise DatabaseBackupError(
        f"Unsupported database type: {db_url.split(':')[0]}. Supported types: postgresql, sqlite.", 400
    )


# ---------------------------------------------------------------------------
# The automatic backup
# ---------------------------------------------------------------------------

_run_lock = threading.Lock()
# What the last check in this process did; shown on the Operations page. Not persisted: the
# files themselves say when the last backup was made.
_last_attempt: dict[str, Any] = {"at": None, "status": None, "error": None}


def _automatic_settings() -> tuple[bool, int, int]:
    settings = get_settings()
    enabled = bool(getattr(settings, "AUTO_BACKUP_ENABLED", True))
    interval_hours = max(1, int(getattr(settings, "AUTO_BACKUP_INTERVAL_HOURS", 24) or 24))
    keep = max(1, int(getattr(settings, "AUTO_BACKUP_KEEP", 30) or 30))
    return enabled, interval_hours, keep


def list_automatic_backups(backup_dir: Path | None = None) -> list[Path]:
    """The automatic backups in a folder, newest first."""
    backup_dir = backup_dir or database_backup_dir()
    if not backup_dir.exists():
        return []
    files = [p for p in backup_dir.glob(f"{AUTOMATIC_PREFIX}_*.enc") if p.is_file()]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files


def _due_tolerance(interval_hours: int) -> timedelta:
    """How much short of the interval still counts as "due": half an hour, half the gap
    between two checks.

    Without it a server that is always on would drift. Its check comes once an hour, at the
    same minute; yesterday's backup was finished a second after that minute, so today at that
    minute it is a second short of 24 hours old, and the backup would wait for the next check:
    one backup every 25 hours, an hour later each day.
    """
    return min(timedelta(minutes=30), timedelta(hours=interval_hours) / 2)


def automatic_backup_due(
    backup_dir: Path | None = None, interval_hours: int = 24, now: datetime | None = None
) -> bool:
    """True when there is no automatic backup yet, or the newest one is as old as the interval
    (give or take the tolerance above)."""
    backups = list_automatic_backups(backup_dir)
    if not backups:
        return True
    now = now or datetime.now()
    newest = datetime.fromtimestamp(backups[0].stat().st_mtime)
    return now - newest >= timedelta(hours=interval_hours) - _due_tolerance(interval_hours)


def prune_automatic_backups(backup_dir: Path | None = None, keep: int = 30) -> list[str]:
    """Delete automatic backups beyond the newest ``keep``. Never touches any other file."""
    backup_dir = backup_dir or database_backup_dir()
    removed: list[str] = []
    for old in list_automatic_backups(backup_dir)[max(1, keep) :]:
        try:
            old.unlink()
            (backup_dir / ".metadata" / f"{old.stem}.json").unlink(missing_ok=True)
            removed.append(old.name)
        except OSError as exc:
            logger.warning("Could not remove the old automatic backup %s: %s", old.name, exc)
    return removed


def _remove_interrupted_leftovers(backup_dir: Path) -> None:
    """A run that was cut short (the server stopped while it wrote) can leave its plaintext
    dump behind. Only files of the automatic backup are looked at."""
    if not backup_dir.exists():
        return
    for suffix in _PLAINTEXT_SUFFIXES:
        for leftover in backup_dir.glob(f"{AUTOMATIC_PREFIX}_*{suffix}"):
            try:
                leftover.unlink()
                logger.warning("Removed the unfinished automatic backup file %s", leftover.name)
            except OSError as exc:
                logger.warning("Could not remove the unfinished automatic backup file %s: %s", leftover.name, exc)


def remove_readable_leftovers(backup_dir: Path | None = None) -> list[str]:
    """Delete the readable copies that builds up to v1.18.70 left beside encrypted backups.

    On Windows an encrypted backup of a SQLite database left its unencrypted ``<name>.db`` next
    to ``<name>.enc``: the temporary copy was still open when it should have been deleted (fixed
    in v1.18.71). Those files hold the whole database in the clear. A ``.db`` is removed only
    when an ``.enc`` of the same name, not empty, stands beside it, which is how the fault left
    them; a backup somebody made unencrypted on purpose has no such twin and stays. Never
    raises; returns the names it removed.
    """
    backup_dir = backup_dir or database_backup_dir()
    removed: list[str] = []
    if not backup_dir.is_dir():
        return removed
    for readable in backup_dir.glob("*.db"):
        twin = readable.with_suffix(".enc")
        try:
            if not readable.is_file() or not twin.is_file() or twin.stat().st_size == 0:
                continue
            readable.unlink()
            removed.append(readable.name)
        except OSError as exc:
            logger.warning("Could not remove the readable copy %s of an encrypted backup: %s", readable.name, exc)
    if removed:
        logger.info(
            "Removed %d readable copy/copies that older versions left beside encrypted backups: %s",
            len(removed),
            ", ".join(sorted(removed)),
        )
    return removed


def run_automatic_backup(*, force: bool = False) -> dict[str, Any]:
    """Make the automatic backup if one is due. Called by the scheduler; never raises.

    Returns what it did: ``{"status": "created" | "not_due" | "disabled" | "skipped" | "busy" |
    "failed", ...}``.
    """
    enabled, interval_hours, keep = _automatic_settings()
    # At every check, due, switched off or not: the first check comes a minute after the
    # server starts. Neither raises.
    remove_readable_leftovers()
    from backend.services.database_panel_backups import encrypt_legacy_plaintext

    encrypt_legacy_plaintext()
    if not enabled and not force:
        return {"status": "disabled"}

    if not _run_lock.acquire(blocking=False):
        return {"status": "busy"}
    try:
        backup_dir = database_backup_dir()
        if not force and not automatic_backup_due(backup_dir, interval_hours):
            return {"status": "not_due"}

        _last_attempt.update(at=datetime.now().astimezone().isoformat(timespec="seconds"), status=None, error=None)
        try:
            _remove_interrupted_leftovers(backup_dir)
            result = create_database_backup(encrypt=True, prefix=AUTOMATIC_PREFIX)
        except DatabaseBackupError as exc:
            if exc.status_code == 400:
                # Nothing to back up this way (an in-memory database, no file yet): say so
                # once per check at INFO, it is not a failure of the backup.
                logger.info("Automatic database backup skipped: %s", exc.message)
                _last_attempt.update(status="skipped", error=exc.message)
                return {"status": "skipped", "reason": exc.message}
            logger.error("Automatic database backup FAILED: %s", exc.message)
            _last_attempt.update(status="failed", error=exc.message)
            notify_administrators_of_failure(exc.message)
            return {"status": "failed", "error": exc.message}
        except Exception as exc:
            logger.error("Automatic database backup FAILED: %s", exc, exc_info=True)
            _last_attempt.update(status="failed", error=str(exc))
            notify_administrators_of_failure(str(exc))
            return {"status": "failed", "error": str(exc)}

        removed = prune_automatic_backups(backup_dir, keep)
        details = result["details"]
        logger.info(
            "Automatic database backup created: %s (%s bytes, %s); %d older one(s) removed, the newest %d are kept",
            details.get("filename"),
            details.get("encrypted_size"),
            details.get("backup_method") or details.get("database_type"),
            len(removed),
            keep,
        )
        _last_attempt.update(status="created", error=None)
        return {"status": "created", "filename": details.get("filename"), "removed": removed}
    finally:
        _run_lock.release()


# ---------------------------------------------------------------------------
# When the automatic backup fails: somebody has to be told
# ---------------------------------------------------------------------------
#
# A failed backup wrote an ERROR line into a log nobody reads and showed on a page nobody opens
# unless they already suspect something. The administrators now get a notice in the bell, and
# the heartbeat (services/monitor_heartbeat.py) stops telling the outside world that all is well.

BACKUP_FAILED_NOTIFICATION_TYPE = "backup_failed"
# Where the notice takes the administrator: System > Control Panel > Maintenance.
BACKUP_NOTICE_URL = "#/power?showControl=1&tab=maintenance"
# A backup that keeps failing is tried again every hour; one notice a day is enough.
_NOTICE_EVERY = timedelta(hours=24)
_last_failure_notice_at: datetime | None = None
# For "no backup yet": a server that has just started has not had its first check.
_PROCESS_STARTED = time.monotonic()
_FIRST_BACKUP_GRACE_SECONDS = 15 * 60
# How far past the interval the newest backup may be before it counts as missing: the check
# is hourly, and a backup may take a while.
_OVERDUE_GRACE = timedelta(hours=3)


def configured_session_factory() -> Callable[[], Any] | None:
    """The sessions of the database this server uses, or None in a test run.

    A test run (and a start with DISABLE_STARTUP_TASKS) must never reach for the configured
    database: on a developer's PC that is a real one. The same rule the lifespan follows.
    """
    from backend.environment import startup_tasks_enabled

    if not startup_tasks_enabled():
        return None
    from backend.db import SessionLocal

    return SessionLocal


def notify_administrators_of_failure(error: str, session_factory: Callable[[], Any] | None = None) -> int:
    """Put a notice in the bell of every active administrator; at most one a day each.

    Never raises: telling somebody must not be able to break the thing it reports on. Returns
    how many notices were created. The notice lives in the database that could not be backed
    up, so when the database itself is gone it cannot be written; the heartbeat covers that.
    """
    global _last_failure_notice_at
    now = datetime.now(timezone.utc)
    if _last_failure_notice_at is not None and now - _last_failure_notice_at < _NOTICE_EVERY:
        return 0

    factory = session_factory or configured_session_factory()
    if factory is None:
        return 0

    created = 0
    try:
        from backend.models import Notification, User
        from backend.services.notification_service import NotificationService

        since = (now - _NOTICE_EVERY).replace(tzinfo=None)
        short_error = (error or "").strip()[:300]
        with factory() as db:
            admin_ids = [
                row.id for row in db.query(User.id).filter(User.role == "admin", User.is_active.is_(True)).all()
            ]
            service = NotificationService(db)
            for admin_id in admin_ids:
                already = (
                    db.query(Notification.id)
                    .filter(
                        Notification.user_id == admin_id,
                        Notification.notification_type == BACKUP_FAILED_NOTIFICATION_TYPE,
                        Notification.created_at >= since,
                    )
                    .first()
                )
                if already:
                    continue
                service.create_notification(
                    user_id=admin_id,
                    notification_type=BACKUP_FAILED_NOTIFICATION_TYPE,
                    title="Automatic backup failed",
                    message=(
                        f"The automatic database backup failed: {short_error}. Until it works again there "
                        "is no new backup. See System > Control Panel > Maintenance > System Operations > "
                        "Manage Backups."
                    ),
                    data={"error": short_error, "url": BACKUP_NOTICE_URL},
                )
                created += 1
        _last_failure_notice_at = now
    except Exception:
        logger.exception("Could not tell the administrators that the automatic backup failed")
    return created


def backup_health(backup_dir: Path | None = None) -> dict[str, Any]:
    """Is the automatic backup in order? For the heartbeat. Never raises.

    ``{"status": "ok" | "disabled" | "problem", "reason": <short, no details>}``. The reason is
    a fixed phrase on purpose: it is sent to a monitoring service outside, and an error text
    can carry host names or more.
    """
    enabled, interval_hours, _keep = _automatic_settings()
    if not enabled:
        return {"status": "disabled", "reason": ""}
    if _last_attempt.get("status") == "failed":
        return {"status": "problem", "reason": "the last automatic backup failed"}
    if _last_attempt.get("status") == "skipped":
        return {"status": "ok", "reason": ""}  # nothing to back up this way (an in-memory database)
    try:
        backups = list_automatic_backups(backup_dir)
    except OSError:
        return {"status": "problem", "reason": "the backups folder cannot be read"}
    if not backups:
        if time.monotonic() - _PROCESS_STARTED < _FIRST_BACKUP_GRACE_SECONDS:
            return {"status": "ok", "reason": ""}  # the first check has not run yet
        return {"status": "problem", "reason": "there is no automatic backup"}
    age = datetime.now() - datetime.fromtimestamp(backups[0].stat().st_mtime)
    if age > timedelta(hours=interval_hours) + _OVERDUE_GRACE:
        return {"status": "problem", "reason": f"the newest automatic backup is {int(age.total_seconds() // 3600)} hours old"}
    return {"status": "ok", "reason": ""}


def automatic_backup_status(backup_dir: Path | None = None) -> dict[str, Any]:
    """What the Operations page shows about the automatic backup. Never raises."""
    enabled, interval_hours, keep = _automatic_settings()
    status: dict[str, Any] = {
        "enabled": enabled,
        "interval_hours": interval_hours,
        "keep": keep,
        "count": 0,
        "last_backup": None,
        "last_backup_filename": None,
        "last_attempt": _last_attempt.get("at"),
        "last_attempt_status": _last_attempt.get("status"),
        "last_error": _last_attempt.get("error") if _last_attempt.get("status") == "failed" else None,
    }
    try:
        backups = list_automatic_backups(backup_dir)
        status["count"] = len(backups)
        if backups:
            status["last_backup"] = file_time_iso(backups[0])
            status["last_backup_filename"] = backups[0].name
    except OSError as exc:
        logger.warning("Could not read the automatic backups: %s", exc)
    return status
