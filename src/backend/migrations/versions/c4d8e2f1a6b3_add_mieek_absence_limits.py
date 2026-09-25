"""add ΜΙΕΕΚ absence limits

Attendance at ΜΙΕΕΚ is compulsory: a student may miss at most 10% of a course's
scheduled teaching periods for the semester, or up to 15% when the Directorate
approves documented reasons. Going over makes attendance "insufficient" (no
final exam). This migration adds:

- courses.absence_limit_percent (default 10) and
  courses.absence_limit_extended_percent (default 15), and
- the per-enrollment Directorate approval for the extended limit.

Existing rows get the defaults; absence_penalty is untouched.

Revision ID: c4d8e2f1a6b3
Revises: b97c31e9c95f
Create Date: 2026-09-25 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d8e2f1a6b3"
down_revision: Union[str, None] = "b97c31e9c95f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("courses") as batch_op:
        batch_op.add_column(sa.Column("absence_limit_percent", sa.Float(), nullable=True, server_default="10"))
        batch_op.add_column(sa.Column("absence_limit_extended_percent", sa.Float(), nullable=True, server_default="15"))

    with op.batch_alter_table("course_enrollments") as batch_op:
        batch_op.add_column(
            sa.Column("extended_absence_approved", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("extended_absence_approved_at", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("extended_absence_note", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("course_enrollments") as batch_op:
        batch_op.drop_column("extended_absence_note")
        batch_op.drop_column("extended_absence_approved_at")
        batch_op.drop_column("extended_absence_approved")

    with op.batch_alter_table("courses") as batch_op:
        batch_op.drop_column("absence_limit_extended_percent")
        batch_op.drop_column("absence_limit_percent")
