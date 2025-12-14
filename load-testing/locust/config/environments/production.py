"""
Production environment configuration for load testing.
WARNING: Use with extreme caution - only run during maintenance windows.
"""

import os
from ..base_config import LoadTestConfig


class ProductionConfig(LoadTestConfig):
    """Production environment configuration."""

    # Environment settings
    ENVIRONMENT = "production"

    # Target application settings
    HOST = os.getenv("TARGET_HOST", "https://sms.example.com")
    API_BASE = f"{HOST}/api/v1"

    # Test data settings (full production datasets)
    STUDENT_COUNT = int(os.getenv("STUDENT_COUNT", "5000"))
    COURSE_COUNT = int(os.getenv("COURSE_COUNT", "200"))
    USER_COUNT = int(os.getenv("USER_COUNT", "500"))

    # Performance targets (strict production requirements)
    TARGETS = {
        "response_time_95p": 2.0,  # 95th percentile - strict SLA
        "response_time_99p": 5.0,  # 99th percentile
        "error_rate_max": 0.02,   # 2% max error rate (99.8% uptime)
        "requests_per_second": {
            "smoke": 10,
            "light": 50,
            "medium": 200,
            "heavy": 500,
            "stress": 1000
        }
    }

    # Test scenarios (comprehensive production testing)
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

    # Monitoring (required for production)
    ENABLE_PROMETHEUS = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    PROMETHEUS_PORT = int(os.getenv("PROMETHEUS_PORT", "8003"))

    # Safety settings for production
    MAX_USERS = int(os.getenv("MAX_USERS", "200"))  # Limit concurrent users
    RATE_LIMIT_ENABLED = True
    READONLY_MODE = os.getenv("READONLY_MODE", "false").lower() == "true"

    # CI/CD settings (disabled for production by default)
    CI_MODE = os.getenv("CI", "false").lower() == "true"
    CI_TIMEOUT = int(os.getenv("CI_TIMEOUT", "1800"))  # 30 minutes for production

    @classmethod
    def validate_production_safety(cls) -> bool:
        """Additional safety validations for production environment."""
        errors = []

        # Check for required environment variables
        required_vars = ["TARGET_HOST", "AUTH_TOKEN"]
        for var in required_vars:
            if not os.getenv(var):
                errors.append(f"Required environment variable {var} is not set")

        # Check if readonly mode is enabled for safety
        if not cls.READONLY_MODE:
            errors.append("Production load testing should use READONLY_MODE=true")

        # Check user limits
        if cls.MAX_USERS > 500:
            errors.append("MAX_USERS too high for production environment")

        # Check rate limiting
        if not cls.RATE_LIMIT_ENABLED:
            errors.append("Rate limiting must be enabled in production")

        if errors:
            print("Production safety validation errors:")
            for error in errors:
                print(f"  - {error}")
            return False

        print("✅ Production safety validations passed")
        return True

    @classmethod
    def validate_config(cls) -> bool:
        """Override base validation with production safety checks."""
        # Run base validation first
        if not super().validate_config():
            return False

        # Run production-specific validation
        return cls.validate_production_safety()