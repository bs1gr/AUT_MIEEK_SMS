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

import pytest

from backend.db.query_profiler import profiler


@pytest.fixture(autouse=True)
def clean_profiler():
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
        assert len(profiler.queries) == 0
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
