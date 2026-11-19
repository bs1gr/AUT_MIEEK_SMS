"""A permission's key is unique in the database too (migration e2b7c9d4a1f6).

The model says ``unique=True``. A PostgreSQL database has the unique index since revision
3af743932574, which skips SQLite; a migrated SQLite database (every SMS Lite, a Docker
installation on its own database) had no unique index on the key at all, so only the
application's own checks kept a key from being stored twice. Found on 18 November 2026 while
the older RBAC documents were read against the code.
"""

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from backend import models
from backend.tests.test_two_roles_model import _alembic

BEFORE = "9c41f7e2a6d3"
REVISION = "e2b7c9d4a1f6"


@pytest.fixture
def database(tmp_path):
    """A scratch SQLite database at the revision before."""
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'keys.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, BEFORE)
    engine = create_engine(url)
    try:
        yield cfg, engine
    finally:
        engine.dispose()


def _unique_on_key(engine) -> bool:
    return any(
        index["unique"] and index["column_names"] == ["key"] for index in inspect(engine).get_indexes("permissions")
    )


def _permission(key: str) -> models.Permission:
    resource, action = key.split(":")
    return models.Permission(key=key, resource=resource, action=action, is_active=True)


def test_before_the_migration_a_sqlite_database_takes_a_key_twice(database):
    _cfg, engine = database

    assert not _unique_on_key(engine)
    with sessionmaker(bind=engine)() as db:
        db.add_all([_permission("students:view"), _permission("students:view")])
        db.commit()
        assert db.query(models.Permission).filter(models.Permission.key == "students:view").count() == 2


def test_after_it_the_database_refuses_a_key_that_is_there(database):
    from alembic import command

    cfg, engine = database
    command.upgrade(cfg, REVISION)

    assert _unique_on_key(engine)
    with sessionmaker(bind=engine)() as db:
        db.add(_permission("students:view"))
        db.commit()
        db.add(_permission("students:view"))
        with pytest.raises(IntegrityError):
            db.commit()


def test_keys_that_are_there_twice_become_one_and_keep_their_grants(database):
    from alembic import command

    cfg, engine = database
    with sessionmaker(bind=engine)() as db:
        admin, teacher = (
            models.Role(name="admin", description="Admin"),
            models.Role(name="teacher", description="Teacher"),
        )
        first, second, third = _permission("students:view"), _permission("students:view"), _permission("students:view")
        other = _permission("grades:edit")
        account = models.User(email="granted@example.com", hashed_password="x", role="teacher", is_active=True)
        db.add_all([admin, teacher, first, second, third, other, account])
        db.flush()
        kept_id, other_id = int(first.id), int(other.id)
        db.add_all(
            [
                models.RolePermission(role_id=teacher.id, permission_id=first.id),
                models.RolePermission(role_id=teacher.id, permission_id=second.id),  # the same grant twice
                models.RolePermission(role_id=admin.id, permission_id=third.id),  # held through a repeat only
                models.RolePermission(role_id=admin.id, permission_id=other.id),
                models.UserPermission(user_id=account.id, permission_id=second.id),
                models.UserPermission(user_id=account.id, permission_id=third.id),  # twice, through two repeats
            ]
        )
        db.commit()

    command.upgrade(cfg, REVISION)

    assert _unique_on_key(engine)
    with sessionmaker(bind=engine)() as db:
        rows = db.query(models.Permission.id, models.Permission.key).order_by(models.Permission.id).all()
        assert [(int(row_id), key) for row_id, key in rows] == [(kept_id, "students:view"), (other_id, "grades:edit")]
        held = sorted(
            (name, int(permission_id))
            for name, permission_id in db.query(models.Role.name, models.RolePermission.permission_id).join(
                models.RolePermission, models.RolePermission.role_id == models.Role.id
            )
        )
        assert held == [("admin", kept_id), ("admin", other_id), ("teacher", kept_id)]
        assert [int(row.permission_id) for row in db.query(models.UserPermission).all()] == [kept_id]


def test_it_can_run_again_and_the_way_back_leaves_the_index(database):
    from alembic import command

    cfg, engine = database
    command.upgrade(cfg, REVISION)

    command.downgrade(cfg, BEFORE)
    assert _unique_on_key(engine)

    command.upgrade(cfg, REVISION)
    assert _unique_on_key(engine)
    names = [index["name"] for index in inspect(engine).get_indexes("permissions") if index["column_names"] == ["key"]]
    assert names == ["ix_permissions_key"]
