"""Two roles (admin, teacher), "none" for every other account, and a tidied permission list

Revision ID: 5189ab647b5a
Revises: a7d4e9c2b5f8
Create Date: 2026-11-18 11:04:05

The owner's decisions of 18 November 2026, for a database that already has accounts:

1. The roles Viewer and Guest go. They read and exported every record, got no Dashboard
   figures, and nothing in the pages was made for them.
2. "Student" is no longer a role an account can have. Nothing ever tied a student record to
   an account, so such an account could sign in and do nothing.
3. Teachers import students and courses from a file, as administrators do.
4. The permission list holds what the server asks for and nothing else: the thirteen keys
   that endpoints asked for and no row stood for are added, and the eight that no endpoint
   asks for are removed.

What it does, data only (no table or column changes):

- an account whose Role column says student, viewer or guest gets the word of the highest
  role it still holds (admin, teacher), or "none": it can sign in and nothing opens for it;
- the roles viewer and guest are removed, with their grants and with the rows that gave them
  to accounts;
- the eight unused permissions are removed, with their grants;
- the thirteen missing permissions are added;
- the role teacher is granted the four import permissions, and jobs:view, with which the
  Imports tab follows an import it started.

A database whose role tables are still empty is left alone: the seed at start
(backend.routers.routers_rbac._seed_defaults) creates the same state.

Older versions of the application keep working against a database at this revision: they do
not know the word "none" and give it nothing, and they do not need the removed rows.

Downgrade puts the two roles, the eight permissions and their standard grants back and takes
the thirteen permissions and the teacher's import grants away. It cannot know which accounts
were Students, Viewers or Guests: they stay "none".
"""

from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "5189ab647b5a"
down_revision: Union[str, None] = "a7d4e9c2b5f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GONE_ROLES = ("viewer", "guest")
GONE_WORDS = ("student", "viewer", "guest")
KEPT_ROLES = ("admin", "teacher")  # highest first

# Seeded until now, asked for by no endpoint.
UNUSED_PERMISSIONS = (
    ("analytics:view", "analytics", "view", "View analytics dashboards"),
    ("enrollments:view", "enrollments", "view", "View enrollments"),
    ("enrollments:manage", "enrollments", "manage", "Create/update/delete enrollments"),
    ("system:import", "system", "import", "Import data"),
    ("system:export", "system", "export", "Export data"),
    ("students.self:read", "students.self", "read", "Student: view own profile"),
    ("grades.self:read", "grades.self", "read", "Student: view own grades"),
    ("attendance.self:read", "attendance.self", "read", "Student: view own attendance"),
)

# Asked for by endpoints, and no row stood for them: only the wildcard of admin opened them.
MISSING_PERMISSIONS = (
    ("reports:create", "reports", "create", "Create analytics reports"),
    ("analytics:export", "analytics", "export", "Export analytics"),
    ("imports:create", "imports", "create", "Upload a file to import"),
    ("imports:view", "imports", "view", "View import jobs"),
    ("exports:view", "exports", "view", "View export jobs"),
    ("sessions:manage", "sessions", "manage", "Export and import a semester's session"),
    ("jobs:create", "jobs", "create", "Start background jobs"),
    ("jobs:view", "jobs", "view", "View background jobs"),
    ("jobs:manage", "jobs", "manage", "Cancel background jobs"),
    ("jobs:delete", "jobs", "delete", "Delete background jobs"),
    ("diagnostics:view", "diagnostics", "view", "View query diagnostics"),
    ("diagnostics:manage", "diagnostics", "manage", "Reset query diagnostics"),
    ("admin:manage", "admin", "manage", "Clear the analytics cache"),
)

# Two of them were seeded before (admin's wildcard was all that opened them).
IMPORT_PERMISSIONS = (
    ("imports:preview", "imports", "preview", "Preview data import"),
    ("imports:execute", "imports", "execute", "Execute data import"),
)
# jobs:view is with them: the Imports tab follows an import it started through GET /jobs/{id}.
TEACHER_IMPORT_KEYS = ("imports:preview", "imports:execute", "imports:create", "imports:view", "jobs:view")

# For the downgrade: what the two roles held, and what teacher held of the unused eight.
VIEWER_KEYS = (
    "students:view",
    "courses:view",
    "grades:view",
    "attendance:view",
    "enrollments:view",
    "reports:view",
    "analytics:view",
    "exports:generate",
    "exports:download",
)
TEACHER_UNUSED_KEYS = ("enrollments:view", "enrollments:manage", "analytics:view", "system:import", "system:export")

users = sa.table("users", sa.column("id", sa.Integer), sa.column("role", sa.String))
roles = sa.table(
    "roles", sa.column("id", sa.Integer), sa.column("name", sa.String), sa.column("description", sa.String)
)
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
user_roles = sa.table(
    "user_roles", sa.column("id", sa.Integer), sa.column("user_id", sa.Integer), sa.column("role_id", sa.Integer)
)
user_permissions = sa.table(
    "user_permissions",
    sa.column("id", sa.Integer),
    sa.column("user_id", sa.Integer),
    sa.column("permission_id", sa.Integer),
)


def _has_role_tables(bind) -> bool:
    tables = set(sa.inspect(bind).get_table_names())
    return {"users", "roles", "permissions", "role_permissions", "user_roles"} <= tables


def _has_roles(bind) -> bool:
    return bind.execute(sa.select(sa.func.count()).select_from(roles)).scalar_one() > 0


def _role_ids(bind, names) -> dict:
    rows = bind.execute(sa.select(roles.c.name, roles.c.id).where(roles.c.name.in_(names))).all()
    return {name: role_id for name, role_id in rows}


def _permission_id(bind, key: str):
    return bind.execute(sa.select(permissions.c.id).where(permissions.c.key == key)).scalar()


def _add_permission(bind, key: str, resource: str, action: str, description: str, now: datetime):
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
    return permission_id


def _grant(bind, role_id, permission_id, now: datetime) -> None:
    if role_id is None or permission_id is None:
        return
    held = bind.execute(
        sa.select(role_permissions.c.id).where(
            role_permissions.c.role_id == role_id, role_permissions.c.permission_id == permission_id
        )
    ).first()
    if held is None:
        bind.execute(role_permissions.insert().values(role_id=role_id, permission_id=permission_id, created_at=now))


def _remove_permissions(bind, keys) -> None:
    ids = [row[0] for row in bind.execute(sa.select(permissions.c.id).where(permissions.c.key.in_(keys))).all()]
    if not ids:
        return
    bind.execute(role_permissions.delete().where(role_permissions.c.permission_id.in_(ids)))
    if "user_permissions" in set(sa.inspect(bind).get_table_names()):
        bind.execute(user_permissions.delete().where(user_permissions.c.permission_id.in_(ids)))
    bind.execute(permissions.delete().where(permissions.c.id.in_(ids)))


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_role_tables(bind):
        return
    now = datetime.now(timezone.utc)

    # 1. Accounts whose word names a role that no longer exists. With role rows of admin or
    #    teacher they are that; without, "none". (The words are compared as the application
    #    compares them: lower case, without spaces around.)
    kept = _role_ids(bind, KEPT_ROLES)
    for user_id, word in bind.execute(sa.select(users.c.id, users.c.role)).all():
        if (word or "").strip().lower() not in GONE_WORDS:
            continue
        held = {
            row[0] for row in bind.execute(sa.select(user_roles.c.role_id).where(user_roles.c.user_id == user_id)).all()
        }
        new_word = next((name for name in KEPT_ROLES if kept.get(name) in held), "none")
        bind.execute(users.update().where(users.c.id == user_id).values(role=new_word))

    if not _has_roles(bind):
        return  # the role tables are empty: the seed at start does the rest

    # 2. The roles viewer and guest.
    gone = list(_role_ids(bind, GONE_ROLES).values())
    if gone:
        bind.execute(user_roles.delete().where(user_roles.c.role_id.in_(gone)))
        bind.execute(role_permissions.delete().where(role_permissions.c.role_id.in_(gone)))
        bind.execute(roles.delete().where(roles.c.id.in_(gone)))

    # 3. The permissions nothing asks for.
    _remove_permissions(bind, [key for key, *_ in UNUSED_PERMISSIONS])

    # 4. The permissions the server asks for.
    for key, resource, action, description in MISSING_PERMISSIONS + IMPORT_PERMISSIONS:
        _add_permission(bind, key, resource, action, description, now)

    # 5. Teachers import. The administrator is given the same grants beside the wildcard, as
    #    the seed does, so that the list of what an administrator holds reads complete.
    for role_name in KEPT_ROLES:
        role_id = kept.get(role_name)
        for key in TEACHER_IMPORT_KEYS:
            _grant(bind, role_id, _permission_id(bind, key), now)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_role_tables(bind) or not _has_roles(bind):
        return
    now = datetime.now(timezone.utc)

    kept = _role_ids(bind, KEPT_ROLES)
    import_ids = [
        row[0]
        for row in bind.execute(sa.select(permissions.c.id).where(permissions.c.key.in_(TEACHER_IMPORT_KEYS))).all()
    ]
    if import_ids and kept:
        bind.execute(
            role_permissions.delete().where(
                role_permissions.c.role_id.in_(list(kept.values())),
                role_permissions.c.permission_id.in_(import_ids),
            )
        )
    _remove_permissions(bind, [key for key, *_ in MISSING_PERMISSIONS])

    for key, resource, action, description in UNUSED_PERMISSIONS:
        _add_permission(bind, key, resource, action, description, now)
    for name, description in (("guest", "Guest (read-only)"), ("viewer", "Viewer (read-only)")):
        if not _role_ids(bind, (name,)):
            bind.execute(roles.insert().values(name=name, description=description))
    both = _role_ids(bind, GONE_ROLES)
    for role_id in both.values():
        for key in VIEWER_KEYS:
            _grant(bind, role_id, _permission_id(bind, key), now)
    for role_name in KEPT_ROLES:
        for key in TEACHER_UNUSED_KEYS:
            _grant(bind, kept.get(role_name), _permission_id(bind, key), now)
