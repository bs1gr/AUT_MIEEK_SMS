"""add users table

Revision ID: 9a1d2b3c4d56
Revises: 3f2b1a9c0d7e
Create Date: 2025-10-30 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9a1d2b3c4d56"  # pragma: allowlist secret
down_revision: Union[str, None] = "3f2b1a9c0d7e"  # pragma: allowlist secret
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
    if not _table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False, unique=True),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=200), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=False, server_default="teacher"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
            ),
        )

    if not _index_exists("users", "ix_users_email"):
        op.create_index("ix_users_email", "users", ["email"])
    if not _index_exists("users", "ix_users_role"):
        op.create_index("ix_users_role", "users", ["role"])
    if not _index_exists("users", "ix_users_is_active"):
        op.create_index("ix_users_is_active", "users", ["is_active"])
    if not _index_exists("users", "idx_users_email_role"):
        op.create_index("idx_users_email_role", "users", ["email", "role"])


def downgrade() -> None:
    if not _table_exists("users"):
        return
    if _index_exists("users", "idx_users_email_role"):
        op.drop_index("idx_users_email_role", table_name="users")
    if _index_exists("users", "ix_users_is_active"):
        op.drop_index("ix_users_is_active", table_name="users")
    if _index_exists("users", "ix_users_role"):
        op.drop_index("ix_users_role", table_name="users")
    if _index_exists("users", "ix_users_email"):
        op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
