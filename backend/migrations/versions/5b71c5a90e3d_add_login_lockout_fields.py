"""add login lockout fields

Revision ID: 5b71c5a90e3d
Revises: 18865e982265
Create Date: 2025-11-15 19:20:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5b71c5a90e3d"
down_revision = "18865e982265"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "users",
        sa.Column("last_failed_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("lockout_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_last_failed_login_at", "users", ["last_failed_login_at"], unique=False)
    op.create_index("ix_users_lockout_until", "users", ["lockout_until"], unique=False)
    op.alter_column(
        "users",
        "failed_login_attempts",
        server_default=None,
        existing_type=sa.Integer(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.drop_index("ix_users_lockout_until", table_name="users")
    op.drop_index("ix_users_last_failed_login_at", table_name="users")
    op.drop_column("users", "lockout_until")
    op.drop_column("users", "last_failed_login_at")
    op.drop_column("users", "failed_login_attempts")
