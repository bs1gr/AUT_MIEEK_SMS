"""A backup of the database right before a migration changes it.

Why: a backup holds the tables as they were when it was made, and a release that changes the
database can only restore backups of its own schema. Without this, an update that migrated the
shared database left every earlier backup restorable only with the earlier release, and the rows
a migration rewrote were saved by hand (v1.18.70). Now each runner makes one encrypted backup,
``pre_migration_<timestamp>.enc`` in ``<BACKUPS_DIR>/database``, before it applies pending
migrations. Restored together with the release that made it, nothing is lost.

When no backup is made: a new, empty database (nothing to keep), a database that is already at
the newest revision (nothing will change), and a database at a revision this code does not know
(a newer release migrated it; this code will not migrate it either).

When the backup fails, the migration does not run: the runner reports a failure, as it does for
a failed migration. That is the usual rule for an upgrade that changes data. An operator who has
a backup of their own can set ``SMS_SKIP_MIGRATION_BACKUP=1`` for one start. A database the
backup cannot handle at all (an in-memory database, an unsupported engine) is not a failure.

These backups are kept like a manual one: the retention rule of the automatic backup never
removes them.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from alembic.util import CommandError
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)

PREFIX = "pre_migration"
SKIP_ENV = "SMS_SKIP_MIGRATION_BACKUP"


@dataclass(frozen=True)
class MigrationState:
    """Where the database stands against this code's migrations."""

    current: tuple[str, ...]  # the database's revision(s); empty for a new database
    heads: tuple[str, ...]  # the newest revision(s) this code has
    known: bool  # False when the database is at a revision this code does not have

    @property
    def pending(self) -> bool:
        """True when ``upgrade head`` would change the database."""
        return bool(self.current) and self.known and set(self.current) != set(self.heads)


def target_url(cfg: Config) -> str:
    """The database the migration will change, by the rule of ``migrations/env.py``: the
    config's URL, else ``DATABASE_URL`` from the environment, else the settings.
    (get_main_option undoes the "%%" escaping the runners apply for ConfigParser.)"""
    configured = (cfg.get_main_option("sqlalchemy.url") or "").strip()
    if configured and not configured.startswith("driver://"):
        return configured
    env_url = os.environ.get("DATABASE_URL", "").strip()
    if env_url:
        return env_url
    from backend.config import get_settings

    return get_settings().DATABASE_URL


def migration_state(cfg: Config) -> MigrationState:
    """Read the database's revision and compare it with this code's heads (read only)."""
    script = ScriptDirectory.from_config(cfg)
    heads = tuple(script.get_heads())
    engine = create_engine(target_url(cfg))
    try:
        with engine.connect() as connection:
            current = tuple(MigrationContext.configure(connection).get_current_heads())
    finally:
        engine.dispose()
    known = True
    for revision in current:
        try:
            if script.get_revision(revision) is None:
                known = False
        except CommandError:
            known = False
    return MigrationState(current=current, heads=heads, known=known)


def backup_before_migrating(cfg: Config) -> dict[str, Any]:
    """Make the backup if migrations are pending. Never raises.

    Returns ``{"status": ...}``, one of ``not_needed`` (nothing will change), ``created``
    (with ``filename``), ``skipped`` (the database cannot be backed up this way, or the
    operator set SMS_SKIP_MIGRATION_BACKUP) and ``failed`` (with ``error``). Only ``failed``
    stops the migration.
    """
    try:
        state = migration_state(cfg)
    except Exception as exc:
        # The migration itself will meet the same problem and report it.
        logger.warning("Could not read the database's revision before migrating: %s", exc)
        return {"status": "not_needed", "reason": f"revision unreadable: {exc}"}

    if not state.pending:
        return {"status": "not_needed", "current": list(state.current), "heads": list(state.heads)}

    if os.environ.get(SKIP_ENV, "").strip().lower() in ("1", "true", "yes"):
        logger.warning(
            "%s is set: migrating %s -> %s WITHOUT a backup made just before",
            SKIP_ENV,
            ",".join(state.current),
            ",".join(state.heads),
        )
        return {"status": "skipped", "reason": SKIP_ENV}

    from backend.services.database_backup import DatabaseBackupError, create_database_backup

    try:
        result = create_database_backup(encrypt=True, prefix=PREFIX, db_url=target_url(cfg))
    except DatabaseBackupError as exc:
        if exc.status_code == 400:
            logger.info("No backup before migrating: %s", exc.message)
            return {"status": "skipped", "reason": exc.message}
        return _failed(state, exc.message)
    except Exception as exc:
        return _failed(state, str(exc))

    filename = result.get("details", {}).get("filename")
    logger.info(
        "Backup made before migrating %s -> %s: %s",
        ",".join(state.current),
        ",".join(state.heads),
        filename,
    )
    return {"status": "created", "filename": filename, "current": list(state.current), "heads": list(state.heads)}


def _failed(state: MigrationState, error: str) -> dict[str, Any]:
    logger.error(
        "The backup before migrating %s -> %s FAILED, so the database is NOT migrated: %s. "
        "Repair the backup (Control Panel > Maintenance shows its folder), or, with a backup "
        "of your own, start once with %s=1.",
        ",".join(state.current),
        ",".join(state.heads),
        error,
        SKIP_ENV,
    )
    try:
        from backend.services.database_backup import notify_administrators_of_failure

        notify_administrators_of_failure(f"Backup before a database update failed, update not applied: {error}")
    except Exception:  # never let telling stop the runner
        logger.debug("Could not notify the administrators of the failed backup", exc_info=True)
    return {"status": "failed", "error": error}
