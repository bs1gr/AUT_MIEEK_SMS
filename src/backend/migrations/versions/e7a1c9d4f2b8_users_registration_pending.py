"""users.registration_pending: tell a registration awaiting approval from a deactivated account

Until now an inactive account was always shown as a self-registration waiting for approval,
with an Approve button. That included accounts an administrator deactivated on purpose
(2026-10-12: the dev admin@example.com showed up as "waiting for approval", one click from
being active again). Self-registration now sets registration_pending; activation clears it.

Backfill: an inactive user is pending when a "registration" notification names it; every
other inactive account counts as deactivated.

Additive: older installed apps share this database and do not map the column; its server
default lets their inserts work.

Revision ID: e7a1c9d4f2b8
Revises: d5e9f3a2b7c4
Create Date: 2026-10-12 23:50:00.000000

"""

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7a1c9d4f2b8"
down_revision: Union[str, None] = "d5e9f3a2b7c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("registration_pending", sa.Boolean(), nullable=False, server_default=sa.false())
        )

    bind = op.get_bind()
    pending_ids: set[int] = set()
    rows = bind.execute(sa.text("SELECT data FROM notifications WHERE notification_type = 'registration'"))
    for (data,) in rows:
        if isinstance(data, str):  # SQLite returns the JSON text; PostgreSQL a dict
            try:
                data = json.loads(data)
            except ValueError:
                continue
        user_id = data.get("user_id") if isinstance(data, dict) else None
        if isinstance(user_id, int):
            pending_ids.add(user_id)
    if pending_ids:
        users = sa.table("users", sa.column("id", sa.Integer), sa.column("is_active", sa.Boolean),
                         sa.column("registration_pending", sa.Boolean))
        bind.execute(
            users.update()
            .where(users.c.id.in_(sorted(pending_ids)))
            .where(users.c.is_active.is_(False))
            .values(registration_pending=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("registration_pending")
