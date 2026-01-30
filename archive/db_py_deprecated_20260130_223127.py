"""
DEPRECATED: Database Connection Module (Moved to backend.db package)

This module is maintained for backward compatibility only.
All functionality has been moved to:
- backend.db.connection (engine, SessionLocal, get_session, ensure_schema)
- backend.db.utils (transaction, query helpers, etc.)

NEW CODE SHOULD IMPORT FROM:
    from backend.db import get_session, engine, SessionLocal, ensure_schema

MIGRATION PATH:
1. v1.11.0-v1.11.x: Deprecation warnings, dual imports working
2. v1.12.0: db.py and db_utils.py removed, direct package imports required

This file will be removed in v1.12.0. Please update imports.
"""

# Re-export all functionality from new locations for backward compatibility
from backend.db.connection import (
    SessionLocal,
    engine,
    ensure_schema,
    get_session,
)

__all__ = [
    "engine",
    "SessionLocal",
    "get_session",
    "ensure_schema",
]
