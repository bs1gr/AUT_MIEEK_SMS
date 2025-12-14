"""
Staging environment configuration for load testing.
"""

import os
from ..base_config import LoadTestConfig


class StagingConfig(LoadTestConfig):
    """Staging environment configuration."""

    # Environment settings
    ENVIRONMENT = "staging"

    # Target application settings
    HOST = os.getenv("TARGET_HOST", "https://staging.sms.example.com")
    API_BASE = f"{HOST}/api/v1"

    # Test data settings (medium datasets for staging)
    STUDENT_COUNT = int(os.getenv("STUDENT_COUNT", "500"))
    COURSE_COUNT = int(os.getenv("COURSE_COUNT", "25"))
    USER_COUNT = int(os.getenv("USER_COUNT", "50"))

    # Performance targets (production-like but with some tolerance)
    TARGETS = {
        "response_time_95p": 2.5,  # 95th percentile
        "response_time_99p": 6.0,  # 99th percentile
        "error_rate_max": 0.05,   # 5% max error rate
        "requests_per_second": {
            "smoke": 8,
            "light": 40,
            "medium": 150,
            "heavy": 400,
            "stress": 800
        }
    }

    # Test scenarios (balanced testing)
    SCENARIOS = {
        "auth": {
            "weight": 1,
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
            "weight": 2,
            "description": "Analytics and reporting"
        },
        "attendance": {
            "weight": 2,
            "description": "Attendance management"
        },
        "grades": {
            "weight": 2,
            "description": "Grade management"
        }
    }

    # Monitoring (enabled for staging)
    ENABLE_PROMETHEUS = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    PROMETHEUS_PORT = int(os.getenv("PROMETHEUS_PORT", "8002"))

    # CI/CD settings
    CI_MODE = os.getenv("CI", "false").lower() == "true"
    CI_TIMEOUT = int(os.getenv("CI_TIMEOUT", "1200"))  # 20 minutes for staging