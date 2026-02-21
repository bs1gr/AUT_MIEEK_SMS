# Error Recovery & Resilience Patterns

**Version**: 1.0
**Date**: 2025-12-12
**Status**: Production Ready
**Target Release**: $11.18.3

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Error Categories](#error-categories)
3. [Recovery Patterns](#recovery-patterns)
4. [Resilience Strategies](#resilience-strategies)
5. [Circuit Breaker Pattern](#circuit-breaker-pattern)
6. [Fallback Mechanisms](#fallback-mechanisms)
7. [Error Logging & Monitoring](#error-logging--monitoring)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Reference Implementation](#reference-implementation)

---

## Executive Summary

This guide documents error recovery strategies and resilience patterns for the Student Management System. The system is designed to gracefully handle failures, provide meaningful feedback to users, and maintain service availability during transient issues.

### Key Principles

1. **Fail Fast**: Detect errors early and report clearly
2. **Recover Gracefully**: Implement automatic recovery where possible
3. **Degrade Gracefully**: Reduce functionality rather than fail completely
4. **Inform Users**: Provide clear error messages and next steps
5. **Learn from Failures**: Log and monitor all failures for improvement

---

## Error Categories

### Category 1: Transient Errors (Retry-able)

These are temporary failures that may succeed if retried:

| Error Type | Cause | Recovery | Example |
|-----------|-------|----------|---------|
| **Network Timeout** | Temporary network issue | Retry with exponential backoff | `Connection timeout to database` |
| **Database Lock** | Concurrent transaction | Retry with exponential backoff | `Database is locked` |
| **Rate Limit** | Request quota exceeded | Wait then retry | `429 Too Many Requests` |
| **Temporary Service Outage** | Service briefly unavailable | Retry with exponential backoff | `Service Unavailable (503)` |

**Recovery Pattern:**

```python
import asyncio
from functools import wraps

def retry_on_transient(max_retries: int = 3, backoff: float = 1.0):
    """Retry decorator for transient errors."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(1, max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except TransientError as e:
                    last_error = e
                    if attempt < max_retries:
                        wait_time = backoff * (2 ** (attempt - 1))
                        await asyncio.sleep(wait_time)
                    continue
            raise last_error
        return wrapper
    return decorator

```text
### Category 2: Client Errors (Non-Retry-able)

These are permanent client errors that shouldn't be retried:

| Error Type | Cause | Recovery | Example |
|-----------|-------|----------|---------|
| **Invalid Input** | Client provided bad data | Fix input and retry | `ValidationError: Email invalid` |
| **Unauthorized** | Missing/invalid credentials | Re-authenticate | `401 Unauthorized` |
| **Forbidden** | Insufficient permissions | Request access | `403 Forbidden` |
| **Not Found** | Resource doesn't exist | Handle gracefully | `404 Not Found` |
| **Conflict** | Resource state conflict | Resolve and retry | `409 Conflict` |

**Recovery Pattern:**

```python
from fastapi import HTTPException

def validate_and_handle(data: dict):
    """Validate input and provide clear error messages."""
    if not data.get('email'):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "VALIDATION_ERROR",
                "field": "email",
                "message": "Email is required",
                "suggestion": "Provide a valid email address"
            }
        )

```text
### Category 3: Server Errors (Investigate)

These indicate server-side issues requiring investigation:

| Error Type | Cause | Recovery | Example |
|-----------|-------|----------|---------|
| **Internal Server Error** | Unexpected exception | Log and alert | `500 Internal Server Error` |
| **Database Error** | Database operation failed | Check database health | `Database connection error` |
| **File System Error** | File operation failed | Check disk space | `Disk quota exceeded` |
| **Unhandled Exception** | Code bug | Debug and fix | `AttributeError: NoneType...` |

**Recovery Pattern:**

```python
import logging
import traceback

logger = logging.getLogger(__name__)

async def handle_server_error(error: Exception, request_id: str):
    """Log server errors with full context."""
    logger.error(
        "Server error occurred",
        extra={
            "request_id": request_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc()
        }
    )

    # Alert ops team for critical errors
    if isinstance(error, DatabaseError):
        send_alert("Database error detected", severity="critical")

```text
---

## Recovery Patterns

### Pattern 1: Exponential Backoff Retry

For transient errors, retry with increasing delays:

```python
import asyncio
from datetime import datetime, timedelta

async def retry_with_backoff(
    func,
    max_retries: int = 5,
    base_wait: float = 1.0,
    max_wait: float = 60.0
):
    """Retry with exponential backoff."""
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            return await func()
        except TransientError as e:
            last_error = e

            if attempt >= max_retries:
                break

            # Calculate wait time: base * 2^(attempt-1), capped at max_wait
            wait_time = min(
                base_wait * (2 ** (attempt - 1)),
                max_wait
            )

            # Add jitter to prevent thundering herd
            jitter = wait_time * 0.1 * (1 - 2 * random.random())
            actual_wait = wait_time + jitter

            logger.warning(
                f"Attempt {attempt} failed, retrying in {actual_wait:.1f}s",
                extra={"error": str(e)}
            )

            await asyncio.sleep(actual_wait)

    raise last_error

```text
### Pattern 2: Timeout with Fallback

For operations that might hang, use timeout + fallback:

```python
import asyncio

async def get_with_timeout_and_fallback(
    primary_func,
    fallback_func,
    timeout: float = 5.0
):
    """Try primary with timeout, fall back if it fails."""
    try:
        return await asyncio.wait_for(
            primary_func(),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        logger.warning("Primary operation timed out, using fallback")
        return await fallback_func()
    except Exception as e:
        logger.warning(f"Primary operation failed: {e}, using fallback")
        return await fallback_func()

```text
### Pattern 3: Circuit Breaker

Prevent cascading failures by stopping requests to failing services:

```python
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"          # Normal operation
    OPEN = "open"              # Blocking requests
    HALF_OPEN = "half_open"    # Testing if service recovered

class CircuitBreaker:
    """Simple circuit breaker implementation."""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        name: str = "default"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.success_count = 0

    async def call(self, func, *args, **kwargs):
        """Execute function through circuit breaker."""

        # Check if we should attempt recovery
        if self.state == CircuitState.OPEN:
            if self._should_attempt_recovery():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise CircuitBreakerOpen(
                    f"Circuit breaker '{self.name}' is open"
                )

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0

        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= 2:
                self.state = CircuitState.CLOSED
                logger.info(f"Circuit breaker '{self.name}' closed (recovered)")

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(
                f"Circuit breaker '{self.name}' opened "
                f"({self.failure_count} failures)"
            )

    def _should_attempt_recovery(self) -> bool:
        """Check if recovery timeout has elapsed."""
        if not self.last_failure_time:
            return True

        elapsed = (
            datetime.now() - self.last_failure_time
        ).total_seconds()
        return elapsed >= self.recovery_timeout

```text
---

## Resilience Strategies

### Strategy 1: Connection Pool Management

Manage database connections to prevent exhaustion:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

def create_resilient_engine(database_url: str):
    """Create engine with resilient connection pooling."""
    return create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=20,              # Number of connections to keep open
        max_overflow=40,           # Additional connections allowed
        pool_recycle=3600,         # Recycle connections after 1 hour
        pool_pre_ping=True,        # Ping connections before use
        echo_pool=False,           # Set True to debug pool issues
    )

```text
**Best Practices:**
- Set `pool_pre_ping=True` to detect stale connections
- Use `pool_recycle` to prevent timeout issues
- Monitor pool utilization in production

### Strategy 2: Request ID Propagation

Track requests through the system for debugging:

```python
import uuid
from fastapi import Request
from context import request_context

async def add_request_id(request: Request, call_next):
    """Middleware to add request ID to all requests."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    # Store in context for use throughout request lifecycle
    request_context.id = request_id
    request_context.start_time = time.time()

    # Add to response headers
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    # Log request completion
    duration = time.time() - request_context.start_time
    logger.info(
        f"Request completed in {duration:.2f}s",
        extra={"request_id": request_id}
    )

    return response

```text
### Strategy 3: Graceful Degradation

Reduce functionality rather than fail completely:

```python
@app.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db)):
    """Get dashboard with graceful degradation."""

    dashboard = {}

    # Try to load primary data
    try:
        dashboard["students"] = get_student_stats(db)
    except Exception as e:
        logger.warning(f"Failed to load student stats: {e}")
        dashboard["students"] = None
        dashboard["students_error"] = "Student data temporarily unavailable"

    # Try to load secondary data
    try:
        dashboard["analytics"] = get_analytics(db)
    except Exception as e:
        logger.warning(f"Failed to load analytics: {e}")
        dashboard["analytics"] = None
        dashboard["analytics_error"] = "Analytics temporarily unavailable"

    # Always return partial data with error indicators
    return {
        "status": "partial" if None in dashboard.values() else "ok",
        "data": dashboard
    }

```text
### Strategy 4: Bulkhead Pattern

Isolate failures to prevent cascading:

```python
from concurrent.futures import ThreadPoolExecutor
import asyncio

class BulkheadExecutor:
    """Isolate work to prevent cascading failures."""

    def __init__(self, name: str, max_workers: int = 5):
        self.name = name
        self.executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix=name
        )

    async def execute(self, func, *args, **kwargs):
        """Execute in isolated thread pool."""
        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(
                self.executor,
                lambda: func(*args, **kwargs)
            )
        except Exception as e:
            logger.error(
                f"Bulkhead '{self.name}' operation failed: {e}"
            )
            raise

# Usage

report_executor = BulkheadExecutor("reports", max_workers=3)

@app.post("/reports/generate")
async def generate_report(report_type: str):
    """Generate report in isolated executor."""
    try:
        result = await report_executor.execute(
            _generate_report_sync,
            report_type
        )
        return {"status": "ok", "report": result}
    except Exception as e:
        return {
            "status": "error",
            "message": "Report generation failed",
            "error": str(e)
        }, 500

```text
---

## Circuit Breaker Pattern

### When to Use Circuit Breaker

Use circuit breakers for:
- External API calls (weather, geocoding, payment services)
- Database operations (detect connection issues early)
- Cache operations (don't retry if cache is down)
- Slow operations (prevent resource exhaustion)

### Implementation Example

```python
# Create circuit breaker for external API

external_api_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="external_api"
)

@app.get("/weather/{location}")
async def get_weather(location: str):
    """Get weather with circuit breaker protection."""
    try:
        data = await external_api_breaker.call(
            fetch_weather_api,
            location
        )
        return {"status": "ok", "data": data}
    except CircuitBreakerOpen:
        # Service is down, return cached data
        cached = get_cached_weather(location)
        if cached:
            return {
                "status": "degraded",
                "data": cached,
                "message": "Using cached data (service unavailable)"
            }
        return {
            "status": "error",
            "message": "Weather service unavailable, no cached data"
        }, 503

```text
---

## Fallback Mechanisms

### Fallback 1: Use Cached Data

When primary data source fails, use cached version:

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedDataStore:
    """Store data with timestamp for fallback use."""

    def __init__(self):
        self.cache = {}
        self.timestamps = {}

    def get_with_fallback(self, key: str, primary_func, max_age_seconds: int = 300):
        """Get data from primary, fall back to cache if needed."""
        try:
            data = primary_func()
            self.cache[key] = data
            self.timestamps[key] = datetime.now()
            return data
        except Exception as e:
            # Try to use cached data
            if key in self.cache:
                age = (datetime.now() - self.timestamps[key]).total_seconds()
                if age <= max_age_seconds:
                    logger.warning(
                        f"Primary failed, using cache ({age:.0f}s old)"
                    )
                    return self.cache[key]
                else:
                    logger.error(
                        f"Cache too old ({age:.0f}s > {max_age_seconds}s)"
                    )
            raise

# Usage

cache_store = CachedDataStore()

@app.get("/student/{student_id}")
async def get_student(student_id: int, db: Session = Depends(get_db)):
    """Get student with cache fallback."""
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404)
        return student
    except DatabaseError as e:
        logger.warning(f"Database error: {e}, attempting fallback")
        # Return partial data or cached version
        return {
            "status": "degraded",
            "id": student_id,
            "message": "Using fallback data"
        }

```text
### Fallback 2: Default Values

Return sensible defaults when data unavailable:

```python
@app.get("/analytics/student/{student_id}")
async def get_student_analytics(student_id: int, db: Session = Depends(get_db)):
    """Get analytics with safe defaults."""

    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404)

        # Try to calculate metrics
        attendance_rate = calculate_attendance(db, student_id)
        grade_average = calculate_grade_average(db, student_id)

    except Exception as e:
        logger.warning(f"Analytics calculation failed: {e}")
        # Return safe defaults
        attendance_rate = None
        grade_average = None

    return {
        "student_id": student_id,
        "attendance_rate": attendance_rate,
        "grade_average": grade_average,
        "note": "Some metrics unavailable" if any([x is None for x in [attendance_rate, grade_average]]) else None
    }

```text
### Fallback 3: Async Alternative Processing

Process data asynchronously instead of blocking:

```python
import asyncio
from background_tasks import bg_tasks

@app.post("/reports/generate")
async def generate_report_async(report_type: str):
    """Generate report asynchronously."""

    # Try to generate synchronously first
    try:
        result = generate_report_sync(report_type)
        return {"status": "ok", "report": result}
    except TimeoutError:
        # Fall back to async generation
        logger.info("Report generation timing out, queuing for background processing")

        task_id = str(uuid.uuid4())
        bg_tasks.add_task(generate_report_background, task_id, report_type)

        return {
            "status": "processing",
            "task_id": task_id,
            "message": "Report is being generated in the background",
            "check_url": f"/reports/{task_id}"
        }, 202  # Accepted

```text
---

## Error Logging & Monitoring

### Structured Logging Format

```python
import json
import logging

class StructuredLogger:
    """Log errors in structured format for easy parsing."""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def error(self, message: str, error: Exception, context: dict = None):
        """Log error with structured context."""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or {}
        }

        self.logger.error(json.dumps(log_data))

# Usage

struct_logger = StructuredLogger(__name__)

try:
    db.commit()
except DatabaseError as e:
    struct_logger.error(
        "Database commit failed",
        e,
        {"operation": "create_student", "student_id": 123}
    )

```text
### Error Metrics

Track error rates and types for alerting:

```python
from prometheus_client import Counter, Histogram

# Error counters

error_counter = Counter(
    'app_errors_total',
    'Total errors by type',
    ['error_type', 'endpoint']
)

# Error duration

error_duration = Histogram(
    'app_error_recovery_seconds',
    'Time to recover from error',
    ['error_type']
)

# Track errors

@app.middleware("http")
async def error_tracking_middleware(request, call_next):
    start_time = time.time()
    try:
        return await call_next(request)
    except Exception as e:
        error_counter.labels(
            error_type=type(e).__name__,
            endpoint=request.url.path
        ).inc()

        duration = time.time() - start_time
        error_duration.labels(error_type=type(e).__name__).observe(duration)

        raise

```text
---

## Troubleshooting Guide

### Symptom: Database Connections Exhausted

**Error Message:** `QueuePool limit exceeded with overflow on connection`

**Root Causes:**
1. Connection leak (not closing connections)
2. Long-running queries holding connections
3. Too many concurrent requests

**Solutions:**

```python
# 1. Check for connection leaks

async with db() as session:
    # Ensure connection is released
    pass

# 2. Add query timeout

from sqlalchemy import event

@event.listens_for(Engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    dbapi_conn.execute('SET SESSION sql_mode="STRICT_TRANS_TABLES"')
    dbapi_conn.timeout = 10  # 10 second query timeout

# 3. Adjust pool size

engine = create_engine(
    database_url,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600
)

```text
### Symptom: Intermittent Database Errors

**Error Message:** `Database connection error` (happens randomly)

**Root Causes:**
1. Stale connections not detected
2. Network issues
3. Database restarts

**Solutions:**

```python
# Enable connection pinging

engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Ping before use
    pool_recycle=1800    # Recycle after 30 minutes
)

# Add retry logic

@retry_on_transient(max_retries=3)
async def get_student(db, student_id):
    return db.query(Student).filter(Student.id == student_id).first()

```text
### Symptom: Slow API Responses

**Error Message:** `Request took >5 seconds`

**Root Causes:**
1. N+1 queries
2. Missing database indexes
3. External API timeouts

**Solutions:**

```python
# 1. Add request timeout monitoring

@app.middleware("http")
async def timeout_middleware(request, call_next):
    try:
        response = await asyncio.wait_for(
            call_next(request),
            timeout=10.0
        )
        return response
    except asyncio.TimeoutError:
        return JSONResponse(
            {"error": "Request timeout"},
            status_code=504
        )

# 2. Check query profiler

curl http://localhost:8000/api/v1/diagnostics/queries/slow

# 3. Add indexes

# See QUERY_OPTIMIZATION.md for indexing strategy

```text
---

## Reference Implementation

### Complete Error Handler Middleware

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
import traceback
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    """Comprehensive error handling middleware."""

    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = datetime.now()

    try:
        response = await call_next(request)

        # Log successful requests
        duration = (datetime.now() - start_time).total_seconds()
        if duration > 1.0:  # Log slow requests
            logger.warning(
                f"Slow request: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "duration_seconds": duration,
                    "status_code": response.status_code
                }
            )

        return response

    except HTTPException as e:
        # Client errors - return as-is
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": "HTTP_ERROR",
                "status_code": e.status_code,
                "message": e.detail,
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        )

    except ValidationError as e:
        # Validation errors
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": e.errors(),
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        )

    except DatabaseError as e:
        # Database errors - log and return generic message
        logger.error(
            "Database error",
            extra={
                "request_id": request_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )

        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "DATABASE_ERROR",
                "message": "Database operation failed",
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "suggestion": "Please try again later"
            }
        )

    except Exception as e:
        # Unhandled exceptions - log with full context
        logger.error(
            "Unhandled exception",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "error_type": type(e).__name__,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )

        # Return generic error to client
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "support": "Contact support with request ID"
            }
        )

```text
---

## Checklist for $11.18.3 Implementation

- [x] Create Error Recovery Guide (this document)
- [ ] Implement Circuit Breaker for external APIs
- [ ] Add request ID propagation middleware
- [ ] Implement graceful degradation for analytics
- [ ] Add connection pool management documentation
- [ ] Create error monitoring dashboard
- [ ] Add structured logging throughout backend
- [ ] Test failure scenarios in E2E suite
- [ ] Document incident response procedures
- [ ] Create monitoring alerts for critical errors

---

## References

- [Error Handling Best Practices](https://www.rfc-editor.org/rfc/rfc7231#section-6)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Graceful Degradation](https://www.w3.org/wiki/Graceful_degradation_versus_progressive_enhancement)
- [Resilience4j Documentation](https://resilience4j.readme.io/)
