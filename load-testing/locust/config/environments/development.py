"""
Development environment configuration for load testing.
"""

import os
from ..base_config import LoadTestConfig


class DevelopmentConfig(LoadTestConfig):
    """Development environment configuration."""

    # Environment settings
    ENVIRONMENT = "development"

    # Target application settings
    HOST = os.getenv("TARGET_HOST", "http://localhost:8080")
    API_BASE = f"{HOST}/api/v1"

    # Test data settings (smaller datasets for development)
    STUDENT_COUNT = int(os.getenv("STUDENT_COUNT", "100"))
    COURSE_COUNT = int(os.getenv("COURSE_COUNT", "10"))
    USER_COUNT = int(os.getenv("USER_COUNT", "10"))

    # Performance targets (relaxed for development)
    TARGETS = {
        "response_time_95p": 3.0,  # 95th percentile - more lenient
        "response_time_99p": 8.0,  # 99th percentile
        "error_rate_max": 0.10,   # 10% max error rate (development may have issues)
        "requests_per_second": {
            "smoke": 5,
            "light": 25,
            "medium": 100,
            "heavy": 250,
            "stress": 500
        }
    }

    # Test scenarios (focus on basic functionality)
    SCENARIOS = {
        "auth": {
            "weight": 2,
            "description": "Authentication operations"
        },
        "students": {
            "weight": 4,
            "description": "Student management operations"
        },
        "courses": {
            "weight": 3,
            "description": "Course management operations"
        },
        "analytics": {
            "weight": 1,
            "description": "Analytics and reporting"
        }
    }

    # Monitoring (disabled by default in development)
    ENABLE_PROMETHEUS = os.getenv("ENABLE_PROMETHEUS", "false").lower() == "true"

    # CI/CD settings
    CI_MODE = os.getenv("CI", "false").lower() == "true"
    CI_TIMEOUT = int(os.getenv("CI_TIMEOUT", "600"))  # 10 minutes for development