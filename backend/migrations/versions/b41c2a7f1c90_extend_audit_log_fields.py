"""Extend audit log with change metadata and request id

Revision ID: b41c2a7f1c90
Revises: d37fb9f4bd49
Create Date: 2026-01-06 22:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

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
    with op.batch_alter_table("audit_logs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("old_values", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("new_values", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("change_reason", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("request_id", sa.String(length=64), nullable=True))
        batch_op.create_index("idx_audit_request_id", ["request_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("audit_logs", schema=None) as batch_op:
        batch_op.drop_index("idx_audit_request_id")
        batch_op.drop_column("request_id")
        batch_op.drop_column("change_reason")
        batch_op.drop_column("new_values")
        batch_op.drop_column("old_values")
