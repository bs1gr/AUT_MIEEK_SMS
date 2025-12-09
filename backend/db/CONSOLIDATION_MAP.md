# Backend Database Consolidation Map

## Directory Structure

\\\
backend/db/
├── __init__.py
├── connection.py            (from backend/db.py)
├── utils.py                 (from backend/db_utils.py)
├── models.py                (from backend/models.py - future)
├── cli/                     (from backend/tools/)
│   ├── __init__.py
│   ├── admin.py             (create_admin.py)
│   ├── schema.py            (create_tables, verify_schema, check_schema_drift)
│   ├── diagnostics.py       (inspect_db, validate_first_run, check_secret)
│   └── README.md
└── migrations/
    └── (Alembic migrations)
\\\

## Consolidation Status

__Phase:__ Planned for v1.11.0  
__Current:__ Files scattered across backend/db.py, db_utils.py, tools/  
__Target:__ All DB code under backend/db/ hierarchy

## File Mapping

### Core Database Files

- backend/db.py → backend/db/connection.py
- backend/db_utils.py → backend/db/utils.py
- (backend/models.py → backend/db/models.py) [future, requires careful migration]

### Database CLI Tools

- backend/tools/create_admin.py → backend/db/cli/admin.py
- backend/tools/create_tables.py → backend/db/cli/schema.py
- backend/tools/verify_schema.py → backend/db/cli/schema.py
- backend/tools/check_schema_drift.py → backend/db/cli/schema.py
- backend/tools/inspect_db.py → backend/db/cli/diagnostics.py
- backend/tools/validate_first_run.py → backend/db/cli/diagnostics.py
- backend/tools/check_secret.py → backend/db/cli/diagnostics.py

## Import Path Changes

### Current (Scattered)

\\\python
from backend.db import get_session
from backend.db_utils import BaseQuery
from backend.tools import create_admin
from backend.models import Student
\\\

### Future (Consolidated)

\\\python
from backend.db import get_session
from backend.db.utils import BaseQuery
from backend.db.cli.admin import create_admin
from backend.db.models import Student
\\\

## Migration Approach

1. Create backend/db/ directory structure
2. Move connection.py and utils.py
3. Create cli/ subdirectory with organized tools
4. Update imports across codebase
5. Keep backend/tools/ as deprecated (backward compatibility)
6. Update tests to use new paths
7. Full test suite validation
8. v1.11.0 release with new structure

## Backward Compatibility

Maintain deprecated imports in backend/tools/__init__.py:

\\\python
import warnings
warnings.warn(
    "backend.tools is deprecated. Use backend.db.cli instead.",
    DeprecationWarning,
    stacklevel=2
)
from backend.db.cli import *
\\\

## Benefits

- ✅ Clear namespace hierarchy
- ✅ All DB code in single location
- ✅ Better discoverability
- ✅ Easier imports for new developers
- ✅ Logical grouping for maintenance

---
Generated: 2025-12-09
Status: Structure created, file migration pending
