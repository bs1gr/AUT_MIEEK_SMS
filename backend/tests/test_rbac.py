"""
Tests for RBAC (Role-Based Access Control) functionality.
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import text

from backend.models import Permission, Role, User, UserPermission
from backend.rbac import (
    has_permission,
    get_user_permissions,
    _is_self_access,
)


@pytest.fixture(autouse=True)
def enable_auth_for_rbac_tests(monkeypatch):
    """Force AUTH_MODE to permissive for RBAC tests to actually test permission logic."""
    try:
        from backend.config import settings

        monkeypatch.setattr(settings, "AUTH_MODE", "permissive", raising=False)
    except Exception:
        pass
    yield


@pytest.fixture
def sample_user(db):
    """Create a sample user with admin role."""
    # Create admin role
    admin_role = Role(name="admin", description="Administrator role")
    db.add(admin_role)
    db.flush()

    # Create user
    user = User(
        email="admin@test.com",
        hashed_password="hashed",
        full_name="Admin User",
        role="admin",
    )
    db.add(user)
    db.flush()

    # Link user to role (using raw SQL to avoid schema mismatch)
    db.execute(
        text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)"),
        {"user_id": user.id, "role_id": admin_role.id},
    )
    db.commit()

    return user


@pytest.fixture
def sample_permission(db):
    """Create a sample permission."""
    # Create using raw SQL without name column (test DB doesn't have it)
    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            INSERT INTO permissions (key, resource, action, description, is_active, created_at, updated_at)
            VALUES (:key, :resource, :action, :description, :is_active, :created_at, :updated_at)
        """),
        {
            "key": "students:view",
            "resource": "students",
            "action": "view",
            "description": "View student records",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
    )
    db.commit()

    return db.query(Permission).filter(Permission.key == "students:view").first()


def test_has_permission_via_role(db, sample_user, sample_permission):
    """Test checking permission via role assignment."""
    # Get admin role
    admin_role = db.query(Role).filter(Role.name == "admin").first()

    # Assign permission to role (using raw SQL with created_at)
    now = datetime.now(timezone.utc)
    db.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (:role_id, :perm_id, :created_at)"
        ),
        {"role_id": admin_role.id, "perm_id": sample_permission.id, "created_at": now},
    )
    db.commit()

    # Check permission
    assert has_permission(sample_user, "students:view", db) is True


def test_has_permission_via_direct_assignment(db, sample_user, sample_permission):
    """Test checking permission via direct user assignment."""
    # Create direct user permission
    user_perm = UserPermission(
        user_id=sample_user.id,
        permission_id=sample_permission.id,
        granted_by=sample_user.id,
        granted_at=datetime.now(timezone.utc),
    )
    db.add(user_perm)
    db.commit()

    # Check permission
    assert has_permission(sample_user, "students:view", db) is True


def test_has_permission_expired(db, sample_user, sample_permission):
    """Test that expired permissions are not granted."""
    # Create expired user permission
    user_perm = UserPermission(
        user_id=sample_user.id,
        permission_id=sample_permission.id,
        granted_by=sample_user.id,
        granted_at=datetime.now(timezone.utc) - timedelta(days=2),
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(user_perm)
    db.commit()

    # Check permission - should be False because it's expired
    assert has_permission(sample_user, "students:view", db) is False


def test_has_permission_not_granted(db, sample_user, sample_permission):
    """Test checking permission that user doesn't have."""
    # Check permission - should be False
    assert has_permission(sample_user, "students:view", db) is False


def test_has_permission_inactive_permission(db, sample_user, sample_permission):
    """Test that inactive permissions are not granted."""
    # Assign permission to user
    user_perm = UserPermission(
        user_id=sample_user.id,
        permission_id=sample_permission.id,
        granted_by=sample_user.id,
        granted_at=datetime.now(timezone.utc),
    )
    db.add(user_perm)

    # Deactivate permission
    sample_permission.is_active = False
    db.commit()

    # Check permission - should be False because permission is inactive
    assert has_permission(sample_user, "students:view", db) is False


def test_get_user_permissions(db, sample_user, sample_permission):
    """Test getting all user permissions."""
    # Create additional permission
    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            INSERT INTO permissions (key, resource, action, description, is_active, created_at, updated_at)
            VALUES (:key, :resource, :action, :description, :is_active, :created_at, :updated_at)
        """),
        {
            "key": "grades:edit",
            "resource": "grades",
            "action": "edit",
            "description": "Edit grades",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
    )
    db.commit()

    grades_perm = db.query(Permission).filter(Permission.key == "grades:edit").first()

    # Assign permissions via role
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    now = datetime.now(timezone.utc)
    db.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (:role_id, :perm_id, :created_at)"
        ),
        {"role_id": admin_role.id, "perm_id": sample_permission.id, "created_at": now},
    )
    db.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (:role_id, :perm_id, :created_at)"
        ),
        {"role_id": admin_role.id, "perm_id": grades_perm.id, "created_at": now},
    )
    db.commit()

    # Get all permissions
    perms = get_user_permissions(sample_user, db)

    assert "students:view" in perms
    assert "grades:edit" in perms
    assert len(perms) == 2


def test_get_user_permissions_empty(db, sample_user):
    """Test getting permissions for user with no permissions."""
    perms = get_user_permissions(sample_user, db)
    assert perms == []


def test_is_self_access_student():
    """Test self-access check for student role."""
    from unittest.mock import Mock

    # Create mock user
    user = Mock()
    user.id = 123
    user.role = "student"

    # Create mock request with path params
    request = Mock()
    request.path_params = {"student_id": "123"}

    # Should return True for matching student_id
    assert _is_self_access(user, "students:view", request) is True

    # Should return False for non-matching student_id
    request.path_params = {"student_id": "456"}
    assert _is_self_access(user, "students:view", request) is False


def test_is_self_access_non_student():
    """Test that self-access is False for non-student roles."""
    from unittest.mock import Mock

    user = Mock()
    user.id = 123
    user.role = "admin"

    request = Mock()
    request.path_params = {"student_id": "123"}

    # Should return False because user is not a student
    assert _is_self_access(user, "students:view", request) is False


def test_is_self_access_non_self_permission():
    """Test that self-access is False for permissions that don't allow it."""
    from unittest.mock import Mock

    user = Mock()
    user.id = 123
    user.role = "student"

    request = Mock()
    request.path_params = {"student_id": "123"}

    # Should return False because students:delete doesn't allow self-access
    assert _is_self_access(user, "students:delete", request) is False
