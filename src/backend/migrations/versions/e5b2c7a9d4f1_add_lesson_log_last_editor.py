"""Record who last edited a lesson log (updated_by_id, updated_by_name)

Revision ID: e5b2c7a9d4f1
Revises: d3a7b9c1e5f2
Create Date: 2026-11-13 00:00:00

Additive only: two nullable columns on lesson_logs. Installs that have not been updated keep
working against a database that already has them (they neither read nor write the columns), and
entries saved before this migration simply have no recorded editor.

No foreign key on updated_by_id: the name is a snapshot that must outlive the account, and SQLite
cannot add a constraint to an existing table.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e5b2c7a9d4f1"
down_revision: Union[str, None] = "d3a7b9c1e5f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "lesson_logs"
COLUMNS = (
    ("updated_by_id", sa.Integer()),
    ("updated_by_name", sa.String(length=255)),
)


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in set(inspector.get_table_names()):
        return set()
    return {column["name"] for column in inspector.get_columns(TABLE)}


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in set(inspector.get_table_names()):
        return
    existing = _existing_columns()
    for name, column_type in COLUMNS:
        if name not in existing:
            op.add_column(TABLE, sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    existing = _existing_columns()
    for name, _ in reversed(COLUMNS):
        if name in existing:
            op.drop_column(TABLE, name)
