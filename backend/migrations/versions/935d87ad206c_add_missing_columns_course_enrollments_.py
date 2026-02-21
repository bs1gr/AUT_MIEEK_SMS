"""add missing columns - course_enrollments.status and courses.periods_per_week and is_active

Revision ID: 935d87ad206c
Revises: d5b7c9e1f4a0
Create Date: 2026-02-21 15:24:36.597421

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "935d87ad206c"
down_revision: Union[str, None] = "d5b7c9e1f4a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get connection and inspector to check existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Check and add status column to course_enrollments
    existing_ce_columns = {col["name"] for col in inspector.get_columns("course_enrollments")}
    if "status" not in existing_ce_columns:
        with op.batch_alter_table("course_enrollments", schema=None) as batch_op:
            batch_op.add_column(sa.Column("status", sa.String(length=20), nullable=True, server_default="active"))

    # Check and add missing columns to courses table
    existing_course_columns = {col["name"] for col in inspector.get_columns("courses")}
    with op.batch_alter_table("courses", schema=None) as batch_op:
        if "periods_per_week" not in existing_course_columns:
            batch_op.add_column(sa.Column("periods_per_week", sa.Integer(), nullable=True))
        if "is_active" not in existing_course_columns:
            batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=True, server_default="1"))


def downgrade() -> None:
    # Remove added columns (check existence first to avoid errors)
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Remove columns from courses
    existing_course_columns = {col["name"] for col in inspector.get_columns("courses")}
    with op.batch_alter_table("courses", schema=None) as batch_op:
        if "is_active" in existing_course_columns:
            batch_op.drop_column("is_active")
        if "periods_per_week" in existing_course_columns:
            batch_op.drop_column("periods_per_week")

    # Remove column from course_enrollments
    existing_ce_columns = {col["name"] for col in inspector.get_columns("course_enrollments")}
    if "status" in existing_ce_columns:
        with op.batch_alter_table("course_enrollments", schema=None) as batch_op:
            batch_op.drop_column("status")
