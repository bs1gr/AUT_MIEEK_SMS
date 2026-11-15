"""One live row per attendance period and per daily rating

Revision ID: a7d4e9c2b5f8
Revises: f6c3d8b1a2e4
Create Date: 2026-11-15 00:00:00

Nothing in the database stopped a second attendance row for the same student, course, date and
teaching period, or a second daily-performance row for the same student, course, date and
category. The application looks before it inserts, which is enough while one process handles one
request at a time and stops being enough with two hosts on one database. The cost of a duplicate
is not cosmetic: the absence limits (fail above 30%, Class Participation lost above 10%) count
attendance rows, and every daily-performance row is one item in its category's average.

What this does, in order:

1. Attendance rows without a period get period 1, which is what "no period" has always meant
   (NULLs are distinct in a unique index, so they would escape the key).
2. Surplus live rows are soft-deleted, never removed: for attendance the lowest id of a slot stays
   (the row the application reads and updates), for ratings the highest id stays (the one the
   Attendance page shows). `deleted_at` is set, so they can be looked at afterwards.
3. Two partial unique indexes (`WHERE deleted_at IS NULL`) keep it that way. A slot whose row was
   deleted can be recorded again.

Additive for installs that have not been updated: they keep working, and the one request an old
build could still send twice is now refused instead of stored twice. The downgrade drops the two
indexes and leaves the rows as they are.
"""

import logging
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a7d4e9c2b5f8"
down_revision: Union[str, None] = "f6c3d8b1a2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger("alembic.runtime.migration")

LIVE = sa.text("deleted_at IS NULL")

attendances = sa.table(
    "attendances",
    sa.column("id", sa.Integer),
    sa.column("student_id", sa.Integer),
    sa.column("course_id", sa.Integer),
    sa.column("date", sa.Date),
    sa.column("period_number", sa.Integer),
    sa.column("deleted_at", sa.DateTime(timezone=True)),
)
daily_performances = sa.table(
    "daily_performances",
    sa.column("id", sa.Integer),
    sa.column("student_id", sa.Integer),
    sa.column("course_id", sa.Integer),
    sa.column("date", sa.Date),
    sa.column("category", sa.String),
    sa.column("deleted_at", sa.DateTime(timezone=True)),
)

# (table, index name, key columns, which id of a slot stays)
SLOTS = (
    (attendances, "uq_attendance_live_slot", ("student_id", "course_id", "date", "period_number"), sa.func.min),
    (
        daily_performances,
        "uq_daily_performance_live_slot",
        ("student_id", "course_id", "date", "category"),
        sa.func.max,
    ),
)


def _soft_delete_surplus(bind, table, key_columns, keep, now) -> int:
    live = table.c.deleted_at.is_(None)
    keepers = (
        sa.select(keep(table.c.id).label("keep_id"))
        .where(live)
        .group_by(*[table.c[name] for name in key_columns])
        .subquery("keepers")
    )
    result = bind.execute(
        table.update().where(live, table.c.id.not_in(sa.select(keepers.c.keep_id))).values(deleted_at=now)
    )
    return int(result.rowcount or 0)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    now = datetime.now(timezone.utc)

    if attendances.name in tables:
        bind.execute(attendances.update().where(attendances.c.period_number.is_(None)).values(period_number=1))

    for table, index_name, key_columns, keep in SLOTS:
        if table.name not in tables:
            continue
        removed = _soft_delete_surplus(bind, table, key_columns, keep, now)
        if removed:
            logger.warning("%s: soft-deleted %s surplus row(s) that repeated a live slot", table.name, removed)
        if index_name in {index["name"] for index in inspector.get_indexes(table.name)}:
            continue
        op.create_index(
            index_name,
            table.name,
            list(key_columns),
            unique=True,
            postgresql_where=LIVE,
            sqlite_where=LIVE,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table, index_name, _key_columns, _keep in SLOTS:
        if table.name not in tables:
            continue
        if index_name in {index["name"] for index in inspector.get_indexes(table.name)}:
            op.drop_index(index_name, table_name=table.name)
