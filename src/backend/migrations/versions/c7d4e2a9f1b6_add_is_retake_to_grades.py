"""Add is_retake to grades: a Midterm or Final Exam grade that replaces the earlier sitting

Revision ID: c7d4e2a9f1b6
Revises: f4c2a8d6e1b3
Create Date: 2026-11-24 10:00:00.000000

Plan todo 80 (the owner, 2026-11-24): the teacher picks the day an exam was taken and can mark a
Midterm or Final Exam grade as the retake. A retake replaces the earlier sitting in the final
grade, which then no longer counts; a retake of the final exam under 50 fails the course. A missed
first sitting has no grade recorded, so only such a mark can tell a retake: the grades' dates are
the days they were typed in.

Additive, false for every grade already stored (no grade is a retake until a teacher says so), and
with a server default, so an installation still on an older version keeps working against a
database that has the column: its new grades are no retakes.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c7d4e2a9f1b6"
down_revision = "f4c2a8d6e1b3"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _has_column("grades", "is_retake"):
        op.add_column(
            "grades",
            sa.Column("is_retake", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    if _has_column("grades", "is_retake"):
        with op.batch_alter_table("grades") as batch:
            batch.drop_column("is_retake")
