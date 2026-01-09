"""
Database Connection Configuration
Manages SQLAlchemy engine, session factory, and core database connectivity.
"""

from __future__ import annotations

from typing import Generator

import sqlalchemy as sa
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker, with_loader_criteria

# Import settings and models dynamically to avoid import-time redefinition warnings
from backend.import_resolver import import_from_possible_locations

# Prefer package-qualified imports, fall back to bare module when running as a script
config_mod = import_from_possible_locations("config")
settings = config_mod.settings
models = import_from_possible_locations("models")

# Create engine from configuration using models.init_db for dev convenience
try:
    engine = models.init_db(settings.DATABASE_URL)
except Exception:
    # Fallback in case init_db changes signature
    engine = create_engine(settings.DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)


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


def get_session(_: object | None = None) -> Generator[Session, None, None]:
    """
    FastAPI dependency for database session.
    Yields a session and ensures it's closed after use.

    Usage:
        @app.get("/items")
        async def list_items(db: Session = Depends(get_session)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(engine, table: str, column: str, coltype_sql: str, default_sql: str | None = None) -> None:
    """Ensure a column exists; if missing, add it with optional DEFAULT.
    Works on SQLite and other SQL dialects best-effort without Alembic.
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
        # Best effort; leave handling/logging to caller
        pass


def ensure_schema(engine) -> None:
    """Best-effort schema guard for runtime safety.
    - Adds courses.absence_penalty FLOAT DEFAULT 0.0 if missing.
    """
    _ensure_column(engine, "courses", "absence_penalty", "FLOAT", "0.0")
