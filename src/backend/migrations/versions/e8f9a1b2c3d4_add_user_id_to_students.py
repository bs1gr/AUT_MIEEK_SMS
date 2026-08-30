"""Add user_id to students (links a student record to its login account)

Revision ID: e8f9a1b2c3d4
Revises: 9c9a5ba0bf0b
Create Date: 2026-08-30 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e8f9a1b2c3d4"
down_revision: Union[str, None] = "9c9a5ba0bf0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def _fk_exists(inspector: sa.Inspector, table_name: str, fk_name: str) -> bool:
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("students", schema=None) as batch_op:
        if not _column_exists(inspector, "students", "user_id"):
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))

        if not _fk_exists(inspector, "students", "fk_students_user_id_users"):
            batch_op.create_foreign_key(
                "fk_students_user_id_users",
                "users",
                ["user_id"],
                ["id"],
                ondelete="SET NULL",
            )

        if not _index_exists(inspector, "students", "ix_students_user_id"):
            batch_op.create_index("ix_students_user_id", ["user_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("students", schema=None) as batch_op:
        if _index_exists(inspector, "students", "ix_students_user_id"):
            batch_op.drop_index("ix_students_user_id")

        if _fk_exists(inspector, "students", "fk_students_user_id_users"):
            batch_op.drop_constraint("fk_students_user_id_users", type_="foreignkey")

        if _column_exists(inspector, "students", "user_id"):
            batch_op.drop_column("user_id")
