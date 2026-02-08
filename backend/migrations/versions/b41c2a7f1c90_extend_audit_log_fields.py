"""Extend audit log with change metadata and request id

Revision ID: b41c2a7f1c90
Revises: d37fb9f4bd49
Create Date: 2026-01-06 22:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b41c2a7f1c90"
down_revision: Union[str, None] = "d37fb9f4bd49"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
__all__ = [
    "revision",
    "down_revision",
    "branch_labels",
    "depends_on",
    "upgrade",
    "downgrade",
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    def _column_exists(table_name: str, column_name: str) -> bool:
        columns = [col["name"] for col in inspector.get_columns(table_name)]
        return column_name in columns

    def _index_exists(table_name: str, index_name: str) -> bool:
        indexes = {idx["name"] for idx in inspector.get_indexes(table_name)}
        return index_name in indexes

    with op.batch_alter_table("audit_logs", schema=None) as batch_op:
        if not _column_exists("audit_logs", "old_values"):
            batch_op.add_column(sa.Column("old_values", sa.JSON(), nullable=True))
        if not _column_exists("audit_logs", "new_values"):
            batch_op.add_column(sa.Column("new_values", sa.JSON(), nullable=True))
        if not _column_exists("audit_logs", "change_reason"):
            batch_op.add_column(sa.Column("change_reason", sa.String(length=500), nullable=True))
        if not _column_exists("audit_logs", "request_id"):
            batch_op.add_column(sa.Column("request_id", sa.String(length=64), nullable=True))
        if not _index_exists("audit_logs", "idx_audit_request_id"):
            batch_op.create_index("idx_audit_request_id", ["request_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("audit_logs", schema=None) as batch_op:
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        indexes = {idx["name"] for idx in inspector.get_indexes("audit_logs")}
        columns = {col["name"] for col in inspector.get_columns("audit_logs")}
        if "idx_audit_request_id" in indexes:
            batch_op.drop_index("idx_audit_request_id")
        if "request_id" in columns:
            batch_op.drop_column("request_id")
        if "change_reason" in columns:
            batch_op.drop_column("change_reason")
        if "new_values" in columns:
            batch_op.drop_column("new_values")
        if "old_values" in columns:
            batch_op.drop_column("old_values")
