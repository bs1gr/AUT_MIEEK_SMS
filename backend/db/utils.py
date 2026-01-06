"""
Database Utilities
Provides transaction management, query helpers, and common database operations.
"""

import logging
from contextlib import contextmanager
from typing import Any, Dict, Optional, TypeVar

from fastapi import HTTPException, Request
from backend.errors import ErrorCode, http_error
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Query, Session

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ============================================================================
# TRANSACTION MANAGEMENT
# ============================================================================


@contextmanager
def transaction(db: Session, auto_commit: bool = True):
    """
    Safe transaction context manager with automatic rollback on errors.

    Usage:
        with transaction(db):
            db.add(student)
            # Auto-commits on success, rolls back on exception

    Args:
        db: SQLAlchemy session
        auto_commit: Whether to automatically commit (default: True)

    Raises:
        SQLAlchemyError: On database errors (after rollback)
    """
    try:
        yield db
        if auto_commit:
            db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Transaction rolled back due to error: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction rolled back due to unexpected error: {e}")
        raise


# ============================================================================
# QUERY HELPERS
# ============================================================================


def get_active_query(db: Session, model: Any) -> Query:
    """
    Get base query for non-deleted (soft delete) records.

    Usage:
        query = get_active_query(db, Student)
        students = query.filter(Student.email.like("%@example.com")).all()

    Args:
        model: SQLAlchemy model class with deleted_at column

    Returns:
        Query filtered for deleted_at IS NULL
    """
    return db.query(model).filter(model.deleted_at.is_(None))


def get_active(
    db: Session, model: Any, filters: Optional[Dict[str, Any]] = None, order_by: Optional[Any] = None
) -> list[Any]:
    """
    Get all non-deleted records matching filters.

    Usage:
        students = get_active(db, Student, {"email": "test@example.com"})
        courses = get_active(db, Course, order_by=Course.course_code)

    Args:
        db: Database session
        model: SQLAlchemy model class
        filters: Dictionary of field: value filters
        order_by: Column to order by

    Returns:
        List of model instances
    """
    query = get_active_query(db, model)

    if filters:
        for key, value in filters.items():
            if value is not None:
                query = query.filter(getattr(model, key) == value)

    if order_by is not None:
        query = query.order_by(order_by)

    return query.all()


def get_by_id(db: Session, model: Any, id: int, include_deleted: bool = False) -> Optional[Any]:
    """
    Get record by ID.

    Args:
        db: Database session
        model: SQLAlchemy model class
        id: Record ID
        include_deleted: Whether to include soft-deleted records

    Returns:
        Model instance or None if not found
    """
    query = db.query(model).execution_options(include_deleted=include_deleted).filter(model.id == id)

    if not include_deleted and hasattr(model, "deleted_at"):
        # Redundant with global filter but kept for explicitness and compatibility
        query = query.filter(model.deleted_at.is_(None))

    return query.first()


def get_by_id_or_404(
    db: Session,
    model: Any,
    id: int,
    include_deleted: bool = False,
    error_code: Optional[ErrorCode] = None,
    request: Optional[Request] = None,
) -> Any:
    """
    Get record by ID or raise 404.

    Usage:
        student = get_by_id_or_404(db, Student, 123)
        # Raises HTTPException(404) if not found

    Args:
        db: Database session
        model: SQLAlchemy model class
        id: Record ID
        include_deleted: Whether to include soft-deleted records

    Returns:
        Model instance

    Raises:
        HTTPException: 404 if not found
    """
    obj = get_by_id(db, model, id, include_deleted)

    if obj is None:
        # Allow callers to provide a stable error code and the request for
        # richer structured error payloads (used throughout the services).
        if error_code is not None:
            raise http_error(
                status_code=404, code=error_code, message=f"{model.__name__} with id {id} not found", request=request
            )

        raise HTTPException(status_code=404, detail=f"{model.__name__} with id {id} not found")

    return obj


def exists(
    db: Session,
    model: Any,
    filters: Dict[str, Any],
    exclude_id: Optional[int] = None,
    include_deleted: bool = False,
) -> bool:
    """
    Check if record exists matching filters.

    Usage:
        # Check if email exists (excluding current user)
        if exists(db, Student, {"email": "test@example.com"}, exclude_id=current_user_id):
            raise HTTPException(409, "Email already in use")

    Args:
        db: Database session
        model: SQLAlchemy model class
        filters: Dictionary of field: value filters
        exclude_id: Optional ID to exclude from check
        include_deleted: Whether to include soft-deleted records

    Returns:
        True if matching record exists
    """
    query = db.query(model).execution_options(include_deleted=include_deleted)

    for key, value in filters.items():
        query = query.filter(getattr(model, key) == value)

    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)

    if not include_deleted and hasattr(model, "deleted_at"):
        query = query.filter(model.deleted_at.is_(None))

    return query.first() is not None


# ============================================================================
# PAGINATION
# ============================================================================


class PaginatedResult:
    """Container for paginated query results with metadata."""

    def __init__(self, items: list, total: int, skip: int, limit: int):
        self.items = items
        self.total = total
        self.skip = skip
        self.limit = limit
        self.pages = (total + limit - 1) // limit  # Ceiling division
        self.current_page = (skip // limit) + 1

    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "items": self.items,
            "total": self.total,
            "skip": self.skip,
            "limit": self.limit,
            "pages": self.pages,
            "current_page": self.current_page,
        }


def paginate(query: Query, skip: int = 0, limit: int = 100, max_limit: int = 1000) -> PaginatedResult:
    """
    Add pagination to query and return results with metadata.

    Usage:
        query = db.query(Student).filter(Student.deleted_at.is_(None))
        result = paginate(query, skip=0, limit=50)
        return result.dict()

    Args:
        query: SQLAlchemy query
        skip: Number of records to skip
        limit: Maximum records to return
        max_limit: Maximum allowed limit (prevents abuse)

    Returns:
        PaginatedResult with items and metadata
    """
    # Enforce max limit
    limit = min(limit, max_limit)

    # Get total count before pagination (strip ORDER BY for faster counts)
    try:
        total = query.order_by(None).count()
    except Exception:
        total = query.count()

    # Apply pagination
    items = query.offset(skip).limit(limit).all()

    return PaginatedResult(items, total, skip, limit)


# ============================================================================
# SOFT DELETE
# ============================================================================


def soft_delete(db: Session, obj: Any) -> Any:
    """
    Soft delete a record by setting deleted_at timestamp.

    Usage:
        student = get_by_id_or_404(db, Student, 123)
        with transaction(db):
            soft_delete(db, student)

    Args:
        db: Database session
        obj: Model instance with deleted_at column

    Returns:
        Updated model instance

    Raises:
        AttributeError: If model doesn't have deleted_at column
    """
    from datetime import datetime, timezone

    if not hasattr(obj, "deleted_at"):
        raise AttributeError(f"{type(obj).__name__} does not support soft delete")

    obj.deleted_at = datetime.now(timezone.utc)
    db.add(obj)

    return obj


def restore(db: Session, obj: Any) -> Any:
    """
    Restore a soft-deleted record.

    Args:
        db: Database session
        obj: Soft-deleted model instance

    Returns:
        Restored model instance
    """
    if hasattr(obj, "deleted_at"):
        obj.deleted_at = None
        db.add(obj)

    return obj


# ============================================================================
# VALIDATION HELPERS
# ============================================================================


def validate_date_range(start_date: Optional[Any], end_date: Optional[Any]) -> None:
    """
    Validate that start_date is before end_date.

    Usage:
        validate_date_range(start_date, end_date)
        # Raises HTTPException(400) if invalid

    Args:
        start_date: Start date/datetime
        end_date: End date/datetime

    Raises:
        HTTPException: 400 if start_date > end_date
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")


def validate_unique_constraint(
    db: Session,
    model: Any,
    field: str,
    value: Any,
    exclude_id: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    """
    Validate that a field value is unique.

    Usage:
        validate_unique_constraint(
            db, Student, "email", student.email,
            exclude_id=student.id,
            error_message="Email already in use"
        )

    Args:
        db: Database session
        model: SQLAlchemy model class
        field: Field name to check
        value: Value to check for uniqueness
        exclude_id: Optional ID to exclude (for updates)
        error_message: Custom error message

    Raises:
        HTTPException: 409 if value already exists
    """
    if exists(db, model, {field: value}, exclude_id=exclude_id):
        message = error_message or f"{field.replace('_', ' ').title()} already exists"
        raise HTTPException(status_code=409, detail=message)


# ============================================================================
# BULK OPERATIONS
# ============================================================================


def bulk_create(db: Session, model: Any, data_list: list[Dict[str, Any]], commit: bool = True) -> list[Any]:
    """
    Bulk create records efficiently.

    Usage:
        students_data = [
            {"name": "Student 1", "email": "s1@test.com"},
            {"name": "Student 2", "email": "s2@test.com"}
        ]
        with transaction(db, auto_commit=False):
            students = bulk_create(db, Student, students_data)

    Args:
        db: Database session
        model: SQLAlchemy model class
        data_list: List of dictionaries with model data
        commit: Whether to commit after bulk insert

    Returns:
        List of created model instances
    """
    instances = [model(**data) for data in data_list]
    db.bulk_save_objects(instances, return_defaults=True)

    if commit:
        db.commit()

    return instances


def bulk_update(db: Session, model: Any, updates: list[Dict[str, Any]], commit: bool = True) -> int:
    """
    Bulk update records efficiently.

    Args:
        db: Database session
        model: SQLAlchemy model class
        updates: List of dicts with 'id' and fields to update
        commit: Whether to commit after bulk update

    Returns:
        Number of records updated
    """
    count = 0
    for update_data in updates:
        id = update_data.pop("id")
        db.query(model).filter(model.id == id).update(update_data)
        count += 1

    if commit:
        db.commit()

    return count
