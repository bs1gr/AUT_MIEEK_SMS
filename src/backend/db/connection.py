"""
Database Connection Configuration
Manages SQLAlchemy engine, session factory, and core database connectivity.
"""

from __future__ import annotations

import logging
from typing import Generator

import sqlalchemy as sa
from fastapi import Request
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker, with_loader_criteria

# Import settings and models dynamically to avoid import-time redefinition warnings
from backend.import_resolver import import_from_possible_locations

# Prefer explicit package-qualified import to avoid shadowing by root-level 'config' directory
from backend import config as config_mod

settings = config_mod.settings
models = import_from_possible_locations("models")
logger = logging.getLogger(__name__)

# Create engine from configuration using models.init_db for dev convenience
try:
    engine = models.init_db(settings.DATABASE_URL)
except Exception:
    # Fallback in case init_db changes signature
    engine = create_engine(settings.DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

# Opt-in for a far-away database (backend.remote_db_tuning): a second handle on the same pool
# whose connections run without a transaction, used for plain read requests.
_autocommit_engine = None
try:
    from backend import remote_db_tuning as _remote_db_tuning

    if engine.dialect.name == "postgresql" and _remote_db_tuning.autocommit_reads_enabled():
        _autocommit_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
        logger.info("DB_AUTOCOMMIT_READS is on: GET/HEAD/OPTIONS requests run without a transaction")
except Exception:
    logger.warning("Could not set up transaction-less reads; reads keep using transactions", exc_info=True)
    _autocommit_engine = None

# Opt-in permission cache: a write to an RBAC table through this process clears it.
try:
    from backend import permission_cache as _permission_cache

    _permission_cache.install_invalidation(SessionLocal)
except Exception:
    logger.warning("Could not install permission-cache invalidation", exc_info=True)


# ---------------------------------------------------------------------------
# Soft-delete auto-filtering (global)
# ---------------------------------------------------------------------------
# Apply a universal filter to exclude SoftDeleteMixin.deleted_at IS NOT NULL
# for all SELECT statements. Can be bypassed per-query with
# execution_options(include_deleted=True).
try:
    SoftDeleteMixin = getattr(models, "SoftDeleteMixin", None)

    if SoftDeleteMixin is not None:

        @event.listens_for(SessionLocal, "do_orm_execute")
        def _add_soft_delete_filter(execute_state):
            if not execute_state.is_select:
                return

            if execute_state.execution_options.get("include_deleted"):
                return

            execute_state.statement = execute_state.statement.options(
                with_loader_criteria(SoftDeleteMixin, lambda cls: cls.deleted_at.is_(None), include_aliases=True)
            )
except Exception:
    # Best-effort: do not block app startup if filter registration fails
    pass


def get_session(request: Request = None) -> Generator[Session, None, None]:  # type: ignore[assignment]
    """
    FastAPI dependency for database session.
    Yields a session and ensures it's closed after use.

    FastAPI passes the request in; code that calls this by hand (``next(get_db())``) gets an
    ordinary transactional session. With DB_AUTOCOMMIT_READS on, a GET/HEAD/OPTIONS request
    gets a session whose connection runs without a transaction.

    Usage:
        @app.get("/items")
        async def list_items(db: Session = Depends(get_session)):
            return db.query(Item).all()
    """
    if _autocommit_engine is not None and request is not None:
        db = SessionLocal(bind=_remote_db_tuning.session_bind_for(request, engine, _autocommit_engine))
    else:
        db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(engine, table: str, column: str, coltype_sql: str, default_sql: str | None = None) -> None:
    """Ensure a column exists; if missing, add it with optional DEFAULT.
    Works on SQLite and other SQL dialects best-effort without Alembic.

    This is a narrow, hardcoded-argument repair path for databases created
    before a since-committed Alembic migration existed (e.g. an old SQLite
    file predating `3f2b1a9c0d7e_add_absence_penalty_to_courses`) — it is
    NOT a substitute for Alembic and must never be extended with
    caller/user-controlled table or column names. Prefer a normal Alembic
    migration for any new schema change; only add calls here for repairing
    genuinely pre-existing drift.
    """
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
                res = conn.execute(text(f"PRAGMA table_info('{table}')"))
                cols = [row[1] for row in res]
                if column not in cols:
                    alter = f"ALTER TABLE {table} ADD COLUMN {column} {coltype_sql}"
                    if default_sql is not None:
                        alter += f" DEFAULT {default_sql}"
                    conn.execute(text(alter))
                    conn.commit()
            else:
                # Generic approach for other dialects
                inspector = sa.inspect(engine)
                cols = [c["name"] for c in inspector.get_columns(table)]
                if column not in cols:
                    alter = f"ALTER TABLE {table} ADD COLUMN {column} {coltype_sql}"
                    if default_sql is not None:
                        alter += f" DEFAULT {default_sql}"
                    conn.execute(text(alter))
                    conn.commit()
    except Exception:
        # Best-effort repair: log so operators can see a failed self-heal
        # instead of it silently vanishing, but never fail startup over it.
        logger.warning("ensure_schema: failed to repair %s.%s", table, column, exc_info=True)


def ensure_schema(engine) -> None:
    """Best-effort schema guard for runtime safety.
    - Adds courses.absence_penalty FLOAT DEFAULT 0.0 if missing.
    """
    _ensure_column(engine, "courses", "absence_penalty", "FLOAT", "0.0")
