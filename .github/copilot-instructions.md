# Copilot Instructions for Student Management System

## 🚀 Quick Start for AI Agents

**What you're working with:** Bilingual (EN/EL) student management system with Docker + native modes.

**Most common tasks:**
```powershell
.\QUICKSTART.ps1              # Intelligent setup & start (detects first-time, installs deps, starts app)
.\QUICKSTART.ps1 -Force       # Force reinstall everything
.\SMS.ps1 -Stop               # Stop everything
cd backend && pytest -q        # Run tests
alembic revision --autogenerate -m "msg" && alembic upgrade head  # DB migration
```

**New: SMART_SETUP.ps1 - Intelligent Installation**
- ✅ Detects first-time vs existing installation automatically
- ✅ Checks Python, Node.js, Docker availability
- ✅ Installs missing dependencies automatically
- ✅ Chooses optimal mode (Docker vs Native)
- ✅ Initializes database correctly
- ✅ Handles all edge cases (empty DB, missing deps, etc.)

**Critical rules:**
1. ❌ Never edit DB schema directly → Always use Alembic
2. ❌ Never hardcode UI strings → Use `t('i18n.key')` from `translations.js`
3. ❌ Never use `@app.on_event()` → Use `@asynccontextmanager` lifespan
4. ✅ Always add rate limiting to new endpoints: `@limiter.limit(RATE_LIMIT_WRITE)`
5. ✅ Always add translations for both EN and EL

**File locations you'll need:**
- Models: `backend/models.py`
- Routers: `backend/routers/routers_*.py`
- Schemas: `backend/schemas/*.py` (exported via `__init__.py`)
- Frontend API: `frontend/src/api/api.js`
- Translations: `frontend/src/translations.js`

## Architecture Overview

**Dual deployment modes:**

| Mode | Description | Ports | Use Case |
|------|-------------|-------|----------|
| **Docker** | Single container (FastAPI serves built React SPA) | 8080 | Production, consistent env |
| **Native** | Backend + Frontend separate processes | 8000 (API) + 5173 (Vite) | Development, hot reload |

**Stack:** FastAPI 0.120+ • SQLAlchemy 2.0 • SQLite • Alembic • React 18 (JSX) • Vite 5 • Tailwind 3 • i18next • PowerShell 7+

**Database:**
- Native: `data/student_management.db`
- Docker: Volume `sms_data:/data/student_management.db`
- Models: Student, Course, Attendance, Grade, DailyPerformance, Highlight, CourseEnrollment
- Auto-migrations on startup via `run_migrations.py` in FastAPI lifespan

**Entry points:**
- Backend: `backend/main.py` (lifespan-managed, includes Control Panel at `/control`)
- Frontend: `frontend/src/App.jsx` → `StudentManagementApp.jsx`
- Scripts: `QUICKSTART.ps1` (delegates to `SMS.ps1`)

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
- Check version mismatch: `scripts/CHECK_VOLUME_VERSION.ps1`

### API Endpoints Pattern
```python
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE

@router.post("/items/", response_model=ItemResponse)
@limiter.limit(RATE_LIMIT_WRITE)  # 10/min for writes, 60/min reads, 5/min heavy
async def create_item(item: ItemCreate, request: Request, db: Session = Depends(get_db)):
    # Access request.state.request_id for logging
    # Raise HTTPException(status_code=400, detail="error") for errors
```

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
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;  // Never hardcode strings!
}
```
Add keys to `frontend/src/translations.js` under both `en` and `el` objects.

### Date Range Queries (Auto-fill Logic)
```python
# If only start_date: end_date = start + SEMESTER_WEEKS*7 days
# If only end_date: start_date = end - SEMESTER_WEEKS*7 days
# Use _normalize_date_range() helper in routers
```

## Common Workflows

### Start/Stop Application (NEW - Intelligent Setup)
```powershell
.\QUICKSTART.ps1       # Intelligent: detects first-time, installs deps, chooses mode, starts
.\QUICKSTART.ps1 -Force # Force reinstall all dependencies
.\SMS.ps1 -Stop        # Stop everything (kills containers + processes)
.\SMS.ps1 -Status      # Check what's running

# Advanced setup options
.\SMART_SETUP.ps1              # Same as QUICKSTART (auto-mode)
.\SMART_SETUP.ps1 -PreferDocker # Force Docker mode (fail if unavailable)
.\SMART_SETUP.ps1 -PreferNative # Force native mode (fail if unavailable)
.\SMART_SETUP.ps1 -SkipStart    # Setup only, don't start
.\SMART_SETUP.ps1 -Verbose      # Show detailed logs
```

**What SMART_SETUP does:**
1. Detects first-time installation vs existing
2. Checks Python 3.11+, Node.js 18+, Docker availability
3. Auto-installs missing dependencies (backend/frontend)
4. Initializes empty database with Alembic migrations
5. Creates .env files from .env.example if missing
6. Chooses best mode: Docker (preferred) > Native (fallback)
7. Starts application and shows access URLs
8. Logs everything to `setup.log` for troubleshooting

### Development Setup
```powershell
.\QUICKSTART.ps1       # Start (auto-detects Docker/native, non-interactive)
.\SMS.ps1              # Interactive menu (status, diagnostics, backups)
.\SMS.ps1 -Stop        # Stop everything (kills containers + processes)
.\SMS.ps1 -Status      # Check what's running
```

### Development Setup
```powershell
# Backend (hot reload)
cd backend && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (HMR)
cd frontend && npm run dev  # http://localhost:5173

# Docker rebuild
.\scripts\SETUP.ps1 && docker compose up -d --build
```

**Environment files:** Copy `.env.example` to `.env` in `backend/` and `frontend/` directories.

### Testing
```bash
cd backend && pytest -q              # All tests
pytest tests/test_students_router.py -v  # Specific file
pytest --cov=backend --cov-report=html   # With coverage
```
Tests use in-memory SQLite with `StaticPool` (see `backend/tests/conftest.py`).

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
1. **Model** (if new table): Add to `backend/models.py` with indexes
2. **Schema**: Create in `backend/schemas/{module}.py`, export in `__init__.py`
3. **Router**: Add to `backend/routers/routers_{module}.py`
   ```python
   @router.post("/items/")
   @limiter.limit(RATE_LIMIT_WRITE)
   async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
       pass
   ```
4. **Register**: Add router in `backend/main.py` `register_routers()` if new file
5. **Migration**: `alembic revision --autogenerate && alembic upgrade head`
6. **Translations**: Add to `frontend/src/translations.js` (en + el)
7. **API Client**: Add to `frontend/src/api/api.js`
8. **Component**: Use `const { t } = useTranslation()` for all text

## Important Technical Details

### Control Panel Limitation
- Lives at `/control`, served from `html_control_panel.html`
- **Can't stop Docker container from inside itself** - use `SMS.ps1 -Stop` on host
- Control API: `/control/api/{status,start,stop,stop-all,stop-backend}`

### Grade Calculation
- Weighted components: Each grade has `component_type` + `weight` (% of final)
- Absence penalty: Deducted from final (set in `courses.absence_penalty`)
- Scale: Greek 0-20 (exports convert to %)
- Date filtering: Use `use_submitted=true` for `date_submitted` vs `date_assigned`

### Frontend Architecture
- Hierarchy: `App.jsx` → `StudentManagementApp.jsx` → features
- Providers: `LanguageProvider`, `ThemeProvider`, `ErrorBoundary`
- i18n: Greek fallback, localStorage → navigator detection
- API: Single axios client in `api/api.js`, uses `VITE_API_URL` env

### Logging & Monitoring
- Format: `%(asctime)s - %(name)s - [%(request_id)s] - %(message)s`
- Files: `backend/logs/app.log` (rotating 2MB, 5 backups) + `structured.json`
- Request ID: Auto-added via `RequestIDMiddleware` to `request.state.request_id`
- Frontend errors: POST to `/api/logs/frontend-error`

### Health Checks
- `/health` - Detailed status (DB, disk, migrations)
- `/health/ready` - Readiness probe (for K8s)
- `/health/live` - Liveness probe (process alive)

## Don't Do This

❌ **Never edit DB schema directly** → Use Alembic migrations  
❌ **Never hardcode UI strings** → Use `t('i18n.key')`  
❌ **Never use `@app.on_event()`** → Use `@asynccontextmanager` lifespan  
❌ **Never stop Docker from Control Panel** → Use `SMS.ps1 -Stop` on host  
❌ **Never forget date validation** → Check `start_date <= end_date`  
❌ **Never commit `.env` files** → Use `.env.example` templates

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port conflicts | `SMS.ps1` → Option 7 or `netstat -ano \| findstr ":8000"` |
| Docker issues | `docker ps`, `docker logs sms-fullstack` |
| Schema mismatch | `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate` |
| Frontend build fails | Check `VITE_API_URL=/api/v1` in env |
| Tests failing | Verify in-memory DB setup in `conftest.py` |
| Migrations not running | Check logs for `run_migrations.py` output |

## Reference Docs

- **Architecture**: `docs/ARCHITECTURE.md` - System design, deployment modes
- **Localization**: `docs/LOCALIZATION.md` - i18n setup, adding translations
- **Docker**: `docs/DOCKER_NAMING_CONVENTIONS.md` - Volume versioning
- **Deployment**: `DEPLOYMENT_GUIDE.md`, `QUICK_DEPLOYMENT.md`
