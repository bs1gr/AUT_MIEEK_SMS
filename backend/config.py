from __future__ import annotations

from functools import lru_cache
from typing import List, Any
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


# Select default DB path based on execution mode
if os.environ.get("SMS_EXECUTION_MODE", "native").lower() == "docker":
    _DEFAULT_DB_PATH = "/data/student_management.db"
else:
    _DEFAULT_DB_PATH = (Path(__file__).resolve().parents[1] / "data" / "student_management.db").as_posix()


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
    # Use a long development placeholder by default so test runs and local
    # development don't fail on import. Deployments should set a secure
    # SECRET_KEY via environment variables (see README / .env.example).
    SECRET_KEY: str = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Feature flags
    # Toggle authentication/authorization enforcement without code changes.
    # Default disabled to preserve backward compatibility and keep tests passing.
    AUTH_ENABLED: bool = False

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

    @field_validator("SEMESTER_WEEKS")
    @classmethod
    def validate_semester_weeks(cls, v: int) -> int:
        # Enforce reasonable bounds (1 to 52 weeks)
        if v < 1 or v > 52:
            raise ValueError("SEMESTER_WEEKS must be between 1 and 52")
        return v

    @model_validator(mode="after")
    def check_secret_key(self) -> "Settings":
        """Allow insecure SECRET_KEY if AUTH_ENABLED is False, else enforce strong key."""
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

        # If AUTH_ENABLED is False, allow any key for development
        if not self.AUTH_ENABLED:
            return self

        insecure_names = {"change-me", "changeme", ""}
        is_insecure_placeholder = self.SECRET_KEY.lower() in insecure_names or self.SECRET_KEY.lower().startswith(
            "dev-placeholder"
        )

        if is_insecure_placeholder:
            if is_ci or is_pytest or allow_insecure_flag:
                new_key = secrets.token_urlsafe(32)
                logging.getLogger(__name__).warning(
                    "Detected insecure SECRET_KEY in CI/test environment — auto-generating a temporary secret."
                )
                object.__setattr__(self, "SECRET_KEY", new_key)
                return self
            raise ValueError(
                "SECRET_KEY must be changed from default value 'change-me'. "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )

        if len(self.SECRET_KEY) < 32:
            if is_ci or is_pytest or allow_insecure_flag:
                new_key = secrets.token_urlsafe(32)
                logging.getLogger(__name__).warning(
                    "Provided SECRET_KEY is too short in CI/test environment — auto-generating a temporary secret."
                )
                object.__setattr__(self, "SECRET_KEY", new_key)
                return self
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (current length: {len(self.SECRET_KEY)}). "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
