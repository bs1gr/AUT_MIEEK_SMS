"""Add semester_archive_exports and student_course_performance tables

Revision ID: a3f7c9e2b5d1
Revises: e8f9a1b2c3d4
Create Date: 2026-08-31 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a3f7c9e2b5d1"
down_revision: Union[str, None] = "e8f9a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "semester_archive_exports" not in existing_tables:
        op.create_table(
            "semester_archive_exports",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("semester", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("export_filename", sa.String(length=255), nullable=True),
            sa.Column("pass_threshold", sa.Float(), nullable=False),
            sa.Column("students_affected", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("courses_affected", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("enrollments_archived", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("enrollments_skipped", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("triggered_by_user_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["triggered_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_semester_archive_exports_id", "semester_archive_exports", ["id"], unique=False
        )
        op.create_index(
            "ix_semester_archive_exports_semester", "semester_archive_exports", ["semester"], unique=False
        )
        op.create_index(
            "ix_semester_archive_exports_status", "semester_archive_exports", ["status"], unique=False
        )

    existing_tables = set(sa.inspect(bind).get_table_names())
    if "student_course_performance" not in existing_tables:
        op.create_table(
            "student_course_performance",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("course_code", sa.String(length=20), nullable=False),
            sa.Column("course_name", sa.String(length=200), nullable=False),
            sa.Column("credits", sa.Integer(), nullable=True),
            sa.Column("semester", sa.String(length=50), nullable=False),
            sa.Column("final_grade", sa.Float(), nullable=False),
            sa.Column("letter_grade", sa.String(length=5), nullable=False),
            sa.Column("gpa", sa.Float(), nullable=True),
            sa.Column("passed", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("total_weight_used", sa.Float(), nullable=False),
            sa.Column("archived_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("archived_by_user_id", sa.Integer(), nullable=True),
            sa.Column("export_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
            sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["archived_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["export_id"], ["semester_archive_exports.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_student_course_performance_id", "student_course_performance", ["id"], unique=False
        )
        op.create_index(
            "ix_student_course_performance_student_id", "student_course_performance", ["student_id"], unique=False
        )
        op.create_index(
            "ix_student_course_performance_course_id", "student_course_performance", ["course_id"], unique=False
        )
        op.create_index(
            "ix_student_course_performance_semester", "student_course_performance", ["semester"], unique=False
        )
        op.create_index(
            "ix_student_course_performance_archived_at", "student_course_performance", ["archived_at"], unique=False
        )
        op.create_index(
            "ix_student_course_performance_export_id", "student_course_performance", ["export_id"], unique=False
        )
        op.create_index(
            "idx_student_course_performance_student_semester",
            "student_course_performance",
            ["student_id", "semester"],
            unique=False,
        )
        op.create_index(
            "idx_student_course_performance_student_course",
            "student_course_performance",
            ["student_id", "course_id"],
            unique=False,
        )
        op.create_index(
            "idx_student_course_performance_unique",
            "student_course_performance",
            ["student_id", "course_code", "semester"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if "student_course_performance" in existing_tables:
        op.drop_table("student_course_performance")

    if "semester_archive_exports" in existing_tables:
        op.drop_table("semester_archive_exports")
