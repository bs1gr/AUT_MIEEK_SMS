"""Ensure user_permissions table exists

Revision ID: 9c2e3f7f5d3b
Revises: 935d87ad206c
Create Date: 2026-03-21 14:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9c2e3f7f5d3b"
down_revision: Union[str, None] = "935d87ad206c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _index_exists(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _table_exists("user_permissions"):
        op.create_table(
            "user_permissions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("permission_id", sa.Integer(), nullable=False),
            sa.Column("granted_by", sa.Integer(), nullable=True),
            sa.Column(
                "granted_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["granted_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if (
        _table_exists("user_permissions")
        and _column_exists("user_permissions", "user_id")
        and _column_exists("user_permissions", "permission_id")
        and not _index_exists("user_permissions", "idx_user_permission_unique")
    ):
        op.create_index(
            "idx_user_permission_unique",
            "user_permissions",
            ["user_id", "permission_id"],
            unique=True,
        )

    if (
        _table_exists("user_permissions")
        and _column_exists("user_permissions", "user_id")
        and not _index_exists("user_permissions", "idx_user_permission_user_id")
    ):
        op.create_index("idx_user_permission_user_id", "user_permissions", ["user_id"], unique=False)

    if (
        _table_exists("user_permissions")
        and _column_exists("user_permissions", "expires_at")
        and not _index_exists("user_permissions", "idx_user_permission_expires_at")
    ):
        op.create_index("idx_user_permission_expires_at", "user_permissions", ["expires_at"], unique=False)


def downgrade() -> None:
    if _table_exists("user_permissions"):
        if _index_exists("user_permissions", "idx_user_permission_expires_at"):
            op.drop_index("idx_user_permission_expires_at", table_name="user_permissions")
        if _index_exists("user_permissions", "idx_user_permission_user_id"):
            op.drop_index("idx_user_permission_user_id", table_name="user_permissions")
        if _index_exists("user_permissions", "idx_user_permission_unique"):
            op.drop_index("idx_user_permission_unique", table_name="user_permissions")
        op.drop_table("user_permissions")
