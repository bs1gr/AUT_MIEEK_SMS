"""Tests for backend.routers.routers_diagnostics (query profiler endpoints).

Previously untested. The profiler (backend.db.query_profiler.profiler) is a
process-wide singleton normally populated via a SQLAlchemy event listener
registered against the production engine in the app lifespan - whether that
listener is attached to the in-memory test engine varies with how/where
tests run, so relying on it to generate deterministic query counts would be
flaky. These tests instead seed profiler state directly via its own
_record_query() method (the same method the event listener itself calls),
which exercises the same code path without depending on engine wiring.
"""

import logging
from collections import deque
from contextlib import contextmanager

import pytest

from backend.config import settings
from backend.db.query_profiler import QueryProfiler, profiler
from backend.request_id_middleware import request_id_context


@pytest.fixture(autouse=True)
def clean_profiler(monkeypatch):
    # The tests below were written for a limit of 100 ms: 0.01 s is quick, 0.15 s and 0.2 s slow.
    monkeypatch.setattr(settings, "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS", 100)
    profiler.reset()
    yield
    profiler.reset()


class TestQuerySummary:
    def test_summary_empty(self, client):
        response = client.get("/api/v1/diagnostics/queries/summary")
        assert response.status_code == 200, response.text
        assert response.json()["data"]["total_queries"] == 0

    def test_summary_reflects_recorded_queries(self, client):
        profiler._record_query('SELECT * FROM "students" WHERE id = 1', 0.01)
        profiler._record_query('SELECT * FROM "students" WHERE id = 2', 0.15)

        response = client.get("/api/v1/diagnostics/queries/summary")
        data = response.json()["data"]
        assert data["total_queries"] == 2
        assert data["slow_queries"] == 1
        assert data["table_patterns"]["students"] == 2
        assert data["recorded_queries"] == 2
        assert data["slow_query_threshold_ms"] == 100


class TestSlowQueries:
    def test_slow_queries_only_returns_slow(self, client):
        profiler._record_query("SELECT 1", 0.01)
        profiler._record_query("SELECT 2", 0.2)

        response = client.get("/api/v1/diagnostics/queries/slow")
        body = response.json()
        assert body["count"] == 1
        assert body["data"][0]["duration"] == 0.2

    def test_slow_queries_respects_limit(self, client):
        for i in range(5):
            profiler._record_query(f"SELECT {i}", 0.2)

        response = client.get("/api/v1/diagnostics/queries/slow", params={"limit": 2})
        assert len(response.json()["data"]) == 2


@contextmanager
def in_request(request_id: str):
    """Statements recorded inside belong to this request, as the middleware would mark them."""
    token = request_id_context.set(request_id)
    try:
        yield
    finally:
        request_id_context.reset(token)


class TestQueryPatterns:
    """An N+1 pattern is one table read many times within ONE request. Until November 2026 the
    detector compared the statements per table since the start of the server with five, which
    after an hour was every table, and wrote one warning per table at every call."""

    def test_patterns_detects_n_plus_one(self, client):
        with in_request("req-list-of-grades"):
            for _ in range(6):
                profiler._record_query('SELECT * FROM "grades"', 0.01)

        response = client.get("/api/v1/diagnostics/queries/patterns")
        body = response.json()
        assert body["table_patterns"]["grades"] == 6
        assert {"table": "grades", "count": 6, "request_id": "req-list-of-grades"} in body["potential_n_plus_one"]
        assert body["warning"] is not None
        assert "selectinload" in body["warning"]

    def test_patterns_no_warning_below_threshold(self, client):
        with in_request("req-one"):
            for _ in range(5):
                profiler._record_query('SELECT * FROM "grades"', 0.01)

        response = client.get("/api/v1/diagnostics/queries/patterns")
        assert response.json()["warning"] is None
        assert response.json()["potential_n_plus_one"] == []

    def test_a_busy_table_is_not_a_pattern(self, client):
        """Fifty requests that each read a table once: what every table looks like after an
        hour. Until the fix this was reported, with the total as its count."""
        for i in range(50):
            with in_request(f"req-{i}"):
                profiler._record_query('SELECT * FROM "students" WHERE id = 1', 0.01)

        body = client.get("/api/v1/diagnostics/queries/patterns").json()

        assert body["table_patterns"]["students"] == 50
        assert [p for p in body["potential_n_plus_one"] if p["table"] == "students"] == []

    def test_statements_outside_a_request_are_not_counted(self):
        """The startup tasks and the schedulers read the same tables over and over."""
        for _ in range(20):
            profiler._record_query('SELECT * FROM "notifications"', 0.01)

        assert profiler.detect_n_plus_one() == []
        assert profiler.query_patterns["notifications"] == 20

    def test_only_reads_are_counted(self):
        """An import that inserts 200 rows in one request is not an N+1 pattern."""
        with in_request("req-import"):
            for _ in range(200):
                profiler._record_query('INSERT INTO "students" (id) VALUES (1)', 0.01)
                profiler._record_query('UPDATE "students" SET id = 1', 0.01)
            profiler._record_query("SELECT 1", 0.01)

        assert profiler.detect_n_plus_one() == []

    def test_statements_that_read_from_a_sub_query_are_not_one_table(self):
        """Seen on a scratch server: the dashboard's six aggregate queries, each over a
        sub-query, were reported as six reads of the table "(SELECT"."""
        with in_request("req-dashboard"):
            for i in range(6):
                profiler._record_query(
                    f"SELECT count(*) AS count_{i} FROM (SELECT grades.id FROM grades) AS anon_1", 0.01
                )

        assert profiler.query_patterns["(SELECT"] == 6
        assert profiler.detect_n_plus_one() == []

    def test_the_worst_request_is_reported_for_each_table(self):
        with in_request("req-a"):
            for _ in range(7):
                profiler._record_query('SELECT * FROM "grades"', 0.01)
        with in_request("req-b"):
            for _ in range(12):
                profiler._record_query('SELECT * FROM "grades"', 0.01)
            for _ in range(6):
                profiler._record_query('SELECT * FROM "courses"', 0.01)
        with in_request("req-c"):
            for _ in range(9):
                profiler._record_query('SELECT * FROM "grades"', 0.01)

        assert profiler.n_plus_one_requests() == [
            {"table": "grades", "count": 12, "request_id": "req-b"},
            {"table": "courses", "count": 6, "request_id": "req-b"},
        ]
        assert profiler.detect_n_plus_one() == [("grades", 12), ("courses", 6)]
        assert profiler.detect_n_plus_one(threshold=11) == [("grades", 12)]

    def test_only_the_newest_requests_are_tracked(self):
        own = QueryProfiler(max_tracked_requests=3)
        for name in ("old", "b", "c", "d"):
            with in_request(f"req-{name}"):
                for _ in range(6):
                    own._record_query(f'SELECT * FROM "{name}"', 0.01)

        assert [entry["table"] for entry in own.n_plus_one_requests()] == ["b", "c", "d"]
        assert own.get_summary()["tracked_requests"] == 3
        # Every statement is still in the totals.
        assert own.query_patterns["old"] == 6

    def test_a_request_that_reads_again_stays_among_the_newest(self):
        own = QueryProfiler(max_tracked_requests=2)
        with in_request("req-long"):
            for _ in range(6):
                own._record_query('SELECT * FROM "grades"', 0.01)
        with in_request("req-b"):
            own._record_query('SELECT * FROM "courses"', 0.01)
        with in_request("req-long"):
            own._record_query('SELECT * FROM "grades"', 0.01)
        with in_request("req-c"):
            own._record_query('SELECT * FROM "courses"', 0.01)

        assert own.n_plus_one_requests() == [{"table": "grades", "count": 7, "request_id": "req-long"}]

    def test_the_summary_and_the_patterns_write_no_warning(self, client, caplog):
        """Both wrote one warning per reported table at every call."""
        with in_request("req-1"):
            for _ in range(6):
                profiler._record_query('SELECT * FROM "grades"', 0.01)

        with caplog.at_level(logging.DEBUG, logger="backend.db.query_profiler"):
            summary = client.get("/api/v1/diagnostics/queries/summary").json()["data"]
            patterns = client.get("/api/v1/diagnostics/queries/patterns").json()

        assert summary["n_plus_one_patterns"] == [["grades", 6]]
        assert summary["n_plus_one_threshold"] == 5
        assert summary["tracked_requests"] >= 1
        assert patterns["potential_n_plus_one"][0]["table"] == "grades"
        assert [
            r for r in caplog.records if r.name == "backend.db.query_profiler" and r.levelno >= logging.WARNING
        ] == []

    def test_reset_forgets_the_requests(self):
        with in_request("req-1"):
            for _ in range(6):
                profiler._record_query('SELECT * FROM "grades"', 0.01)
        assert profiler.detect_n_plus_one() == [("grades", 6)]

        profiler.reset()

        assert profiler.detect_n_plus_one() == []
        assert profiler.get_summary()["tracked_requests"] == 0


class TestRequestsThroughTheMiddleware:
    """The whole path: the request-id middleware marks the request, the statements run on the
    engine (in the endpoint itself or on a worker thread), and the engine's hook finds the
    request they belong to."""

    @pytest.fixture()
    def served(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine, text
        from sqlalchemy.pool import StaticPool

        from backend.request_id_middleware import RequestIDMiddleware

        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE lessons (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE rooms (id INTEGER PRIMARY KEY)"))
        own = QueryProfiler()
        own.register(engine)
        own.reset()

        def read(table: str, times: int) -> None:
            with engine.connect() as connection:
                for i in range(times):
                    connection.execute(text(f"SELECT id FROM {table} WHERE id = {i}"))

        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/async-list")
        async def async_list():
            read("lessons", 8)
            return {"ok": True}

        @app.get("/sync-list")
        def sync_list():
            read("rooms", 7)
            return {"ok": True}

        @app.get("/one")
        async def one():
            read("lessons", 1)
            return {"ok": True}

        with TestClient(app) as test_client:
            yield test_client, own
        engine.dispose()

    def test_an_async_endpoint_is_found_with_its_request_id(self, served):
        test_client, own = served

        response = test_client.get("/async-list")

        request_id = response.headers["X-Request-ID"]
        assert own.n_plus_one_requests() == [{"table": "lessons", "count": 8, "request_id": request_id}]

    def test_a_sync_endpoint_on_a_worker_thread_is_found_too(self, served):
        test_client, own = served

        response = test_client.get("/sync-list", headers={"X-Request-ID": "from-the-client"})

        assert response.headers["X-Request-ID"] == "from-the-client"
        assert own.n_plus_one_requests() == [{"table": "rooms", "count": 7, "request_id": "from-the-client"}]

    def test_many_requests_reading_once_are_not_reported(self, served):
        test_client, own = served

        for _ in range(30):
            assert test_client.get("/one").status_code == 200

        assert own.query_patterns["lessons"] == 30
        assert own.n_plus_one_requests() == []
        assert own.get_summary()["tracked_requests"] == 30


class TestResetProfiler:
    def test_reset_clears_recorded_stats(self, client):
        profiler._record_query("SELECT 1", 0.2)

        response = client.post("/api/v1/diagnostics/queries/reset")
        assert response.status_code == 200, response.text
        assert "cleared 1 queries" in response.json()["message"]
        assert len(profiler.queries) == 0
        assert profiler.query_count == 0
        assert profiler.slow_query_count == 0
        assert profiler.total_time == 0.0


class TestHealthCheckQueries:
    def test_health_healthy_with_no_queries(self, client):
        response = client.get("/api/v1/diagnostics/health/queries")
        assert response.json()["status"] == "healthy"

    def test_health_critical_with_high_slow_rate(self, client):
        for _ in range(10):
            profiler._record_query("SELECT 1", 0.2)

        response = client.get("/api/v1/diagnostics/health/queries")
        body = response.json()
        assert body["status"] == "critical"
        assert body["slow_query_rate_percent"] == 100.0

    def test_health_healthy_with_low_slow_rate(self, client):
        for _ in range(9):
            profiler._record_query("SELECT 1", 0.01)
        profiler._record_query("SELECT 2", 0.2)

        response = client.get("/api/v1/diagnostics/health/queries")
        assert response.json()["status"] == "healthy"

    def test_health_counts_every_query_not_only_the_kept_records(self, client, monkeypatch):
        """With only the newest records kept, a rate over the kept ones would pass 100 %."""
        monkeypatch.setattr(profiler, "queries", deque(maxlen=4))
        for _ in range(15):
            profiler._record_query("SELECT 1", 0.01)
        for _ in range(5):
            profiler._record_query("SELECT 2", 0.2)

        body = client.get("/api/v1/diagnostics/health/queries").json()

        assert len(profiler.queries) == 4
        assert body["total_queries"] == 20
        assert body["slow_query_rate_percent"] == 25.0
        assert body["avg_response_time_ms"] == pytest.approx((15 * 0.01 + 5 * 0.2) / 20 * 1000, abs=0.01)

    def test_health_check_writes_no_warnings(self, client, caplog):
        """It is polled; the N+1 warnings of the summary must not come with every poll."""
        for _ in range(6):
            profiler._record_query('SELECT * FROM "grades"', 0.01)

        with caplog.at_level(logging.WARNING, logger="backend.db.query_profiler"):
            assert client.get("/api/v1/diagnostics/health/queries").status_code == 200

        assert [r for r in caplog.records if r.name == "backend.db.query_profiler"] == []


def _headers(db, email: str, role: str) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token

    db.add(User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


ENDPOINTS = [
    ("get", "/api/v1/diagnostics/queries/summary"),
    ("get", "/api/v1/diagnostics/queries/slow"),
    ("get", "/api/v1/diagnostics/queries/patterns"),
    ("get", "/api/v1/diagnostics/health/queries"),
    ("post", "/api/v1/diagnostics/queries/reset"),
]


class TestWithAuthenticationOn:
    """Every real server. The tests above run with authentication off, where the permission
    check is skipped; with it on, all five endpoints answered 500 "Request not available"."""

    @pytest.fixture(autouse=True)
    def strict_auth(self, monkeypatch):
        monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
        monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)

    @pytest.mark.parametrize(("method", "path"), ENDPOINTS)
    def test_an_administrator_gets_an_answer(self, client, db, method, path):
        headers = _headers(db, "diag-admin@example.com", "admin")

        response = getattr(client, method)(path, headers=headers)

        assert response.status_code == 200, response.text
        assert response.json()["status"] in {"ok", "healthy"}

    @pytest.mark.parametrize(("method", "path"), ENDPOINTS)
    def test_a_teacher_is_refused(self, client, db, method, path):
        headers = _headers(db, "diag-teacher@example.com", "teacher")

        assert getattr(client, method)(path, headers=headers).status_code == 403

    @pytest.mark.parametrize(("method", "path"), ENDPOINTS)
    def test_nobody_is_let_in_without_a_login(self, client, method, path):
        assert getattr(client, method)(path).status_code == 401


def test_every_permission_guarded_endpoint_takes_a_request():
    """The permission decorators look the request up among the endpoint's own arguments, by
    the name `request`. An endpoint without it works in the tests (authentication off) and
    answers 500 on a real server, which is how the five above went unnoticed."""
    import ast
    import os
    from pathlib import Path

    decorators = {"require_permission", "require_any_permission", "require_all_permissions"}
    backend_root = Path(__file__).resolve().parents[1]
    sources = []
    for folder, subfolders, files in os.walk(backend_root):
        # Not the tests, and not a virtual environment or a cache sitting in the folder.
        subfolders[:] = [s for s in subfolders if s not in {"tests", "venv", "__pycache__"} and not s.startswith(".")]
        sources += [Path(folder) / name for name in files if name.endswith(".py")]

    guarded = 0
    without_request = []
    for path in sorted(sources):
        relative = path.relative_to(backend_root)
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            names = set()
            for decorator in node.decorator_list:
                target = decorator.func if isinstance(decorator, ast.Call) else decorator
                names.add(getattr(target, "id", None) or getattr(target, "attr", None))
            if not names & decorators:
                continue
            guarded += 1
            arguments = [a.arg for a in node.args.posonlyargs + node.args.args + node.args.kwonlyargs]
            if "request" not in arguments:
                without_request.append(f"{relative.as_posix()}:{node.lineno} {node.name}")

    assert guarded > 200, "the scan no longer finds the guarded endpoints"
    assert without_request == []


class TestSlowLimit:
    """One limit for the whole server: SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS."""

    def test_the_stock_limit_is_the_settings_300_ms(self, monkeypatch):
        stock = type(settings).model_fields["SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS"].default
        assert stock == 300
        monkeypatch.setattr(settings, "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS", stock)

        # The cloud host's health check, 65 ms from its database: 118 to 197 ms, every 30 s.
        profiler._record_query("SELECT pg_catalog.pg_class.relname FROM pg_catalog.pg_class", 0.197)
        profiler._record_query('SELECT * FROM "students"', 0.301)

        assert profiler.slow_query_count == 1
        assert [q.is_slow for q in profiler.queries] == [False, True]

    def test_the_limit_follows_the_setting(self, monkeypatch):
        monkeypatch.setattr(settings, "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS", 500)
        profiler._record_query("SELECT 1", 0.45)
        assert profiler.slow_query_count == 0

        monkeypatch.setattr(settings, "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS", 400)
        profiler._record_query("SELECT 1", 0.45)
        assert profiler.slow_query_count == 1
        assert profiler.get_summary()["slow_query_threshold_ms"] == 400

    def test_a_limit_given_to_the_profiler_wins(self):
        own = QueryProfiler(slow_threshold=0.05)
        own._record_query("SELECT 1", 0.06)
        assert own.slow_query_count == 1

    def test_a_slow_statement_is_not_warned_about_here(self, caplog):
        """backend.performance_monitor writes the warning, at the same limit: one line, not two."""
        with caplog.at_level(logging.DEBUG, logger="backend.db.query_profiler"):
            profiler._record_query('SELECT * FROM "students"', 0.2)

        own = [r for r in caplog.records if r.name == "backend.db.query_profiler"]
        assert [r.levelno for r in own] == [logging.DEBUG]
        assert "Slow query (0.200s)" in own[0].getMessage()


class TestKeptRecords:
    """The profiler keeps its newest records only; the totals count everything."""

    def test_only_the_newest_records_are_kept(self):
        own = QueryProfiler(slow_threshold=0.1, max_records=3)
        for i in range(10):
            own._record_query(f'SELECT {i} FROM "students"', 0.2 if i < 2 else 0.01)

        assert [q.statement for q in own.queries] == [f'SELECT {i} FROM "students"' for i in (7, 8, 9)]
        assert own.query_count == 10
        assert own.slow_query_count == 2  # both already dropped from the records
        assert own.query_patterns["students"] == 10
        assert own.total_time == pytest.approx(2 * 0.2 + 8 * 0.01)

        summary = own.get_summary()
        assert summary["total_queries"] == 10
        assert summary["recorded_queries"] == 3
        assert summary["average_time"] == pytest.approx((2 * 0.2 + 8 * 0.01) / 10)

    def test_the_server_keeps_a_bounded_number(self):
        assert profiler.queries.maxlen == QueryProfiler.MAX_RECORDED_QUERIES == 2000

        for i in range(QueryProfiler.MAX_RECORDED_QUERIES + 50):
            profiler._record_query("SELECT 1", 0.001)

        assert len(profiler.queries) == 2000
        assert profiler.query_count == 2050

    def test_recent_queries_is_a_copy(self):
        profiler._record_query("SELECT 1", 0.01)
        snapshot = profiler.recent_queries()
        profiler._record_query("SELECT 2", 0.01)

        assert [q.statement for q in snapshot] == ["SELECT 1"]
        assert isinstance(snapshot, list)

    def test_slow_list_shows_what_is_still_kept(self, client, monkeypatch):
        monkeypatch.setattr(profiler, "queries", deque(maxlen=2))
        profiler._record_query("SELECT old", 0.2)
        profiler._record_query("SELECT a", 0.01)
        profiler._record_query("SELECT new", 0.3)

        body = client.get("/api/v1/diagnostics/queries/slow").json()

        assert [q["statement"] for q in body["data"]] == ["SELECT new"]
        assert client.get("/api/v1/diagnostics/queries/summary").json()["data"]["slow_queries"] == 2
