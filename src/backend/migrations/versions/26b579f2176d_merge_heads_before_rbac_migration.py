"""Merge heads before RBAC migration

Revision ID: 26b579f2176d
Revises: 36c455e672ec, 8e1a2c3b4d5e
Create Date: 2025-12-18 16:26:51.277987

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "26b579f2176d"
down_revision: Union[str, None] = ("36c455e672ec", "8e1a2c3b4d5e")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
__all__ = [
    "revision",
    "down_revision",
    "branch_labels",
    "depends_on",
    "upgrade",
    "downgrade",
]


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
