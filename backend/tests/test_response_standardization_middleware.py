import asyncio
import json

from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from starlette.requests import Request
from fastapi.testclient import TestClient

from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.response_standardization import ResponseStandardizationMiddleware


def _create_app(include_request_id: bool = False):
    app = FastAPI()
    if include_request_id:
        app.add_middleware(RequestIDMiddleware)
    app.add_middleware(ResponseStandardizationMiddleware)

    @app.get("/json")
    async def json_endpoint():
        return {"ok": True}

    @app.get("/prewrapped")
    async def prewrapped():
        payload = {
            "success": True,
            "data": {"value": 1},
            "error": None,
            "meta": {"request_id": "req_123", "timestamp": "2026-01-01T00:00:00Z", "version": "1.0.0"},
        }
        return JSONResponse(content=payload)

    @app.get("/text")
    async def text_endpoint():
        return PlainTextResponse("hello")

    return app


def test_standardizes_json_response():
    app = _create_app()
    middleware = ResponseStandardizationMiddleware(app)

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/json",
        "headers": [],
        "query_string": b"",
        "client": ("test", 1234),
        "server": ("test", 80),
        "scheme": "http",
    }
    request = Request(scope)

    async def call_next(_: Request):
        return JSONResponse(content={"ok": True})

    response = asyncio.run(middleware.dispatch(request, call_next))
    assert isinstance(response, JSONResponse)
    body = json.loads(response.body.decode("utf-8"))
    assert body["success"] is True
    assert body["data"] == {"ok": True}
    assert body["meta"]["request_id"]


def test_preserves_existing_api_response_and_sets_header():
    client = TestClient(_create_app(include_request_id=True))
    response = client.get("/prewrapped")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"] == {"value": 1}
    assert "X-Request-ID" in response.headers


def test_passthrough_non_json_response():
    client = TestClient(_create_app())
    response = client.get("/text")
    assert response.status_code == 200
    assert response.text == "hello"
