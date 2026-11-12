"""Teachers must hold the permissions the analytics and report endpoints ask for.

Found by the v1.18.67 smoke test: the roles seeded into the database gave teachers neither
`reports:generate` nor `reports:export`, although backend.rbac's defaults and the permission
reference do. The Dashboard overview and the Analytics page answered a teacher with 403.
"""

import re
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

from backend import models
from backend.rbac import _default_role_permissions
from backend.routers.routers_rbac import _seed_defaults

PREVIOUS_HEAD = "c8e1f4a7d2b9"
REVISION = "d3a7b9c1e5f2"
KEYS = ("reports:generate", "reports:export")
BACKEND_DIR = Path(__file__).resolve().parents[1]


def _seeded_keys(db, role_name: str) -> set[str]:
    rows = (
        db.query(models.Permission.key)
        .join(models.RolePermission, models.RolePermission.permission_id == models.Permission.id)
        .join(models.Role, models.Role.id == models.RolePermission.role_id)
        .filter(models.Role.name == role_name)
        .all()
    )
    return {key for (key,) in rows}


def _keys_required_by_routers() -> set[str]:
    keys: set[str] = set()
    for path in (BACKEND_DIR / "routers").glob("*.py"):
        for call in re.finditer(r"require_(?:any_)?permission\(([^)]*)\)", path.read_text(encoding="utf-8")):
            keys.update(re.findall(r"[\"']([\w.*]+:[\w.*]+)[\"']", call.group(1)))
    return keys


def test_seeded_teacher_role_can_generate_and_export_reports(db):
    _seed_defaults(db, None)
    assert set(KEYS) <= _seeded_keys(db, "teacher")


def test_seeded_teacher_role_covers_every_default_a_router_requires(db):
    """The seed and backend.rbac's defaults are two lists; this fails when they drift apart."""
    _seed_defaults(db, None)
    expected = _default_role_permissions("teacher") & _keys_required_by_routers()
    assert "reports:generate" in expected  # the scan found the routers
    assert expected - _seeded_keys(db, "teacher") == set()


def _alembic(url: str):
    from alembic.config import Config

    # No alembic.ini on purpose: see test_lesson_logs_migration._alembic.
    cfg = Config()
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture
def deployed(tmp_path):
    """A scratch SQLite database at the revision before the grant."""
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, PREVIOUS_HEAD)
    engine = create_engine(url)
    try:
        yield cfg, engine
    finally:
        engine.dispose()


def _teacher_keys(engine) -> list[str]:
    with engine.connect() as conn:
        return [
            key
            for (key,) in conn.execute(
                text(
                    "SELECT p.key FROM role_permissions rp "
                    "JOIN permissions p ON p.id = rp.permission_id "
                    "JOIN roles r ON r.id = rp.role_id WHERE r.name = 'teacher' ORDER BY p.key"
                )
            )
        ]


def _add_teacher_role(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO roles (name, description) VALUES ('teacher', 'Teacher')"))


def test_migration_grants_an_existing_teacher_role(deployed):
    from alembic import command

    cfg, engine = deployed
    _add_teacher_role(engine)  # a deployed database: the role exists, the two permissions do not
    assert _teacher_keys(engine) == []

    command.upgrade(cfg, REVISION)
    assert _teacher_keys(engine) == sorted(KEYS)

    # Going down removes the two links; coming back up does not duplicate anything.
    command.downgrade(cfg, PREVIOUS_HEAD)
    assert _teacher_keys(engine) == []
    command.upgrade(cfg, REVISION)
    assert _teacher_keys(engine) == sorted(KEYS)
    with engine.connect() as conn:
        count = conn.execute(
            text("SELECT COUNT(*) FROM permissions WHERE key IN ('reports:generate', 'reports:export')")
        )
        assert count.scalar() == 2


def test_migration_keeps_an_existing_grant_and_permission_row(deployed):
    from alembic import command

    cfg, engine = deployed
    _add_teacher_role(engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO permissions (key, resource, action, is_active, created_at, updated_at) "
                "VALUES ('reports:generate', 'reports', 'generate', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO role_permissions (role_id, permission_id, created_at) "
                "SELECT r.id, p.id, CURRENT_TIMESTAMP FROM roles r, permissions p "
                "WHERE r.name = 'teacher' AND p.key = 'reports:generate'"
            )
        )

    command.upgrade(cfg, REVISION)
    assert _teacher_keys(engine) == sorted(KEYS)  # one link each, no duplicate


def test_migration_leaves_an_unseeded_database_alone(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, REVISION)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM permissions")).scalar() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM role_permissions")).scalar() == 0
