"""Foreign-key enforcement for SQLite, switched on only where the data already satisfies it.

PostgreSQL always enforces foreign keys. SQLite enforces them only on a connection that has
run ``PRAGMA foreign_keys=ON``, and the engine opens a new connection for every use (NullPool),
so the pragma that ``init_db`` ran once at start never reached the connections the application
works with. A deleted parent row left its children behind, and the next row that got the same
number inherited them (PR 419 repaired one such case, an account's roles).

Switching enforcement on is not harmless for an installation that already holds a row without
its parent: from then on every change to that row would be refused. So this module looks first.
``PRAGMA foreign_key_check`` lists the rows whose parent is missing; when there are none, every
later connection runs ``PRAGMA foreign_keys=ON``. When there are some, nothing changes (the
installation works as it did before), and the log says which tables hold them, so that an
administrator can have them repaired.

Called once, after the migrations, by the lifespan. It never raises.
"""

from __future__ import annotations

import logging
from collections import Counter

from sqlalchemy import event

logger = logging.getLogger(__name__)

# Marks an engine this module has already switched, so a second call does not stack listeners.
_ENFORCED_ATTR = "_sms_sqlite_foreign_keys_enforced"


def foreign_key_violations(engine) -> Counter:
    """Rows without their parent, counted per (child table, parent table).

    Empty on a clean database and on any engine that is not SQLite.
    """
    found: Counter = Counter()
    if engine.dialect.name != "sqlite":
        return found
    with engine.connect() as conn:
        for row in conn.exec_driver_sql("PRAGMA foreign_key_check").fetchall():
            # (table, rowid, parent, fk index)
            found[(row[0], row[2])] += 1
    return found


def _switch_on(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def enable_foreign_keys_where_clean(engine) -> bool:
    """Enforce foreign keys on every new SQLite connection if no row is without its parent.

    Returns True when enforcement is (now) on, False when it was left off: another database
    engine, rows without a parent, or a failure of the check itself.
    """
    try:
        if engine.dialect.name != "sqlite":
            return False
        if getattr(engine, _ENFORCED_ATTR, False):
            return True

        violations = foreign_key_violations(engine)
        if violations:
            detail = ", ".join(f"{child} -> {parent}: {n}" for (child, parent), n in sorted(violations.items()))
            logger.warning(
                "SQLite foreign keys NOT enforced: %d row(s) have no parent row (%s). "
                "The database works as before; have these rows repaired or removed, and the "
                "next start switches enforcement on.",
                sum(violations.values()),
                detail,
            )
            return False

        event.listen(engine, "connect", _switch_on)
        setattr(engine, _ENFORCED_ATTR, True)
        # The pool may already hold a connection (NullPool does not): drop it so that the
        # next use gets the pragma.
        engine.dispose()
        logger.info("SQLite foreign keys are enforced (no row without a parent was found)")
        return True
    except Exception:
        logger.warning("SQLite foreign-key check failed; enforcement left as it was", exc_info=True)
        return False
