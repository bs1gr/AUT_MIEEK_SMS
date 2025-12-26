# backend/db - Database Module

Consolidated database module for Student Management System - centralizes all database-related code, utilities, and management tools.

## Purpose

Provides a unified namespace for:

- Database connection management
- Database utilities and helpers
- Database schema management
- Command-line tools for database operations
- Migration management

## Directory Structure

```
db/
├── __init__.py             # Database module initialization
├── connection.py           # Database connection and session management
├── utils.py               # Database utilities and helpers
├── cli/                   # Command-line interface tools
│   ├── __init__.py
│   ├── admin.py           # Admin user management
│   ├── schema.py          # Schema creation and verification
│   ├── diagnostics.py     # Database diagnostics and validation
│   └── README.md
├── migrations/            # Alembic database migrations
│   ├── versions/
│   └── alembic.ini
├── models.py             # (future) Consolidated database models
└── CONSOLIDATION_MAP.md  # Migration documentation
```

## Core Modules

### connection.py

Database connection setup and session management.

```python
from backend.db import get_session, SessionLocal

# Get database session
with get_session() as session:
    users = session.query(User).all()
```

### utils.py

Database utilities and helper functions.

```python
from backend.db.utils import BaseQuery, execute_query

# Use database utilities
query = BaseQuery(session)
results = execute_query(query, filters={})
```

## CLI Tools (backend/db/cli/)

### admin.py - User Management

**Purpose:** Create, modify, and manage admin users

**Usage:**

```bash
# Create admin user
python -m backend.db.cli.admin create --username admin --password secret

# List users
python -m backend.db.cli.admin list

# Reset password
python -m backend.db.cli.admin reset-password --username admin
```

### schema.py - Schema Management

**Purpose:** Database schema creation, verification, and drift checking

**Usage:**

```bash
# Create tables from models
python -m backend.db.cli.schema create

# Verify schema integrity
python -m backend.db.cli.schema verify

# Check for schema drift
python -m backend.db.cli.schema check-drift

# Generate migration for schema changes
python -m backend.db.cli.schema diff-migration
```

### diagnostics.py - Database Diagnostics

**Purpose:** Validate database state and perform health checks

**Usage:**

```bash
# Inspect database tables and indexes
python -m backend.db.cli.diagnostics inspect

# Validate first-run database creation
python -m backend.db.cli.diagnostics validate-first-run

# Check database secrets/configuration
python -m backend.db.cli.diagnostics check-config
```

## Migrations

Database migrations managed by Alembic. Located in `migrations/` subdirectory.

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Import Examples

### Before Consolidation (Scattered Imports)

```python
from backend.db import get_session
from backend.db_utils import BaseQuery
from backend.tools.create_admin import create_admin_user
from backend.models import Student, Course
```

### After Consolidation (Organized Imports)

```python
from backend.db import get_session
from backend.db.utils import BaseQuery
from backend.db.cli.admin import create_admin_user
from backend.db.models import Student, Course
```

## Consolidation Status

### Current (v1.10.1)

- ✅ Directory structure created
- ✅ **init**.py files in place
- ⏳ File migration from scattered locations

### Planned (v1.11.0)

- [ ] Move db.py → connection.py
- [ ] Move db_utils.py → utils.py
- [ ] Organize tools/* → cli/
- [ ] Update all imports across codebase
- [ ] Full test suite validation
- [ ] Update documentation

### Backward Compatibility

During migration:

- Original `backend.db`, `backend.db_utils`, `backend.tools` maintained
- Import aliases created for backward compatibility
- Deprecation warnings added to old locations
- Full compatibility period through v1.12.0

Example:

```python
# backend/tools/__init__.py
import warnings
warnings.warn(
    "backend.tools is deprecated. Use backend.db.cli instead.",
    DeprecationWarning,
    stacklevel=2
)
from backend.db.cli import *
```

## Benefits of Consolidation

- ✅ **Clear Hierarchy:** All DB code under single `db/` namespace
- ✅ **Better Discoverability:** New developers easily find DB utilities
- ✅ **Logical Organization:** CLI tools in `cli/`, migrations together, etc.
- ✅ **Reduced Imports:** Single import source instead of scattered modules
- ✅ **Easier Maintenance:** All DB code in one location
- ✅ **Future-Proof:** Extensible structure for new DB utilities

## Adding New Tools

To add new database CLI tool:

1. Create file in `cli/` directory: `new_tool.py`
2. Implement as Python module with main() function
3. Add to `cli/__init__.py` exports
4. Document in this README.md
5. Include usage examples

Example structure:

```python
# backend/db/cli/new_tool.py
"""
new_tool.py - Brief description

Purpose:
    What this tool does

Usage:
    python -m backend.db.cli.new_tool [options]
"""

import argparse

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--option', help='Option description')
    args = parser.parse_args()
    # Implementation

if __name__ == '__main__':
    main()
```

## Testing

Database operations tested in `backend/tests/`:

```bash
# Run all database tests
pytest backend/tests/ -v

# Run specific test
pytest backend/tests/test_db_cli.py -v

# Run with coverage
pytest backend/tests/ --cov=backend.db
```

## Troubleshooting

### Import Errors After Migration

If you see import errors like:

```
ImportError: cannot import name 'X' from backend.db
```

Check that:

1. Module is in correct location under db/
2. `__init__.py` files are in place
3. Import path matches new structure
4. Backward compatibility not yet available (if < v1.11.0)

### Missing Migrations

If migrations aren't auto-discovered:

```bash
cd backend
alembic current  # Check current revision
alembic upgrade head  # Apply pending migrations
```

## Related Documentation

- `CONSOLIDATION_MAP.md` - Detailed migration plan
- `cli/README.md` - CLI tools documentation
- `../../WORKSPACE_CONSOLIDATION_ANALYSIS.md` - Full workspace analysis

---

**Created:** December 9, 2025
**Status:** Structure established, migrations in progress
**Consolidation Phase:** v1.10.1 (planning), v1.11.0 (implementation)
