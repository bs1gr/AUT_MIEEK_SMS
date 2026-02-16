"""Add periods_per_week to courses

Revision ID: b7e8c9d0e1f2
Revises: 8f9594fc435d
Create Date: 2026-02-16 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b7e8c9d0e1f2"
down_revision = "8f9594fc435d"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not _has_column("courses", "periods_per_week"):
        op.add_column("courses", sa.Column("periods_per_week", sa.Integer(), nullable=True))
    op.execute("UPDATE courses SET periods_per_week = 0 WHERE periods_per_week IS NULL")


def downgrade() -> None:
    if _has_column("courses", "periods_per_week"):
        op.drop_column("courses", "periods_per_week")
