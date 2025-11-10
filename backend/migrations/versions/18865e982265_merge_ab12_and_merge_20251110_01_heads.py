"""merge ab12 and merge_20251110_01 heads

Revision ID: 18865e982265
Revises: ab12cd34ef56, merge_20251110_01
Create Date: 2025-11-10 20:59:51.505078

"""
from typing import Sequence, Union

# alembic and sqlalchemy imports are intentionally omitted here because
# this revision is a merge-only, no-op revision used to unify heads.
# Keeping unused imports causes linter noise in CI and local runs.


# revision identifiers, used by Alembic.
revision: str = '18865e982265'
# For Alembic merge revisions the down_revision can be a sequence of parent
# revision ids; annotate accordingly so static type checkers accept the tuple.
down_revision: Union[str, Sequence[str], None] = ('ab12cd34ef56', 'merge_20251110_01')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
