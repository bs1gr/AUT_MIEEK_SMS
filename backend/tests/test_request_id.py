def test_request_id_in_response(client):
    """Test that X-Request-ID header is added to responses."""
    response = client.get("/health")

    # Check that X-Request-ID header is present in response
    assert (
        "X-Request-ID" in response.headers
    ), "X-Request-ID header missing from response"

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


def test_custom_request_id(client):
    """Test that custom X-Request-ID from client is preserved."""
    custom_id = "test-custom-request-id-12345"
    response = client.get("/health", headers={"X-Request-ID": custom_id})

    # Check that our custom request ID is preserved
    assert (
        response.headers["X-Request-ID"] == custom_id
    ), "Custom request ID not preserved"
    print(f"✓ Custom request ID preserved: {custom_id}")


def test_multiple_requests(client):
    """Test that different requests get different IDs."""
    response1 = client.get("/health")
    response2 = client.get("/health")

    id1 = response1.headers["X-Request-ID"]
    id2 = response2.headers["X-Request-ID"]

    assert id1 != id2, "Request IDs should be unique for different requests"
