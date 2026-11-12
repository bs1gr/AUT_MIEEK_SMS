"""Grant the teacher role reports:generate and reports:export

Revision ID: d3a7b9c1e5f2
Revises: c8e1f4a7d2b9
Create Date: 2026-11-12 00:00:00

Every /analytics, /reports, /metrics and custom-report endpoint requires `reports:generate`, and
the analytics exports accept `reports:export`. The code defaults (backend.rbac) and the permission
reference give both to teachers, but the roles seeded into the database never had them, and the
seed only runs on an empty RBAC table. A teacher therefore got 403 on the Dashboard overview
("Error loading analytics data") and on the Analytics page.

Data only, additive: it creates the two permission rows if they are missing and links them to the
`teacher` role if that role exists. A database whose RBAC tables are still empty is left alone;
the startup seed gives it the same grants.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d3a7b9c1e5f2"
down_revision: Union[str, None] = "c8e1f4a7d2b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERMISSIONS = (
    ("reports:generate", "reports", "generate", "Generate reports and analytics views"),
    ("reports:export", "reports", "export", "Export reports and analytics"),
)

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


def _teacher_role_id(bind) -> Union[int, None]:
    tables = set(sa.inspect(bind).get_table_names())
    if not {"roles", "permissions", "role_permissions"} <= tables:
        return None
    return bind.execute(sa.select(roles.c.id).where(roles.c.name == "teacher")).scalar()


def upgrade() -> None:
    bind = op.get_bind()
    role_id = _teacher_role_id(bind)
    if role_id is None:
        return

    now = datetime.now(timezone.utc)
    for key, resource, action, description in PERMISSIONS:
        permission_id = bind.execute(sa.select(permissions.c.id).where(permissions.c.key == key)).scalar()
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
            permission_id = bind.execute(sa.select(permissions.c.id).where(permissions.c.key == key)).scalar()

        linked = bind.execute(
            sa.select(role_permissions.c.id).where(
                role_permissions.c.role_id == role_id,
                role_permissions.c.permission_id == permission_id,
            )
        ).first()
        if linked is None:
            bind.execute(role_permissions.insert().values(role_id=role_id, permission_id=permission_id, created_at=now))


def downgrade() -> None:
    bind = op.get_bind()
    role_id = _teacher_role_id(bind)
    if role_id is None:
        return
    keys = [key for key, *_ in PERMISSIONS]
    permission_ids = sa.select(permissions.c.id).where(permissions.c.key.in_(keys))
    bind.execute(
        role_permissions.delete().where(
            role_permissions.c.role_id == role_id,
            role_permissions.c.permission_id.in_(permission_ids),
        )
    )
