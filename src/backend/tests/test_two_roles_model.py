"""Two roles, "No role" for every other account, and nothing but the rows.

The owner's decisions of 18 November 2026:

- teachers import students and courses from a file, as administrators do (a semester's
  session file stayed with the administrator that day; teachers have it since 19 November,
  see test_teachers_session_file.py);
- "Student" is not a role an account can have: nothing ever tied a student record to an
  account, so such an account could sign in and do nothing;
- the roles Viewer and Guest go;
- the list of permissions the code kept for accounts without role rows goes: an account may
  do what its rows say, and a step at every start gives each administrator and teacher the row
  of its role.

The tests here are about the model itself: what a new database gets, what the migration
makes of a database of the version before, what a start does for accounts without their row,
and what a teacher's import needs from start to finish. The tests of the single requests
(roles revoked, roles renamed, accounts changed) are in the files they were always in.
"""

import asyncio
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from backend import models
from backend.routers.routers_rbac import (
    PERMISSION_DEFS,
    TEACHER_PERMISSIONS,
    _seed_defaults,
    backfill_role_rows,
    ensure_defaults_startup,
)
from backend.tests.test_account_role_leftovers import (  # noqa: F401
    PASSWORD,
    Headers,
    _create,
    _roles,
    _session,
    _sign_in,
    rbac_client,
    school,
)

PREVIOUS_HEAD = "a7d4e9c2b5f8"
REVISION = "5189ab647b5a"
BACKEND_DIR = Path(__file__).resolve().parents[1]

UNUSED = {
    "analytics:view",
    "enrollments:view",
    "enrollments:manage",
    "system:import",
    "system:export",
    "students.self:read",
    "grades.self:read",
    "attendance.self:read",
}
ADDED = {
    "reports:create",
    "analytics:export",
    "imports:create",
    "imports:view",
    "exports:view",
    "sessions:manage",
    "jobs:create",
    "jobs:view",
    "jobs:manage",
    "jobs:delete",
    "diagnostics:view",
    "diagnostics:manage",
    "admin:manage",
}
TEACHER_IMPORTS = {"imports:preview", "imports:execute", "imports:create", "imports:view", "jobs:view"}


class _Open:
    """Hands a function that closes its session the test's own, which has to stay open."""

    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)

    def close(self):
        pass


def _held_by(db: Session, role_name: str) -> set[str]:
    rows = (
        db.query(models.Permission.key)
        .join(models.RolePermission, models.RolePermission.permission_id == models.Permission.id)
        .join(models.Role, models.Role.id == models.RolePermission.role_id)
        .filter(models.Role.name == role_name)
    )
    return {str(key) for (key,) in rows}


# --- a new database ---------------------------------------------------------------------------


def test_a_new_database_has_two_roles_and_the_permissions_the_endpoints_ask_for(db):
    from backend.main import app
    from backend.scripts import endpoint_requirements

    _seed_defaults(db)

    assert {name for (name,) in db.query(models.Role.name)} == {"admin", "teacher"}
    in_the_database = {str(key) for (key,) in db.query(models.Permission.key)}
    # A closed list: the wildcard, and what an endpoint asks for. Nothing that opens nothing,
    # and nothing an endpoint asks for that nobody can be granted.
    assert in_the_database == endpoint_requirements.permission_keys_asked(app) | {"*:*"}
    assert len(in_the_database) == len(PERMISSION_DEFS) == 44
    assert UNUSED & in_the_database == set()
    assert ADDED <= in_the_database


def test_what_the_two_roles_hold_in_a_new_database(db):
    _seed_defaults(db)

    teacher, admin = _held_by(db, "teacher"), _held_by(db, "admin")

    assert teacher == set(TEACHER_PERMISSIONS)
    assert len(teacher) == 26
    assert TEACHER_IMPORTS <= teacher
    # A semester's session file, since 19 November 2026.
    assert "sessions:manage" in teacher
    # The administration stays with the administrator.
    assert (
        teacher & {"*:*", "users:manage", "permissions:manage", "audit:view", "adminops:restore", "jobs:create"}
        == set()
    )
    assert admin == teacher | {"*:*"}


def test_the_seed_can_run_again_and_adds_nothing(db):
    _seed_defaults(db)
    counts = [db.query(model).count() for model in (models.Role, models.Permission, models.RolePermission)]

    _seed_defaults(db)

    assert [db.query(model).count() for model in (models.Role, models.Permission, models.RolePermission)] == counts
    assert counts == [2, 44, 53]


# --- the step at every start --------------------------------------------------------------------


def test_a_start_gives_administrators_and_teachers_the_row_of_their_role_and_nobody_else(db):
    for email, word in (
        ("head@example.com", "admin"),
        ("maria@example.com", "teacher"),
        ("capital@example.com", " Teacher "),  # compared as the application compares it
        ("former@example.com", "none"),
        ("pupil@example.com", "student"),
        ("office@example.com", "staff"),
    ):
        db.add(models.User(email=email, hashed_password="x", role=word, is_active=True))
    db.commit()

    _seed_defaults(db)  # what a first start runs: it ends with the step

    held = {
        email: {name for (name,) in rows}
        for email in ("head", "maria", "capital", "former", "pupil", "office")
        for rows in [
            db.query(models.Role.name)
            .join(models.UserRole, models.UserRole.role_id == models.Role.id)
            .join(models.User, models.User.id == models.UserRole.user_id)
            .filter(models.User.email == f"{email}@example.com")
            .all()
        ]
    }
    assert held == {
        "head": {"admin"},
        "maria": {"teacher"},
        "capital": {"teacher"},
        "former": set(),
        "pupil": set(),
        "office": set(),
    }
    # A later start, with nothing to seed, finds nothing to add ...
    assert ensure_defaults_startup(lambda: _Open(db)) is False
    assert backfill_role_rows(db) == 0
    # ... until an account turns up without its row (a database restored from a backup, say).
    db.add(models.User(email="restored@example.com", hashed_password="x", role="teacher", is_active=True))
    db.commit()
    assert backfill_role_rows(db) == 1


def test_a_start_whose_migrations_failed_still_gives_the_rows(monkeypatch):
    """An administrator has to be able to sign in and see what went wrong."""
    import backend.lifespan as lifespan_module
    from backend.tests.db_setup import TestingSessionLocal

    asked: list = []

    class _Scheduler:
        def __getattr__(self, name):
            return lambda *args, **kwargs: None

    monkeypatch.setattr(lifespan_module, "startup_tasks_enabled", lambda: True)
    monkeypatch.setattr(lifespan_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(lifespan_module.profiler, "register", lambda _engine: None)
    monkeypatch.setattr(lifespan_module, "run_migrations", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(lifespan_module, "ensure_defaults_startup", lambda _factory: asked.append("seed") or False)
    monkeypatch.setattr(lifespan_module, "backfill_role_rows_startup", lambda _factory: asked.append("rows") or 0)
    monkeypatch.setattr(lifespan_module.settings, "DEFAULT_ADMIN_EMAIL", None, raising=False)
    monkeypatch.setattr("backend.services.smtp_override.load_and_apply", lambda: True)
    monkeypatch.setattr("backend.services.maintenance_scheduler.get_maintenance_scheduler", lambda: _Scheduler())

    class App:
        class state:
            pass

    async def run():
        async with lifespan_module.get_lifespan()(App()):
            pass

    asyncio.run(run())

    assert asked == ["rows"]


def test_the_command_line_administrator_gets_the_row(db, monkeypatch):
    from backend.db.cli import admin as cli

    monkeypatch.setattr(cli, "SessionLocal", lambda: _Open(db))
    _seed_defaults(db)

    assert cli.create_admin("Console@Example.com", PASSWORD) is True

    user = db.query(models.User).filter(models.User.email == "console@example.com").one()
    held = (
        db.query(models.Role.name)
        .join(models.UserRole, models.UserRole.role_id == models.Role.id)
        .filter(models.UserRole.user_id == user.id)
        .all()
    )
    assert [name for (name,) in held] == ["admin"]


def _rows_of(db: Session, email: str) -> list[str]:
    rows = (
        db.query(models.Role.name)
        .join(models.UserRole, models.UserRole.role_id == models.Role.id)
        .join(models.User, models.User.id == models.UserRole.user_id)
        .filter(models.User.email == email)
        .all()
    )
    return sorted(name for (name,) in rows)


def _bootstrap(db: Session) -> None:
    from types import SimpleNamespace

    from backend.scripts.admin.bootstrap import ensure_default_admin_account

    settings = SimpleNamespace(
        DEFAULT_ADMIN_EMAIL="owner@example.com",
        DEFAULT_ADMIN_PASSWORD="ChangeMe123!",
        DEFAULT_ADMIN_FULL_NAME="Owner",
        DEFAULT_ADMIN_FORCE_RESET=False,
    )
    ensure_default_admin_account(settings=settings, session_factory=lambda: db, close_session=False)


def test_the_first_administrator_of_an_installation_gets_the_row(db):
    """A first start seeds the roles and then creates the account named in the settings. The
    account used to stay without a row: the list in the code served the word "admin"."""
    _seed_defaults(db)

    _bootstrap(db)

    assert _rows_of(db, "owner@example.com") == ["admin"]
    # The next start changes nothing about it.
    _bootstrap(db)
    assert backfill_role_rows(db) == 0
    assert _rows_of(db, "owner@example.com") == ["admin"]


def test_where_the_roles_are_not_there_yet_the_start_gives_the_row_afterwards(db):
    _bootstrap(db)
    assert _rows_of(db, "owner@example.com") == []

    _seed_defaults(db)

    assert _rows_of(db, "owner@example.com") == ["admin"]


# --- a teacher's import ---------------------------------------------------------------------------

ROWS = '[{"student_id": "IMP-1", "first_name": "Imp", "last_name": "Ort", "email": "imp.ort@example.com"}]'
FORM = {"import_type": "students", "json_text": ROWS, "allow_updates": "false", "skip_duplicates": "true"}


@pytest.fixture
def strict_auth(monkeypatch, db):
    from backend import rbac
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)

    # The /jobs endpoints take no session of their own, so the permission check opens one on
    # the configured database. In a test that is not the test's database: give it this one.
    def the_tests_session():
        yield db

    monkeypatch.setattr(rbac, "get_db", the_tests_session)


def _headers(db: Session, email: str, role: str) -> Headers:
    """An account with that role, on a database as a start leaves it, and its sign-in."""
    from backend.routers.routers_auth import create_access_token
    from backend.tests.conftest import started_installation

    db.add(models.User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    started_installation(db)
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


def _job(client, headers: Headers, job_id: str) -> dict:
    for _ in range(50):
        answer = client.get(f"/api/v1/jobs/{job_id}", headers=headers)
        assert answer.status_code == 200, answer.text
        body = answer.json()
        if body["status"] in ("completed", "failed", "cancelled"):
            return body
        time.sleep(0.1)
    raise AssertionError(f"the import did not finish: {body}")


@pytest.mark.auth_required
def test_a_teacher_imports_students_from_start_to_finish(client, db, strict_auth) -> None:
    teacher = _headers(db, "teacher@example.com", "teacher")

    preview = client.post("/api/v1/imports/preview", data=FORM, headers=teacher)
    assert preview.status_code == 200, preview.text
    started = client.post("/api/v1/imports/execute", data=FORM, headers=teacher)
    assert started.status_code in (200, 202), started.text
    body = started.json()
    job_id = body.get("data", body).get("job_id")
    assert job_id, body

    # The Imports tab follows the import it started: this asked for a permission nobody but
    # the administrator's wildcard held, and the tab could only say that the status failed.
    finished = _job(client, teacher, job_id)

    assert finished["status"] == "completed", finished
    listed = client.get("/api/v1/students/", params={"limit": 100}, headers=teacher).json()
    assert "IMP-1" in {student["student_id"] for student in listed.get("items", listed)}
    # The other import, behind Control Panel > Maintenance > Import/Export, answers as well.
    assert client.get("/api/v1/import-export/imports", headers=teacher).status_code == 200


@pytest.mark.auth_required
def test_what_stays_with_the_administrator(client, db, strict_auth) -> None:
    teacher = _headers(db, "teacher@example.com", "teacher")
    admin = _headers(db, "head@example.com", "admin")

    answers = {
        "returning the database to a backup": client.post(
            "/api/v1/sessions/rollback", params={"backup_filename": "no_such_backup.db"}, headers=teacher
        ).status_code,
        "starting a job by hand": client.post(
            "/api/v1/jobs/", json={"job_type": "data_cleanup", "parameters": {}}, headers=teacher
        ).status_code,
        "cancelling a job": client.post("/api/v1/jobs/no-such-job/cancel", headers=teacher).status_code,
        "deleting a job": client.delete("/api/v1/jobs/no-such-job", headers=teacher).status_code,
        "the accounts": client.get("/api/v1/admin/users", headers=teacher).status_code,
        "the audit log": client.get("/api/v1/audit/logs", headers=teacher).status_code,
    }

    assert answers == dict.fromkeys(answers, 403)
    assert client.get("/api/v1/admin/users", headers=admin).status_code == 200


def test_an_account_without_a_role_imports_nothing(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    account = _create(client, admin, "former@example.com", "teacher")
    former = _sign_in(client, "former@example.com")
    changed = client.patch(f"/api/v1/admin/users/{account}", json={"role": "none"}, headers=admin)
    assert changed.status_code == 200, changed.text

    assert client.post("/api/v1/imports/preview", data=FORM, headers=former).status_code == 403
    assert client.post("/api/v1/imports/execute", data=FORM, headers=former).status_code == 403
    assert _roles(client, account) == set()


# --- a database of the version before -------------------------------------------------------------


def _alembic(url: str):
    from alembic.config import Config

    # No alembic.ini on purpose: see test_lesson_logs_migration._alembic.
    cfg = Config()
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


# What the version before seeded, as far as the migration is concerned.
OLD_VIEWER = {
    "students:view",
    "courses:view",
    "grades:view",
    "attendance:view",
    "enrollments:view",
    "reports:view",
    "analytics:view",
    "exports:generate",
    "exports:download",
}
OLD_TEACHER = OLD_VIEWER | {
    "students:edit",
    "grades:edit",
    "attendance:edit",
    "reports:generate",
    "enrollments:manage",
    "system:import",
    "system:export",
}
OLD_PERMISSIONS = OLD_TEACHER | UNUSED | {"*:*", "imports:preview", "imports:execute", "audit:view", "users:manage"}


@pytest.fixture
def old_database(tmp_path):
    """A scratch SQLite database at the revision before, filled as that version left one."""
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'old.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, PREVIOUS_HEAD)
    engine = create_engine(url)
    try:
        yield cfg, engine
    finally:
        engine.dispose()


def _fill_as_the_version_before(engine) -> dict[str, int]:
    """Roles, permissions, grants and one account of every kind. Returns the accounts' numbers."""
    with sessionmaker(bind=engine)() as db:
        roles = {
            name: models.Role(name=name, description=name.title()) for name in ("admin", "teacher", "viewer", "guest")
        }
        permissions = {
            key: models.Permission(key=key, resource=key.split(":")[0], action=key.split(":")[1], is_active=True)
            for key in sorted(OLD_PERMISSIONS)
        }
        db.add_all([*roles.values(), *permissions.values()])
        db.flush()
        grants = [("admin", "*:*")]
        grants += [("teacher", key) for key in OLD_TEACHER]
        grants += [(role, key) for role in ("viewer", "guest") for key in OLD_VIEWER]
        db.add_all(
            models.RolePermission(role_id=roles[role].id, permission_id=permissions[key].id) for role, key in grants
        )

        accounts = {
            # name: (the word in the Role column, the role rows it holds)
            "head": ("admin", ["admin", "teacher", "viewer", "guest"]),
            "maria": ("teacher", ["teacher", "viewer", "guest"]),
            "old_teacher": ("teacher", []),  # from before the role tables: the code's list served it
            "old_admin": ("admin", []),
            "viewer": ("viewer", ["viewer", "guest"]),
            "guest": ("guest", ["guest"]),
            "pupil": ("student", []),
            "revoked": ("none", []),
            "viewer_who_teaches": ("Viewer", ["teacher", "viewer"]),  # a word and rows that disagree
            "granted": ("teacher", ["teacher"]),
        }
        numbers: dict[str, int] = {}
        for name, (word, held) in accounts.items():
            user = models.User(email=f"{name}@example.com", hashed_password="x", role=word, is_active=True)
            db.add(user)
            db.flush()
            numbers[name] = int(user.id)
            db.add_all(models.UserRole(user_id=user.id, role_id=roles[role].id) for role in held)
        # Grants made to one account: one that stays, one whose permission goes.
        for key in ("audit:view", "system:import"):
            db.add(models.UserPermission(user_id=numbers["granted"], permission_id=permissions[key].id))
        db.commit()
        return numbers


def _state(engine) -> dict:
    with engine.connect() as conn:
        words = dict(conn.execute(text("SELECT email, role FROM users")).all())
        rows: dict[str, set[str]] = {email: set() for email in words}
        for email, role in conn.execute(
            text(
                "SELECT u.email, r.name FROM users u JOIN user_roles ur ON ur.user_id = u.id "
                "JOIN roles r ON r.id = ur.role_id"
            )
        ):
            rows[email].add(role)
        held: dict[str, set[str]] = {}
        for role, key in conn.execute(
            text(
                "SELECT r.name, p.key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                "JOIN permissions p ON p.id = rp.permission_id"
            )
        ):
            held.setdefault(role, set()).add(key)
        return {
            "words": {email.split("@")[0]: word for email, word in words.items()},
            "rows": {email.split("@")[0]: roles for email, roles in rows.items()},
            "roles": {name for (name,) in conn.execute(text("SELECT name FROM roles"))},
            "permissions": {key for (key,) in conn.execute(text("SELECT key FROM permissions"))},
            "held": held,
            "direct": {
                key
                for (key,) in conn.execute(
                    text("SELECT p.key FROM user_permissions up JOIN permissions p ON p.id = up.permission_id")
                )
            },
            "orphans": sum(
                int(conn.execute(text(query)).scalar() or 0)
                for query in (
                    "SELECT COUNT(*) FROM user_roles WHERE role_id NOT IN (SELECT id FROM roles)",
                    "SELECT COUNT(*) FROM role_permissions WHERE role_id NOT IN (SELECT id FROM roles)",
                    "SELECT COUNT(*) FROM role_permissions WHERE permission_id NOT IN (SELECT id FROM permissions)",
                    "SELECT COUNT(*) FROM user_permissions WHERE permission_id NOT IN (SELECT id FROM permissions)",
                )
            ),
        }


def test_the_migration_makes_a_database_of_the_version_before_one_of_two_roles(old_database):
    from alembic import command

    cfg, engine = old_database
    _fill_as_the_version_before(engine)

    command.upgrade(cfg, REVISION)
    after = _state(engine)

    assert after["roles"] == {"admin", "teacher"}
    assert after["words"] == {
        "head": "admin",
        "maria": "teacher",
        "old_teacher": "teacher",
        "old_admin": "admin",
        "viewer": "none",
        "guest": "none",
        "pupil": "none",
        "revoked": "none",
        "viewer_who_teaches": "teacher",  # it held the teacher's role
        "granted": "teacher",
    }
    assert after["rows"]["head"] == {"admin", "teacher"}
    assert after["rows"]["maria"] == {"teacher"}
    assert after["rows"]["viewer"] == after["rows"]["guest"] == after["rows"]["pupil"] == set()
    assert after["rows"]["viewer_who_teaches"] == {"teacher"}
    # The permission list: the eight are gone, the thirteen are there, the rest is as it was.
    assert after["permissions"] == (OLD_PERMISSIONS - UNUSED) | ADDED
    assert after["held"]["teacher"] == (OLD_TEACHER - UNUSED) | TEACHER_IMPORTS
    assert after["held"]["admin"] == {"*:*"} | TEACHER_IMPORTS
    # A grant to one account stays, unless its permission went.
    assert after["direct"] == {"audit:view"}
    assert after["orphans"] == 0


def test_after_the_migration_a_start_completes_the_picture(old_database, monkeypatch):
    """The migration leaves to the step at start what that step does: the row of an account
    from before the role tables, which the list in the code used to serve."""
    from alembic import command

    monkeypatch.setattr("backend.config.settings.AUTH_MODE", "strict")  # off, every check says yes
    cfg, engine = old_database
    numbers = _fill_as_the_version_before(engine)
    command.upgrade(cfg, REVISION)

    assert ensure_defaults_startup(sessionmaker(bind=engine)) is False  # nothing to seed, rows to give
    after = _state(engine)

    assert after["rows"]["old_teacher"] == {"teacher"}
    assert after["rows"]["old_admin"] == {"admin"}
    assert after["rows"]["viewer"] == after["rows"]["pupil"] == after["rows"]["revoked"] == set()
    with sessionmaker(bind=engine)() as db:
        from backend.rbac import has_permission

        def may(name: str, key: str) -> bool:
            return has_permission(db.get(models.User, numbers[name]), key, db)

        assert may("old_teacher", "students:view") and may("old_teacher", "imports:execute")
        assert not may("old_teacher", "users:manage")
        assert may("old_admin", "users:manage") and may("old_admin", "sessions:manage")
        assert may("granted", "audit:view")
        for name in ("viewer", "guest", "pupil", "revoked"):
            assert not may(name, "students:view"), name
            assert not may(name, "exports:generate"), name


def test_the_migration_can_be_taken_back_and_run_again(old_database):
    from alembic import command

    cfg, engine = old_database
    _fill_as_the_version_before(engine)
    command.upgrade(cfg, REVISION)
    upgraded = _state(engine)

    command.downgrade(cfg, PREVIOUS_HEAD)
    back = _state(engine)

    assert back["roles"] == {"admin", "teacher", "viewer", "guest"}
    assert back["permissions"] == OLD_PERMISSIONS
    assert back["held"]["viewer"] == back["held"]["guest"] == OLD_VIEWER
    assert back["held"]["teacher"] == OLD_TEACHER
    assert back["held"]["admin"] == {"*:*"} | (UNUSED & OLD_TEACHER)
    # It cannot know who was a Student, a Viewer or a Guest: they stay without a role.
    assert back["words"]["viewer"] == back["words"]["pupil"] == "none"
    assert back["orphans"] == 0

    command.upgrade(cfg, REVISION)
    assert _state(engine) == upgraded


def test_the_migration_leaves_a_database_without_roles_to_the_seed(old_database):
    from alembic import command

    cfg, engine = old_database
    with sessionmaker(bind=engine)() as db:
        db.add(models.User(email="pupil@example.com", hashed_password="x", role="student", is_active=True))
        db.add(models.User(email="head@example.com", hashed_password="x", role="admin", is_active=True))
        db.commit()

    command.upgrade(cfg, REVISION)
    after = _state(engine)

    assert (after["roles"], after["permissions"]) == (set(), set())
    assert after["words"] == {"pupil": "none", "head": "admin"}
    command.downgrade(cfg, PREVIOUS_HEAD)
    assert _state(engine)["roles"] == set()
