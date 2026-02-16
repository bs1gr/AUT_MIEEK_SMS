"""merge heads after periods per week

Revision ID: 423e6e15cb20
Revises: b7e8c9d0e1f2, d2e3f4a5b6c7
Create Date: 2026-02-16 19:34:09.349719

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '423e6e15cb20'
down_revision: Union[str, None] = ('b7e8c9d0e1f2', 'd2e3f4a5b6c7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
