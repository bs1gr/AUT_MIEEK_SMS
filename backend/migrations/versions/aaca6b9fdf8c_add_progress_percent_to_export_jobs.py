"""add_progress_percent_to_export_jobs

Revision ID: aaca6b9fdf8c
Revises: af6a56d30257
Create Date: 2026-01-31 17:23:53.385967

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aaca6b9fdf8c'
down_revision: Union[str, None] = 'af6a56d30257'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add progress_percent column to export_jobs table
    op.add_column('export_jobs', sa.Column('progress_percent', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove progress_percent column from export_jobs table
    op.drop_column('export_jobs', 'progress_percent')
