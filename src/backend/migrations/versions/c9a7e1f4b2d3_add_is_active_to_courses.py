"""Add is_active to courses

Revision ID: c9a7e1f4b2d3
Revises: 423e6e15cb20
Create Date: 2026-02-16 23:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c9a7e1f4b2d3"
down_revision: Union[str, None] = "423e6e15cb20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _column_exists(inspector, "courses", "is_active"):
        op.add_column(
            "courses",
            sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("TRUE")),
        )

    if not _index_exists(inspector, "courses", "ix_courses_is_active"):
        op.create_index("ix_courses_is_active", "courses", ["is_active"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _index_exists(inspector, "courses", "ix_courses_is_active"):
        op.drop_index("ix_courses_is_active", table_name="courses")

    if _column_exists(inspector, "courses", "is_active"):
        op.drop_column("courses", "is_active")
