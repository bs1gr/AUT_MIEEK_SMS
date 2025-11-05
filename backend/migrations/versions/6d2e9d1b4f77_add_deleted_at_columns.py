"""add deleted_at columns for soft delete support

Revision ID: 6d2e9d1b4f77
Revises: 039d0af51aab
Create Date: 2025-11-05 12:45:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "6d2e9d1b4f77"
down_revision = "039d0af51aab"
branch_labels = None
depends_on = None


def _add_deleted_at(table_name: str) -> None:
    op.add_column(
        table_name,
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(f"ix_{table_name}_deleted_at", table_name, ["deleted_at"])


def _drop_deleted_at(table_name: str) -> None:
    op.drop_index(f"ix_{table_name}_deleted_at", table_name=table_name)
    op.drop_column(table_name, "deleted_at")


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
