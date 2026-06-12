"""add login lockout fields

Revision ID: 5b71c5a90e3d
Revises: 18865e982265
Create Date: 2025-11-15 19:20:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "5b71c5a90e3d"  # pragma: allowlist secret
down_revision = "18865e982265"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Idempotent upgrade: add columns/indexes only if they don't exist.

    This prevents failures like "duplicate column name" when migrations were partially applied
    or the target DB already contains these fields (e.g., restored backups).
    """
    bind = op.get_bind()
    insp = sa.inspect(bind)

    existing_cols = {col["name"] for col in insp.get_columns("users")}
    existing_indexes = {ix.get("name") for ix in insp.get_indexes("users")}

    added_failed_col = False
    if "failed_login_attempts" not in existing_cols:
        op.add_column(
            "users",
            sa.Column(
                "failed_login_attempts",
                sa.Integer(),
                nullable=False,
                server_default="0",
            ),
        )
        added_failed_col = True

    if "last_failed_login_at" not in existing_cols:
        op.add_column(
            "users",
            sa.Column("last_failed_login_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "lockout_until" not in existing_cols:
        op.add_column(
            "users",
            sa.Column("lockout_until", sa.DateTime(timezone=True), nullable=True),
        )

    if "ix_users_last_failed_login_at" not in existing_indexes:
        op.create_index(
            "ix_users_last_failed_login_at",
            "users",
            ["last_failed_login_at"],
            unique=False,
        )

    if "ix_users_lockout_until" not in existing_indexes:
        op.create_index("ix_users_lockout_until", "users", ["lockout_until"], unique=False)

    # Best-effort removal of server_default set above when we just created the column.
    # On SQLite, altering defaults is limited; wrap in try/except for safety.
    if added_failed_col:
        try:
            op.alter_column(
                "users",
                "failed_login_attempts",
                server_default=None,
                existing_type=sa.Integer(),
                existing_nullable=False,
            )
        except Exception:
            # Non-fatal on dialects that don't support this alteration
            pass


def downgrade() -> None:
    """Best-effort downgrade: drop if present."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_cols = {col["name"] for col in insp.get_columns("users")}
    existing_indexes = {ix.get("name") for ix in insp.get_indexes("users")}

    if "ix_users_lockout_until" in existing_indexes:
        op.drop_index("ix_users_lockout_until", table_name="users")
    if "ix_users_last_failed_login_at" in existing_indexes:
        op.drop_index("ix_users_last_failed_login_at", table_name="users")
    if "lockout_until" in existing_cols:
        op.drop_column("users", "lockout_until")
    if "last_failed_login_at" in existing_cols:
        op.drop_column("users", "last_failed_login_at")
    if "failed_login_attempts" in existing_cols:
        op.drop_column("users", "failed_login_attempts")
