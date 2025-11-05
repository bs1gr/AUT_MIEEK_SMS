# Backend Tools

Utility scripts for database management, data conversion, and system diagnostics.

## Database Validation

### validate_first_run.py

**Purpose**: Programmatically validate fresh database creation and migration execution.

**What it does**:

- Creates a temporary test database
- Runs Alembic migrations from scratch
- Verifies all tables were created correctly
- Checks Alembic version tracking
- Reports success/failure with diagnostic info

**Usage**:

```powershell
# From backend directory
cd backend

# Windows (using venv Python)
.\.venv\Scripts\python.exe tools\validate_first_run.py

# Set custom database path (optional)
$env:DATABASE_URL = "sqlite:///d:/SMS/data/custom_test.db"
python tools\validate_first_run.py
```

**Output**:

```text
============================================================
DATABASE MIGRATION CHECK
============================================================
...
OK: Database migrations applied successfully
============================================================
RUN_MIGRATIONS_OK: True
DB_EXISTS: True
TABLES_COUNT: 8
TABLES_SAMPLE: ['alembic_version', 'attendances', 'course_enrollments', ...]
HAS_ALEMBIC_VERSION: True
```

**When to use**:

- Troubleshooting first-time installation issues
- Testing migration changes before committing
- Verifying baseline migration creates all tables
- CI/CD pipeline validation
- After modifying Alembic migration files

**Integration**:

- Called automatically by `SMART_SETUP.ps1` after migrations in native mode
- Can be run manually for diagnostics

---

## Data Conversion Tools

### convert_mieek_to_import.py

Converts student data from MIEEK system format to SMS import format.

See file header for usage details.

---

## Maintenance

When adding new tools:

1. Document purpose and usage here
2. Include examples
3. Note any dependencies
4. Explain when/why to use the tool
