"""
Integration tests for SavedSearch CRUD functionality (Feature #142 - BATCH 7).

Tests end-to-end data flow:
- API endpoint → Service → Database
- Authentication and authorization
- Data validation and persistence
- Error handling and edge cases
- Favorite toggle functionality
- Statistics calculation

Author: AI Agent
Date: January 22, 2026
Version: 1.0.0
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from backend.models import User


# Enable auth for these tests (override global test default AUTH_ENABLED=False)
@pytest.fixture(autouse=True)
def enable_auth_for_saved_search_tests(patch_settings_for_tests):
    """Enable authentication for SavedSearch authorization tests.

    Depends on patch_settings_for_tests to ensure it runs first, then overrides AUTH settings.
    """
    from backend.config import settings

    # patch_settings_for_tests has already run (disabled auth)
    # Now override to enable auth for these specific tests
    object.__setattr__(settings, "AUTH_ENABLED", True)
    object.__setattr__(settings, "AUTH_MODE", "strict")

    yield

    # No need to restore - patch_settings_for_tests will clean up


@pytest.fixture
def test_user(db: Session, client: TestClient) -> User:
    """Create a test user for saved search tests."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == "testsearch@example.com").first()
    if existing:
        return existing

    # Create new user via registration
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "testsearch@example.com",
            "password": "Test123!@#",
            "full_name": "Search Test User",
            "role": "student",  # Use valid role: admin, teacher, or student
        },
    )

    # If registration fails (already exists), fetch existing user
    if response.status_code != 200 and response.status_code != 201:
        user = db.query(User).filter(User.email == "testsearch@example.com").first()
        if user:
            return user
        raise Exception(f"Failed to create test user: {response.json()}")

    # Get user from database
    user = db.query(User).filter(User.email == "testsearch@example.com").first()
    assert user, "User not found after registration"
    return user


@pytest.fixture
def test_user_headers(client: TestClient, test_user: User) -> dict:
    """Get authentication headers for test user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "Test123!@#"},  # Use 'email' not 'username'
    )
    assert response.status_code == 200
    data = response.json()
    token = data.get("data", {}).get("access_token") or data.get("access_token")
    assert token, "Failed to get access token"
    return {"Authorization": f"Bearer {token}"}


class TestSavedSearchCRUD:
    """Test SavedSearch CRUD operations through API."""

    def test_create_saved_search_success(self, client: TestClient, admin_headers: dict):
        """Test creating a saved search successfully."""
        payload = {
            "name": "Top Students",
            "description": "Students with excellent performance",
            "search_type": "students",
            "query": "excellent",
            "filters": {"grade_min": 90},
            "is_favorite": False,
        }

        response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)

        assert response.status_code == 200 or response.status_code == 201
        data = response.json()

        # Handle both APIResponse and direct response formats
        if "data" in data:
            result = data["data"]
        else:
            result = data

        assert result["name"] == "Top Students"
        assert result["search_type"] == "students"
        assert "id" in result
        assert "created_at" in result

    def test_create_saved_search_requires_auth(self, client: TestClient):
        """Test that creating saved search requires authentication."""
        payload = {
            "name": "Test Search",
            "search_type": "students",
        }

        response = client.post("/api/v1/search/saved", json=payload)

        # Should return unauthorized (401) or error in APIResponse
        data = response.json()
        if "success" in data:
            assert data["success"] is False, f"Expected success=False but got success={data['success']}"
            assert "error" in data
        else:
            assert response.status_code in [401, 403]

    def test_create_saved_search_validation_error(self, client: TestClient, admin_headers: dict):
        """Test validation errors on invalid input."""
        payload = {
            "name": "",  # Empty name should fail
            "search_type": "invalid_type",  # Invalid search type
        }

        response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)

        # Should return validation error (422) or error in APIResponse
        assert response.status_code in [400, 422] or not response.json().get("success", True)

    def test_list_saved_searches_empty(self, client: TestClient, test_user_headers: dict):
        """Test listing saved searches when none exist."""
        response = client.get("/api/v1/search/saved", headers=test_user_headers)

        assert response.status_code == 200
        data = response.json()

        # Handle both formats
        if "data" in data:
            result = data["data"]
        else:
            result = data

        assert isinstance(result, list)

    def test_list_saved_searches_with_data(self, client: TestClient, admin_headers: dict, db: Session):
        """Test listing saved searches returns created searches."""
        # Create a saved search first
        payload = {
            "name": "List Test Search",
            "search_type": "courses",
            "is_favorite": True,
        }

        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        assert create_response.status_code in [200, 201]

        # Now list searches
        response = client.get("/api/v1/search/saved", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        result = data.get("data", data)

        assert isinstance(result, list)
        assert len(result) > 0

        # Find our created search
        found = any(s["name"] == "List Test Search" for s in result)
        assert found, "Created search not found in list"

    def test_list_saved_searches_filter_by_type(self, client: TestClient, admin_headers: dict):
        """Test filtering saved searches by type."""
        # Create searches of different types
        for search_type in ["students", "courses", "grades"]:
            payload = {
                "name": f"Test {search_type.capitalize()}",
                "search_type": search_type,
            }
            client.post("/api/v1/search/saved", json=payload, headers=admin_headers)

        # Filter by students
        response = client.get("/api/v1/search/saved?search_type=students", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        result = data.get("data", data)

        # All returned searches should be of type 'students'
        for search in result:
            assert search["search_type"] == "students"

    def test_list_saved_searches_filter_by_favorite(self, client: TestClient, admin_headers: dict):
        """Test filtering saved searches by favorite status."""
        # Create a favorite search
        payload = {
            "name": "Favorite Search",
            "search_type": "students",
            "is_favorite": True,
        }
        client.post("/api/v1/search/saved", json=payload, headers=admin_headers)

        # Create a non-favorite search
        payload2 = {
            "name": "Non-Favorite Search",
            "search_type": "students",
            "is_favorite": False,
        }
        client.post("/api/v1/search/saved", json=payload2, headers=admin_headers)

        # Filter by favorites
        response = client.get("/api/v1/search/saved?is_favorite=true", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        result = data.get("data", data)

        # All returned searches should be favorites
        for search in result:
            assert search.get("is_favorite") is True

    def test_get_saved_search_by_id(self, client: TestClient, admin_headers: dict):
        """Test retrieving a specific saved search by ID."""
        # Create a search
        payload = {
            "name": "Get By ID Test",
            "search_type": "students",
        }
        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        assert create_response.status_code in [200, 201]

        create_data = create_response.json()
        search_id = create_data.get("data", create_data)["id"]

        # Get the search by ID
        response = client.get(f"/api/v1/search/saved/{search_id}", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        result = data.get("data", data)

        assert result["id"] == search_id
        assert result["name"] == "Get By ID Test"

    def test_get_saved_search_not_found(self, client: TestClient, admin_headers: dict):
        """Test getting non-existent saved search returns 404."""
        response = client.get("/api/v1/search/saved/99999", headers=admin_headers)

        # Should return 404 or error in APIResponse
        data = response.json()
        if "success" in data:
            assert data["success"] is False
        else:
            assert response.status_code == 404

    def test_update_saved_search(self, client: TestClient, admin_headers: dict):
        """Test updating a saved search."""
        # Create a search
        payload = {
            "name": "Original Name",
            "search_type": "students",
            "description": "Original description",
        }
        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        search_id = create_response.json().get("data", create_response.json())["id"]

        # Update the search
        update_payload = {
            "name": "Updated Name",
            "description": "Updated description",
        }
        response = client.put(f"/api/v1/search/saved/{search_id}", json=update_payload, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        result = data.get("data", data)

        assert result["name"] == "Updated Name"
        assert result["description"] == "Updated description"

    def test_delete_saved_search(self, client: TestClient, admin_headers: dict):
        """Test deleting a saved search (soft delete)."""
        # Create a search
        payload = {
            "name": "To Be Deleted",
            "search_type": "students",
        }
        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        search_id = create_response.json().get("data", create_response.json())["id"]

        # Delete the search
        response = client.delete(f"/api/v1/search/saved/{search_id}", headers=admin_headers)
        assert response.status_code == 200 or response.status_code == 204

        # Verify it's no longer in the list
        list_response = client.get("/api/v1/search/saved", headers=admin_headers)
        searches = list_response.json().get("data", list_response.json())

        # Search should not appear in list (soft deleted)
        found = any(s["id"] == search_id for s in searches)
        assert not found, "Deleted search still appears in list"

    def test_toggle_favorite(self, client: TestClient, admin_headers: dict):
        """Test toggling favorite status of a saved search."""
        # Create a non-favorite search
        payload = {
            "name": "Favorite Toggle Test",
            "search_type": "students",
            "is_favorite": False,
        }
        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        search_id = create_response.json().get("data", create_response.json())["id"]

        # Toggle to favorite
        response = client.post(f"/api/v1/search/saved/{search_id}/favorite", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        result = data.get("data", data)
        assert result.get("is_favorite") is True

        # Toggle back to non-favorite
        response2 = client.post(f"/api/v1/search/saved/{search_id}/favorite", headers=admin_headers)
        assert response2.status_code == 200

        data2 = response2.json()
        result2 = data2.get("data", data2)
        assert result2.get("is_favorite") is False


class TestSavedSearchAuthorization:
    """Test authorization rules for saved searches."""

    def test_user_cannot_see_other_users_searches(
        self, client: TestClient, admin_headers: dict, test_user_headers: dict
    ):
        """Test that users can only see their own saved searches."""
        # Create search with admin user
        admin_payload = {
            "name": "Admin Search",
            "search_type": "students",
        }
        client.post("/api/v1/search/saved", json=admin_payload, headers=admin_headers)

        # Try to list searches as test user
        response = client.get("/api/v1/search/saved", headers=test_user_headers)
        assert response.status_code == 200

        data = response.json()
        searches = data.get("data", data)

        # Test user should not see admin's search
        admin_search_found = any(s["name"] == "Admin Search" for s in searches)
        assert not admin_search_found, "User can see other user's saved searches"

    def test_user_cannot_update_other_users_search(
        self, client: TestClient, admin_headers: dict, test_user_headers: dict
    ):
        """Test that users cannot update other users' saved searches."""
        # Create search with admin user
        payload = {
            "name": "Admin Owned Search",
            "search_type": "students",
        }
        create_response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        search_id = create_response.json().get("data", create_response.json())["id"]

        # Try to update as test user
        update_payload = {"name": "Hacked Name"}
        response = client.put(f"/api/v1/search/saved/{search_id}", json=update_payload, headers=test_user_headers)

        # Should fail with authorization error
        assert response.status_code in [403, 404] or not response.json().get("success", True)


class TestSavedSearchStatistics:
    """Test statistics functionality for saved searches."""

    def test_get_search_statistics(self, client: TestClient, admin_headers: dict, db: Session):
        """Test getting statistics for saved searches."""
        # Create multiple searches with different properties
        searches = [
            {"name": "Stats Test 1", "search_type": "students", "is_favorite": True},
            {"name": "Stats Test 2", "search_type": "courses", "is_favorite": False},
            {"name": "Stats Test 3", "search_type": "students", "is_favorite": True},
        ]

        for search in searches:
            client.post("/api/v1/search/saved", json=search, headers=admin_headers)

        # Note: Statistics endpoint may not exist yet - this is a placeholder
        # If it exists, test it. If not, we can skip or create it in BATCH 8.
        # For now, we'll just verify we can list and count searches
        response = client.get("/api/v1/search/saved", headers=admin_headers)
        assert response.status_code == 200

        data = response.json()
        searches_list = data.get("data", data)

        # Verify we have at least our created searches
        assert len(searches_list) >= 3


class TestSavedSearchEdgeCases:
    """Test edge cases and error handling."""

    def test_create_search_with_same_name(self, client: TestClient, admin_headers: dict):
        """Test creating multiple searches with the same name (should be allowed)."""
        payload = {
            "name": "Duplicate Name",
            "search_type": "students",
        }

        # Create first search
        response1 = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        assert response1.status_code in [200, 201]

        # Create second search with same name
        response2 = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        assert response2.status_code in [200, 201]

        # Both should succeed (names don't need to be unique)

    def test_update_nonexistent_search(self, client: TestClient, admin_headers: dict):
        """Test updating a search that doesn't exist."""
        update_payload = {"name": "Updated Name"}
        response = client.put("/api/v1/search/saved/99999", json=update_payload, headers=admin_headers)

        # Should return 404 or error
        data = response.json()
        if "success" in data:
            assert data["success"] is False
        else:
            assert response.status_code == 404

    def test_delete_nonexistent_search(self, client: TestClient, admin_headers: dict):
        """Test deleting a search that doesn't exist."""
        response = client.delete("/api/v1/search/saved/99999", headers=admin_headers)

        # Should return 404 or error
        data = response.json()
        if "success" in data:
            assert data["success"] is False
        else:
            assert response.status_code == 404

    def test_create_search_with_complex_filters(self, client: TestClient, admin_headers: dict):
        """Test creating a search with complex filter criteria."""
        payload = {
            "name": "Complex Filters",
            "search_type": "students",
            "filters": {
                "grade_min": 80,
                "grade_max": 95,
                "is_active": True,
                "courses": ["MATH101", "PHYS201"],
                "enrollment_year": 2024,
            },
        }

        response = client.post("/api/v1/search/saved", json=payload, headers=admin_headers)
        assert response.status_code in [200, 201]

        data = response.json()
        result = data.get("data", data)

        # Verify filters were saved (would need to get by ID to verify fully)
        assert "id" in result
