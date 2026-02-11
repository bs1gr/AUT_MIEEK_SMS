from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend.error_handlers import register_error_handlers
from backend.error_messages import ErrorCode, get_error_message


def _create_app():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/http-exception-locale")
    async def http_exception_locale():
        raise HTTPException(status_code=404, detail={"error_code": ErrorCode.STUDENT_NOT_FOUND})

    @app.get("/http-exception-nonserializable")
    async def http_exception_nonserializable():
        raise HTTPException(status_code=400, detail={"bad": object()})

    return app


def test_http_exception_uses_accept_language():
    app = _create_app()
    client = TestClient(app)
    response = client.get("/http-exception-locale", headers={"Accept-Language": "el"})
    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    message = payload["error"]["message"]
    assert message == get_error_message(ErrorCode.STUDENT_NOT_FOUND, lang="el")


def test_http_exception_nonserializable_detail():
    app = _create_app()
    client = TestClient(app)
    response = client.get("/http-exception-nonserializable")
    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert "HTTP Exception" in payload["error"]["message"] or payload["error"]["message"]
