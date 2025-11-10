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
    op.create_index(
        "idx_attendance_student_course_date",
        "attendances",
        ["student_id", "course_id", "date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_attendance_student_course_date", table_name="attendances")