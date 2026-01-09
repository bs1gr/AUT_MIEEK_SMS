"""
Tests for comprehensive health check system.
"""

import sys
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from sqlalchemy.orm import Session

from backend.health_checks import HealthChecker, HealthCheckStatus


@pytest.fixture
def mock_app_state():
    """Create mock application state."""
    state = Mock()
    state.start_time = 1000000
    state.version = "3.0.0"
    return state


def test_get_network_ips_exception(health_checker, monkeypatch):
    # Simulate psutil and socket failure
    monkeypatch.setitem(sys.modules, "psutil", SimpleNamespace(net_if_addrs=lambda: {}))

    def boom(*_args, **_kwargs):
        raise OSError("lookup failed")

    monkeypatch.setattr("backend.health_checks.socket.gethostbyname_ex", boom)
    result = health_checker._get_network_ips("host")
    assert result == ["127.0.0.1"]


@pytest.fixture
def mock_db_session():
    """Create mock database session."""
    session = Mock(spec=Session)
    # Mock query results
    session.query.return_value.count.return_value = 10
    return session


@pytest.fixture
def health_checker(mock_app_state, mock_db_engine):
    """Create HealthChecker instance."""
    return HealthChecker(mock_app_state, mock_db_engine)


def test_liveness_check_always_succeeds(health_checker):
    """Test that liveness check always returns healthy."""
    with patch("time.time", return_value=1000100):
        result = health_checker.check_liveness()
        assert result["status"] == HealthCheckStatus.HEALTHY
        assert "timestamp" in result
        assert result["uptime_seconds"] == 100


def test_readiness_check_healthy(health_checker, mock_db_session):
    """Test readiness check when all systems are healthy."""
    # Mock successful database check
    mock_db_session.execute.return_value = Mock()
    with patch.object(health_checker, "_check_database") as mock_db_check:
        mock_db_check.return_value = {"status": HealthCheckStatus.HEALTHY}
        with patch.object(health_checker, "_check_disk_space") as mock_disk_check:
            mock_disk_check.return_value = {"status": HealthCheckStatus.HEALTHY}
            with patch.object(health_checker, "_check_memory_usage") as mock_mem_check:
                mock_mem_check.return_value = {"status": HealthCheckStatus.HEALTHY}
                result = health_checker.check_readiness(mock_db_session)
    assert result["status"] == "ready"
    assert "checks" in result
    assert result["checks"]["database"]["status"] == HealthCheckStatus.HEALTHY


def test_readiness_check_not_ready(health_checker, mock_db_session):
    """Test readiness check when system is not ready."""
    # Mock failed database check
    with patch.object(health_checker, "_check_database") as mock_db_check:
        mock_db_check.return_value = {"status": HealthCheckStatus.UNHEALTHY}
        with patch.object(health_checker, "_check_disk_space") as mock_disk_check:
            mock_disk_check.return_value = {"status": HealthCheckStatus.HEALTHY}
            with patch.object(health_checker, "_check_memory_usage") as mock_mem_check:
                mock_mem_check.return_value = {"status": HealthCheckStatus.HEALTHY}
                # Should raise HTTPException with 503
                from fastapi import HTTPException

                with pytest.raises(HTTPException):
                    health_checker.check_readiness(mock_db_session)
