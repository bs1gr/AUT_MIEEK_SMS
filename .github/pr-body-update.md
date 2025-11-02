ci: add migrations workflow and tests

This pull request implements a programmatic Alembic migration runner, a container entrypoint that runs migrations automatically at startup, and CI that runs migrations + backend tests. It also includes small operational fixes (ensuring /app/data exists in images, baked templates for imports) to make container deployments predictable.

---

Operator Notes (exact)

- Required environment variables / secrets
  - DATABASE_URL: must point to the target database for the service. In production, set this to a managed RDBMS (Postgres/MySQL). If omitted, the container falls back to the default SQLite file URL (sqlite:////app/data/student_management.db) and will create the file inside the container's filesystem; prefer explicit DATABASE_URL in production.
  - SECRET_KEY: set a secure value for production; otherwise a temporary key is auto-generated for dev only.
  - ALLOW_SCHEMA_AUTO_CREATE: leave unset or set to false in production. This flag enables SQLAlchemy metadata.create_all() fallback only when explicitly opted-in.

- Container behavior
  - The container entrypoint (/app/entrypoint.sh) runs the programmatic migrations runner (python -m backend.run_migrations -v) before starting the app server.
  - If migrations fail, the entrypoint exits non-zero and the container stops. This makes deployment fail-fast so operators can inspect logs rather than running with a missing schema.
  - The entrypoint prints /app/backend/migrations.log on failure if it exists — useful for diagnostics.
  - A writable /app/data directory is created in the image to support the default SQLite file when DATABASE_URL is not set. For production, use a proper external DB and set DATABASE_URL accordingly.

- CI behaviour
  - The GitHub Actions workflow in this branch will run the same programmatic migration runner prior to running backend tests. Provide a `DATABASE_URL` repository secret for integration scenarios; otherwise tests run with an in-memory or repo-local DB depending on the workflow configuration.

---

Migration-run policy (recommended, exact steps)

1) Pre-deployment (Operator-run migration job) — RECOMMENDED for multi-instance production
   - Take a database backup (snapshot/export) and verify backup integrity. Ensure you have a tested rollback path.
   - Set the service into maintenance mode or temporarily remove it from the load-balancer (if applicable).
   - Run a one-shot migration job (Kubernetes Job / container task) with the same image and environment that the service will run with:
     - Example: kubectl run --rm -i --restart=Never migrate --image=<repo>/aut_mieek_sms-fullstack:<tag> --env "DATABASE_URL=<prod_url>" -- /bin/sh -c "python -m backend.run_migrations -v"
   - Verify the migration output: ensure the migration runner reports the final `current_version` and `at_head: true`.
   - Run smoke tests against a staging replica pointing to the same DB (read-only checks) if safe.
   - Rollout application deployment once migrations succeed.

2) Entrypoint fallback (only for small or single-instance deployments)
   - The container entrypoint will attempt to run migrations on startup automatically. This is acceptable for single-instance deployments or staging. For clustered production, avoid relying solely on per-container entrypoints to run migrations concurrently.

3) Rollout strategy
   - Blue/Green or Canary rollout is preferred. If using rolling updates, ensure a migration job is run first where schema changes are non-breaking or backward-compatible. If migrations are destructive or require a lock, prefer blue/green.

4) Monitoring & health gates
   - Ensure readiness probes point to `/health/ready` so pods only receive traffic after startup checks pass.
   - Monitor /health and logs for migration errors. Migrations log is written to `/app/backend/migrations.log` by the runner (if enabled) and container stdout.

5) If migrations fail
   - Do not re-deploy application pods. Inspect migration logs and errors, revert the migration branch if necessary, and restore the database from backup if the migration partially applied harmful changes.
   - If you intentionally want the application to create missing tables (development only), set `ALLOW_SCHEMA_AUTO_CREATE=1` in the environment. Do NOT set this in production.

---

Notes for reviewers

- The entrypoint enforces migrations and makes the container fail-fast on schema errors. For multi-replica production, prefer running migrations as a separate one-shot job before rolling out the new image.
- The PR also includes CI updates to run the programmatic migration runner and backend tests. Ensure repository secrets (DATABASE_URL) are configured if you want CI to run migrations against a persistent test database.

---

If you'd like, I can also:
- add a Kubernetes Job manifest (example) that runs migrations as a one-shot job,
- or convert the shell entrypoint to a small Python entrypoint for unified logging/exit codes.
