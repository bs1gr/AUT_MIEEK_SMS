"""add deleted_at columns for soft delete support

Revision ID: 6d2e9d1b4f77
Revises: 039d0af51aab
Create Date: 2025-11-05 12:45:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "6d2e9d1b4f77"
down_revision = "039d0af51aab"
branch_labels = None
depends_on = None


def _add_deleted_at(table_name: str) -> None:
    bind = op.get_bind()
    try:
        inspector = sa.inspect(bind)
        existing = [c["name"] for c in inspector.get_columns(table_name)]
    except Exception:
        # Fallback: assume column absent and attempt add (will error if present)
        existing = []

    if "deleted_at" not in existing:
        op.add_column(
            table_name,
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )
        try:
            op.create_index(f"ix_{table_name}_deleted_at", table_name, ["deleted_at"])
        except Exception:
            # Best-effort: ignore if index creation fails due to existing index
            pass


def _drop_deleted_at(table_name: str) -> None:
    bind = op.get_bind()
    try:
        inspector = sa.inspect(bind)
        existing = [c["name"] for c in inspector.get_columns(table_name)]
    except Exception:
        existing = []

    if "deleted_at" in existing:
        try:
            op.drop_index(f"ix_{table_name}_deleted_at", table_name=table_name)
        except Exception:
            pass
        try:
            op.drop_column(table_name, "deleted_at")
        except Exception:
            pass


def upgrade() -> None:
    tables = [
        "students",
        "courses",
        "attendances",
        "course_enrollments",
        "daily_performances",
        "grades",
        "highlights",
    ]
    for table in tables:
        _add_deleted_at(table)


def downgrade() -> None:
    tables = [
        "students",
        "courses",
        "attendances",
        "course_enrollments",
        "daily_performances",
        "grades",
        "highlights",
    ]
    for table in reversed(tables):
        _drop_deleted_at(table)
