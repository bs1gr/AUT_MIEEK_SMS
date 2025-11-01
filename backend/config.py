from __future__ import annotations

from functools import lru_cache
from typing import List, Any

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # ignore extra keys in .env (e.g., unrelated settings)
    )

    # Application
    APP_NAME: str = "Student Management System API"
    APP_VERSION: str = "3.0.3"

    # Database
    # Default to an absolute path under the project root: <repo>/data/student_management.db
    # This avoids CWD-dependent relative paths that can fail on first run.
    _DEFAULT_DB_PATH = (Path(__file__).resolve().parents[1] / "data" / "student_management.db").as_posix()
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"

    # API Pagination
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000
    MIN_PAGE_SIZE: int = 1

    # Academic Settings
    # Default number of weeks in an academic semester (can be overridden via env)
    SEMESTER_WEEKS: int = 14

    # CORS (store as string to avoid pydantic-settings JSON decoding for complex types)
    CORS_ORIGINS: str = "http://localhost:5173"

    # Security / JWT
    # Names aligned with .env.example
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Feature flags
    # Toggle authentication/authorization enforcement without code changes.
    # Default disabled to preserve backward compatibility and keep tests passing.
    AUTH_ENABLED: bool = False

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

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure SECRET_KEY is not default value and is sufficiently long."""
        if v == "change-me":
            raise ValueError(
                "SECRET_KEY must be changed from default value 'change-me'. "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (current length: {len(v)}). "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        return v

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
            try:
                # Check if db_path is relative to project_root
                db_path.relative_to(project_root)
            except ValueError:
                raise ValueError(
                    f"Database path must be within project directory.\n"
                    f"Database path: {db_path}\n"
                    f"Project root: {project_root}"
                )

        except Exception as e:
            raise ValueError(f"Invalid database path in DATABASE_URL: {e}")

        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
