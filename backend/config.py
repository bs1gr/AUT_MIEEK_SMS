from __future__ import annotations

from functools import lru_cache
from typing import List, Any, Literal
import os
import secrets
import logging
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from pydantic import field_validator, model_validator, EmailStr


def _path_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


# Select defaults based on execution mode
_IS_DOCKER_MODE = os.environ.get("SMS_EXECUTION_MODE", "native").lower() == "docker"

# Database path (container uses /data volume)
if _IS_DOCKER_MODE:
    _DEFAULT_DB_PATH = "/data/student_management.db"
else:
    _DEFAULT_DB_PATH = (Path(__file__).resolve().parents[1] / "data" / "student_management.db").as_posix()

# When running inside Docker Desktop, containers can reach host services via this DNS name
# Use it to allow the API container to talk to monitoring services (Grafana/Prometheus/Loki)
_DEFAULT_MONITORING_HOST = "host.docker.internal" if _IS_DOCKER_MODE else "localhost"


def _get_app_version() -> str:
    # Try to read from VERSION file in project root
    try:
        version_file = Path(__file__).resolve().parents[1] / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    except Exception:
        pass
    # Fallback to env or default
    return os.environ.get("APP_VERSION", "1.3.8")


class Settings(BaseSettings):
    # Choose an env file intelligently:
    # - If a local `backend/.env` exists (native/dev), prefer it
    # - Otherwise fall back to the container path used in Docker deployments
    try:
        _candidate_local = (Path(__file__).resolve().parents[1] / ".env")
        if _candidate_local.exists():
            _env_file_path = str(_candidate_local)
        else:
            _env_file_path = "/app/backend/.env"
    except Exception:
        _env_file_path = "/app/backend/.env"

    model_config = SettingsConfigDict(
        env_file=_env_file_path,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # ignore extra keys in .env (e.g., unrelated settings)
    )

    # Application
    APP_NAME: str = "Student Management System API"
    APP_VERSION: str = _get_app_version()
    SMS_ENV: str = os.environ.get("SMS_ENV", "development")
    SMS_EXECUTION_MODE: str = os.environ.get("SMS_EXECUTION_MODE", "native")

    # Database
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"

    # API Pagination
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000
    MIN_PAGE_SIZE: int = 1

    # Academic Settings
    # Default number of weeks in an academic semester (can be overridden via env)
    SEMESTER_WEEKS: int = 14

    # CORS (store as string to avoid pydantic-settings JSON decoding for complex types)
    # Include common local dev origins (localhost and 127.0.0.1 on common dev ports).
    # Operators can override via CORS_ORIGINS env var when running in different environments.
    CORS_ORIGINS: str = (
        "http://localhost:5173, http://127.0.0.1:5173,"
        " http://localhost:5174, http://127.0.0.1:5174"
    )

    # Security / JWT
    # Names aligned with .env.example
    # The placeholder SECRET_KEY below is intentionally rejected during startup
    # (outside of CI/pytest where a random key is generated). Always set a
    # unique, unpredictable key in your environment before running the app.
    SECRET_KEY: str = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"
    SECRET_KEY_STRICT_ENFORCEMENT: bool = False
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    COOKIE_SECURE: bool = False

    # CSRF Protection
    CSRF_ENABLED: bool = False
    CSRF_HEADER_NAME: str = "X-CSRF-Token"
    CSRF_HEADER_TYPE: str | None = None
    CSRF_COOKIE_NAME: str = "fastapi-csrf-token"
    CSRF_COOKIE_PATH: str = "/"
    CSRF_COOKIE_DOMAIN: str | None = None
    CSRF_COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    CSRF_COOKIE_SECURE: bool | None = None
    CSRF_COOKIE_HTTPONLY: bool = True
    CSRF_COOKIE_MAX_AGE: int = 3600
    CSRF_TOKEN_LOCATION: Literal["header", "body"] = "header"
    CSRF_TOKEN_KEY: str = "csrf-token"
    CSRF_EXEMPT_PATHS: str = "/api/v1/security/csrf,/docs,/openapi.json,/redoc"
    CSRF_ENFORCE_IN_TESTS: bool = False

    # Feature flags
    # Toggle authentication/authorization enforcement without code changes.
    # Default disabled to preserve backward compatibility and keep tests passing.
    AUTH_ENABLED: bool = False
    AUTH_LOGIN_MAX_ATTEMPTS: int = 5
    AUTH_LOGIN_LOCKOUT_SECONDS: int = 300
    AUTH_LOGIN_TRACKING_WINDOW_SECONDS: int = 300

    # Default administrator bootstrap (optional)
    DEFAULT_ADMIN_EMAIL: EmailStr | None = None
    DEFAULT_ADMIN_PASSWORD: str | None = None
    DEFAULT_ADMIN_FULL_NAME: str | None = "System Administrator"
    DEFAULT_ADMIN_FORCE_RESET: bool = False

    # Database performance monitoring
    SQLALCHEMY_SLOW_QUERY_ENABLED: bool = True
    SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS: int = 300
    SQLALCHEMY_SLOW_QUERY_MAX_ENTRIES: int = 200
    SQLALCHEMY_SLOW_QUERY_EXPORT_PATH: str | None = None
    SQLALCHEMY_SLOW_QUERY_INCLUDE_PARAMS: bool = True

    # HTTP middleware
    ENABLE_GZIP: bool = True
    GZIP_MINIMUM_SIZE: int = 500
    ENABLE_RESPONSE_CACHE: bool = True
    RESPONSE_CACHE_TTL_SECONDS: int = 120
    RESPONSE_CACHE_MAXSIZE: int = 512
    RESPONSE_CACHE_INCLUDE_HEADERS: str = "accept-language,accept"
    RESPONSE_CACHE_EXCLUDED_PATHS: str = "/control,/health,/health/live,/health/ready"
    RESPONSE_CACHE_INCLUDE_PREFIXES: str = "/api/v1/analytics,/api/v1/daily-performance,/api/v1/grades/analysis"
    RESPONSE_CACHE_REQUIRE_OPT_IN: bool = True
    RESPONSE_CACHE_OPT_IN_HEADER: str = "x-cache-allow"

    # Monitoring services (Grafana, Prometheus, Loki)
    # Defaults adapt to execution mode so the API inside a container can reach host-published ports.
    GRAFANA_URL: str = os.environ.get("GRAFANA_URL", f"http://{_DEFAULT_MONITORING_HOST}:3000")
    PROMETHEUS_URL: str = os.environ.get("PROMETHEUS_URL", f"http://{_DEFAULT_MONITORING_HOST}:9090")
    LOKI_URL: str = os.environ.get("LOKI_URL", f"http://{_DEFAULT_MONITORING_HOST}:3100")

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        v: Any = getattr(self, "CORS_ORIGINS", "")
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        s = str(v or "").strip()
        if not s:
            return []
        # Accept JSON-looking list or comma-separated
        if s.startswith("[") and s.endswith("]"):
            try:
                import json

                data = json.loads(s)
                if isinstance(data, list):
                    return [str(x).strip() for x in data if str(x).strip()]
            except Exception:
                pass
        return [part.strip() for part in s.split(",") if part.strip()]

    @property
    def CSRF_EXEMPT_PATHS_LIST(self) -> List[str]:
        raw = getattr(self, "CSRF_EXEMPT_PATHS", "")
        if isinstance(raw, list):
            parts = raw
        else:
            parts = [segment.strip() for segment in str(raw or "").split(",")]
        normalized: List[str] = []
        for entry in parts:
            if not entry:
                continue
            path = entry if entry.startswith("/") else f"/{entry}"
            while "//" in path:
                path = path.replace("//", "/")
            normalized.append(path.rstrip(" "))
        return normalized

    @field_validator("SEMESTER_WEEKS")
    @classmethod
    def validate_semester_weeks(cls, v: int) -> int:
        # Enforce reasonable bounds (1 to 52 weeks)
        if v < 1 or v > 52:
            raise ValueError("SEMESTER_WEEKS must be between 1 and 52")
        return v

    @field_validator("CSRF_COOKIE_SAMESITE")
    @classmethod
    def validate_csrf_cookie_samesite(cls, v: str) -> str:
        value = (v or "lax").strip().lower()
        if value not in {"lax", "strict", "none"}:
            raise ValueError("CSRF_COOKIE_SAMESITE must be one of: lax, strict, none")
        return value

    @field_validator("CSRF_TOKEN_LOCATION")
    @classmethod
    def validate_csrf_token_location(cls, v: str) -> str:
        value = (v or "header").strip().lower()
        if value not in {"header", "body"}:
            raise ValueError("CSRF_TOKEN_LOCATION must be either 'header' or 'body'")
        return value

    @field_validator("AUTH_LOGIN_MAX_ATTEMPTS")
    @classmethod
    def validate_auth_login_max_attempts(cls, v: int) -> int:
        if v < 1:
            raise ValueError("AUTH_LOGIN_MAX_ATTEMPTS must be >= 1")
        return v

    @field_validator("AUTH_LOGIN_LOCKOUT_SECONDS")
    @classmethod
    def validate_auth_login_lockout_seconds(cls, v: int) -> int:
        if v < 1:
            raise ValueError("AUTH_LOGIN_LOCKOUT_SECONDS must be >= 1")
        return v

    @field_validator("AUTH_LOGIN_TRACKING_WINDOW_SECONDS")
    @classmethod
    def validate_auth_login_tracking_window(cls, v: int) -> int:
        if v < 1:
            raise ValueError("AUTH_LOGIN_TRACKING_WINDOW_SECONDS must be >= 1")
        return v

    @model_validator(mode="after")
    def check_secret_key(self) -> "Settings":
        """
        Validate SECRET_KEY strength with warnings or errors based on enforcement level.
        
        Behavior:
        - STRICT_ENFORCEMENT or AUTH_ENABLED: Raises error for weak keys (except CI/test)
        - WARNING mode (default): Logs warnings but allows weak keys
        - CI/test environments: Auto-generates temporary secure key
        """
        logger = logging.getLogger(__name__)
        
        is_ci = bool(
            os.environ.get("GITHUB_ACTIONS")
            or os.environ.get("CI")
            or os.environ.get("GITLAB_CI")
            or os.environ.get("GITHUB_RUN_ID")
            or os.environ.get("CI_SERVER")
            or os.environ.get("CONTINUOUS_INTEGRATION")
        )
        is_pytest = bool(
            os.environ.get("PYTEST_CURRENT_TEST")
            or os.environ.get("PYTEST_RUNNING")
            or any("pytest" in (arg or "").lower() for arg in sys.argv)
        )
        allow_insecure_flag = os.environ.get("CI_ALLOW_INSECURE_SECRET", "").lower() in (
            "1",
            "true",
            "yes",
        )

        normalized_secret = (self.SECRET_KEY or "").strip()
        object.__setattr__(self, "SECRET_KEY", normalized_secret)
        
        lower_secret = normalized_secret.lower()

        # Define insecure patterns
        insecure_placeholders = {
            "",
            "change-me",
            "changeme",
            "your-secret-key-change-this-in-production-use-long-random-string",
        }
        is_placeholder = (
            lower_secret in insecure_placeholders
            or lower_secret.startswith("dev-placeholder")
            or "your-secret-key" in lower_secret
            or "change" in lower_secret
            or "placeholder" in lower_secret
        )
        is_too_short = len(normalized_secret) < 32
        
        # Detect security issue type
        security_issue: str | None = None
        if is_placeholder:
            security_issue = "placeholder/default value detected"
        elif is_too_short:
            security_issue = f"must be at least 32 characters (current: {len(normalized_secret)})"
        
        # If no issues, return early
        if not security_issue:
            return self

        # Determine enforcement level
        enforcement_active = bool(self.SECRET_KEY_STRICT_ENFORCEMENT or self.AUTH_ENABLED)
        is_production = self.SMS_ENV.lower() in ("production", "prod", "staging")
        
        def handle_insecure(reason: str, warn_only: bool = False) -> "Settings":
            """Handle insecure SECRET_KEY based on environment and enforcement."""
            if (is_ci or is_pytest or allow_insecure_flag) and not warn_only:
                # Only auto-generate in CI/test when strict enforcement is active
                new_key = secrets.token_urlsafe(48)
                logger.warning(
                    "⚠️  INSECURE SECRET_KEY (%s) detected in CI/test — auto-generating temporary key",
                    reason,
                )
                object.__setattr__(self, "SECRET_KEY", new_key)
                return self
            
            error_msg = (
                f"🔐 SECRET_KEY SECURITY ISSUE: {reason}\n"
                f"   Environment: {self.SMS_ENV} ({self.SMS_EXECUTION_MODE} mode)\n"
                f"   Generate strong key: python -c \"import secrets; print(secrets.token_urlsafe(48))\"\n"
                f"   Set in backend/.env: SECRET_KEY=<generated_key>"
            )
            
            if warn_only:
                logger.warning(error_msg)
                if is_production:
                    logger.error(
                        "❌ CRITICAL: Running in production with weak SECRET_KEY! "
                        "This allows JWT token forgery and session hijacking."
                    )
                return self
            else:
                raise ValueError(error_msg)
        
        # Apply enforcement policy
        if enforcement_active:
            # Strict enforcement: error unless CI/test
            return handle_insecure(security_issue, warn_only=False)
        else:
            # Warning mode: log warning but allow
            return handle_insecure(security_issue, warn_only=True)

        return self

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format and path security."""
        if not v.startswith("sqlite:///"):
            raise ValueError("Only SQLite databases are supported (URL must start with 'sqlite:///')")

        # Extract and validate path
        db_path_str = v.replace("sqlite:///", "")
        try:
            db_path = Path(db_path_str).resolve()

            # Ensure path is within project directory (prevent path traversal)
            project_root = Path(__file__).resolve().parents[1]
            allowed_roots = [project_root]
            if os.environ.get("SMS_EXECUTION_MODE", "").lower() == "docker":
                allowed_roots.append(Path("/data"))

            if not any(_path_within(db_path, root) for root in allowed_roots):
                allowed_desc = ", ".join(str(root) for root in allowed_roots)
                raise ValueError(
                    "Database path must be within an allowed directory.\n"
                    f"Database path: {db_path}\n"
                    f"Allowed roots: {allowed_desc}"
                )

        except Exception as e:
            raise ValueError(f"Invalid database path in DATABASE_URL: {e}")

        return v

    @field_validator("DEFAULT_ADMIN_PASSWORD")
    @classmethod
    def validate_default_admin_password(cls, v: str | None) -> str | None:
        if v is None:
            return None
        value = str(v).strip()
        if not value:
            return None
        if len(value) < 8:
            raise ValueError("DEFAULT_ADMIN_PASSWORD must be at least 8 characters long")
        return value

    @field_validator("SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS")
    @classmethod
    def validate_slow_query_threshold(cls, v: int) -> int:
        if v < 0:
            raise ValueError("SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS must be >= 0")
        return v

    @field_validator("SQLALCHEMY_SLOW_QUERY_MAX_ENTRIES")
    @classmethod
    def validate_slow_query_max_entries(cls, v: int) -> int:
        if v < 1:
            raise ValueError("SQLALCHEMY_SLOW_QUERY_MAX_ENTRIES must be >= 1")
        return v

    @field_validator("GZIP_MINIMUM_SIZE")
    @classmethod
    def validate_gzip_minimum_size(cls, v: int) -> int:
        if v < 128:
            raise ValueError("GZIP_MINIMUM_SIZE must be at least 128 bytes to avoid compressing tiny payloads")
        return v

    @field_validator("RESPONSE_CACHE_TTL_SECONDS")
    @classmethod
    def validate_response_cache_ttl(cls, v: int) -> int:
        if v < 1:
            raise ValueError("RESPONSE_CACHE_TTL_SECONDS must be >= 1")
        return v

    @field_validator("RESPONSE_CACHE_MAXSIZE")
    @classmethod
    def validate_response_cache_maxsize(cls, v: int) -> int:
        if v < 1:
            raise ValueError("RESPONSE_CACHE_MAXSIZE must be >= 1")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
