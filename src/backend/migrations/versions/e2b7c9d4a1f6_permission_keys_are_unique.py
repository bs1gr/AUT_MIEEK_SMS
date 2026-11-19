"""A permission's key is unique in the database, as the model says

Revision ID: e2b7c9d4a1f6
Revises: 9c41f7e2a6d3
Create Date: 2026-11-19 03:00:00

The model declares ``Permission.key`` unique. What the migrations left:

- PostgreSQL: revision 3af743932574 makes ``ix_permissions_key`` a unique index. Nothing to do.
- SQLite: that revision skips SQLite, and revision d37fb9f4bd49 before it made the index
  without "unique" and then rebuilt the table. A migrated SQLite database (every SMS Lite, a
  Docker installation on its own database) ended with no unique index on the key: the
  application's checks kept a key from being stored twice, the database did not.

What it does:

- nothing, when a unique index or constraint on ``permissions.key`` is already there;
- otherwise, first makes every key single: of the rows that share a key the oldest stays, the
  grants of the others (to roles and to accounts) are moved to it unless it already has the
  same grant, and the others are deleted. No such rows are expected; a database that has them
  must not fail to start because of them;
- then replaces a non-unique index on the key by the unique ``ix_permissions_key``.

Downgrade leaves the index where it is: it is what the model says, and on PostgreSQL it was
not made by this revision.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e2b7c9d4a1f6"
down_revision: Union[str, None] = "9c41f7e2a6d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "ix_permissions_key"

permissions = sa.table("permissions", sa.column("id", sa.Integer), sa.column("key", sa.String))
role_permissions = sa.table(
    "role_permissions",
    sa.column("id", sa.Integer),
    sa.column("role_id", sa.Integer),
    sa.column("permission_id", sa.Integer),
)
user_permissions = sa.table(
    "user_permissions",
    sa.column("id", sa.Integer),
    sa.column("user_id", sa.Integer),
    sa.column("permission_id", sa.Integer),
)


def _key_is_unique(inspector) -> bool:
    for index in inspector.get_indexes("permissions"):
        if index.get("unique") and list(index.get("column_names") or []) == ["key"]:
            return True
    for constraint in inspector.get_unique_constraints("permissions"):
        if list(constraint.get("column_names") or []) == ["key"]:
            return True
    return False


def _move_grants(bind, table, owner_column, kept_id: int, other_id: int) -> None:
    """Grants of ``other_id`` become grants of ``kept_id``; one the kept row already has goes."""
    owner = table.c[owner_column]
    already = {row[0] for row in bind.execute(sa.select(owner).where(table.c.permission_id == kept_id)).all()}
    for grant_id, owner_id in bind.execute(sa.select(table.c.id, owner).where(table.c.permission_id == other_id)).all():
        if owner_id in already:
            bind.execute(table.delete().where(table.c.id == grant_id))
        else:
            bind.execute(table.update().where(table.c.id == grant_id).values(permission_id=kept_id))
            already.add(owner_id)


def _make_keys_single(bind, tables: set[str]) -> None:
    by_key: dict[str, list[int]] = {}
    for permission_id, key in bind.execute(sa.select(permissions.c.id, permissions.c.key).order_by(permissions.c.id)):
        by_key.setdefault(key, []).append(permission_id)
    for ids in by_key.values():
        kept_id, others = ids[0], ids[1:]
        for other_id in others:
            if "role_permissions" in tables:
                _move_grants(bind, role_permissions, "role_id", kept_id, other_id)
            if "user_permissions" in tables:
                _move_grants(bind, user_permissions, "user_id", kept_id, other_id)
            bind.execute(permissions.delete().where(permissions.c.id == other_id))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "permissions" not in tables:
        return
    if "key" not in {column["name"] for column in inspector.get_columns("permissions")}:
        return
    if _key_is_unique(inspector):
        return

    _make_keys_single(bind, tables)

    # Any non-unique index on the key alone is replaced; the unique one serves the same look-ups.
    for index in inspector.get_indexes("permissions"):
        if list(index.get("column_names") or []) == ["key"] and index.get("name"):
            op.drop_index(index["name"], table_name="permissions")
    op.create_index(INDEX_NAME, "permissions", ["key"], unique=True)


def downgrade() -> None:
    # The index stays (see the module's text).
    pass
