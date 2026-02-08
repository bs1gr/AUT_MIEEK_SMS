"""add refresh_tokens table (canonical autogen)

Revision ID: ffedcba12345
Revises: 18865e982265
Create Date: 2025-11-10 21:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ffedcba12345"
down_revision: Union[str, Sequence[str], None] = "18865e982265"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = inspector.get_indexes(table_name)
    return any(idx.get("name") == index_name for idx in indexes)


def upgrade() -> None:
    if not _table_exists("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("jti", sa.String(length=64), nullable=False),
            sa.Column("token_hash", sa.String(length=128), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked", sa.Boolean(), nullable=True, server_default=sa.text("FALSE")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
    if not _index_exists("refresh_tokens", "idx_refresh_tokens_jti"):
        op.create_index("idx_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    if not _index_exists("refresh_tokens", "idx_refresh_tokens_user"):
        op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])
    if not _index_exists("refresh_tokens", "idx_refresh_tokens_expires"):
        op.create_index("idx_refresh_tokens_expires", "refresh_tokens", ["expires_at"])


def downgrade() -> None:
    if not _table_exists("refresh_tokens"):
        return
    if _index_exists("refresh_tokens", "idx_refresh_tokens_expires"):
        op.drop_index("idx_refresh_tokens_expires", table_name="refresh_tokens")
    if _index_exists("refresh_tokens", "idx_refresh_tokens_user"):
        op.drop_index("idx_refresh_tokens_user", table_name="refresh_tokens")
    if _index_exists("refresh_tokens", "idx_refresh_tokens_jti"):
        op.drop_index("idx_refresh_tokens_jti", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
