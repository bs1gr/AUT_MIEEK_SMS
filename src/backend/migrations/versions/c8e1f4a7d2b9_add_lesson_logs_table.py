"""Add lesson_logs table (material covered and teacher's notes per teaching period)

Revision ID: c8e1f4a7d2b9
Revises: f2b6d8a1c3e5
Create Date: 2026-11-12 00:00:00

Additive only: one new table and nothing existing is touched, so installs that have not been
updated keep working against a database that already has it.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c8e1f4a7d2b9"
down_revision: Union[str, None] = "f2b6d8a1c3e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "lesson_logs" in set(sa.inspect(bind).get_table_names()):
        return

    op.create_table(
        "lesson_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("period_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("material_covered", sa.Text(), nullable=True),
        sa.Column("teacher_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lesson_logs_id", "lesson_logs", ["id"], unique=False)
    op.create_index("ix_lesson_logs_course_id", "lesson_logs", ["course_id"], unique=False)
    op.create_index("ix_lesson_logs_date", "lesson_logs", ["date"], unique=False)
    # One log per course, date and period: this is what the upsert's lookup and retry rely on.
    op.create_index(
        "idx_lesson_logs_course_date_period",
        "lesson_logs",
        ["course_id", "date", "period_number"],
        unique=True,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "lesson_logs" in set(sa.inspect(bind).get_table_names()):
        op.drop_table("lesson_logs")
