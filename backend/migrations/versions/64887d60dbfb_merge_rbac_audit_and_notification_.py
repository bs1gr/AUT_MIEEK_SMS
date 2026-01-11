"""Merge RBAC audit and notification migration heads

Revision ID: 64887d60dbfb
Revises: b41c2a7f1c90, b6c5a7170d93
Create Date: 2026-01-11 10:30:39.876876

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "64887d60dbfb"
down_revision: Union[str, None] = ("b41c2a7f1c90", "b6c5a7170d93")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
