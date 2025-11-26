"""merge migration heads 2025-11-16

Revision ID: 00c146dcf611
Revises: 2b4c64f9fbba, 5b71c5a90e3d, ffedcba12345
Create Date: 2025-11-16 21:26:33.734124

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '00c146dcf611'
down_revision: Union[str, None] = ('2b4c64f9fbba', '5b71c5a90e3d', 'ffedcba12345')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
