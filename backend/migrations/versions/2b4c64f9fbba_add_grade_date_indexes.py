"""add grade date indexes and ensure attendance composite index

Revision ID: 2b4c64f9fbba
Revises: 18865e982265
Create Date: 2025-11-15 12:00:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = "2b4c64f9fbba"
down_revision: Union[str, Sequence[str], None] = "18865e982265"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_INDEX_DEFINITIONS = (
    ("grades", "idx_grade_date_assigned", ["date_assigned"], False),
    ("grades", "idx_grade_date_submitted", ["date_submitted"], False),
    (
        "attendances",
        "idx_attendance_student_course_date",
        ["student_id", "course_id", "date"],
        False,
    ),
)


def _index_exists(inspector: Inspector, table_name: str, index_name: str) -> bool:
    existing = {idx["name"] for idx in inspector.get_indexes(table_name)}
    return index_name in existing


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table_name, index_name, columns, unique in _INDEX_DEFINITIONS:
        if not _index_exists(inspector, table_name, index_name):
            op.create_index(index_name, table_name, columns, unique=unique)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table_name, index_name, _columns, _unique in reversed(_INDEX_DEFINITIONS):
        if _index_exists(inspector, table_name, index_name):
            op.drop_index(index_name, table_name=table_name)
