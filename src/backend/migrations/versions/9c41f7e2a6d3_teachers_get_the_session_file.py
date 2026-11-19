"""Teachers get the session file of a semester (sessions:manage)

Revision ID: 9c41f7e2a6d3
Revises: 5189ab647b5a
Create Date: 2026-11-19 02:00:00

The owner decided on 18 November 2026 who may import: "both teachers and admins". Revision
5189ab647b5a read that as the import of students and courses from a file and left the session
file of a semester (Utils > Export > Session Export/Import: export, import, the backups made
before an import and the return to one) with the administrator, saying that it is one more
grant if teachers are to have it. On 19 November the owner asked for that to be finished.

What it does, data only (no table or column changes): the role teacher is granted
sessions:manage. The administrator gets the same grant beside the wildcard, as the seed does,
so that the list of what an administrator holds reads complete. The permission row itself is
added if a database lacks it.

A database whose role tables are still empty is left alone: the seed at start
(backend.routers.routers_rbac._seed_defaults) creates the same state.

Older versions of the application keep working against a database at this revision: the grant
only opens something for them that they already ask sessions:manage for.

Downgrade takes the grant from the role teacher. The administrator's stays (the wildcard opens
the same), and so does the permission row.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9c41f7e2a6d3"
down_revision: Union[str, None] = "5189ab647b5a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SESSION_PERMISSION = ("sessions:manage", "sessions", "manage", "Export and import a semester's session")
GRANTED_TO = ("admin", "teacher")

roles = sa.table("roles", sa.column("id", sa.Integer), sa.column("name", sa.String))
permissions = sa.table(
    "permissions",
    sa.column("id", sa.Integer),
    sa.column("key", sa.String),
    sa.column("resource", sa.String),
    sa.column("action", sa.String),
    sa.column("description", sa.Text),
    sa.column("is_active", sa.Boolean),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)
role_permissions = sa.table(
    "role_permissions",
    sa.column("id", sa.Integer),
    sa.column("role_id", sa.Integer),
    sa.column("permission_id", sa.Integer),
    sa.column("created_at", sa.DateTime(timezone=True)),
)


def _has_role_tables(bind) -> bool:
    tables = set(sa.inspect(bind).get_table_names())
    return {"roles", "permissions", "role_permissions"} <= tables


def _role_id(bind, name: str):
    return bind.execute(sa.select(roles.c.id).where(roles.c.name == name)).scalar()


def _permission_id(bind, key: str):
    return bind.execute(sa.select(permissions.c.id).where(permissions.c.key == key)).scalar()


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_role_tables(bind):
        return
    if bind.execute(sa.select(sa.func.count()).select_from(roles)).scalar_one() == 0:
        return  # the role tables are empty: the seed at start does it
    now = datetime.now(timezone.utc)

    key, resource, action, description = SESSION_PERMISSION
    permission_id = _permission_id(bind, key)
    if permission_id is None:
        bind.execute(
            permissions.insert().values(
                key=key,
                resource=resource,
                action=action,
                description=description,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
        permission_id = _permission_id(bind, key)

    for role_name in GRANTED_TO:
        role_id = _role_id(bind, role_name)
        if role_id is None:
            continue
        held = bind.execute(
            sa.select(role_permissions.c.id).where(
                role_permissions.c.role_id == role_id, role_permissions.c.permission_id == permission_id
            )
        ).first()
        if held is None:
            bind.execute(role_permissions.insert().values(role_id=role_id, permission_id=permission_id, created_at=now))


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_role_tables(bind):
        return
    role_id = _role_id(bind, "teacher")
    permission_id = _permission_id(bind, SESSION_PERMISSION[0])
    if role_id is None or permission_id is None:
        return
    bind.execute(
        role_permissions.delete().where(
            role_permissions.c.role_id == role_id, role_permissions.c.permission_id == permission_id
        )
    )
