"""The Database panel's backups are the application's encrypted backups.

Until November 2026 the panel (Control Panel > Maintenance > Database Management) wrote its own
backups: pg_dump scripts or data-only COPY files, in the clear (some gzipped), into
``<BACKUPS_DIR>/postgres``, with a list of their own. Every other backup of the application is
encrypted (AES-256-GCM, the installation's ``master.key``) and lives in
``<BACKUPS_DIR>/database``. A plain file with every student's data in it is the weak point of a
backup set, so the panel now makes, lists, downloads, deletes and restores the same encrypted
backups as Manage Backups, for the database it is asked about.

Files the panel wrote before are encrypted where they lie by ``encrypt_legacy_plaintext``: the
encrypted copy goes into ``<BACKUPS_DIR>/database``, it is decrypted and compared with the
original byte for byte, and only then is the plain file deleted. It runs at every automatic
backup check.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import logging
import re
import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from backend.config import get_settings
from backend.services import database_backup
from backend.services.backup_service_encrypted import BackupServiceEncrypted

logger = logging.getLogger(__name__)

# Only these names are accepted from a request: a plain name ending in .enc.
_ENC_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,200}\.enc$")
# A plain file younger than this may still be being written (a backup in progress moves its
# file out of the legacy folder when it is done); it is left for the next check.
LEGACY_MIN_AGE_SECONDS = 10 * 60


def _backup_dir() -> Path:
    return database_backup.database_backup_dir()


def _legacy_dir() -> Path:
    return Path(get_settings().BACKUPS_DIR) / "postgres"


def instance_url(instance: dict[str, Any]) -> str:
    """The SQLAlchemy URL of a configured instance; the primary is ``DATABASE_URL`` itself."""
    if instance.get("is_primary") or instance.get("name") == "primary":
        return str(get_settings().DATABASE_URL)
    user = quote(str(instance.get("user") or ""), safe="")
    password = quote(str(instance.get("password") or ""), safe="")
    host = str(instance.get("host") or "localhost")
    port = int(instance.get("port") or 5432)
    dbname = quote(str(instance.get("dbname") or ""), safe="")
    sslmode = quote(str(instance.get("sslmode") or "prefer"), safe="")
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode={sslmode}"


def _human_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def make_backup(instance: dict[str, Any]) -> dict[str, Any]:
    """An encrypted backup of the instance, the same kind as Manage Backups makes.

    Returns the fields of the panel's ``BackupResult``; raises ``DatabaseBackupError``.
    """
    result = database_backup.create_database_backup(
        encrypt=True, prefix=database_backup.MANUAL_PREFIX, db_url=instance_url(instance)
    )
    details = result.get("details", {})
    size = int(details.get("encrypted_size") or 0)
    return {
        "success": True,
        "filename": details.get("filename"),
        "size_bytes": size,
        "size_human": _human_size(size),
        "method": details.get("backup_method"),
        "compressed": False,
        "encrypted": True,
        "timestamp": details.get("timestamp"),
        "restorable": bool(details.get("restorable_in_app", True)),
        "warning": details.get("warning"),
        "tables": details.get("tables"),
        "rows": details.get("rows"),
        "alembic_version": details.get("alembic_version"),
    }


def _metadata(path: Path) -> dict[str, Any]:
    meta_path = path.parent / ".metadata" / f"{path.stem}.json"
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _instance_name(meta: dict[str, Any], instances: list[dict[str, Any]]) -> str:
    """Which configured instance a backup is of: by host and database name, else the primary."""
    host, dbname = meta.get("database_host"), meta.get("database_name")
    for inst in instances:
        if host and dbname and inst.get("host") == host and inst.get("dbname") == dbname:
            return str(inst.get("name"))
    primary = next((inst for inst in instances if inst.get("is_primary")), None)
    return str(primary.get("name")) if primary else str(dbname or "unknown")


def list_backups(instances: list[dict[str, Any]], instance_name: str | None = None) -> list[dict[str, Any]]:
    """The encrypted PostgreSQL backups in ``<BACKUPS_DIR>/database``, newest first."""
    folder = _backup_dir()
    if not folder.is_dir():
        return []
    rows: list[dict[str, Any]] = []
    for path in folder.glob("*.enc"):
        if not path.is_file():
            continue
        meta = _metadata(path)
        if meta.get("database_type") not in (None, "postgresql"):
            continue  # a SQLite backup: not the panel's business
        name = _instance_name(meta, instances)
        if instance_name and name != instance_name:
            continue
        stat = path.stat()
        rows.append(
            {
                "filename": path.name,
                "size_bytes": stat.st_size,
                "size_human": _human_size(stat.st_size),
                "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "instance": name,
                "method": str(meta.get("backup_method") or "unknown"),
                "compressed": False,
                "encrypted": True,
            }
        )
    rows.sort(key=lambda row: row["created_at"], reverse=True)
    return rows


def find_backup(filename: str) -> Path | None:
    """The encrypted backup of that name in ``<BACKUPS_DIR>/database``; raises ValueError for a
    name that is not a plain ``*.enc`` file name."""
    if not _ENC_NAME.match(filename or "") or Path(filename).name != filename:
        raise ValueError("Invalid backup filename")
    folder = _backup_dir().resolve()
    candidate = (folder / filename).resolve()
    if candidate.parent != folder or not candidate.is_file():
        return None
    return candidate


def delete_backup(filename: str) -> bool:
    path = find_backup(filename)
    if path is None:
        return False
    BackupServiceEncrypted(backup_dir=path.parent, enable_encryption=True).delete_encrypted_backup(path.stem)
    return True


def _decrypted_text(path: Path) -> str:
    """Decrypt an encrypted backup in a private temporary folder and read it as text."""
    service = BackupServiceEncrypted(backup_dir=path.parent, enable_encryption=True)
    work = Path(tempfile.mkdtemp(prefix=".restore-", dir=path.parent))
    try:
        restored = service.restore_encrypted_backup(
            backup_name=path.stem, output_path=work / "x", allowed_base_dir=work
        )
        data = Path(restored["restored_to"]).read_bytes()
    finally:
        shutil.rmtree(work, ignore_errors=True)
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return data.decode("utf-8")


def restore_backup(instance: dict[str, Any], filename: str) -> dict[str, Any]:
    """Restore an encrypted backup into the instance, by the same engine as before.

    Raises ValueError (bad name, not a backup) and FileNotFoundError.
    """
    path = find_backup(filename)
    if path is None:
        raise FileNotFoundError(f"Backup file not found: {filename}")
    if _metadata(path).get("database_type") == "sqlite":
        raise ValueError("This is a backup of a SQLite database; restore it from Manage Backups. Nothing was changed.")
    from backend.services.database_manager import restore_sql_content

    return restore_sql_content(instance, _decrypted_text(path))


# ---------------------------------------------------------------------------
# The plain files the panel wrote before
# ---------------------------------------------------------------------------


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encrypt_legacy_plaintext(min_age_seconds: int = LEGACY_MIN_AGE_SECONDS) -> list[str]:
    """Encrypt the panel's old plain backups into ``<BACKUPS_DIR>/database``. Never raises.

    For each ``*.sql`` / ``*.sql.gz`` in ``<BACKUPS_DIR>/postgres`` older than ``min_age_seconds``:
    its SQL (unzipped) is encrypted as ``<name>.enc``, the new file is decrypted again and
    compared with the SQL byte for byte, and only when they match are the plain file and its
    ``.meta.json`` deleted. Returns the names of the plain files that were replaced.
    """
    legacy = _legacy_dir()
    if not legacy.is_dir():
        return []
    target = _backup_dir()
    converted: list[str] = []
    now = time.time()
    for path in sorted(legacy.iterdir()):
        name = path.name
        if not path.is_file() or not (name.endswith(".sql") or name.endswith(".sql.gz")):
            continue
        try:
            if now - path.stat().st_mtime < min_age_seconds:
                continue
            raw = path.read_bytes()
            sql = gzip.decompress(raw) if name.endswith(".gz") else raw
            stem = name[: -len(".sql.gz")] if name.endswith(".sql.gz") else name[: -len(".sql")]
            if (target / f"{stem}.enc").exists():
                stem = f"{stem}_from_panel"
            if (target / f"{stem}.enc").exists():
                logger.warning("Not encrypting %s: %s.enc already exists", name, stem)
                continue
            target.mkdir(parents=True, exist_ok=True)
            old_meta = {}
            meta_path = path.with_name(f"{name}.meta.json")
            if meta_path.is_file():
                try:
                    old_meta = json.loads(meta_path.read_text(encoding="utf-8"))
                except ValueError:
                    old_meta = {}
            work = Path(tempfile.mkdtemp(prefix=".encrypt-", dir=target))
            try:
                plain = work / f"{stem}.sql"
                plain.write_bytes(sql)
                service = BackupServiceEncrypted(backup_dir=target, enable_encryption=True)
                service.create_encrypted_backup(
                    source_path=plain,
                    backup_name=stem,
                    metadata={
                        "database_type": "postgresql",
                        "backup_method": old_meta.get("method", "unknown"),
                        "encryption_enabled": True,
                        "converted_from": name,
                    },
                )
                check = service.restore_encrypted_backup(
                    backup_name=stem, output_path=work / "check", allowed_base_dir=work
                )
                same = _sha256(Path(check["restored_to"]).read_bytes()) == _sha256(sql)
            finally:
                shutil.rmtree(work, ignore_errors=True)
            if not same:
                logger.error(
                    "The encrypted copy of %s did not decrypt to the same content; the plain file is kept", name
                )
                (target / f"{stem}.enc").unlink(missing_ok=True)
                continue
            path.unlink()
            meta_path.unlink(missing_ok=True)
            converted.append(name)
        except Exception as exc:  # one bad file must not stop the others, nor the caller
            logger.warning("Could not encrypt the old plain backup %s: %s", name, exc)
    if converted:
        logger.info(
            "Encrypted %d old plain backup(s) of the Database panel into %s and removed the plain files: %s",
            len(converted),
            target,
            ", ".join(converted),
        )
    return converted
