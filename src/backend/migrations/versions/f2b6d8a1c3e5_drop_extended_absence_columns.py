"""Drop the four unused extended-absence columns

Step 2 of 2. The Directorate-approved extended absence limit was removed on 2026-10-07
(d5e9f3a2b7c4), but the columns stayed: installs sharing the QNAP database still mapped them,
and SQLAlchemy selects every mapped column, so dropping them would have broken every course and
enrollment query there. v1.18.56 stopped mapping them; the owner confirmed on 2026-10-13 that
every device runs it.

- courses.absence_limit_extended_percent
- course_enrollments.extended_absence_approved, extended_absence_approved_at,
  extended_absence_note

Downgrade restores the columns empty, with their old defaults: the values were never used.

Revision ID: f2b6d8a1c3e5
Revises: e7a1c9d4f2b8
Create Date: 2026-10-13 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2b6d8a1c3e5"
down_revision: Union[str, None] = "e7a1c9d4f2b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("course_enrollments") as batch_op:
        batch_op.drop_column("extended_absence_note")
        batch_op.drop_column("extended_absence_approved_at")
        batch_op.drop_column("extended_absence_approved")
    with op.batch_alter_table("courses") as batch_op:
        batch_op.drop_column("absence_limit_extended_percent")


def downgrade() -> None:
    with op.batch_alter_table("courses") as batch_op:
        batch_op.add_column(sa.Column("absence_limit_extended_percent", sa.Float(), nullable=True, server_default="15"))
    with op.batch_alter_table("course_enrollments") as batch_op:
        batch_op.add_column(
            sa.Column("extended_absence_approved", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("extended_absence_approved_at", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("extended_absence_note", sa.Text(), nullable=True))
