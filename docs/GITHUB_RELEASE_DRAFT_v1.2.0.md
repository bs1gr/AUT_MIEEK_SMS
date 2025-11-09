# Release v1.2.0

A focused release adding optional authentication/authorization, timezone-safe timestamps, and stronger operational docs. Docker-first experience remains the default; native dev still supported.

## Highlights

- Optional JWT authentication with role-based access control (RBAC)
- Timezone-aware timestamps (UTC) across all models and migrations
- Rate limiting enforced on new write endpoints
- Fresh-clone deployment fully validated and documented

## Links

- Detailed release notes: [CHANGELOG.md](../CHANGELOG.md)
- Changelog: [CHANGELOG.md](../CHANGELOG.md)
- Fresh clone test report: archived (see docs/REMOVED_DOCS_SUMMARY.md)
- Authentication guide: [docs/AUTHENTICATION.md](../docs/AUTHENTICATION.md)

## Migrations

- Auto-applied on startup via FastAPI lifespan (see `backend/run_migrations.py`)
- For manual use: `cd backend && alembic upgrade head`

## Upgrade notes

- No breaking API changes when `AUTH_ENABLED=false` (default)
- To enable auth:
  1. Set `AUTH_ENABLED=true` in `backend/.env`
  2. Restart backend (or container)
  3. Register users and assign roles per `docs/AUTHENTICATION.md`

## Verification

- All backend tests pass (pytest)
- Fresh-clone setup verified for Docker and native modes; see report above

## Thanks

Thanks to contributors and testers who helped validate the auth flow and timezone changes.
