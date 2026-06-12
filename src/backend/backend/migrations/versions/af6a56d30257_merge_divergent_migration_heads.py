"""Merge divergent migration heads

Revision ID: af6a56d30257
Revises: 3af743932574, 4bf8a44e5c21
Create Date: 2026-01-28 10:09:47.605030

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "af6a56d30257"
down_revision: Union[str, None] = ("3af743932574", "4bf8a44e5c21")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
