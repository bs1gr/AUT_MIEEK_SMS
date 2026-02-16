"""Add status to course enrollments

Revision ID: d5b7c9e1f4a0
Revises: c9a7e1f4b2d3
Create Date: 2026-02-17 00:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5b7c9e1f4a0"
down_revision: Union[str, None] = "c9a7e1f4b2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _column_exists(inspector, "course_enrollments", "status"):
        op.add_column(
            "course_enrollments",
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        )

    if not _index_exists(inspector, "course_enrollments", "idx_enrollment_status"):
        op.create_index("idx_enrollment_status", "course_enrollments", ["status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _index_exists(inspector, "course_enrollments", "idx_enrollment_status"):
        op.drop_index("idx_enrollment_status", table_name="course_enrollments")

    if _column_exists(inspector, "course_enrollments", "status"):
        op.drop_column("course_enrollments", "status")
