"""
Tests for comprehensive health check system.
"""
import pytest
from unittest.mock import Mock, patch
from backend.health_checks import HealthChecker, HealthCheckStatus
from sqlalchemy.orm import Session


@pytest.fixture
def mock_app_state():
    """Create mock application state."""
    state = Mock()
    state.start_time = 1000000
    state.version = "3.0.0"
    return state


@pytest.fixture
def mock_db_engine():
    """Create mock database engine."""
    return Mock()


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
    with patch('time.time', return_value=1000100):
        result = health_checker.check_liveness()
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert "timestamp" in result
    assert result["uptime_seconds"] == 100


def test_readiness_check_healthy(health_checker, mock_db_session):
    """Test readiness check when all systems are healthy."""
    # Mock successful database check
    mock_db_session.execute.return_value = Mock()
    
    with patch.object(health_checker, '_check_database') as mock_db_check:
        mock_db_check.return_value = {"status": HealthCheckStatus.HEALTHY}
        
        with patch.object(health_checker, '_check_disk_space') as mock_disk_check:
            mock_disk_check.return_value = {"status": HealthCheckStatus.HEALTHY}
            
            result = health_checker.check_readiness(mock_db_session)
    
    assert result["status"] == "ready"
    assert "checks" in result
    assert result["checks"]["database"]["status"] == HealthCheckStatus.HEALTHY


def test_readiness_check_not_ready(health_checker, mock_db_session):
    """Test readiness check when system is not ready."""
    # Mock failed database check
    with patch.object(health_checker, '_check_database') as mock_db_check:
        mock_db_check.return_value = {"status": HealthCheckStatus.UNHEALTHY}
        
        with patch.object(health_checker, '_check_disk_space') as mock_disk_check:
            mock_disk_check.return_value = {"status": HealthCheckStatus.HEALTHY}
            
            # Should raise HTTPException with 503
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc_info:
                health_checker.check_readiness(mock_db_session)
            
            assert exc_info.value.status_code == 503


def test_database_check_healthy(health_checker, mock_db_session):
    """Test successful database connectivity check."""
    mock_result = Mock()
    mock_result.__getitem__ = lambda self, index: "wal"
    mock_db_session.execute.return_value.fetchone.return_value = mock_result
    
    result = health_checker._check_database(mock_db_session)
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert result["details"]["connected"] is True
    assert result["journal_mode"] == "wal"


def test_database_check_unhealthy(health_checker, mock_db_session):
    """Test database check when connection fails."""
    mock_db_session.execute.side_effect = Exception("Connection failed")
    
    result = health_checker._check_database(mock_db_session)
    
    assert result["status"] == HealthCheckStatus.UNHEALTHY
    assert result["details"]["connected"] is False
    assert "error" in result["details"]


def test_disk_space_check_healthy(health_checker):
    """Test disk space check with sufficient space."""
    mock_usage = Mock()
    mock_usage.total = 100 * 1024 ** 3  # 100 GB
    mock_usage.used = 50 * 1024 ** 3     # 50 GB
    mock_usage.free = 50 * 1024 ** 3     # 50 GB
    
    with patch('shutil.disk_usage', return_value=mock_usage):
        result = health_checker._check_disk_space()
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert result["details"]["percent_used"] == 50.0


def test_disk_space_check_degraded(health_checker):
    """Test disk space check when space is low."""
    mock_usage = Mock()
    mock_usage.total = 100 * 1024 ** 3  # 100 GB
    mock_usage.used = 95 * 1024 ** 3     # 95 GB
    mock_usage.free = 5 * 1024 ** 3      # 5 GB
    
    with patch('shutil.disk_usage', return_value=mock_usage):
        result = health_checker._check_disk_space(threshold_percent=90)
    
    assert result["status"] == HealthCheckStatus.DEGRADED
    assert result["details"]["percent_used"] == 95.0


def test_migration_status_at_head(health_checker):
    """Test migration status check when at head."""
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stdout = "3f2b1a9c0d7e (head)"
    mock_result.stderr = ""
    
    with patch('subprocess.run', return_value=mock_result):
        result = health_checker._check_migration_status()
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert result["details"]["current_version"] == "3f2b1a9c0d7e"
    assert result["details"]["at_head"] is True


def test_migration_status_not_at_head(health_checker):
    """Test migration status check when migrations are pending."""
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stdout = "abc123def456"
    mock_result.stderr = ""
    
    with patch('subprocess.run', return_value=mock_result):
        result = health_checker._check_migration_status()
    
    assert result["status"] == HealthCheckStatus.DEGRADED
    assert result["details"]["at_head"] is False


def test_detect_environment_native(health_checker):
    """Test environment detection for native execution."""
    with patch('os.path.exists', return_value=False):
        with patch('os.getenv', return_value=None):
            result = health_checker._detect_environment()
    
    assert result == "native"


def test_detect_environment_docker(health_checker):
    """Test environment detection for Docker container."""
    with patch('os.path.exists', return_value=True):
        result = health_checker._detect_environment()
    
    assert result == "docker"


def test_frontend_check_running(health_checker):
    """Test frontend check when frontend is running."""
    with patch.object(health_checker, '_detect_frontend_port', return_value=5173):
        result = health_checker._check_frontend()
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert result["details"]["running"] is True
    assert result["details"]["port"] == 5173


def test_frontend_check_not_running(health_checker):
    """Test frontend check when frontend is not running."""
    with patch.object(health_checker, '_detect_frontend_port', return_value=None):
        result = health_checker._check_frontend()
    
    assert result["status"] == HealthCheckStatus.DEGRADED
    assert result["details"]["running"] is False


def test_comprehensive_health_check(health_checker, mock_db_session):
    """Test comprehensive health check with all components."""
    # Mock all checks to be healthy
    with patch.object(health_checker, '_check_database') as mock_db:
        mock_db.return_value = {"status": HealthCheckStatus.HEALTHY}
        
        with patch.object(health_checker, '_check_disk_space') as mock_disk:
            mock_disk.return_value = {"status": HealthCheckStatus.HEALTHY}
            
            with patch.object(health_checker, '_check_migration_status') as mock_migration:
                mock_migration.return_value = {"status": HealthCheckStatus.HEALTHY}
                
                with patch.object(health_checker, '_check_frontend') as mock_frontend:
                    mock_frontend.return_value = {"status": HealthCheckStatus.HEALTHY}
                    
                    with patch.object(health_checker, '_get_database_stats') as mock_stats:
                        mock_stats.return_value = {"students": 10, "courses": 5}
                        
                        with patch.object(health_checker, '_get_system_info') as mock_system:
                            mock_system.return_value = {"hostname": "test"}
                            
                            with patch('time.time', return_value=1000100):
                                result = health_checker.check_health(mock_db_session)
    
    assert result["status"] == HealthCheckStatus.HEALTHY
    assert "checks" in result
    assert "statistics" in result
    assert "system" in result
    assert result["uptime_seconds"] == 100


def test_health_check_degraded_state(health_checker, mock_db_session):
    """Test health check with degraded components."""
    # Mock one check as degraded
    with patch.object(health_checker, '_check_database') as mock_db:
        mock_db.return_value = {"status": HealthCheckStatus.HEALTHY}
        
        with patch.object(health_checker, '_check_disk_space') as mock_disk:
            mock_disk.return_value = {"status": HealthCheckStatus.DEGRADED}
            
            with patch.object(health_checker, '_check_migration_status') as mock_migration:
                mock_migration.return_value = {"status": HealthCheckStatus.HEALTHY}
                
                with patch.object(health_checker, '_check_frontend') as mock_frontend:
                    mock_frontend.return_value = {"status": HealthCheckStatus.HEALTHY}
                    
                    with patch.object(health_checker, '_get_database_stats') as mock_stats:
                        mock_stats.return_value = {}
                        
                        with patch.object(health_checker, '_get_system_info') as mock_system:
                            mock_system.return_value = {}
                            
                            with patch('time.time', return_value=1000100):
                                result = health_checker.check_health(mock_db_session)
    
    # Should return 200 but with degraded status
    assert result["status"] == HealthCheckStatus.DEGRADED


def test_health_check_unhealthy_state(health_checker, mock_db_session):
    """Test health check with unhealthy components."""
    from fastapi import HTTPException
    
    # Mock database as unhealthy
    with patch.object(health_checker, '_check_database') as mock_db:
        mock_db.return_value = {"status": HealthCheckStatus.UNHEALTHY}
        
        with patch.object(health_checker, '_check_disk_space') as mock_disk:
            mock_disk.return_value = {"status": HealthCheckStatus.HEALTHY}
            
            with patch.object(health_checker, '_check_migration_status') as mock_migration:
                mock_migration.return_value = {"status": HealthCheckStatus.HEALTHY}
                
                with patch.object(health_checker, '_check_frontend') as mock_frontend:
                    mock_frontend.return_value = {"status": HealthCheckStatus.HEALTHY}
                    
                    with patch.object(health_checker, '_get_database_stats') as mock_stats:
                        mock_stats.return_value = {}
                        
                        with patch.object(health_checker, '_get_system_info') as mock_system:
                            mock_system.return_value = {}
                            
                            with patch('time.time', return_value=1000100):
                                # Should raise HTTPException with 503
                                with pytest.raises(HTTPException) as exc_info:
                                    health_checker.check_health(mock_db_session)
                                
                                assert exc_info.value.status_code == 503
