# PostgreSQL Migration Guide

This document explains how to move an existing Student Management System
installation from the default SQLite database to PostgreSQL using the new
`backend/scripts/migrate_sqlite_to_postgres.py` helper.

## Why PostgreSQL?

- ✅ Better concurrency for multi-user deployments
- ✅ Native support for managed services (Azure, RDS, Supabase, etc.)
- ✅ Easier backup/restore workflows
- ✅ Required for high-availability and scale-out scenarios

SQLite remains the default for local development, but production installations
should switch to PostgreSQL before onboarding real data.

## Prerequisites

1. **Backup your SQLite database** (use Control Panel or backup scripts).
2. **Provision a PostgreSQL instance** and note the host, port, database, user,
   and password.
3. **Install the latest backend dependencies** (includes `psycopg[binary]`).
4. Ensure the application is **stopped** before copying data.

## Step 1 — Configure `.env`

Edit `backend/.env` (or the root `.env`) and set the new database variables:

```dotenv
DATABASE_ENGINE=postgresql
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=student_management
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=super-secure-password
POSTGRES_SSLMODE=require       # prefer/require/verify-* as needed
POSTGRES_OPTIONS=connect_timeout=10&application_name=sms
# Leave DATABASE_URL blank to let the app build it automatically

```text
> **Tip:** `DOCKER.ps1`, `docker-compose.yml`, and the helper scripts now read the
> same variables, so the container picks up the PostgreSQL connection without
> additional flags.

> **Important (v1.18.0 hardening):** PostgreSQL mode is now **explicit**. Keep
> `DATABASE_ENGINE=postgresql` (or an explicit PostgreSQL `DATABASE_URL`) to run
> Compose/PostgreSQL mode. This avoids accidental engine switching and prevents
> "data disappeared" incidents caused by silently reading from the wrong backend.

## Step 2 — (Optional) Dry Run

Preview the migration without touching PostgreSQL:

```powershell
cd backend
python -m backend.scripts.migrate_sqlite_to_postgres `
    --sqlite-path ../data/student_management.db `
    --postgres-url postgresql+psycopg://user:pass@host:5432/dbname `
    --dry-run --skip-migrations

```text
This validates connectivity to the SQLite file and prints row counts for each
model while skipping PostgreSQL writes.

## Step 3 — Migrate Data

Run the migration for real (stop the app first):

```powershell
cd backend
python -m backend.scripts.migrate_sqlite_to_postgres `
    --sqlite-path ../data/student_management.db `
    --postgres-url postgresql+psycopg://user:pass@host:5432/dbname

```text
Key options:

| Flag | Description |
|------|-------------|
| `--batch-size 2000` | Tune insert batch size (default 1000) |
| `--tables students courses` | Only migrate specific tables |
| `--no-truncate` | Append mode (keeps existing PostgreSQL rows) |
| `--skip-migrations` | Skip Alembic runner if schema already matches |
| `--dry-run` | Evaluate without writing data |

By default the script truncates destination tables with `RESTART IDENTITY
CASCADE` to guarantee clean imports.

### Migration reliability improvements (v1.18.0)

- Percent-encoded PostgreSQL URLs (for example passwords containing `!` encoded
    as `%21`) are now handled safely by the Alembic runner.
- If selected tables do not exist in destination PostgreSQL schema, the helper
    logs a warning and skips only those tables instead of aborting the full run.

## Step 4 — Point the App to PostgreSQL

1. Remove any hard-coded `DATABASE_URL` values so the new builder can take over
   (or set it explicitly to the PostgreSQL URI).
2. Restart the application using `.\DOCKER.ps1 -Start` or your
   preferred compose workflow.
3. Verify the Control Panel and API endpoints against the new database.

## Verification Checklist

- [ ] `.\DOCKER.ps1 -Logs` shows `DATABASE_URL` beginning with `postgresql`.
- [ ] Control Panel → `Database Health` reports PostgreSQL as the engine.
- [ ] Recent students/courses appear correctly after migration.
- [ ] Backups now use `pg_dump` (see deployment guide) instead of `.db` copies.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `psycopg` import error | Run `pip install -r backend/requirements.txt` |
| Permission denied | Grant the PostgreSQL user `CONNECT`, `CREATE`, and DML rights |
| Slow migration | Increase `--batch-size` and ensure the Postgres instance is near the API container |
| Duplicate rows | Re-run with `--tables ... --no-truncate` to target specific tables |

For detailed operational steps (backups, compose overrides, QNAP notes), see
[docs/deployment/PRODUCTION_DOCKER_GUIDE.md](PRODUCTION_DOCKER_GUIDE.md).
