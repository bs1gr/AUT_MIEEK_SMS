import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend imports work regardless of current working dir
import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT.parent) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT.parent))

from backend.main import app, get_db as main_get_db
from backend.rate_limiting import limiter
from backend.db import get_session as db_get_session
from backend import models

# Create an in-memory SQLite database shared across connections
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

# Create all tables once per test session
models.Base.metadata.create_all(bind=engine)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db(_=None):
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the dependency override for all tests
app.dependency_overrides[main_get_db] = override_get_db
app.dependency_overrides[db_get_session] = override_get_db

# Disable rate limiting in tests to avoid 429s from SlowAPI
try:
    limiter.enabled = False
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
except Exception:
    pass


@pytest.fixture(scope="function", autouse=True)
def clean_db():
    """Clean tables before each test function for isolation."""
    # Truncate all tables by dropping and recreating schema
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)
