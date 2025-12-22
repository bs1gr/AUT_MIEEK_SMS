"""Tests for the ResponseCacheMiddleware integration."""

from __future__ import annotations

from typing import Dict, Tuple

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.middleware.response_cache import ResponseCacheMiddleware


def build_cached_client(
    ttl_seconds: int = 60,
    *,
    require_opt_in: bool = False,
    opt_in_header: str = "x-cache-allow",
) -> Tuple[TestClient, Dict[str, int]]:
    app = FastAPI()
    counter = {"value": 0}

    @app.get("/expensive")
    async def expensive_endpoint():
        counter["value"] += 1
        return {"hits": counter["value"]}

    app.add_middleware(
        ResponseCacheMiddleware,
        ttl_seconds=ttl_seconds,
        maxsize=32,
        require_opt_in=require_opt_in,
        opt_in_header=opt_in_header,
    )
    return TestClient(app), counter


def test_response_cache_returns_cached_payload():
    client, counter = build_cached_client()

    first = client.get("/expensive")
    second = client.get("/expensive")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json() == {"hits": 1}
    assert counter["value"] == 1


def test_authorized_requests_bypass_cache():
    client, counter = build_cached_client()

    first = client.get("/expensive", headers={"Authorization": "Bearer test"})
    second = client.get("/expensive", headers={"Authorization": "Bearer test"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == {"hits": 1}
    assert second.json() == {"hits": 2}
    assert counter["value"] == 2


def test_query_flag_disables_cache():
    client, counter = build_cached_client()

    first = client.get("/expensive", params={"__nocache": "1"})
    second = client.get("/expensive", params={"__nocache": "1"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == {"hits": 1}
    assert second.json() == {"hits": 2}
    assert counter["value"] == 2


def test_opt_in_header_controls_caching():
    header_name = "x-cache-allow"
    client, counter = build_cached_client(
        require_opt_in=True, opt_in_header=header_name
    )

    # Without opt-in, both requests execute the endpoint
    client.get("/expensive")
    client.get("/expensive")
    assert counter["value"] == 2

    # Provide opt-in header (truthy value) to enable caching
    client.get("/expensive", headers={header_name: "1"})
    assert counter["value"] == 3
    client.get("/expensive", headers={header_name: "true"})
    assert counter["value"] == 3  # Cached second response
