import httpx

import backend.scripts.import_.courses as aic


class DummyResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json = json_data if json_data is not None else {}

    def json(self):
        return self._json


def test_wait_for_server_success(monkeypatch):
    def fake_get(url, timeout):
        return DummyResponse(200, {})

    monkeypatch.setattr(httpx, "get", fake_get)

    assert aic.wait_for_server(timeout=0.1, interval=0) is True


def test_wait_for_server_timeout(monkeypatch):
    # Never becomes ready
    def fake_get(url, timeout):
        raise httpx.RequestError("boom")

    monkeypatch.setattr(httpx, "get", fake_get)

    # Use zero timeout to exit immediately
    assert aic.wait_for_server(timeout=0.0, interval=0) is False


def test_wait_for_server_non_200(monkeypatch):
    # Backend responds but not ready (e.g., 503)
    def fake_get(url, timeout):
        return DummyResponse(503, {})

    # Accelerate time to avoid a long loop
    t = {"now": 0.0}

    def fake_time():
        t["now"] += 0.01
        return t["now"]

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(aic.time, "time", fake_time)

    assert aic.wait_for_server(timeout=1, interval=0) is False


def test_check_and_import_courses_empty_success(monkeypatch):
    def fake_get(url, timeout):
        if url.endswith("/courses/"):
            return DummyResponse(200, [])
        raise AssertionError(f"unexpected GET {url}")

    def fake_post(url, headers, timeout):
        assert url.endswith("/imports/courses?source=template")
        return DummyResponse(200, {"created": 3, "updated": 1})

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(httpx, "post", fake_post)

    assert aic.check_and_import_courses("http://localhost:8000/api/v1") is True


def test_check_and_import_courses_courses_exist(monkeypatch):
    def fake_get(url, timeout):
        if url.endswith("/courses/"):
            return DummyResponse(200, [{"id": 1}])
        raise AssertionError(f"unexpected GET {url}")

    monkeypatch.setattr(httpx, "get", fake_get)

    assert aic.check_and_import_courses("http://localhost:8000/api/v1") is True


def test_check_and_import_courses_import_failed(monkeypatch):
    def fake_get(url, timeout):
        if url.endswith("/courses/"):
            return DummyResponse(200, [])
        raise AssertionError(f"unexpected GET {url}")

    def fake_post(url, headers, timeout):
        return DummyResponse(500, {})

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(httpx, "post", fake_post)

    assert aic.check_and_import_courses("http://localhost:8000/api/v1") is False


def test_check_and_import_courses_exception(monkeypatch):
    def fake_get(url, timeout):
        raise RuntimeError("nope")

    monkeypatch.setattr(httpx, "get", fake_get)

    assert aic.check_and_import_courses("http://localhost:8000/api/v1") is False
