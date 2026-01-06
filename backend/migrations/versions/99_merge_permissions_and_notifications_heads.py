"""Merge permissions and notifications migration heads

Revision ID: 99perms_notifs_merge
Revises: 4f5c5aa3de07, aabbccdd2025
Create Date: 2026-01-06 15:00:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "99perms_notifs_merge"
down_revision: Union[str, Sequence[str], None] = (
    "4f5c5aa3de07",
    "aabbccdd2025",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a merge migration, no operations needed
    # Both parent migrations have already been applied
    pass


def downgrade() -> None:
    # For a merge migration, downgrade is not applicable
    pass
