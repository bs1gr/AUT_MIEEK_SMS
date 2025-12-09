"""
Backend Database Module
Consolidated database functionality including connection management, utilities, and migrations.

This module provides:
- Connection management via SQLAlchemy engine and sessions
- Query helpers and common database operations
- Transaction management with automatic rollback
- Soft delete support
- Pagination utilities

Public API exports:
- Connection: engine, SessionLocal, get_session, ensure_schema
- Utilities: transaction, get_active_query, get_active, get_by_id, get_by_id_or_404
             exists, paginate, soft_delete, restore, validate_date_range,
             validate_unique_constraint, bulk_create, bulk_update, PaginatedResult
"""

from backend.db.connection import (
    SessionLocal,
    engine,
    ensure_schema,
    get_session,
)
from backend.db.utils import (
    PaginatedResult,
    bulk_create,
    bulk_update,
    exists,
    get_active,
    get_active_query,
    get_by_id,
    get_by_id_or_404,
    paginate,
    restore,
    soft_delete,
    transaction,
    validate_date_range,
    validate_unique_constraint,
)

__all__ = [
    # Connection
    "engine",
    "SessionLocal",
    "get_session",
    "ensure_schema",
    # Utilities
    "transaction",
    "get_active_query",
    "get_active",
    "get_by_id",
    "get_by_id_or_404",
    "exists",
    "PaginatedResult",
    "paginate",
    "soft_delete",
    "restore",
    "validate_date_range",
    "validate_unique_constraint",
    "bulk_create",
    "bulk_update",
]
