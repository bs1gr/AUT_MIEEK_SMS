"""
Base configuration for load testing scenarios.
"""

import os
from typing import Dict, Any


class LoadTestConfig:
    """Base configuration class for load testing."""

    # Environment settings
    ENVIRONMENT = os.getenv("LOAD_TEST_ENV", "development")

    # Target application settings
    HOST = os.getenv("TARGET_HOST", "http://localhost:8080")
    API_BASE = f"{HOST}/api/v1"

    # Authentication settings
    DEFAULT_USERS = [
        {
            "email": "admin@example.com",
            "password": "admin123",  # pragma: allowlist secret
            "role": "admin",
        },
        {
            "email": "teacher@example.com",
            "password": "teacher123",  # pragma: allowlist secret
            "role": "teacher",
        },
        {
            "email": "student@example.com",
            "password": "student123",  # pragma: allowlist secret
            "role": "student",
        },
    ]

    # Test data settings
    STUDENT_COUNT = int(os.getenv("STUDENT_COUNT", "1000"))
    COURSE_COUNT = int(os.getenv("COURSE_COUNT", "50"))
    USER_COUNT = int(os.getenv("USER_COUNT", "100"))

    # Performance targets (response times in seconds)
    TARGETS = {
        "response_time_95p": 2.0,  # 95th percentile
        "response_time_99p": 5.0,  # 99th percentile
        "error_rate_max": 0.05,  # 5% max error rate
        "requests_per_second": {
            "smoke": 10,
            "light": 50,
            "medium": 200,
            "heavy": 500,
            "stress": 1000,
        },
    }

    # Test scenarios configuration
    SCENARIOS = {
        "auth": {"weight": 1, "description": "Authentication operations"},
        "students": {"weight": 4, "description": "Student management operations"},
        "courses": {"weight": 3, "description": "Course management operations"},
        "analytics": {"weight": 2, "description": "Analytics and reporting"},
        "attendance": {"weight": 2, "description": "Attendance management"},
        "grades": {"weight": 2, "description": "Grade management"},
    }

    # Monitoring and metrics
    ENABLE_PROMETHEUS = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    PROMETHEUS_PORT = int(os.getenv("PROMETHEUS_PORT", "8001"))
    METRICS_PREFIX = "sms_load_test"

    # Result storage
    RESULTS_DIR = os.getenv("RESULTS_DIR", "load-testing/results")
    REPORTS_DIR = os.path.join(RESULTS_DIR, "reports")
    LOGS_DIR = os.path.join(RESULTS_DIR, "logs")

    # CI/CD settings
    CI_MODE = os.getenv("CI", "false").lower() == "true"
    CI_TIMEOUT = int(os.getenv("CI_TIMEOUT", "1800"))  # 30 minutes

    @classmethod
    def get_scenario_config(cls, scenario: str) -> Dict[str, Any]:
        """Get configuration for a specific test scenario."""
        base_config = {
            "smoke": {
                "users": 5,
                "spawn_rate": 1,
                "run_time": "30s",
                "description": "Basic smoke test",
            },
            "light": {
                "users": 50,
                "spawn_rate": 5,
                "run_time": "2m",
                "description": "Light load test",
            },
            "medium": {
                "users": 200,
                "spawn_rate": 10,
                "run_time": "5m",
                "description": "Medium load test",
            },
            "heavy": {
                "users": 500,
                "spawn_rate": 20,
                "run_time": "10m",
                "description": "Heavy load test",
            },
            "stress": {
                "users": 1000,
                "spawn_rate": 50,
                "run_time": "15m",
                "description": "Stress test",
            },
        }
        return base_config.get(scenario, base_config["smoke"])

    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration settings."""
        errors = []

        # Check required environment variables
        if not cls.HOST:
            errors.append("TARGET_HOST environment variable is required")

        # Check performance targets
        if cls.TARGETS["response_time_95p"] <= 0:
            errors.append("response_time_95p must be positive")

        if cls.TARGETS["error_rate_max"] < 0 or cls.TARGETS["error_rate_max"] > 1:
            errors.append("error_rate_max must be between 0 and 1")

        # Check directories exist or can be created
        for directory in [cls.RESULTS_DIR, cls.REPORTS_DIR, cls.LOGS_DIR]:
            try:
                os.makedirs(directory, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create directory {directory}: {e}")

        if errors:
            print("Configuration validation errors:")
            for error in errors:
                print(f"  - {error}")
            return False

        return True
