"""Merge divergent migration branches

Revision ID: 6f83bf257dc0
Revises: 64887d60dbfb, feature127_import_export
Create Date: 2026-01-22 10:06:15.619670

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f83bf257dc0'
down_revision: Union[str, None] = ('64887d60dbfb', 'feature127_import_export')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
