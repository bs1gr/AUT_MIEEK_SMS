from __future__ import annotations

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, Session

# Local imports - handle both direct execution and module import
try:
    from backend.config import settings
    from backend import models
except ModuleNotFoundError:
    # Running directly from backend directory
    from config import settings
    import models

# Create engine from configuration using models.init_db for dev convenience
try:
    engine = models.init_db(settings.DATABASE_URL)
except Exception:
    # Fallback in case init_db changes signature
    engine = create_engine(settings.DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session(_: object | None = None) -> Session:
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
                inspector = inspect(engine)
                cols = [c['name'] for c in inspector.get_columns(table)]
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
