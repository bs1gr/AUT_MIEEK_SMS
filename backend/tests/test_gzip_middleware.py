def test_gzip_compression_enabled_for_large_payloads(client):
    """Ensure gzip response compression is configured."""
    response = client.get("/openapi.json", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
