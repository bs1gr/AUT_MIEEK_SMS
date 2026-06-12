# Backend notes

This folder contains the FastAPI backend for the Student Management System.

## Database options (SQLite & PostgreSQL)

When running inside Docker you can either mount a host directory/volume at
`/data` for SQLite **or** point the application to PostgreSQL using the new
`POSTGRES_*` environment variables. `DOCKER.ps1` and `docker-compose.yml` now
respect the same `.env` keys, so switching databases is as simple as editing
your environment file.

SQLite example (default):

```powershell
DATABASE_URL="sqlite:////data/student_management.db"
```

PostgreSQL example (recommended for production):

```dotenv
DATABASE_ENGINE=postgresql
POSTGRES_HOST=db.internal
POSTGRES_PORT=5432
POSTGRES_DB=student_management
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=super-secure-password
POSTGRES_SSLMODE=require
POSTGRES_OPTIONS=connect_timeout=10&application_name=sms
```

Leave `DATABASE_URL` blank to let the backend build the final connection string,
and make sure `psycopg[binary]` is installed (already included in
`backend/requirements.txt`).

Validation and opt-in
Notes:

- By default the application validates that the SQLite file is inside the project directory to reduce accidental path traversal mistakes in development.
- When running in Docker it's common to mount the DB at `/data`. The app accepts `/data` paths automatically.
- If you need to use a different external path, set the environment variable `ALLOW_EXTERNAL_DB_PATH=1` in your container to explicitly opt in.
- PostgreSQL URLs are accepted as long as they start with `postgresql://` or
  `postgresql+psycopg://`. Optional pieces (SSL mode, connection options) are
  read from dedicated env vars to avoid string concatenation errors.

Security note: For production workloads consider using a managed relational database instead of SQLite. If you must use SQLite in production, ensure the volume backing `/data` is durable and backed up.

## Migrating existing data

Use the `backend/scripts/migrate_sqlite_to_postgres.py` helper to copy data from
an existing SQLite database into PostgreSQL. The script runs Alembic migrations,
truncates the destination tables (unless `--no-truncate` is passed), and copies
rows in configurable batches.

```powershell
cd backend
python -m backend.scripts.migrate_sqlite_to_postgres `
  --sqlite-path ../data/student_management.db `
  --postgres-url postgresql+psycopg://user:pass@host:5432/student_management
```

Add `--dry-run` to preview counts without modifying PostgreSQL, or
`--tables students courses` to migrate a subset. See
[`docs/deployment/POSTGRES_MIGRATION_GUIDE.md`](../docs/deployment/POSTGRES_MIGRATION_GUIDE.md)
for the full workflow (backups, verification, troubleshooting).

## Running Alembic migrations (programmatic runner)

The project provides a programmatic Alembic runner at `backend/run_migrations.py`.
This ensures migrations run using the same `DATABASE_URL` as the application and
avoids surprises caused by different working directories or subprocess environment.

Run locally (verbose):

```powershell
cd backend
#$env:DATABASE_URL = "sqlite:///./data/student_management.db"  # set as needed
python -m backend.run_migrations -v
```

Notes:

- Ensure `DATABASE_URL` is set before importing backend modules or restart the process so
 `backend.config` picks up the new value.
- In CI, provide `DATABASE_URL` via secrets and run the above command before deploy.

## CI: run migrations + tests

We ship a GitHub Actions workflow `.github/workflows/run-migrations.yml` that:

- checks out the repository
- installs backend dependencies
- runs the programmatic migration runner
- runs `pytest` and uploads test logs as artifacts

Provide `DATABASE_URL` as a repository secret when running migrations in CI.

If you prefer automated migrations at deploy time, run the same command from your deployment
pipeline before switching traffic to the new release.

## Administrative CLI Tools

The project includes administrative CLI tools under `backend/db/cli/` for common database operations:

### Available Modules

- **`backend.db.cli.admin`** - User administration (create admin users)
- **`backend.db.cli.schema`** - Schema validation and drift detection for CI
- **`backend.db.cli.diagnostics`** - First-run validation and configuration checks

### Usage Examples

Create an admin user:

```powershell
python -m backend.db.cli.admin --email admin@example.com
```

Check for schema drift (useful in CI):

```powershell
python -m backend.db.cli.schema --check-drift
```

Validate first-run database creation:

```powershell
python -m backend.db.cli.diagnostics --validate-first-run
```

### Python API

```python
from backend.db.cli import create_admin, check_schema_drift, validate_first_run

# Create a user programmatically
user = create_admin("admin@example.com", "password")

# Check schema in CI
exit_code = check_schema_drift(engine, fail_on_drift=True)

# Validate first run
ok = validate_first_run("data/student_management.db")
```

For detailed migration information from the legacy `backend/tools/` module, see
[`docs/development/TOOLS_CONSOLIDATION.md`](../docs/development/TOOLS_CONSOLIDATION.md).

## Developer convenience: DEV_EASE (pre-commit only)

DEV_EASE is now strictly reserved for local pre-commit workflows (COMMIT_READY.ps1). It is **not** a
runtime feature and must not be used to alter the behavior of the running backend or frontend.

Usage: set the environment variable when running the pre-commit tool locally if you intentionally want
to allow `COMMIT_READY.ps1` to skip tests/cleanup or to AutoFix issues during local development:

```powershell
$env:DEV_EASE = 'true'
.\COMMIT_READY.ps1 -Mode standard -AutoFix
```

Why: This keeps runtime behavior unchanged in development, CI and production — avoiding accidental
weakening of security on running services. CI workflows should remain strict and never enable DEV_EASE.

---
Small checklist:

- [ ] Do NOT enable `ALLOW_EXTERNAL_DB_PATH` in production unless absolutely necessary.
- [ ] Ensure `DATABASE_URL` points to the correct production DB in CI/deploy workflows.
