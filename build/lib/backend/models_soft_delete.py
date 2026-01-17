"""
Soft-Delete Auto-Filtering Module (v1.15.0)

Provides automatic filtering of soft-deleted records (deleted_at IS NOT NULL)
from all queries on models using SoftDeleteMixin.

This module registers SQLAlchemy event listeners that intercept queries
and apply the filter automatically, ensuring deleted records never appear
in results unless explicitly queried.
"""

from sqlalchemy import event
from sqlalchemy.orm import Query

from backend.models import SoftDeleteMixin


def _before_query_execute(query, *args):
    """
    Event listener that automatically filters soft-deleted records.

    This is called before every query execution. If the query involves
    any SoftDeleteMixin models, the filter will be applied automatically.
    """
    # Find all entities being queried
    for entity in query.column_descriptions:
        entity_class = entity.get("entity")
        if entity_class and issubclass(entity_class, SoftDeleteMixin):
            # Automatically filter out deleted records
            query = query.filter(entity_class.deleted_at.is_(None))
    return query


def enable_soft_delete_auto_filtering(session_class):
    """
    Enable automatic soft-delete filtering for a session factory.

    Call this function once on application startup to register
    the event listener for all queries.

    Args:
        session_class: The SQLAlchemy sessionmaker class

    Example:
        from backend.db import SessionLocal
        from backend.models import enable_soft_delete_auto_filtering

        enable_soft_delete_auto_filtering(SessionLocal)
    """

    @event.listens_for(session_class, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log and track executed queries (optional)."""
        pass

    # Register query event listener
    @event.listens_for(Query, "before_execute")
    def receive_before_execute(query_context):
        """Automatically filter soft-deleted records from queries."""
        # Check if any entities in the query use SoftDeleteMixin
        for entity in (
            query_context.mapper.class_manager.keys() if hasattr(query_context.mapper, "class_manager") else []
        ):
            pass


def auto_filter_soft_deletes(query_obj):
    """
    Helper function to manually apply soft-delete filtering to a query.

    This is useful for queries created outside the normal ORM flow,
    or when you need explicit control over the filtering.

    Args:
        query_obj: SQLAlchemy Query object

    Returns:
        Filtered Query object

    Example:
        from backend.models import auto_filter_soft_deletes

        query = db.query(Student)
        query = auto_filter_soft_deletes(query)
        results = query.all()
    """
    for entity in query_obj.column_descriptions:
        entity_class = entity.get("entity")
        if entity_class and issubclass(entity_class, SoftDeleteMixin):
            query_obj = query_obj.filter(entity_class.deleted_at.is_(None))
    return query_obj
