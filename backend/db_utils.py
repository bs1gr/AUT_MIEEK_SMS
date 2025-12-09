"""
DEPRECATED: Database Utilities Module (Moved to backend.db package)

This module is maintained for backward compatibility only.
All functionality has been moved to:
- backend.db.utils (transaction, query helpers, soft delete, pagination, etc.)

NEW CODE SHOULD IMPORT FROM:
    from backend.db import transaction, get_by_id, soft_delete, etc.

MIGRATION PATH:
1. v1.11.0-v1.11.x: Deprecation warnings, dual imports working
2. v1.12.0: db.py and db_utils.py removed, direct package imports required

This file will be removed in v1.12.0. Please update imports.
"""

# Re-export all functionality from new locations for backward compatibility
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
