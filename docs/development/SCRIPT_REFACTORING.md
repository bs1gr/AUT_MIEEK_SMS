# Script Refactoring Documentation ($11.10.1+)

> **⚠️ DEPRECATED ($11.14.0):** This document references `backend.auto_import_courses` which was removed in $11.14.0. See [Migration Guide](../../guides/MIGRATION_$11.14.0.md) for updated import paths.

## Overview

In version 1.9.9, we reorganized the backend scripts into a structured directory hierarchy under `backend/scripts/` for better organization, maintainability, and clarity. This document explains the refactoring, migration paths, and backward compatibility measures.

## Problem Statement

The backend root directory had several standalone utility modules scattered at the top level:

- `admin_bootstrap.py` - Admin account initialization
- `auto_import_courses.py` - Automatic course importing
- `migrate_job.py` - Database migration utilities

These files made the backend directory cluttered and made it unclear which modules were core application code vs. utilities.

## Solution

We reorganized these scripts into a dedicated `backend/scripts/` directory structure:

```text
backend/scripts/
├── __init__.py                          # Main exports
├── admin/
│   ├── __init__.py
│   └── bootstrap.py                     # Admin account initialization
├── import_/
│   ├── __init__.py
│   └── courses.py                       # Automatic course importing
├── migrate/
│   ├── __init__.py
│   └── runner.py                        # Database migration utilities

```text
### Directory Rationale

- **`admin/`** - Administrative operations (account setup, etc.)
- **`import_/`** - Import operations (named `import_` to avoid Python keyword conflict)
- **`migrate/`** - Migration operations and utilities

## Migration Guide

### For New Code

Always import from the new location:

```python
# ✅ CORRECT - New location

from backend.scripts.admin import ensure_default_admin_account
from backend.scripts.import_ import check_and_import_courses, wait_for_server
from backend.scripts.migrate import run_migrations, check_migration_status

# Also available via convenience re-export

from backend.scripts import ensure_default_admin_account, check_and_import_courses

```text
### For Existing Code (Backward Compatibility)

The old import paths still work for backward compatibility:

```python
# ⚠️ DEPRECATED but still works (shows deprecation warning)

from backend.admin_bootstrap import ensure_default_admin_account
from backend.auto_import_courses import check_and_import_courses, wait_for_server

```text
These import statements work because we've created deprecation stubs at the old locations that re-export from the new location.

## Updated Import References

The following files have been updated to use the new import paths:

### Core Entry Points

- `backend/lifespan.py` - Now imports from `backend.scripts.admin.bootstrap` ✅
- `backend/entrypoint.py` - Now uses `backend.scripts.import_.courses` as subprocess ✅

### Utility Scripts

- `scripts/reset_admin_password.py` - Updated to new import path ✅

### Test Files

- `backend/tests/test_auto_import_courses.py` - Updated to import from new location ✅
- `backend/tests/test_admin_bootstrap.py` - Updated to import from new location ✅

## What's in Each Module

### `backend/scripts/admin/bootstrap.py`

Contains admin account initialization logic:

```python
def ensure_default_admin_account(
    settings: Settings,
    session_factory: sessionmaker,
    logger: logging.Logger,
    force_reset: bool = False,
) -> User:
    """Ensure default admin account exists and is properly configured."""

```text
**Usage:**

```python
from backend.scripts.admin import ensure_default_admin_account
from backend.db import SessionLocal
from backend.config import settings

ensure_default_admin_account(
    settings=settings,
    session_factory=SessionLocal,
    logger=logging.getLogger(__name__)
)

```text
### `backend/scripts/import_/courses.py`

Contains course import functionality:

```python
def wait_for_server(
    url: str = "http://localhost:8000/health",
    timeout: int = 60,
    interval: int = 2
) -> bool:
    """Wait for the backend server to be ready."""

def check_and_import_courses(
    api_url: str = "http://localhost:8000/api/v1"
) -> bool:
    """Check if courses exist, and import from templates if database is empty."""

```text
**Usage:**

```python
from backend.scripts.import_ import wait_for_server, check_and_import_courses

if wait_for_server():
    check_and_import_courses()

```text
### `backend/scripts/migrate/runner.py`

Contains migration utilities:

```python
def run_migrations(is_test: bool = False) -> None:
    """Run pending database migrations using Alembic."""

def check_migration_status() -> dict:
    """Check the current migration status and version."""

```text
**Usage:**

```python
from backend.scripts.migrate import run_migrations, check_migration_status

run_migrations()
status = check_migration_status()

```text
## Deprecation Stubs

Deprecation stubs have been created at the old locations to maintain backward compatibility:

- `backend/admin_bootstrap.py` - Re-exports from `backend.scripts.admin.bootstrap`
- `backend/auto_import_courses.py` - Re-exports from `backend.scripts.import_.courses`

These stubs emit `DeprecationWarning` when imported, guiding users to the new location.

### Example Warning

```text
DeprecationWarning: backend.admin_bootstrap is deprecated.
Use backend.scripts.admin.bootstrap instead.

```text
## Docker Integration

The Docker entrypoint has been updated to use the new import path:

**Before:**

```python
subprocess.Popen(["python", "-u", "-m", "backend.auto_import_courses", ...])

```text
**After:**

```python
subprocess.Popen(["python", "-u", "-m", "backend.scripts.import_.courses", ...])

```text
## Testing

All existing tests continue to pass with the refactoring:

```bash
cd backend && pytest -q
# Result: 378 passed, 1 skipped ✅

```text
## Performance Impact

**Zero performance impact.** The refactoring:

- Does not change runtime behavior
- Does not add or remove any functionality
- Only reorganizes code location and import paths
- Uses Python's standard import system without overhead

## Future Improvements

Potential future improvements to this structure:

1. **Add more admin utilities** to `backend/scripts/admin/`:
   - User management tools
   - Permission management
   - Batch operations

2. **Expand import capabilities** in `backend/scripts/import_/`:
   - Student import
   - Grade import
   - Attendance import

3. **Add migration helpers** to `backend/scripts/migrate/`:
   - Schema validation
   - Backup utilities
   - Rollback helpers

## Troubleshooting

### Import Error: "No module named 'backend.scripts.import_'"

**Cause:** The directory structure wasn't created correctly or Python cache is outdated.

**Solution:**

```bash
# Clear Python cache

find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# Then try importing again

python -c "from backend.scripts.import_ import check_and_import_courses"

```text
### DeprecationWarning about old imports

**Cause:** Code is still using old import paths.

**Solution:** Update imports to use new paths:

```python
# Old

from backend.admin_bootstrap import ensure_default_admin_account

# New

from backend.scripts.admin import ensure_default_admin_account

```text
### Module not found when running as subprocess

**Cause:** Python path not set correctly when running subprocess.

**Solution:** Ensure the project root is in `PYTHONPATH`:

```python
import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

```text
## Summary of Changes

| File/Module | Change | Status |
|---|---|---|
| `backend/scripts/admin/bootstrap.py` | New location | ✅ Created |
| `backend/scripts/import_/courses.py` | New location | ✅ Created |
| `backend/scripts/migrate/runner.py` | New location | ✅ Created |
| `backend/admin_bootstrap.py` | Deprecation stub | ✅ Updated |
| `backend/auto_import_courses.py` | Deprecation stub | ✅ Updated |
| `backend/lifespan.py` | Import updated | ✅ Updated |
| `backend/entrypoint.py` | Import updated | ✅ Updated |
| `scripts/reset_admin_password.py` | Import updated | ✅ Updated |
| `backend/tests/test_admin_bootstrap.py` | Import updated | ✅ Updated |
| `backend/tests/test_auto_import_courses.py` | Import updated | ✅ Updated |

## Related Documentation

- [Architecture Documentation](ARCHITECTURE.md) - Overall system design
- [Development Guide](DEVELOPMENT.md) - Development workflow
- [Git Workflow](GIT_WORKFLOW.md) - Commit and branching standards
