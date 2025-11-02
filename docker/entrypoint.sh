#!/bin/sh
set -e

# Entrypoint for the fullstack Docker image.
# Runs programmatic Alembic migrations and then starts the Uvicorn server.
# The script fails (non-zero exit) if migrations fail so orchestration can detect failures.

echo "[entrypoint] starting: running database migrations..."

# Run migrations; the script in backend.run_migrations returns non-zero exit codes
# when it can't apply migrations. -v for verbose output.
if python -m backend.run_migrations -v; then
  echo "[entrypoint] migrations applied successfully"
else
  echo "[entrypoint] migrations failed" >&2
  # Dump migrations.log if present for diagnostics
  if [ -f /app/backend/migrations.log ]; then
    echo "--- migrations.log ---"
    cat /app/backend/migrations.log
    echo "--- end migrations.log ---"
  fi
  exit 1
fi

echo "[entrypoint] starting uvicorn..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
