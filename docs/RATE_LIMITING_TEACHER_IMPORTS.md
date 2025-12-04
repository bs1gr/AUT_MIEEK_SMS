# Teacher Import Rate Limiting

## Overview

Added `RATE_LIMIT_TEACHER_IMPORT` (5000/min) for bulk teacher data imports, replacing restrictive `RATE_LIMIT_HEAVY` (200/min) on import endpoints.

## Changes

### Backend Rate Limits

```python
# backend/rate_limiting.py
_DEFAULT_TEACHER_IMPORT = int(os.environ.get("RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE", 5000))
RATE_LIMIT_TEACHER_IMPORT = f"{_DEFAULT_TEACHER_IMPORT}/minute"

DEFAULTS = {
    "read": 1000,
    "write": 600,
    "heavy": 200,
    "auth": 50,
    "teacher_import": 5000  # NEW
}
```

### Import Endpoints

```python
# backend/routers/routers_imports.py
@router.post("/courses")
@limiter.limit(RATE_LIMIT_TEACHER_IMPORT)  # Was: RATE_LIMIT_HEAVY
def import_courses(...):
    """83 requests per minute (5000/60)"""

@router.post("/students")
@limiter.limit(RATE_LIMIT_TEACHER_IMPORT)  # Was: RATE_LIMIT_HEAVY
def import_students(...):
    """83 requests per minute (5000/60)"""
```

## Configuration

### Environment Variables

```powershell
# Default (5000/min)
RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE=5000

# Development (higher)
$env:RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE=10000
.\NATIVE.ps1 -Start

# Docker
services:
  backend:
    environment:
      RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE: 5000
```

## Comparison

| Operation | Old Limit | New Limit | Increase |
|-----------|-----------|-----------|----------|
| Teacher imports | 200/min | 5000/min | 25x faster |
| Requests/second | 3.3 | 83 | |
| Large batch (500 items) | ~2.5 min | ~6 sec | |

## Testing

```powershell
# Test with low limit
$env:RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE=10
.\NATIVE.ps1 -Start

# Verify: After 10 requests/min, receive HTTP 429
```

## Migration

- No breaking changes
- Import endpoints automatically use new limit
- Teachers experience immediate improvement
- Existing `RATE_LIMIT_HEAVY` unchanged for other operations

## Related Files

- `backend/rate_limiting.py` - Rate limit configuration
- `backend/routers/routers_imports.py` - Import endpoints
- `backend/ENV_VARS.md` - Environment variables
