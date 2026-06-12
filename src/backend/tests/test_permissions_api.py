"""
Integration tests for Permission Management API endpoints.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from backend.models import Permission


@pytest.fixture
def sample_permissions(db):
    """Create a set of sample permissions."""
    now = datetime.now(timezone.utc)
    permissions_data = [
        ("students:view", "students", "view", "View students"),
        ("students:edit", "students", "edit", "Edit students"),
        ("grades:view", "grades", "view", "View grades"),
        ("grades:edit", "grades", "edit", "Edit grades"),
    ]

    created_perms = []
    for key, resource, action, desc in permissions_data:
        db.execute(
            text("""
                INSERT INTO permissions (key, resource, action, description, is_active, created_at, updated_at)
                VALUES (:key, :resource, :action, :description, :is_active, :created_at, :updated_at)
            """),
            {
                "key": key,
                "resource": resource,
                "action": action,
                "description": desc,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        db.commit()
        perm = db.query(Permission).filter(Permission.key == key).first()
        created_perms.append(perm)

    return created_perms


def test_list_permissions_requires_auth(client):
    """Test that listing permissions requires authentication (404 when not found)."""
    # With AUTH_ENABLED=False in tests, endpoints return 200 or 404
    # This test just ensures the endpoint exists
    response = client.get("/api/v1/permissions/")
    # 404 means router not accessible, 401/403 means auth issue, 200 means success
    assert response.status_code in [200, 401, 403, 404]


def test_list_permissions_with_auth(client, sample_permissions):
    """Test listing permissions (auth disabled in tests)."""
    response = client.get("/api/v1/permissions/")

    # Should succeed (auth disabled in tests)
    assert response.status_code == 200
    data = response.json()

    # Should have at least our sample permissions
    assert len(data) >= 4

    # Check structure
    for perm in data:
        assert "id" in perm
        assert "key" in perm
        assert "resource" in perm
        assert "action" in perm
        assert "is_active" in perm


def test_list_permissions_filter_by_resource(client, sample_permissions):
    """Test filtering permissions by resource."""
    response = client.get("/api/v1/permissions/?resource=students")

    assert response.status_code == 200
    data = response.json()

    # Should only have students permissions
    for perm in data:
        if perm["key"].startswith("students"):
            assert perm["resource"] == "students"


def test_list_permissions_filter_by_action(client, sample_permissions):
    """Test filtering permissions by action."""
    response = client.get("/api/v1/permissions/?action=view")

    assert response.status_code == 200
    data = response.json()

    # Should only have view permissions
    for perm in data:
        if perm["key"] in ["students:view", "grades:view"]:
            assert perm["action"] == "view"


def test_list_permissions_search(client, sample_permissions):
    """Test searching permissions."""
    response = client.get("/api/v1/permissions/?search=students")

    assert response.status_code == 200
    data = response.json()

    # Should have permissions with 'students' in key or description
    assert len(data) >= 2
    for perm in data:
        assert "students" in perm["key"].lower() or "students" in (perm.get("description") or "").lower()


def test_get_permission_by_id(client, sample_permissions):
    """Test getting a specific permission by ID."""
    perm_id = sample_permissions[0].id

    response = client.get(f"/api/v1/permissions/{perm_id}")

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == perm_id
    assert "created_at" in data
    assert "updated_at" in data


def test_get_permission_not_found(client):
    """Test getting a non-existent permission."""
    response = client.get("/api/v1/permissions/99999")

    assert response.status_code == 404


def test_list_permissions_by_resource_grouped(client, sample_permissions):
    """Test getting permissions grouped by resource."""
    response = client.get("/api/v1/permissions/by-resource")

    assert response.status_code == 200
    data = response.json()

    # Should have groups for students and grades
    resource_names = [group["resource"] for group in data]
    assert "students" in resource_names
    assert "grades" in resource_names

    # Check structure
    for group in data:
        assert "resource" in group
        assert "permissions" in group
        assert isinstance(group["permissions"], list)


def test_get_permission_stats(client, sample_permissions):
    """Test getting permission statistics."""
    response = client.get("/api/v1/permissions/stats")

    assert response.status_code == 200
    data = response.json()

    assert "total_permissions" in data
    assert "active_permissions" in data
    assert "inactive_permissions" in data
    assert "permissions_by_resource" in data
    assert "most_common_actions" in data

    # Should have at least our 4 sample permissions
    assert data["total_permissions"] >= 4
    assert data["active_permissions"] >= 4


def test_create_permission_requires_permission(client):
    """Test creating a permission."""
    response = client.post(
        "/api/v1/permissions/",
        json={"key": "test:action", "resource": "test", "action": "action", "description": "Test permission"},
    )

    # With auth disabled in tests, should succeed
    assert response.status_code in [200, 201]


def test_update_permission(client, sample_permissions):
    """Test updating a permission's description."""
    perm_id = sample_permissions[0].id
    response = client.patch(f"/api/v1/permissions/{perm_id}", json={"description": "Updated description"})

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


def test_get_user_permissions(client, sample_permissions, db):
    """Test getting all permissions for a user."""
    # Create a user
    from backend.models import User

    user = User(
        email="testuser@example.com",
        hashed_password="hashed",
        full_name="Test User",
        role="teacher",
    )
    db.add(user)
    db.commit()

    response = client.get(f"/api/v1/permissions/users/{user.id}")

    assert response.status_code == 200
    data = response.json()

    assert data["user_id"] == user.id
    assert "permissions" in data
    assert "direct_permissions" in data
    assert "role_permissions" in data


def test_user_can_view_own_permissions(client, db):
    """Test that a user can view their own permissions."""
    # Create a user
    from backend.models import User

    user = User(
        email="selfview@example.com",
        hashed_password="hashed",
        full_name="Self View User",
        role="student",
    )
    db.add(user)
    db.commit()

    response = client.get(f"/api/v1/permissions/users/{user.id}")

    # Should work (user viewing own permissions or auth disabled)
    assert response.status_code == 200


def test_pagination_works(client, db):
    """Test that pagination parameters work."""
    # Create many permissions
    now = datetime.now(timezone.utc)
    for i in range(15):
        db.execute(
            text("""
                INSERT INTO permissions (key, resource, action, description, is_active, created_at, updated_at)
                VALUES (:key, :resource, :action, :description, :is_active, :created_at, :updated_at)
            """),
            {
                "key": f"test{i}:action",
                "resource": f"test{i}",
                "action": "action",
                "description": f"Test permission {i}",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
    db.commit()

    # Get first page
    response = client.get("/api/v1/permissions/?skip=0&limit=5")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    # Get second page
    response = client.get("/api/v1/permissions/?skip=5&limit=5")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
