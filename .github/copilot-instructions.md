# Copilot Instructions for Student Management System

## � MANDATORY: Development Status & Planning

**⚠️ CRITICAL DIRECTIVE FOR ALL AI AGENTS:**

Before starting ANY work, you MUST:

1. **Check Current Status**: Read [docs/plans/UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md) - This is the **single source of truth** for all project planning, priorities, and timelines.

2. **Follow Documentation Index**: Consult [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) for complete documentation navigation and understand the current project state.

3. **Respect Work Streams**: All work is organized into 4 streams with clear priorities:
   - 🔴 **IMMEDIATE: Phase 1 Completion** (v1.15.0) - Jan 7-24, 2026 - BLOCKING
   - 🟠 **SHORT-TERM: Post-Phase 1 Polish** (v1.15.1) - Jan 7-24, 2026
   - 🟡 **MEDIUM-TERM: Phase 2** (v1.16.0) - Jan 27 - Mar 7, 2026
   - 🔵 **LONG-TERM: Backlog** - Q2 2026+

4. **Update Progress**: When completing tasks, update the checklist in UNIFIED_WORK_PLAN.md to maintain accurate status for all agents.

5. **No Duplicate Planning**: Do NOT create new TODO lists, planning documents, or trackers. Update the unified plan instead.

**Current Development Phase**: Phase 1 Completion (v1.15.0) - 50% complete
**Active Branch**: `feature/v11.14.3-phase1-batch2`
**Next Critical Tasks**: Audit logging implementation, E2E test suite fixes, Frontend API client update

---

## �🚀 Quick Start for AI Agents

**What you're working with:** Bilingual (EN/EL) student management system with Docker + native modes. Version: **1.13.0** (see VERSION file).

**Most common tasks:**

```powershell
# Docker Deployment (v2.0 Consolidated)
.\DOCKER.ps1 -Start               # Start Docker deployment (builds if needed)
.\DOCKER.ps1 -Stop                # Stop Docker container
.\DOCKER.ps1 -Update              # Fast update with automatic backup
.\DOCKER.ps1 -Install             # First-time installation
.\DOCKER.ps1 -Prune               # Safe Docker cleanup
.\DOCKER.ps1 -WithMonitoring      # Start with Grafana/Prometheus
.\DOCKER.ps1 -Help                # Show all commands

# Native Development (v2.0 Consolidated)
.\NATIVE.ps1 -Setup               # Install dependencies (first time)
.\NATIVE.ps1 -Start               # Start backend + frontend with hot-reload
.\NATIVE.ps1 -Stop                # Stop all processes
.\NATIVE.ps1 -Backend             # Backend only (uvicorn --reload)
.\NATIVE.ps1 -Frontend            # Frontend only (Vite HMR)
.\NATIVE.ps1 -Help                # Show all commands

# Quality & Pre-commit (v1.9.3+)
.\COMMIT_READY.ps1 -Quick         # Quick validation (2-3 min): format, lint, smoke test
.\COMMIT_READY.ps1 -Standard      # Standard checks (5-8 min): + backend tests
.\COMMIT_READY.ps1 -Full          # Full validation (15-20 min): + all frontend tests
.\COMMIT_READY.ps1 -Cleanup       # Just cleanup (1-2 min): format + organize imports

# Legacy Scripts (Deprecated & Archived)
# archive/pre-v1.9.1/: RUN.ps1, INSTALL.ps1, SMS.ps1, run-native.ps1 → Use DOCKER.ps1/NATIVE.ps1
# archive/pre-v1.9.7-docker-scripts/: DOCKER_UP/DOWN/REFRESH/RUN/SMOKE/UPDATE_VOLUME → Use DOCKER.ps1
# scripts/ci/VERIFY_VERSION.ps1 → Use scripts/VERIFY_VERSION.ps1 -CIMode

# Database & Testing
cd backend && pytest -q                                             # Run tests (rate limiter auto-disabled)
alembic revision --autogenerate -m "msg" && alembic upgrade head   # DB migration
```

**Configuration Files (Moved to dedicated directories):**
- `config/mypy.ini` - Type checking configuration
- `config/pytest.ini` - Test runner configuration
- `config/ruff.toml` - Linting configuration
- `docker/docker-compose.yml` - Main Docker compose file
- `docker/docker-compose.prod.yml` - Production overlay
- `docker/docker-compose.monitoring.yml` - Monitoring stack

**Critical rules:**
1. ❌ Never edit DB schema directly → Always use Alembic migrations
2. ❌ Never hardcode UI strings → Use `t('i18n.key')` from `translations.ts`
3. ❌ Never use `@app.on_event()` → Use `@asynccontextmanager` lifespan (see `backend/main.py`)
4. ❌ Never create new TODO/planning docs → Update [UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md) instead
5. ✅ Always check [UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md) before starting work
6. ✅ Always add rate limiting to new endpoints: `@limiter.limit(RATE_LIMIT_WRITE)`
7. ✅ Always add translations for both EN and EL (TypeScript modular structure)
8. ✅ Always run `COMMIT_READY.ps1 -Quick` before committing (auto-fix + validation)

**File locations you'll need:**
- Models: `backend/models.py` (with indexes on email, student_id, course_code, date, semester)
- Routers: `backend/routers/routers_*.py` (use `optional_require_role` for admin endpoints)
- Schemas: `backend/schemas/*.py` (exported via `__init__.py` for clean imports)
- Frontend API: `frontend/src/api/api.js` (axios client with auth interceptor)
- Translations: `frontend/src/translations.ts` + `frontend/src/locales/{en,el}/*.ts` (modular)
- Tests: `backend/tests/` (StaticPool in-memory DB) + `frontend/src/**/__tests__/*.test.{ts,tsx}` (Vitest)

## Architecture Overview

**Dual deployment modes:**

| Mode | Description | Ports | Use Case |
|------|-------------|-------|----------|
| **Docker** | Single container (FastAPI serves built React SPA) | 8080 | Production, consistent env |
| **Native** | Backend + Frontend separate processes | 8000 (API) + 5173 (Vite) | Development, hot reload |

**Stack:** FastAPI 0.120+ • SQLAlchemy 2.0 • SQLite/PostgreSQL • Alembic • React 18 (TypeScript/TSX) • Vite 5 • Tailwind 3 • i18next • PowerShell 7+

**Database:**
- Native: `data/student_management.db`
- Docker: Volume `sms_data:/data/student_management.db`
- Models: Student, Course, Attendance, Grade, DailyPerformance, Highlight, CourseEnrollment (all with soft-delete via `SoftDeleteMixin`)
- Auto-migrations on startup via `run_migrations.py` in FastAPI lifespan
- **Indexing strategy**: Indexed fields include `email`, `student_id`, `course_code`, `date`, `semester`, `is_active`, `enrollment_date` for query performance

**Entry points:**
- Backend: `backend/main.py` (minimal entry point, ~100 lines)
  - **Modular Architecture (v1.9.5+):**
    - `backend/app_factory.py` - FastAPI app creation and configuration
    - `backend/lifespan.py` - Startup/shutdown lifecycle management
    - `backend/middleware_config.py` - All middleware registration
    - `backend/error_handlers.py` - Exception handler registration
    - `backend/router_registry.py` - Router registration logic
- Frontend: `frontend/src/App.tsx` → Main layout with navigation, auth, and error boundaries
- Scripts:
  - **Production/Docker:** `DOCKER.ps1` (v2.0 consolidated)
  - **Development/Native:** `NATIVE.ps1` (v2.0 consolidated)
  - **Quality Gate:** `COMMIT_READY.ps1` (v1.9.3+)
  - **Legacy (Archived):** See `archive/pre-v1.9.1/` for deprecated scripts

**Environment Detection** (`backend/environment.py`):
- Production mode requires Docker (enforced via `RuntimeContext.assert_valid()`)
- Test mode: Auto-detected via pytest env vars or `DISABLE_STARTUP_TASKS=1`
- Development mode: Default for native execution (no SMS_ENV set)

## Critical Patterns (Learn These First)

### Database Changes = Alembic Migration

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

- Migrations run auto on startup (lifespan context)
- Use `cascade="all, delete-orphan"` for dependent records
- Index frequently queried fields: `email`, `student_id`, `course_code`, `date`
- Check version mismatch: `.\scripts\CHECK_VOLUME_VERSION.ps1`

### API Endpoints Pattern

```python
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE

@router.post("/items/", response_model=ItemResponse)
@limiter.limit(RATE_LIMIT_WRITE)  # configured via backend.rate_limiting (env-configurable defaults)
async def create_item(item: ItemCreate, request: Request, db: Session = Depends(get_db)):
    # Access request.state.request_id for logging
    # Raise HTTPException(status_code=400, detail="error") for errors
```

**CRITICAL: Admin Endpoint Authentication**
```python
# ❌ WRONG - Bypasses AUTH_MODE (never use for admin endpoints)
@router.get("/admin/users")
async def list_users(current_admin: Any = Depends(require_role("admin"))):
    pass

# ✅ CORRECT - Respects AUTH_MODE (always use for admin endpoints)
@router.get("/admin/users")
async def list_users(current_admin: Any = Depends(optional_require_role("admin"))):
    pass
```

**AUTH_MODE Behavior:**
- `disabled`: No authentication required (emergency access)
- `permissive`: Authentication optional (recommended for production)
- `strict`: Full authentication required (maximum security)

### Pydantic Validation Pattern

```python
class GradeCreate(BaseModel):
    grade: float = Field(ge=0)
    max_grade: float = Field(gt=0)

    @model_validator(mode='after')
    def validate_grade(self):
        if self.grade > self.max_grade:
            raise ValueError("Grade exceeds max_grade")
        return self
```

### Frontend i18n Pattern (MANDATORY)

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;  // Never hardcode strings!
}
```

**Translation Structure (Modular TypeScript):**
- Main: `frontend/src/translations.ts` (imports all locale modules)
- English: `frontend/src/locales/en/*.ts` (common, auth, students, courses, etc.)
- Greek: `frontend/src/locales/el/*.ts` (parallel structure)
- Nested access: `t('students.addStudent')` or flat: `t('addStudent')`
- **Always add both EN and EL** - translation integrity tests will catch missing keys

### Date Range Queries (Auto-fill Logic)

```python
# If only start_date: end_date = start + SEMESTER_WEEKS*7 days
# If only end_date: start_date = end - SEMESTER_WEEKS*7 days
# Use _normalize_date_range() helper in routers
```

## Common Workflows

### Start/Stop Application (v2.0 - Consolidated Scripts)

```powershell
# Docker Deployment
.\DOCKER.ps1 -Install         # First-time installation
.\DOCKER.ps1 -Start           # Start (default, builds if needed)
.\DOCKER.ps1 -Update          # Fast update with backup
.\DOCKER.ps1 -UpdateClean     # Clean update (no-cache + backup)
.\DOCKER.ps1 -Stop            # Stop cleanly
.\DOCKER.ps1 -Status          # Check status
.\DOCKER.ps1 -WithMonitoring  # Start with monitoring stack
.\DOCKER.ps1 -Prune           # Safe cleanup
.\DOCKER.ps1 -DeepClean       # Nuclear cleanup

# Native Development
.\NATIVE.ps1 -Setup           # Install dependencies
.\NATIVE.ps1 -Start           # Start backend + frontend
.\NATIVE.ps1 -Backend         # Backend only (hot-reload)
.\NATIVE.ps1 -Frontend        # Frontend only (HMR)
.\NATIVE.ps1 -Stop            # Stop all
.\NATIVE.ps1 -Status          # Check status
```

**Migration Note:** Old scripts (`RUN.ps1`, `INSTALL.ps1`, `SMS.ps1`, `run-native.ps1`) are deprecated and archived in `archive/pre-v1.9.1/`.

### Development Setup

```powershell
# Backend (hot reload)
cd backend && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (HMR)
cd frontend && npm run dev  # http://localhost:5173

# Force rebuild Docker images
.\DOCKER.ps1 -UpdateClean   # Clean rebuild with no-cache
```

**Environment files:** Copy `.env.example` to `.env` in `backend/` and `frontend/` directories.

### Testing

```bash
cd backend && pytest -q              # All tests (rate limiter auto-disabled)
pytest tests/test_students_router.py -v  # Specific file
pytest --cov=backend --cov-report=html   # With coverage
```

Tests use in-memory SQLite with `StaticPool` (see `backend/tests/conftest.py`).

**Test Configuration:**
- `DISABLE_STARTUP_TASKS=1`: Auto-set in conftest to skip migrations/heavy startup
- `CSRF_ENABLED=0`: CSRF disabled in tests (TestClient doesn't handle cookies easily)
- Rate limiting: Auto-disabled via `limiter.enabled = False`
- Clean DB: `clean_db` fixture resets schema before each test function

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Add phone field"  # Create
alembic upgrade head           # Apply
alembic current                # Check version
alembic downgrade -1           # Rollback
```

**Version mismatch between native/Docker?** Run `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate`

### Adding New Feature (Full Flow)
1. **Check Work Plan**: Verify feature is in [UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md) and properly prioritized
2. **Model** (if new table): Add to `backend/models.py` with indexes
3. **Schema**: Create in `backend/schemas/{module}.py`, export in `__init__.py`
4. **Router**: Add to `backend/routers/routers_{module}.py`

   ```python
   @router.post("/items/")
   @limiter.limit(RATE_LIMIT_WRITE)
   async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
       pass
   ```

5. **Register**: Add router in `backend/main.py` `register_routers()` if new file
6. **Migration**: `alembic revision --autogenerate && alembic upgrade head`
7. **Translations**: Add to `frontend/src/translations.js` (en + el)
8. **API Client**: Add to `frontend/src/api/api.js`
9. **Component**: Use `const { t } = useTranslation()` for all text
10. **Update Plan**: Mark task complete in [UNIFIED_WORK_PLAN.md](../docs/plans/UNIFIED_WORK_PLAN.md)

## Important Technical Details

### Operations UI (Control Features)
- React Operations page at `/operations` provides all control features
- Manage Backups panel: list, download, save to path, ZIP (all/selected), delete selected
- Control API endpoints: `/control/api/operations/*` (used by Operations UI)
- **Can't stop Docker container from inside itself** - use `DOCKER.ps1 -Stop` on host

### Grade Calculation
- Weighted components: Each grade has `component_type` + `weight` (% of final)
- Absence penalty: Deducted from final (set in `courses.absence_penalty`)
- Scale: Greek 0-20 (exports convert to %)
- Date filtering: Use `use_submitted=true` for `date_submitted` vs `date_assigned`

### Frontend Architecture
- Hierarchy: `App.tsx` → Main layout with navigation, auth, error boundaries
- Providers: `LanguageProvider`, `ThemeProvider`, `AppearanceThemeProvider`, `AuthContext`, `ErrorBoundary`
- i18n: Greek fallback, localStorage → navigator detection, modular TypeScript structure
- API: Single axios client in `api/api.js`, uses `VITE_API_URL` env (defaults to `/api/v1`)
- Control API: Canonical base at `/control/api` (exported as `CONTROL_API_BASE` from `api.js`)
- State: React Query for server state, local state for UI (no Redux/Zustand)
- Routing: React Router v6 with protected routes and auth guards

### Logging & Monitoring
- Format: `%(asctime)s - %(name)s - [%(request_id)s] - %(message)s`
- Files: `backend/logs/app.log` (rotating 2MB, 5 backups) + `structured.json`
- Request ID: Auto-added via `RequestIDMiddleware` to `request.state.request_id`
- Frontend errors: POST to `/api/logs/frontend-error`
- Note: Embedded Monitoring UI (Grafana/Prometheus panels) was removed in v1.8.3. The `/metrics` endpoint remains available when `ENABLE_METRICS=1` for external tools.

### Health Checks
- `/health` - Detailed status (DB, disk, migrations)
- `/health/ready` - Readiness probe (for K8s)
- `/health/live` - Liveness probe (process alive)

## Don't Do This

❌ **Never create documentation without auditing first** → Always check `/docs/`, `/docs/plans/`, `/docs/releases/`, `/docs/processes/` directories and `DOCUMENTATION_INDEX.md` first. Review existing structure, naming conventions, and patterns before creating new docs. Consolidate findings into existing framework rather than creating standalone documents. Single source of truth prevents duplication and confusion.

❌ **Never edit DB schema directly** → Use Alembic migrations
❌ **Never hardcode UI strings** → Use `t('i18n.key')`
❌ **Never use `@app.on_event()`** → Use `@asynccontextmanager` lifespan
❌ **Never stop Docker from Control Panel** → Use `DOCKER.ps1 -Stop` on host
❌ **Never forget date validation** → Check `start_date <= end_date`
❌ **Never commit `.env` files** → Use `.env.example` templates

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port conflicts | `DOCKER.ps1 -Status` or `netstat -ano \| findstr ":8000"` |
| Docker issues | `docker ps`, `docker logs sms-fullstack` |
| Schema mismatch | `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate` |
| Frontend build fails | Check `VITE_API_URL=/api/v1` in env |
| Tests failing | Verify in-memory DB setup in `conftest.py` |
| Migrations not running | Check logs for `run_migrations.py` output |

## Reference Docs

- **Architecture**: `docs/development/ARCHITECTURE.md` - System design, deployment modes
- **Localization**: `docs/user/LOCALIZATION.md` - i18n setup, adding translations
- **Docker**: `docs/DOCKER_NAMING_CONVENTIONS.md` - Volume versioning
- **Deployment**: `DEPLOYMENT_GUIDE.md`, `docs/user/QUICK_START_GUIDE.md`
- **Git Workflow**: `docs/development/GIT_WORKFLOW.md` - Commit standards, branching strategy
- **Master Index**: `docs/DOCUMENTATION_INDEX.md` - Complete documentation navigation
