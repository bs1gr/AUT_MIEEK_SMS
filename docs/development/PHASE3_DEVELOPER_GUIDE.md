# Phase 3 Developer Guide
**Student Management System $11.15.1**

---

## Quick Start for Phase 3 Development

### Prerequisites
- Phase 2 completion verified ✅
- 1,592 tests passing ✅
- All deployments healthy ✅
- Code quality checks passing ✅

### Getting Started (2 minutes)

```powershell
# 1. Start development environment
cd d:\SMS\student-management-system

# Option A: Native mode (recommended for development)
.\NATIVE.ps1 -Start
# Backend: http://localhost:8000
# Frontend: http://localhost:8080 (with HMR)

# Option B: Docker mode (for production-like environment)
.\DOCKER.ps1 -Start
# App: http://localhost:8080
# API Docs: http://localhost:8080/docs

# 2. Run tests while developing
cd frontend && npm test -- --watch  # Frontend with watch mode
cd backend && python -m pytest -q --lf  # Backend last-failed mode

# 3. Before committing
.\COMMIT_READY.ps1 -Quick  # Format + lint + smoke test (~2 min)

# 4. Before merging
.\COMMIT_READY.ps1 -Standard  # Full suite + backend tests (~5 min)
```

---

## Phase 3 Feature Development

### Backend Feature Checklist

#### 1. Create API Endpoint (Router)
```python
# File: backend/routers/routers_phase3.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
from backend.dependencies import get_db, optional_require_role
from backend.schemas import YourSchema, YourResponse

router = APIRouter(prefix="/api/v1/features", tags=["Phase 3 Features"])

@router.post("/your-feature", response_model=YourResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_WRITE)  # ALWAYS add rate limiting
async def create_feature(
    request: Request,
    payload: YourSchema,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),  # Use optional_require_role
):
    """Create a feature.

    - **payload**: Feature data (validated)
    - **Returns**: Created feature details

    Rate limit: 10 requests/minute
    """
    # Access request_id from request.state.request_id for logging
    logger.info(f"[{request.state.request_id}] Creating feature: {payload.name}")

    # Create feature using service
    feature = FeatureService.create(db, payload)

    return YourResponse.from_orm(feature)
```

**Critical Rules:**
- ✅ Add rate limiting: `@limiter.limit(RATE_LIMIT_WRITE)`
- ✅ Use `optional_require_role()` for admin endpoints
- ✅ Always validate input with Pydantic schemas
- ✅ Log with request ID: `request.state.request_id`
- ✅ Return proper HTTP status codes
- ✅ Register router in `backend/main.py`

#### 2. Create Service Layer
```python
# File: backend/services/feature_service.py

from backend.models import Feature

class FeatureService:
    """Feature management service."""

    @staticmethod
    def create(db: Session, payload: FeatureCreate) -> Feature:
        """Create feature with validation."""
        feature = Feature(
            name=payload.name,
            description=payload.description,
        )
        db.add(feature)
        db.commit()
        db.refresh(feature)
        return feature
```

#### 3. Create Database Model (if needed)
```python
# File: backend/models.py

from backend.models_soft_delete import SoftDeleteMixin

class Feature(Base, SoftDeleteMixin):
    """Feature model."""
    __tablename__ = "features"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, index=True)  # Index frequently queried fields
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Database Model Rules:**
- ✅ Inherit `SoftDeleteMixin` for soft deletes
- ✅ Index frequently queried fields (`name`, `email`, `course_id`, `date`)
- ✅ Always add `created_at` timestamp
- ✅ Use `index=True` for WHERE/JOIN columns

#### 4. Create Migration
```bash
cd backend
alembic revision --autogenerate -m "Add Feature model"
alembic upgrade head
```

#### 5. Create Tests
```python
# File: backend/tests/test_phase3_features_router.py

def test_create_feature(client, db):
    """Test feature creation."""
    payload = {"name": "Test Feature", "description": "A test"}

    response = client.post("/api/v1/features", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Feature"

    # Verify in database
    feature = db.query(Feature).filter_by(name="Test Feature").first()
    assert feature is not None
```

**Test Rules:**
- ✅ Test happy path first, then edge cases
- ✅ Verify database state after mutations
- ✅ Use `db` fixture for assertions
- ✅ Test error cases (validation, auth, not found)
- ✅ Run with `pytest -q` during development
- ✅ Run with `pytest --cov` before PR

---

### Frontend Feature Checklist

#### 1. Create Component
```tsx
// File: frontend/src/features/phase3/components/FeatureCard.tsx

import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../api/api';

interface FeatureCardProps {
  featureId: number;
  name: string;
  onDelete?: () => void;
}

export function FeatureCard({ featureId, name, onDelete }: FeatureCardProps) {
  const { t } = useTranslation();  // ALWAYS use i18n for strings

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/features/${featureId}`),
    onSuccess: () => onDelete?.(),
  });

  return (
    <div className="card">
      <h3>{name}</h3>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
      >
        {t('common.delete')}  {/* Use i18n keys */}
      </button>
    </div>
  );
}
```

**Component Rules:**
- ✅ NEVER hardcode strings → Use `t('i18n.key')`
- ✅ Always add EN + EL translations together
- ✅ Use React Query for API calls
- ✅ Add TypeScript types for all props
- ✅ Handle loading/error states
- ✅ Make components accessible

#### 2. Add Translations
```typescript
// File: frontend/src/locales/en/features.ts

export const featuresToEn = {
  create: 'Create Feature',
  delete: 'Delete Feature',
  created: 'Feature created successfully',
  deleted: 'Feature deleted successfully',
} as const;

// File: frontend/src/locales/el/features.ts

export const featuresToEl = {
  create: 'Δημιουργία Χαρακτηριστικού',
  delete: 'Διαγραφή Χαρακτηριστικού',
  created: 'Το χαρακτηριστικό δημιουργήθηκε με επιτυχία',
  deleted: 'Το χαρακτηριστικό διαγράφηκε με επιτυχία',
} as const;

// Update frontend/src/translations.ts to import both
```

#### 3. Create Tests
```tsx
// File: frontend/src/features/phase3/components/__tests__/FeatureCard.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCard } from '../FeatureCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(component: React.ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

test('renders feature name', () => {
  renderWithProviders(<FeatureCard featureId={1} name="Test" />);

  expect(screen.getByText('Test')).toBeInTheDocument();
});

test('calls onDelete when delete clicked', async () => {
  const onDelete = vi.fn();
  renderWithProviders(
    <FeatureCard featureId={1} name="Test" onDelete={onDelete} />
  );

  await userEvent.click(screen.getByText('common.delete'));  // i18n key

  expect(onDelete).toHaveBeenCalled();
});
```

**Test Rules:**
- ✅ Test component behavior, not implementation
- ✅ Use `renderWithProviders` for React Query
- ✅ Test accessibility attributes
- ✅ Mock API calls with `vi.mock()`
- ✅ Run with `npm test` during development

#### 4. Add to Routing
```tsx
// File: frontend/src/App.tsx

import { FeatureView } from './features/phase3/views/FeatureView';

<Routes>
  <Route path="/features" element={<FeatureView />} />
  {/* other routes */}
</Routes>
```

---

## Testing Best Practices

### Running Tests During Development

```bash
# Frontend
cd frontend

npm test                          # Run all tests (watch mode)
npm test -- path/to/test.tsx     # Run specific file
npm test -- --ui                 # Open Vitest UI
npm test -- --run                # Single run (CI mode)

# Backend
cd backend

pytest                            # Run all tests
pytest -q                         # Quiet mode
pytest -q --lf                    # Last failed only
pytest -q --cov                   # With coverage
pytest -q tests/test_xyz.py       # Specific file
pytest -q -k "test_name"          # Specific test name
```

### Pre-commit Checklist

```bash
# 1. Format & lint fixes
.\COMMIT_READY.ps1 -Cleanup

# 2. Quick validation (2-3 min)
.\COMMIT_READY.ps1 -Quick

# 3. On success, commit
git add .
git commit -m "feat: Add Phase 3 feature XYZ"

# 4. Before merge, run full suite
.\COMMIT_READY.ps1 -Standard
```

### Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| **Unit Tests** | 75% | 90%+ |
| **Integration Tests** | 60% | 80%+ |
| **API Endpoints** | 100% | 100% |
| **Critical Path** | 95% | 99%+ |

*Run coverage with:*
```bash
# Backend
pytest --cov=backend --cov-report=html

# Frontend
npm test -- --coverage
```

---

## Database Operations

### Creating Migrations

```bash
cd backend

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Add Feature table"

# Manual migration (complex changes)
alembic revision -m "Custom migration"
# Edit alembic/versions/xxx_custom_migration.py

# Apply migrations
alembic upgrade head

# Check current version
alembic current

# Rollback one migration
alembic downgrade -1
```

### Schema Changes Checklist

- ✅ Always use Alembic migrations (never direct DB edits)
- ✅ Test migration up and down
- ✅ Add indexes on foreign keys and WHERE columns
- ✅ Include cascade delete rules
- ✅ Use `index=True` for frequently queried fields
- ✅ Run migration before committing

### Query Optimization

```python
# ❌ BAD - N+1 queries
for student in db.query(Student).all():
    courses = student.courses  # Query per student!

# ✅ GOOD - Eager load
students = db.query(Student).options(
    joinedload(Student.courses)
).all()

# ✅ GOOD - Use indexes
students = db.query(Student).filter(
    Student.email == "test@example.com"  # email is indexed
).all()

# ✅ GOOD - Use date range filters
from datetime import datetime, timedelta
since = datetime.utcnow() - timedelta(days=7)
recent = db.query(Notification).filter(
    Notification.created_at >= since
).all()
```

---

## Common Development Tasks

### Add a New Admin Endpoint

```python
# backend/routers/routers_admin.py

@router.post("/admin/broadcast-notification")
@limiter.limit(RATE_LIMIT_WRITE)
async def broadcast_notification(
    request: Request,
    payload: BroadcastPayload,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(optional_require_role("admin")),  # ← Auth
):
    """Send notification to all users (admin only)."""
    # Service handles business logic
    NotificationService.broadcast_admin_notification(
        db, payload.title, payload.message, payload.data
    )
    return {"status": "sent"}
```

**Key: Use `optional_require_role("admin")` not `require_role("admin")`**

### Add a Query Parameter

```python
# Frontend
const { data, isLoading } = useQuery({
  queryKey: ['notifications', userId, unreadOnly],
  queryFn: ({ signal }) => api.get(
    `/notifications?user_id=${userId}&unread_only=${unreadOnly}`,
    { signal }
  ),
});

# Backend
@router.get("/notifications")
async def get_notifications(
    user_id: int = Query(..., ge=1),
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get notifications with optional filtering."""
    return NotificationService.get_notifications(
        db, user_id, skip, limit, unread_only
    )
```

### Debug a Failing Test

```bash
# See what's happening
pytest -q -vv tests/test_xyz.py::test_specific

# Drop into debugger
pytest -q --pdb tests/test_xyz.py::test_specific

# Print debug info
import pytest; pytest.set_trace()  # Breakpoint
```

---

## Performance Considerations

### Response Time Targets
- API endpoints: **< 200ms p50, < 1s p99**
- Frontend renders: **< 60fps (16ms frames)**
- Database queries: **< 100ms for most queries**
- WebSocket messages: **< 50ms latency**

### Optimization Strategies

1. **Database**
   ```python
   # Add indexes on frequently queried fields
   class Student(Base):
       id = Column(Integer, primary_key=True, index=True)
       email = Column(String(255), index=True)  # ← Index
       student_id = Column(String(50), index=True)  # ← Index
   ```

2. **Caching**
   ```python
   from functools import lru_cache

   @lru_cache(maxsize=128)
   def expensive_operation(param):
       return complex_calculation(param)
   ```

3. **Frontend**
   ```tsx
   // Use React.memo for expensive renders
   export const FeatureCard = React.memo(({ feature }: Props) => (
     <div>{feature.name}</div>
   ));

   // Use useMemo for expensive calculations
   const filteredItems = useMemo(
     () => items.filter(i => i.active),
     [items]
   );
   ```

---

## Troubleshooting

### Tests Failing with Timeout
```bash
# Backend: Check for blocking operations
pytest -q -vv --tb=short tests/test_xyz.py

# Frontend: Check for missing mocks
npm test -- --reporter=verbose src/test.tsx

# Solution: Use vi.mock() or mock HTTP responses
```

### Database Errors
```bash
# Check migrations applied
alembic current

# Verify database URL
echo $DATABASE_URL

# Reset database (dev only!)
rm data/student_management.db
alembic upgrade head

# See SQL queries
export SQLALCHEMY_ECHO=1
```

### Type Errors
```bash
# Frontend
npx tsc --noEmit  # Check TS compilation

# Backend
mypy --config-file=../config/mypy.ini backend/
```

### Hot-reload Not Working
```bash
# Frontend: Restart Vite
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Frontend

# Backend: Restart uvicorn
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Backend
```

---

## Deployment

### Development Environment
```bash
.\NATIVE.ps1 -Start
```

### Staging Environment
```bash
.\DOCKER.ps1 -Start
```

### Production Environment
See `DEPLOYMENT_GUIDE.md` for production deployment.

---

## Resources

- **Architecture:** `docs/development/ARCHITECTURE.md`
- **Git Workflow:** `docs/development/GIT_WORKFLOW.md`
- **API Documentation:** `backend/CONTROL_API.md`
- **Environment Variables:** `backend/ENV_VARS.md`
- **RBAC Guide:** `docs/user/RBAC_GUIDE.md`
- **Localization:** `docs/user/LOCALIZATION.md`

---

## Help & Support

- **Issues:** Check GitHub Issues or `docs/DOCUMENTATION_INDEX.md`
- **Questions:** See `docs/development/AGENT_CONTINUATION_PROTOCOL.md`
- **Code Review:** Follow `docs/development/GIT_WORKFLOW.md` branching strategy
- **Release:** See `QUICK_RELEASE_GUIDE.md` for versioning

---

**Happy coding! 🚀**
