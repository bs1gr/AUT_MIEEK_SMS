"""ΜΙΕΕΚ absence rules: fail over 30%, Class Participation lost over 10%

Owner's decision, 2026-10-07: a course is failed when absences go over 30% of its scheduled
teaching periods (it was 10%, or 15% with Directorate approval). Over 10% the student loses
the Class Participation share of the final grade. The extended limit is gone.

- courses.absence_limit_percent is now the fail limit: every course is set to 30, and new
  courses default to 30.
- courses.participation_limit_percent (new, default 10).

Additive on purpose: courses.absence_limit_extended_percent and the three
course_enrollments.extended_absence_* columns stay, unused, because older installed apps
share this database and still read them. Drop them once every install runs this version.

Revision ID: d5e9f3a2b7c4
Revises: c4d8e2f1a6b3
Create Date: 2026-10-07 23:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5e9f3a2b7c4"
down_revision: Union[str, None] = "c4d8e2f1a6b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("courses") as batch_op:
        batch_op.add_column(sa.Column("participation_limit_percent", sa.Float(), nullable=True, server_default="10"))
        batch_op.alter_column("absence_limit_percent", existing_type=sa.Float(), server_default="30")
    op.execute("UPDATE courses SET absence_limit_percent = 30")


def downgrade() -> None:
    op.execute("UPDATE courses SET absence_limit_percent = 10")
    with op.batch_alter_table("courses") as batch_op:
        batch_op.alter_column("absence_limit_percent", existing_type=sa.Float(), server_default="10")
        batch_op.drop_column("participation_limit_percent")
