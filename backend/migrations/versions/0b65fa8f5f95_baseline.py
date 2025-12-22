"""baseline

Revision ID: 0b65fa8f5f95
Revises:
Create Date: 2025-10-20 10:34:43.411011

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0b65fa8f5f95"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create core tables from SQLAlchemy models (initial schema)
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("student_id", sa.String(length=50), nullable=False, unique=True),
        sa.Column("enrollment_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("father_name", sa.String(length=100), nullable=True),
        sa.Column("mobile_phone", sa.String(length=30), nullable=True),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("health_issue", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("study_year", sa.Integer(), nullable=True),
    )
    op.create_index("idx_student_active_email", "students", ["is_active", "email"])

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("course_code", sa.String(length=20), nullable=False, unique=True),
        sa.Column("course_name", sa.String(length=200), nullable=False),
        sa.Column("semester", sa.String(length=50), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evaluation_rules", sa.JSON(), nullable=True),
        # absence_penalty added in a later migration (3f2b1a9c0d7e)
        sa.Column("hours_per_week", sa.Float(), nullable=True),
        sa.Column("teaching_schedule", sa.JSON(), nullable=True),
    )

    op.create_table(
        "attendances",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False
        ),
        sa.Column(
            "course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=False
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("period_number", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "idx_attendance_student_date", "attendances", ["student_id", "date"]
    )
    op.create_index("idx_attendance_course_date", "attendances", ["course_id", "date"])

    op.create_table(
        "course_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False
        ),
        sa.Column(
            "course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=False
        ),
        sa.Column("enrolled_at", sa.Date(), nullable=True),
    )
    op.create_index(
        "idx_enrollment_student_course",
        "course_enrollments",
        ["student_id", "course_id"],
        unique=True,
    )

    op.create_table(
        "daily_performances",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False
        ),
        sa.Column(
            "course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=False
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "idx_performance_student_course",
        "daily_performances",
        ["student_id", "course_id"],
    )
    op.create_index(
        "idx_performance_student_date", "daily_performances", ["student_id", "date"]
    )

    op.create_table(
        "grades",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False
        ),
        sa.Column(
            "course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=False
        ),
        sa.Column("assignment_name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("grade", sa.Float(), nullable=False),
        sa.Column("max_grade", sa.Float(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("date_assigned", sa.Date(), nullable=True),
        sa.Column("date_submitted", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("idx_grade_student_course", "grades", ["student_id", "course_id"])
    op.create_index("idx_grade_student_category", "grades", ["student_id", "category"])

    op.create_table(
        "highlights",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False
        ),
        sa.Column("semester", sa.String(length=50), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("highlight_text", sa.Text(), nullable=False),
        sa.Column("date_created", sa.Date(), nullable=True),
        sa.Column("is_positive", sa.Boolean(), nullable=True),
    )
    op.create_index(
        "idx_highlight_student_semester", "highlights", ["student_id", "semester"]
    )


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index("idx_highlight_student_semester", table_name="highlights")
    op.drop_table("highlights")

    op.drop_index("idx_grade_student_category", table_name="grades")
    op.drop_index("idx_grade_student_course", table_name="grades")
    op.drop_table("grades")

    op.drop_index("idx_performance_student_date", table_name="daily_performances")
    op.drop_index("idx_performance_student_course", table_name="daily_performances")
    op.drop_table("daily_performances")

    op.drop_index("idx_enrollment_student_course", table_name="course_enrollments")
    op.drop_table("course_enrollments")

    op.drop_index("idx_attendance_course_date", table_name="attendances")
    op.drop_index("idx_attendance_student_date", table_name="attendances")
    op.drop_table("attendances")

    op.drop_table("courses")

    op.drop_index("idx_student_active_email", table_name="students")
    op.drop_table("students")
