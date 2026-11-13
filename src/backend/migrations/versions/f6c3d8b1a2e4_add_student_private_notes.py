"""Add student_private_notes (a staff member's own notes about a student, per account)

Revision ID: f6c3d8b1a2e4
Revises: e5b2c7a9d4f1
Create Date: 2026-11-13 00:00:00

The notes used to be kept in the browser's localStorage. Additive only: one new table and
nothing existing is touched, so installs that have not been updated keep working against a
database that already has it.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f6c3d8b1a2e4"
down_revision: Union[str, None] = "e5b2c7a9d4f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "student_private_notes"


def upgrade() -> None:
    bind = op.get_bind()
    if TABLE in set(sa.inspect(bind).get_table_names()):
        return

    op.create_table(
        TABLE,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        # 0 = an install without authentication; not a foreign key for that reason.
        sa.Column("user_id", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_student_private_notes_id", TABLE, ["id"], unique=False)
    op.create_index("ix_student_private_notes_student_id", TABLE, ["student_id"], unique=False)
    op.create_index("ix_student_private_notes_user_id", TABLE, ["user_id"], unique=False)
    # One note per student and account: this is what the upsert relies on.
    op.create_index("idx_student_private_notes_student_user", TABLE, ["student_id", "user_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    if TABLE in set(sa.inspect(bind).get_table_names()):
        op.drop_table(TABLE)
