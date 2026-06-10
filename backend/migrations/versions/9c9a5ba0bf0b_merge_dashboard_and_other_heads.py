"""Merge dashboard and other heads

Revision ID: 9c9a5ba0bf0b
Revises: 9c2e3f7f5d3b, f129_add_custom_dashboards
Create Date: 2026-06-09 22:44:44.756951

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '9c9a5ba0bf0b'
down_revision: Union[str, None] = ('9c2e3f7f5d3b', 'f129_add_custom_dashboards')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
