from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
