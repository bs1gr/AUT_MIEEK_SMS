"""Merge multiple Alembic heads into a single head

Revision ID: merge_20251110_01
Revises: 6d2e9d1b4f77,7b2d3c4e5f67
Create Date: 2025-11-10 13:30:00.000000

This merge revision unifies the two divergent heads that branched from
revision '9a1d2b3c4d56'. The down_revision list must reference only the
actual head revisions. The upgrade/downgrade are intentionally no-op so
the schema is not altered; the goal is to provide a canonical merge node
in the Alembic graph.
"""


# revision identifiers, used by Alembic.
revision = 'merge_20251110_01'
down_revision = (
    '6d2e9d1b4f77',
    '7b2d3c4e5f67',
)
branch_labels = None
depends_on = None


def upgrade():
    # No schema changes; this revision merges multiple heads into one.
    pass


def downgrade():
    # No-op downgrade
    pass
