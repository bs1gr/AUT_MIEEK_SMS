# Backend notes

This folder contains the FastAPI backend for the Student Management System.

## Database Docker behavior

When running the application inside Docker, the recommended pattern is to mount a host directory or a volume at `/data` and point the application to the SQLite file there.

Example environment variable (inside the container):

```powershell
DATABASE_URL="sqlite:////data/student_management.db"
```

Validation and opt-in
Notes:

- By default the application validates that the SQLite file is inside the project directory to reduce accidental path traversal mistakes in development.
- When running in Docker it's common to mount the DB at `/data`. The app accepts `/data` paths automatically.
- If you need to use a different external path, set the environment variable `ALLOW_EXTERNAL_DB_PATH=1` in your container to explicitly opt in.

Security note: For production workloads consider using a managed relational database instead of SQLite. If you must use SQLite in production, ensure the volume backing `/data` is durable and backed up.

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

---
Small checklist:

- [ ] Do NOT enable `ALLOW_EXTERNAL_DB_PATH` in production unless absolutely necessary.
- [ ] Ensure `DATABASE_URL` points to the correct production DB in CI/deploy workflows.
