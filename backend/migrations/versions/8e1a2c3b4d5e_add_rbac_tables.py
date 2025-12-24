"""add rbac tables

Revision ID: 8e1a2c3b4d5e
Revises: 00c146dcf611
Create Date: 2025-12-12 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8e1a2c3b4d5e"
down_revision: Union[str, None] = "00c146dcf611"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_permissions_name", "permissions", ["name"], unique=True)

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_role_permission_unique", "role_permissions", ["role_id", "permission_id"], unique=True)

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_role_unique", "user_roles", ["user_id", "role_id"], unique=True)


def downgrade() -> None:
    op.drop_index("idx_user_role_unique", table_name="user_roles")
    op.drop_table("user_roles")
    op.drop_index("idx_role_permission_unique", table_name="role_permissions")
    op.drop_table("role_permissions")
    op.drop_index("idx_permissions_name", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("idx_roles_name", table_name="roles")
    op.drop_table("roles")
