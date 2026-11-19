import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# lower() for all letters and translate() on every SQLite connection of the run, as in the
# application (backend.models imports it too; here it does not depend on the order of imports).
import backend.sqlite_unicode  # noqa: F401
from backend.db.sqlite_foreign_keys import _switch_on

# --- Database Setup for Tests ---
# Use an in-memory SQLite database for testing.
# StaticPool is used to ensure the same connection is used across the test session for in-memory DB.
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Note: The datetime adapter deprecation warning in Python 3.12+ comes from SQLAlchemy internals.
# This is expected to be fixed in SQLAlchemy 2.1+. For now, we suppress via pytest config.

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Opt-in: run the suite with SQLite enforcing foreign keys, as PostgreSQL always does and as the
# application does at startup on a database without orphan rows
# (backend.db.sqlite_foreign_keys). `SMS_TEST_SQLITE_FOREIGN_KEYS=1` shows which tests (and which
# endpoints) depend on a row outliving its parent. Off by default: many tests build rows by hand.
if os.environ.get("SMS_TEST_SQLITE_FOREIGN_KEYS", "").strip().lower() in {"1", "true", "yes"}:
    event.listen(engine, "connect", _switch_on)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
