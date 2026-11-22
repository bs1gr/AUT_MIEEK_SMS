"""Add semester_periods to courses: a course's own total of periods in the semester

Revision ID: f4c2a8d6e1b3
Revises: e2b7c9d4a1f6
Create Date: 2026-11-22 02:00:00.000000

Plan todo 71 (the owner's choice of 2026-11-22). A course's absence total was always its
periods per week times the semester's weeks, so a schedule changed in the middle of a semester
rewrote the weeks already taught. When a teacher says that a change applies from week N on, the
total of the weeks before N at the old count and the rest at the new one is kept here. Empty
(NULL) for every course: the old rule applies until someone changes a schedule that way.

Additive and nullable, so an installation still on an older version keeps working against a
database that has the column.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "f4c2a8d6e1b3"
down_revision = "e2b7c9d4a1f6"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _has_column("courses", "semester_periods"):
        op.add_column("courses", sa.Column("semester_periods", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _has_column("courses", "semester_periods"):
        op.drop_column("courses", "semester_periods")
