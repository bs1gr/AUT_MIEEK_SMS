"""
Comprehensive Health Check System
Provides detailed health, readiness, and liveness probes for production monitoring.
"""

import os
import time
import shutil
import socket
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session
import importlib
import importlib.util
from fastapi import HTTPException

try:  # Optional dependency (available in production image, optional in tests)
    import psutil  # type: ignore
except Exception:  # pragma: no cover - handled gracefully in _check_memory_usage
    psutil = None  # type: ignore

logger = logging.getLogger(__name__)


class HealthCheckStatus:
    """Health check status constants."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthChecker:
    """
    Centralized health checking system.

    Provides three types of checks:
    1. Liveness: Is the application running?
    2. Readiness: Is the application ready to serve traffic?
    3. Health: Detailed health status of all components
    """

    def __init__(self, app_state: Any, db_engine: Any):
        """
        Initialize health checker.

        Args:
            app_state: FastAPI application state
            db_engine: SQLAlchemy database engine
        """
        self.app_state = app_state
        self.db_engine = db_engine
        self.start_time = getattr(app_state, "start_time", time.time())

    def check_liveness(self) -> Dict[str, Any]:
        """
        Liveness probe - checks if the application is alive.

        This is a minimal check that only verifies the application process is running.
        Should always return 200 unless the application is completely dead.

        Returns:
            dict: Liveness status
        """
        return {
            "status": HealthCheckStatus.HEALTHY,
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(time.time() - self.start_time),
        }

    def check_readiness(self, db: Session) -> Dict[str, Any]:
        """
        Readiness probe - checks if the application is ready to serve traffic.

        Verifies:
        - Database connectivity
        - Critical dependencies available

        Returns 503 if not ready, 200 if ready.

        Args:
            db: Database session

        Returns:
            dict: Readiness status

        Raises:
            HTTPException: If not ready (503)
        """
        # If tests or CI requested startup tasks to be disabled, avoid running
        # heavy or host-specific checks (disk, memory). This reduces noise in
        # CI logs and avoids flakiness when running in ephemeral test runners.
        if os.getenv("DISABLE_STARTUP_TASKS") == "1":
            db_check = self._check_database(db)
            checks = {
                "database": db_check,
                "disk_space": {"status": HealthCheckStatus.HEALTHY, "message": "skipped in test mode"},
                "memory": {"status": HealthCheckStatus.HEALTHY, "message": "skipped in test mode"},
            }
        else:
            checks = {
                "database": self._check_database(db),
                "disk_space": self._check_disk_space(),
                "memory": self._check_memory_usage(),
            }

        # If any critical check fails, we're not ready
        all_healthy = all(check["status"] == HealthCheckStatus.HEALTHY for check in checks.values())

        if not all_healthy:
            raise HTTPException(
                status_code=503,
                detail={"status": "not_ready", "timestamp": datetime.now().isoformat(), "checks": checks},
            )

        return {"status": "ready", "timestamp": datetime.now().isoformat(), "checks": checks}

    def check_health(self, db: Session) -> Dict[str, Any]:
        """
        Comprehensive health check - detailed status of all components.

        Provides detailed information about:
        - Database connectivity and stats
        - Disk space
        - Migration status
        - System information
        - Service dependencies

        Returns 503 if unhealthy, 200 if healthy or degraded.

        Args:
            db: Database session

        Returns:
            dict: Comprehensive health information
        """
        # If running in test/CI mode, don't run heavy or environment-dependent
        # checks; return a minimal health payload to avoid noisy logs.
        # However, when tests are executing (pytest sets environment markers) we
        # want check_health to call the underlying check methods so unit tests
        # that patch those methods can exercise them. Detect common pytest
        # env markers and skip the short-circuit in that case.
        disable_startup = os.getenv("DISABLE_STARTUP_TASKS") == "1"
        running_under_pytest = bool(
            os.getenv("PYTEST_CURRENT_TEST") or os.getenv("PYTEST_RUNNING") or os.getenv("TESTING") == "true"
        )

        if disable_startup and not running_under_pytest:
            db_check = self._check_database(db)
            disk_check = {"status": HealthCheckStatus.HEALTHY, "message": "skipped in test mode"}
            memory_check = {"status": HealthCheckStatus.HEALTHY, "message": "skipped in test mode"}
            migration_check = {"status": HealthCheckStatus.DEGRADED, "message": "skipped in test mode"}
            stats_check = {}
            system_check = {"note": "skipped in test mode"}
            frontend_check = {"status": HealthCheckStatus.DEGRADED, "message": "optional; skipped in test mode"}
        else:
            # Perform all health checks
            db_check = self._check_database(db)
            disk_check = self._check_disk_space()
            memory_check = self._check_memory_usage()
            migration_check = self._check_migration_status()
            stats_check = self._get_database_stats(db)
            system_check = self._get_system_info()
            frontend_check = self._check_frontend()

        # Determine overall status
        checks = {
            "database": db_check,
            "disk_space": disk_check,
            "memory": memory_check,
            "migrations": migration_check,
            "frontend": frontend_check,
        }

        # Only critical checks should influence overall health. Frontend and migrations are optional for API health.
        critical_keys = ["database", "disk_space", "memory"]
        critical_checks = {k: v for k, v in checks.items() if k in critical_keys}

        unhealthy_count = sum(1 for c in critical_checks.values() if c["status"] == HealthCheckStatus.UNHEALTHY)
        degraded_count = sum(1 for c in critical_checks.values() if c["status"] == HealthCheckStatus.DEGRADED)

        # Determine overall status based on critical checks only
        if unhealthy_count > 0:
            overall_status = HealthCheckStatus.UNHEALTHY
            status_code = 503
        elif degraded_count > 0:
            overall_status = HealthCheckStatus.DEGRADED
            status_code = 200  # Still serving traffic but with warnings
        else:
            overall_status = HealthCheckStatus.HEALTHY
            status_code = 200

        result = {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(time.time() - self.start_time),
            "environment": self._detect_environment(),
            "version": getattr(self.app_state, "version", "unknown"),
            "checks": checks,
            "statistics": stats_check,
            "system": system_check,
        }

        if status_code != 200:
            raise HTTPException(status_code=status_code, detail=result)

        return result

    def _check_database(self, db: Session) -> Dict[str, Any]:
        """
        Check database connectivity and health.

        Args:
            db: Database session

        Returns:
            dict: Database health status
        """
        try:
            # Try a simple query to verify connectivity
            db.execute(text("SELECT 1"))

            # Check for WAL mode (better for concurrent access)
            result = db.execute(text("PRAGMA journal_mode")).fetchone()
            journal_mode = result[0] if result else "unknown"

            return {
                "status": HealthCheckStatus.HEALTHY,
                "message": "Database connection successful",
                "journal_mode": journal_mode,
                "details": {
                    "connected": True,
                    "responsive": True,
                },
            }
        except Exception as e:
            # Tests often mock the DB session and make execute() raise to simulate failures.
            # In that case we don't want to spam CI logs with full tracebacks. Detect
            # common mock signatures and downgrade the log level for mocked/test runs.
            try:
                is_mocked_execute = hasattr(db.execute, "mock_calls") or "Mock" in type(db.execute).__name__
            except Exception:
                is_mocked_execute = False

            # Quiet health-check logging when running tests or in CI testing mode.
            testing_env = os.getenv("TESTING") == "true"
            if is_mocked_execute or os.getenv("PYTEST_CURRENT_TEST") or os.getenv("PYTEST_RUNNING") or testing_env:
                # During tests or when TESTING=true, log at DEBUG to avoid noisy CI output
                logger.debug(f"Database health check failed (test/mocked): {e}")
            else:
                # In normal runs keep detailed error logs
                logger.error(f"Database health check failed: {e}", exc_info=True)

            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "message": f"Database connection failed: {e!s}",
                "details": {"connected": False, "error": str(e)},
            }

    def _check_disk_space(self, threshold_percent: int = 90) -> Dict[str, Any]:
        """
        Check available disk space.

        Args:
            threshold_percent: Percentage at which to warn (default 90%)

        Returns:
            dict: Disk space status
        """
        try:
            # Get disk usage for current directory
            usage = shutil.disk_usage(".")

            total_gb = usage.total / (1024**3)
            used_gb = usage.used / (1024**3)
            free_gb = usage.free / (1024**3)
            percent_used = (usage.used / usage.total) * 100

            if percent_used >= threshold_percent:
                status = HealthCheckStatus.DEGRADED
                message = f"Disk space low: {percent_used:.1f}% used"
            else:
                status = HealthCheckStatus.HEALTHY
                message = f"Disk space sufficient: {free_gb:.1f}GB free"

            return {
                "status": status,
                "message": message,
                "details": {
                    "total_gb": round(total_gb, 2),
                    "used_gb": round(used_gb, 2),
                    "free_gb": round(free_gb, 2),
                    "percent_used": round(percent_used, 2),
                },
            }
        except Exception as e:
            logger.warning(f"Disk space check failed: {e}")
            return {
                "status": HealthCheckStatus.DEGRADED,
                "message": f"Could not check disk space: {e!s}",
                "details": {},
            }

    def _check_memory_usage(self, threshold_percent: int = 90) -> Dict[str, Any]:
        """Check system memory utilisation."""

        if psutil is None:  # type: ignore[truthy-bool]
            return {
                "status": HealthCheckStatus.DEGRADED,
                "message": "Memory check unavailable (psutil not installed)",
                "details": {},
            }

        try:
            stats = psutil.virtual_memory()  # type: ignore[attr-defined]
            percent_used = float(stats.percent)
            total_gb = stats.total / (1024**3)
            available_gb = stats.available / (1024**3)
            used_gb = (stats.total - stats.available) / (1024**3)

            if percent_used >= threshold_percent:
                status = HealthCheckStatus.DEGRADED
                message = f"Memory usage high: {percent_used:.1f}% used"
            else:
                status = HealthCheckStatus.HEALTHY
                message = f"Memory usage OK: {percent_used:.1f}% used"

            return {
                "status": status,
                "message": message,
                "details": {
                    "total_gb": round(total_gb, 2),
                    "used_gb": round(used_gb, 2),
                    "available_gb": round(available_gb, 2),
                    "percent_used": round(percent_used, 2),
                },
            }
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Memory usage check failed: {exc}")
            return {
                "status": HealthCheckStatus.DEGRADED,
                "message": "Could not determine memory usage",
                "details": {},
            }

    def _check_migration_status(self) -> Dict[str, Any]:
        """
        Check database migration status.

        Returns:
            dict: Migration status
        """
        try:
            import subprocess

            # Use the directory where this file resides (backend/) as working directory
            backend_dir = str(Path(__file__).resolve().parent)
            result = subprocess.run(["alembic", "current"], cwd=backend_dir, capture_output=True, text=True, timeout=5)

            if result.returncode == 0:
                # Parse output to get current version
                output = result.stdout.strip()
                # Output format: "3f2b1a9c0d7e (head)"
                current_version = output.split()[0] if output else "unknown"
                is_head = "(head)" in output

                if is_head:
                    status = HealthCheckStatus.HEALTHY
                    message = "Database migrations up to date"
                else:
                    status = HealthCheckStatus.DEGRADED
                    message = "Database migrations may be outdated"

                return {
                    "status": status,
                    "message": message,
                    "details": {
                        "current_version": current_version,
                        "at_head": is_head,
                    },
                }
            else:
                return {
                    "status": HealthCheckStatus.DEGRADED,
                    "message": "Could not check migration status",
                    "details": {"error": result.stderr},
                }
        except Exception as e:
            logger.warning(f"Migration status check failed: {e}")
            return {"status": HealthCheckStatus.DEGRADED, "message": "Migration check unavailable", "details": {}}

    def _get_database_stats(self, db: Session) -> Dict[str, int]:
        """
        Get database statistics.

        Args:
            db: Database session

        Returns:
            dict: Database statistics
        """
        try:
            # Dynamically resolve models package whether running as package or
            # as a script. Use importlib to avoid try/except local import
            # patterns that confuse static checkers and cause redefinition
            # warnings.
            def _load_models_module() -> Any:
                if importlib.util.find_spec("backend.models") is not None:
                    return importlib.import_module("backend.models")
                elif importlib.util.find_spec("models") is not None:
                    return importlib.import_module("models")
                else:
                    raise ModuleNotFoundError("Could not locate models module")

            mod = _load_models_module()
            Student = getattr(mod, "Student")
            Course = getattr(mod, "Course")
            Grade = getattr(mod, "Grade")
            CourseEnrollment = getattr(mod, "CourseEnrollment")

            return {
                "students": db.query(Student).count(),
                "courses": db.query(Course).count(),
                "grades": db.query(Grade).count(),
                "enrollments": db.query(CourseEnrollment).count(),
            }
        except Exception as e:
            logger.warning(f"Could not fetch database stats: {e}")
            return {}

    def _get_system_info(self) -> Dict[str, Any]:
        """
        Get system information.

        Returns:
            dict: System information
        """
        try:
            hostname = socket.gethostname()
            ips = self._get_network_ips(hostname)

            return {
                "hostname": hostname,
                "ips": ips,
                "python_version": self._get_python_version(),
            }
        except Exception as e:
            logger.warning(f"Could not get system info: {e}")
            return {}

    def _get_network_ips(self, hostname: str) -> List[str]:
        """
        Get network IP addresses.

        Args:
            hostname: System hostname

        Returns:
            list: List of IP addresses
        """
        ips = []
        try:
            # Try psutil first (more reliable)
            try:
                import psutil

                addrs = psutil.net_if_addrs()
                for iface, addr_list in addrs.items():
                    for a in addr_list:
                        if getattr(a, "family", None) == socket.AF_INET:
                            ip = a.address
                            if ip and not ip.startswith("169.254.") and ip not in ips:
                                ips.append(ip)
            except ImportError:
                pass
            # Fallback to socket
            if not ips:
                host_ips = socket.gethostbyname_ex(hostname)[2]
                for ip in host_ips:
                    if ip and not ip.startswith("169.254.") and ip not in ips:
                        ips.append(ip)
            # Always include loopback
            if "127.0.0.1" not in ips:
                ips.append("127.0.0.1")
        except Exception as e:
            logger.warning(f"Could not get network IPs: {e}")
            ips = ["127.0.0.1"]
        return ips

    def _get_python_version(self) -> str:
        """Get Python version string."""
        import sys

        return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    def _detect_environment(self) -> str:
        """
        Detect runtime environment.

        Returns:
            str: Environment type (docker or native)
        """
        # Check for /.dockerenv file
        if os.path.exists("/.dockerenv"):
            return "docker"
        # Check cgroup for docker/containerd
        try:
            with open("/proc/1/cgroup", "r") as f:
                content = f.read()
                if "docker" in content or "containerd" in content:
                    return "docker"
        except Exception as e:
            logger.debug(f"Could not read /proc/1/cgroup: {e}")
            pass
        # Check for DOCKER_CONTAINER env var
        if os.getenv("DOCKER_CONTAINER") == "true":
            return "docker"
        return "native"

    def _check_frontend(self) -> Dict[str, Any]:
        """
        Check if frontend service is running.

        Returns:
            dict: Frontend status
        """
        frontend_port = self._detect_frontend_port()

        if frontend_port:
            return {
                "status": HealthCheckStatus.HEALTHY,
                "message": f"Frontend detected on port {frontend_port}",
                "details": {
                    "running": True,
                    "port": frontend_port,
                },
            }
        else:
            return {
                "status": HealthCheckStatus.DEGRADED,
                "message": "Frontend not detected (optional service)",
                "details": {
                    "running": False,
                    "port": None,
                },
            }

    def _detect_frontend_port(self) -> Optional[int]:
        """
        Detect which port the frontend is running on.

        Returns:
            int or None: Port number if found, None otherwise
        """
        common_ports = [5173, 3000, 5174, 3001, 8080]

        for port in common_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.1)
                result = sock.connect_ex(("127.0.0.1", port))
                sock.close()
                if result == 0:
                    return port
            except:
                continue

        return None
