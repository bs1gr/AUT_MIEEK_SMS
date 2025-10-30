"""
Quick test script to verify request ID tracking functionality.
"""
from fastapi.testclient import TestClient
from backend.main import app
import sys

client = TestClient(app)


def test_request_id_in_response():
    """Test that X-Request-ID header is added to responses."""
    response = client.get("/health")

    # Check that X-Request-ID header is present in response
    assert "X-Request-ID" in response.headers, "X-Request-ID header missing from response"

    request_id = response.headers["X-Request-ID"]
    print(f"✓ Request ID generated: {request_id}")

    # Verify it's a valid UUID format (8-4-4-4-12)
    parts = request_id.split("-")
    assert len(parts) == 5, f"Invalid UUID format: {request_id}"
    assert len(parts[0]) == 8, "Invalid UUID part 1"
    assert len(parts[1]) == 4, "Invalid UUID part 2"
    assert len(parts[2]) == 4, "Invalid UUID part 3"
    assert len(parts[3]) == 4, "Invalid UUID part 4"
    assert len(parts[4]) == 12, "Invalid UUID part 5"

    print("✓ Request ID is valid UUID format")


def test_custom_request_id():
    """Test that custom X-Request-ID from client is preserved."""
    custom_id = "test-custom-request-id-12345"
    response = client.get("/health", headers={"X-Request-ID": custom_id})

    # Check that our custom request ID is preserved
    assert response.headers["X-Request-ID"] == custom_id, "Custom request ID not preserved"
    print(f"✓ Custom request ID preserved: {custom_id}")


def test_multiple_requests():
    """Test that different requests get different IDs."""
    response1 = client.get("/health")
    response2 = client.get("/health")

    id1 = response1.headers["X-Request-ID"]
    id2 = response2.headers["X-Request-ID"]

    assert id1 != id2, "Request IDs should be unique for different requests"
    print("✓ Multiple requests generate unique IDs:")
    print(f"  Request 1: {id1}")
    print(f"  Request 2: {id2}")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("TESTING REQUEST ID TRACKING")
    print("=" * 70 + "\n")

    try:
        print("Test 1: Request ID generation")
        test_request_id_in_response()
        print()

        print("Test 2: Custom request ID preservation")
        test_custom_request_id()
        print()

        print("Test 3: Unique IDs for multiple requests")
        test_multiple_requests()
        print()

        print("=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
