"""Ensure gzip response compression is configured."""

from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app


def test_gzip_compression_enabled_for_large_payloads():
    client = TestClient(app)

    response = client.get("/openapi.json", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
