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

import pytest

from backend.config import settings
from backend.db.query_profiler import QueryProfiler, profiler


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


class TestQueryPatterns:
    def test_patterns_detects_n_plus_one(self, client):
        for _ in range(6):
            profiler._record_query('SELECT * FROM "grades"', 0.01)

        response = client.get("/api/v1/diagnostics/queries/patterns")
        body = response.json()
        assert body["table_patterns"]["grades"] == 6
        assert {"table": "grades", "count": 6} in body["potential_n_plus_one"]
        assert body["warning"] is not None

    def test_patterns_no_warning_below_threshold(self, client):
        profiler._record_query('SELECT * FROM "grades"', 0.01)

        response = client.get("/api/v1/diagnostics/queries/patterns")
        assert response.json()["warning"] is None
        assert response.json()["potential_n_plus_one"] == []


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
