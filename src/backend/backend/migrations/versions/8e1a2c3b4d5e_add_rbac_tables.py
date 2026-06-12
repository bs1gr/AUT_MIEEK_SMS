"""add rbac tables

Revision ID: 8e1a2c3b4d5e
Revises: 00c146dcf611
Create Date: 2025-12-12 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8e1a2c3b4d5e"
down_revision: Union[str, None] = "00c146dcf611"
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


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not _table_exists("roles"):
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    if _column_exists("roles", "name") and not _index_exists("roles", "idx_roles_name"):
        op.create_index("idx_roles_name", "roles", ["name"], unique=True)

    if not _table_exists("permissions"):
        op.create_table(
            "permissions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    if _column_exists("permissions", "name") and not _index_exists("permissions", "idx_permissions_name"):
        op.create_index("idx_permissions_name", "permissions", ["name"], unique=True)

    if not _table_exists("role_permissions"):
        op.create_table(
            "role_permissions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.Column("permission_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if (
        _column_exists("role_permissions", "role_id")
        and _column_exists("role_permissions", "permission_id")
        and not _index_exists("role_permissions", "idx_role_permission_unique")
    ):
        op.create_index("idx_role_permission_unique", "role_permissions", ["role_id", "permission_id"], unique=True)

    if not _table_exists("user_roles"):
        op.create_table(
            "user_roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if (
        _column_exists("user_roles", "user_id")
        and _column_exists("user_roles", "role_id")
        and not _index_exists("user_roles", "idx_user_role_unique")
    ):
        op.create_index("idx_user_role_unique", "user_roles", ["user_id", "role_id"], unique=True)


def downgrade() -> None:
    if _table_exists("user_roles"):
        if _index_exists("user_roles", "idx_user_role_unique"):
            op.drop_index("idx_user_role_unique", table_name="user_roles")
        op.drop_table("user_roles")
    if _table_exists("role_permissions"):
        if _index_exists("role_permissions", "idx_role_permission_unique"):
            op.drop_index("idx_role_permission_unique", table_name="role_permissions")
        op.drop_table("role_permissions")
    if _table_exists("permissions"):
        if _index_exists("permissions", "idx_permissions_name"):
            op.drop_index("idx_permissions_name", table_name="permissions")
        op.drop_table("permissions")
    if _table_exists("roles"):
        if _index_exists("roles", "idx_roles_name"):
            op.drop_index("idx_roles_name", table_name="roles")
        op.drop_table("roles")
