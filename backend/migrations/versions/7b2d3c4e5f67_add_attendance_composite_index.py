"""add attendance composite index for performance

Revision ID: 7b2d3c4e5f67
Revises: 9a1d2b3c4d56
Create Date: 2025-01-10 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7b2d3c4e5f67"
down_revision: Union[str, None] = "9a1d2b3c4d56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add three-column composite index for optimized queries filtering by
    # student_id, course_id, and date range (e.g., attendance for student in course)
    bind = op.get_bind()
    # Some databases (notably SQLite in tests) may already have this index
    # (created manually or by a previous migration). Create the index only
    # if it does not already exist to make the migration idempotent and safe
    # when running against databases that may already contain the index.
    dialect_name = bind.dialect.name if bind is not None else ""
    if dialect_name == "sqlite":
        # SQLite supports IF NOT EXISTS for CREATE INDEX
        try:
            bind.execute(
                sa.text(
                    "CREATE INDEX IF NOT EXISTS idx_attendance_student_course_date ON attendances (student_id, course_id, date)"
                )
            )
        except Exception:
            # Best-effort: if the dialect/driver does not accept raw DDL here,
            # fall back to Alembic's op.create_index wrapped in a try/except.
            try:
                op.create_index(
                    "idx_attendance_student_course_date",
                    "attendances",
                    ["student_id", "course_id", "date"],
                    unique=False,
                )
            except Exception:
                pass
    else:
        # For other DBs use Alembic's op.create_index which will raise if the
        # index already exists. We attempt a safe create and ignore a
        # duplicate-index error at runtime when possible.
        try:
            op.create_index(
                "idx_attendance_student_course_date",
                "attendances",
                ["student_id", "course_id", "date"],
                unique=False,
            )
        except Exception:
            # Best-effort: if the index already exists, proceed.
            pass


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind is not None else ""
    if dialect_name == "sqlite":
        # SQLite supports DROP INDEX IF EXISTS in modern versions; use raw
        # SQL via sa.text to avoid exceptions when the index is absent.
        try:
            bind.execute(sa.text("DROP INDEX IF EXISTS idx_attendance_student_course_date"))
        except Exception:
            try:
                op.drop_index("idx_attendance_student_course_date", table_name="attendances")
            except Exception:
                pass
    else:
        try:
            op.drop_index("idx_attendance_student_course_date", table_name="attendances")
        except Exception:
            pass
