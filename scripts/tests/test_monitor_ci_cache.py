"""
Unit tests for CI cache performance monitoring script.

Tests the cache metrics collection and analysis functionality without requiring
actual GitHub API access (uses mocking).
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import the module we're testing
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from monitor_ci_cache import CacheMetricsCollector


@pytest.fixture
def sample_workflow_runs():
    """Sample workflow runs data from GitHub API."""
    base_time = datetime(2025, 12, 11, 10, 0, 0)
    return [
        {
            "id": 1001,
            "run_number": 37,
            "conclusion": "success",
            "created_at": (base_time + timedelta(hours=2)).isoformat() + "Z",
        },
        {
            "id": 1002,
            "run_number": 38,
            "conclusion": "success",
            "created_at": (base_time + timedelta(hours=4)).isoformat() + "Z",
        },
        {
            "id": 1003,
            "run_number": 39,
            "conclusion": "success",
            "created_at": (base_time + timedelta(hours=6)).isoformat() + "Z",
        },
    ]


@pytest.fixture
def sample_job_with_cache_hits():
    """Sample job data with cache hits (fast installs)."""
    base_time = datetime(2025, 12, 11, 10, 0, 0)
    return [
        {
            "id": 2001,
            "name": "e2e",
            "steps": [
                {
                    "name": "Set up Node",
                    "conclusion": "success",
                    "started_at": base_time.isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=2)).isoformat()
                    + "Z",
                },
                {
                    "name": "Set up Python",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=2)).isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=4)).isoformat()
                    + "Z",  # 2s with cache
                },
                {
                    "name": "Cache Playwright browsers",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=4)).isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=6)).isoformat()
                    + "Z",
                },
                {
                    "name": "Install frontend dependencies",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=6)).isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=11)).isoformat()
                    + "Z",  # 5s with cache
                },
                {
                    "name": "Install Playwright browsers",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=11)).isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=17)).isoformat()
                    + "Z",  # 6s with cache
                },
                {
                    "name": "Install backend dependencies",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=17)).isoformat()
                    + "Z",
                    "completed_at": (base_time + timedelta(seconds=22)).isoformat()
                    + "Z",  # 5s with cache
                },
            ],
        }
    ]


@pytest.fixture
def sample_job_without_cache():
    """Sample job data without cache hits (slow installs)."""
    base_time = datetime(2025, 12, 11, 10, 0, 0)
    return [
        {
            "id": 2002,
            "name": "e2e",
            "steps": [
                {
                    "name": "Set up Node",
                    "conclusion": "success",
                    "started_at": base_time.isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=10)).isoformat()
                    + "Z",  # 10s without cache (slower than threshold)
                },
                {
                    "name": "Install frontend dependencies",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=10)).isoformat() + "Z",
                    "completed_at": (base_time + timedelta(seconds=50)).isoformat()
                    + "Z",  # 40s without cache
                },
                {
                    "name": "Install Playwright browsers",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=50)).isoformat()
                    + "Z",
                    "completed_at": (base_time + timedelta(seconds=110)).isoformat()
                    + "Z",  # 60s without cache
                },
                {
                    "name": "Install backend dependencies",
                    "conclusion": "success",
                    "started_at": (base_time + timedelta(seconds=110)).isoformat()
                    + "Z",
                    "completed_at": (base_time + timedelta(seconds=140)).isoformat()
                    + "Z",  # 30s without cache
                },
            ],
        }
    ]


class TestCacheMetricsCollector:
    """Tests for the CacheMetricsCollector class."""

    def test_initialization(self):
        """Test collector initialization."""
        collector = CacheMetricsCollector("owner", "repo")
        assert collector.repo_owner == "owner"
        assert collector.repo_name == "repo"
        assert collector.base_url == "https://api.github.com/repos/owner/repo"
        assert "Authorization" not in collector.headers

    def test_initialization_with_token(self):
        """Test collector initialization with auth token."""
        collector = CacheMetricsCollector("owner", "repo", token="test_token")
        assert collector.headers["Authorization"] == "token test_token"

    @patch("monitor_ci_cache.requests.get")
    def test_get_workflow_runs(self, mock_get, sample_workflow_runs):
        """Test fetching workflow runs from GitHub API."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"workflow_runs": sample_workflow_runs}
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = CacheMetricsCollector("owner", "repo")
        runs = collector.get_workflow_runs("e2e-tests.yml", count=3)

        assert len(runs) == 3
        assert runs[0]["run_number"] == 37
        assert runs[1]["run_number"] == 38
        assert runs[2]["run_number"] == 39

    @patch("monitor_ci_cache.requests.get")
    def test_get_workflow_runs_with_since(self, mock_get, sample_workflow_runs):
        """Test fetching workflow runs with date filter."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"workflow_runs": sample_workflow_runs}
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = CacheMetricsCollector("owner", "repo")
        collector.get_workflow_runs("e2e-tests.yml", count=3, since="2025-12-11")

        # Verify the API call included the date filter
        call_args = mock_get.call_args
        assert call_args[1]["params"]["created"] == ">=2025-12-11"

    @patch("monitor_ci_cache.requests.get")
    def test_get_job_details(self, mock_get, sample_job_with_cache_hits):
        """Test fetching job details for a workflow run."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"jobs": sample_job_with_cache_hits}
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = CacheMetricsCollector("owner", "repo")
        jobs = collector.get_job_details(1001)

        assert len(jobs) == 1
        assert jobs[0]["name"] == "e2e"
        assert len(jobs[0]["steps"]) == 6

    def test_analyze_cache_performance_with_hits(self, sample_job_with_cache_hits):
        """Test analyzing cache performance when caches hit."""
        collector = CacheMetricsCollector("owner", "repo")
        metrics = collector.analyze_cache_performance(sample_job_with_cache_hits)

        # Check cache hit detection
        assert metrics["npm_cache_hit"] is True  # Node setup was fast
        assert metrics["playwright_cache_hit"] is True  # Cache step succeeded

        # Check timing measurements
        assert metrics["npm_install_time"] == 5.0  # 5 seconds
        assert metrics["playwright_install_time"] == 6.0  # 6 seconds
        assert metrics["pip_install_time"] == 5.0  # 5 seconds
        assert metrics["total_setup_time"] == 16.0  # 5+6+5

    def test_analyze_cache_performance_without_cache(self, sample_job_without_cache):
        """Test analyzing cache performance when caches miss."""
        collector = CacheMetricsCollector("owner", "repo")
        metrics = collector.analyze_cache_performance(sample_job_without_cache)

        # Cache steps not present = no cache hits
        assert metrics["npm_cache_hit"] is False
        assert metrics["playwright_cache_hit"] is False

        # Check timing measurements (slower without cache)
        assert metrics["npm_install_time"] == 40.0  # 40 seconds
        assert metrics["playwright_install_time"] == 60.0  # 60 seconds
        assert metrics["pip_install_time"] == 30.0  # 30 seconds
        assert metrics["total_setup_time"] == 130.0  # 40+60+30

    @patch.object(CacheMetricsCollector, "get_workflow_runs")
    @patch.object(CacheMetricsCollector, "get_job_details")
    def test_generate_report(
        self,
        mock_get_jobs,
        mock_get_runs,
        sample_workflow_runs,
        sample_job_with_cache_hits,
        sample_job_without_cache,
    ):
        """Test generating a comprehensive cache performance report."""
        # Setup mocks: 2 runs with cache, 1 without
        mock_get_runs.return_value = sample_workflow_runs[:3]
        mock_get_jobs.side_effect = [
            sample_job_with_cache_hits,  # Run 1: cache hit
            sample_job_with_cache_hits,  # Run 2: cache hit
            sample_job_without_cache,  # Run 3: cache miss
        ]

        collector = CacheMetricsCollector("owner", "repo")
        report = collector.generate_report("e2e-tests.yml", count=3)

        # Check report structure
        assert report["workflow"] == "e2e-tests.yml"
        assert report["analyzed_runs"] == 3
        assert len(report["runs"]) == 3

        # Check summary statistics
        summary = report["summary"]
        assert "66.7%" in summary["npm_cache_hit_rate"]  # 2 out of 3
        assert "66.7%" in summary["playwright_cache_hit_rate"]  # 2 out of 3

        # Check time calculations
        assert summary["avg_setup_time_with_cache"] == "16.0s"  # From cached runs
        assert summary["avg_setup_time_without_cache"] == "130.0s"  # From uncached run
        assert "114.0s" in summary["estimated_time_saved"]  # 130 - 16
        assert "87.7%" in summary["estimated_time_saved"]  # Speedup percentage


class TestReportGeneration:
    """Tests for report generation and output formatting."""

    @patch.object(CacheMetricsCollector, "get_workflow_runs")
    @patch.object(CacheMetricsCollector, "get_job_details")
    def test_report_json_serializable(
        self,
        mock_get_jobs,
        mock_get_runs,
        sample_workflow_runs,
        sample_job_with_cache_hits,
    ):
        """Test that generated reports are JSON serializable."""
        mock_get_runs.return_value = sample_workflow_runs[:1]
        mock_get_jobs.return_value = sample_job_with_cache_hits

        collector = CacheMetricsCollector("owner", "repo")
        report = collector.generate_report("e2e-tests.yml", count=1)

        # Should not raise an exception
        json_str = json.dumps(report)
        assert isinstance(json_str, str)
        assert len(json_str) > 0

    @patch.object(CacheMetricsCollector, "get_workflow_runs")
    def test_report_handles_no_runs(self, mock_get_runs):
        """Test report generation when no workflow runs are found."""
        mock_get_runs.return_value = []

        collector = CacheMetricsCollector("owner", "repo")
        report = collector.generate_report("e2e-tests.yml", count=10)

        assert "error" in report
        assert report["error"] == "No workflow runs found"


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_analyze_performance_empty_jobs(self):
        """Test analyzing performance with empty jobs list."""
        collector = CacheMetricsCollector("owner", "repo")
        metrics = collector.analyze_cache_performance([])

        assert metrics["npm_cache_hit"] is False
        assert metrics["playwright_cache_hit"] is False
        assert metrics["pip_cache_hit"] is False
        assert metrics["total_setup_time"] is None

    def test_analyze_performance_missing_timestamps(self):
        """Test analyzing performance when timestamps are missing."""
        jobs = [
            {
                "id": 2003,
                "name": "test",
                "steps": [
                    {
                        "name": "Install frontend dependencies",
                        "conclusion": "success",
                        # Missing started_at and completed_at
                    }
                ],
            }
        ]

        collector = CacheMetricsCollector("owner", "repo")
        metrics = collector.analyze_cache_performance(jobs)

        # Should handle gracefully
        assert metrics["npm_install_time"] is None
        assert metrics["total_setup_time"] is None

    @patch("monitor_ci_cache.requests.get")
    def test_api_error_handling(self, mock_get):
        """Test handling of API request errors."""
        mock_get.side_effect = Exception("Network error")

        collector = CacheMetricsCollector("owner", "repo")
        runs = collector.get_workflow_runs("e2e-tests.yml")

        # Should return empty list on error
        assert runs == []
