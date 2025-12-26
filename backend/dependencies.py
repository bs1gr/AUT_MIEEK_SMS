"""
IMPROVED: Shared dependencies and utilities for Student Management System
Includes:
- Better database session management
- Validation utilities
- Error handling
- Logging setup
"""

import logging
import logging.handlers
from contextlib import contextmanager
from functools import wraps
from typing import Generator, Optional

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

# ========== LOGGING SETUP ==========


def setup_logging(log_file: str = "logs/sms.log") -> logging.Logger:
    """
    Configure application logging with both file and console handlers.

    Args:
        log_file: Path to log file

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("SMS")
    logger.setLevel(logging.DEBUG)

    # Create formatters
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s")

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # File handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10485760,  # 10MB
        backupCount=5,
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


logger = setup_logging()


# ========== CUSTOM EXCEPTIONS ==========


class StudentManagementException(Exception):
    """Base exception for Student Management System"""

    pass


class StudentNotFound(StudentManagementException):
    """Raised when a student is not found"""

    pass


class CourseNotFound(StudentManagementException):
    """Raised when a course is not found"""

    pass


class InvalidGradeValue(StudentManagementException):
    """Raised when grade value is invalid"""

    pass


class DatabaseError(StudentManagementException):
    """Raised when database operation fails"""

    pass


# ========== DATABASE UTILITIES ==========


@contextmanager
def db_session_context(SessionLocal) -> Generator[Session, None, None]:
    """
    Context manager for database session handling.
    Properly handles connection cleanup and transaction rollback.

    Args:
        SessionLocal: SQLAlchemy sessionmaker instance

    Yields:
        Database session

    Raises:
        DatabaseError: If session initialization fails
    """
    db = None
    try:
        db = SessionLocal()
        yield db
        db.commit()
    except Exception as e:
        if db:
            db.rollback()
        logger.error("Database error: %s", e, exc_info=True)
        raise DatabaseError(f"Database operation failed: {e!s}")
    finally:
        if db:
            db.close()


def with_db_session(SessionLocal):
    """
    Decorator to inject database session into route handlers.

    Usage:
        @app.get("/students/")
        @with_db_session(SessionLocal)
        def get_students(db: Session = Depends()):
            return db.query(Student).all()
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                with db_session_context(SessionLocal) as db:
                    return func(db, *args, **kwargs)
            except StudentManagementException as e:
                logger.warning("Validation error: %s", e)
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error("Unexpected error: %s", e, exc_info=True)
                raise HTTPException(status_code=500, detail="Internal server error")

        return wrapper

    return decorator


# ========== VALIDATION UTILITIES ==========


class ValidationMixin(BaseModel):
    """Base model with common validation methods"""

    @classmethod
    def validate_model(cls, data: dict) -> "ValidationMixin":
        """
        Validate data and return model instance.

        Args:
            data: Dictionary to validate

        Returns:
            Model instance

        Raises:
            ValidationError: If validation fails
        """
        try:
            return cls(**data)
        except ValidationError as e:
            logger.error("Validation error: %s", e)
            raise


def validate_string(value: str, field_name: str, min_length: int = 1, max_length: int = 255) -> str:
    """
    Validate string field.

    Args:
        value: String to validate
        field_name: Name of field for error messages
        min_length: Minimum length
        max_length: Maximum length

    Returns:
        Validated string (stripped)

    Raises:
        ValueError: If validation fails
    """
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")

    value = value.strip()

    if len(value) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} character(s)")

    if len(value) > max_length:
        raise ValueError(f"{field_name} must not exceed {max_length} characters")

    return value


def validate_email(email: str) -> str:
    """
    Validate email format.

    Args:
        email: Email address to validate

    Returns:
        Validated email

    Raises:
        ValueError: If email is invalid
    """
    import re

    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(pattern, email):
        raise ValueError("Invalid email format")

    return email


def validate_grade(grade: float, max_grade: float = 100.0) -> float:
    """
    Validate grade value.

    Args:
        grade: Grade value
        max_grade: Maximum possible grade

    Returns:
        Validated grade

    Raises:
        ValueError: If grade is invalid
    """
    if not isinstance(grade, (int, float)):
        raise ValueError("Grade must be a number")

    if grade < 0:
        raise ValueError("Grade cannot be negative")

    if grade > max_grade:
        raise ValueError(f"Grade cannot exceed {max_grade}")

    return float(grade)


def validate_percentage(value: float) -> float:
    """
    Validate percentage value (0-100).

    Args:
        value: Percentage value

    Returns:
        Validated percentage

    Raises:
        ValueError: If percentage is invalid
    """
    if not isinstance(value, (int, float)):
        raise ValueError("Percentage must be a number")

    if value < 0 or value > 100:
        raise ValueError("Percentage must be between 0 and 100")

    return float(value)


# ========== ERROR RESPONSE UTILITIES ==========


class ErrorResponse(BaseModel):
    """Standard error response model"""

    status_code: int
    message: str
    detail: Optional[str] = None


def create_error_response(status_code: int, message: str, detail: Optional[str] = None) -> ErrorResponse:
    """
    Create standardized error response.

    Args:
        status_code: HTTP status code
        message: Error message
        detail: Detailed error information

    Returns:
        ErrorResponse object
    """
    return ErrorResponse(status_code=status_code, message=message, detail=detail)


# ========== QUERY UTILITIES ==========


def paginate_query(query, skip: int = 0, limit: int = 100):
    """
    Apply pagination to SQLAlchemy query.

    Args:
        query: SQLAlchemy query object
        skip: Number of records to skip
        limit: Maximum records to return

    Returns:
        Paginated query
    """
    if skip < 0:
        raise ValueError("Skip cannot be negative")

    if limit < 1 or limit > 1000:
        raise ValueError("Limit must be between 1 and 1000")

    return query.offset(skip).limit(limit)


# ========== LOGGING UTILITIES ==========


def log_api_call(method: str, endpoint: str, status_code: Optional[int] = None):
    """
    Log API call.

    Args:
        method: HTTP method (GET, POST, etc.)
        endpoint: API endpoint
        status_code: Response status code
    """
    if status_code:
        logger.info("API call", extra={"method": method, "endpoint": endpoint, "status_code": status_code})
    else:
        logger.info("API call", extra={"method": method, "endpoint": endpoint})


def log_database_operation(operation: str, model: str, record_id: Optional[int] = None):
    """
    Log database operation.

    Args:
        operation: Operation type (CREATE, READ, UPDATE, DELETE)
        model: Model name
        record_id: Record ID (if applicable)
    """
    if record_id:
        logger.debug("Database operation", extra={"operation": operation, "model": model, "record_id": record_id})
    else:
        logger.debug("Database operation", extra={"operation": operation, "model": model})


if __name__ == "__main__":
    print("Testing validation utilities...\n")

    # Test string validation
    try:
        result_str = validate_string("John", "First Name", min_length=1, max_length=100)
        print(f"✓ String validation passed: {result_str}")
    except ValueError as e:
        print(f"✗ String validation failed: {e}")

    # Test grade validation
    try:
        result_grade = validate_grade(85.5, 100.0)
        print(f"✓ Grade validation passed: {result_grade}")
    except ValueError as e:
        print(f"✗ Grade validation failed: {e}")

    # Test percentage validation
    try:
        result_pct = validate_percentage(75.0)
        print(f"✓ Percentage validation passed: {result_pct}")
    except ValueError as e:
        print(f"✗ Percentage validation failed: {e}")

    print("\n✓ All validation utilities are working correctly!")
