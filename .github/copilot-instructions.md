# Copilot Instructions: Student Management System

## Project Overview

- **Bilingual (EN/EL) student management system**
- **Backend:** FastAPI (modular, Alembic migrations, SQLAlchemy, SQLite/PostgreSQL)
- **Frontend:** React 19 (TypeScript, Vite, Tailwind, i18next)
- **Deployment:** Docker (prod, single container) & Native (dev, hot-reload)
- **Scripts:** Use only `DOCKER.ps1` (prod/ops) and `NATIVE.ps1` (dev)

## Essential Conventions & Patterns

- **DB schema:** _Never_ edit directly. Use Alembic migrations (`alembic revision --autogenerate -m "msg" && alembic upgrade head`).
- **UI strings:** _Never_ hardcode. Use `t('i18n.key')` and add both EN/EL translations in `frontend/src/locales/{en,el}/*.js`.
- **FastAPI lifespan:** _Never_ use `@app.on_event()`. Use `@asynccontextmanager` (see `backend/lifespan.py`).
- **Rate limiting:** All endpoints must use `@limiter.limit(RATE_LIMIT_WRITE)` (see `backend/rate_limiting.py`).
- **Admin endpoints:** Use `optional_require_role` (not `require_role`) for RBAC (see routers).
- **Pre-commit:** Always run `COMMIT_READY.ps1 -Mode quick` before commit (auto-fix, lint, smoke test).

## Key Files

- **`DOCKER.ps1`**: Main script for production/staging Docker deployments.
- **`NATIVE.ps1`**: Main script for local development with hot-reloading.
- **`backend/main.py`**: Backend application entry point.
- **`backend/models.py`**: SQLAlchemy database models.
- **`backend/routers/`**: Directory for API endpoint routers.
- **`backend/services/`**: Directory for business logic services.
- **`frontend/src/App.tsx`**: Frontend application entry point.
- **`frontend/src/api/api.js`**: Frontend API client (axios).
- **`frontend/src/locales/`**: Directory for i18n translation files.
- **`docs/DOCUMENTATION_INDEX.md`**: Master index for all project documentation.

## Key Workflows

- **Start/Stop (prod):** `./DOCKER.ps1 -Start|-Stop|-Update|-WithMonitoring`
- **Start/Stop (dev):** `./NATIVE.ps1 -Setup|-Start|-Backend|-Frontend|-Stop`
- **Testing:**
    - Backend: `cd backend && python -m pytest -q` (rate limiter auto-disabled)
    - Frontend: `cd frontend && npm run test -- --run`
    - E2E: `cd frontend && npm run e2e`
- **Migrations:** `cd backend && alembic revision --autogenerate -m "msg" && alembic upgrade head`
- **Environment:** Copy `.env.example` to `.env` in the project root. Backend/frontend `.env` files are ignored (see `docs/CONFIG_STRATEGY.md`).

## Architecture & Structure

- **Backend:**
    - Entry: `backend/main.py` (uses `app_factory.py`, `lifespan.py`, `middleware_config.py`, `router_registry.py`)
    - Models: `backend/models.py` (soft-delete, indexed fields)
    - Routers: `backend/routers/routers_*.py` (modular, RBAC)
    - Schemas: `backend/schemas/`
    - Migrations: `backend/migrations/` (auto-run on startup)
    - Service layer: `backend/services/` (business logic)
    - Logging: `backend/logs/` (request ID via `RequestIDMiddleware`)
- **Frontend:**
    - Entry: `frontend/src/App.tsx`
    - API: `frontend/src/api/api.js` (axios, auth)
    - i18n: `frontend/src/translations.ts`, `frontend/src/locales/{en,el}/*.js`
    - Tests: `frontend/src/**/__tests__/*.test.{ts,tsx}` (Vitest), `frontend/tests/` (Playwright)
- **Documentation:**
    - All documentation is in the `docs/` directory, organized by role (`user`, `development`, `deployment`, etc.).
    - The master index is `docs/DOCUMENTATION_INDEX.md`.

## Project-Specific Patterns

- **Date range queries:** Use `_normalize_date_range()` helper in routers for auto-fill logic.
- **Pydantic validation:** Use `@model_validator(mode='after')` for cross-field checks.
- **Health checks:** `/health`, `/health/ready`, `/health/live` endpoints.
- **Backups:** Managed via Operations UI (`/operations`) and Docker scripts.
- **API conventions:** All API endpoints return paginated responses (`PaginatedResponse`) for list queries. See `backend/schemas/common.py`.
- **Frontend API:** Use exported API clients in `frontend/src/api/api.js` for all backend communication. Do not call backend endpoints directly.
- **i18n completeness:** All UI keys must exist in both EN/EL files. Tests enforce this.

## Do Not

- Edit DB schema directly (use migrations)
- Hardcode UI strings (use i18n)
- Use `@app.on_event()` (use lifespan context)
- Stop Docker from inside the container (use host script)
- Commit `.env` files (use `.env.example`)
- Use legacy scripts from the `archive/` directory.

## References

- See `docs/` for architecture, localization, deployment, and workflow guides.
- For legacy scripts, see `archive/pre-v1.9.1/` (do not use for new work).

---
If any section is unclear or missing critical project-specific knowledge, please provide feedback for further refinement.
