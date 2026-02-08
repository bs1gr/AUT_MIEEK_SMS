"""
add absence_penalty to courses

Revision ID: 3f2b1a9c0d7e
Revises: 0b65fa8f5f95
Create Date: 2025-10-23 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "3f2b1a9c0d7e"
down_revision = "0b65fa8f5f95"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    if not _has_column("courses", "absence_penalty"):
        op.add_column("courses", sa.Column("absence_penalty", sa.Float(), nullable=True))
    # Set default 0.0 for existing rows
    op.execute("UPDATE courses SET absence_penalty = 0.0 WHERE absence_penalty IS NULL")


def downgrade():
    if _has_column("courses", "absence_penalty"):
        op.drop_column("courses", "absence_penalty")
