# Complete Developer Guide - Student Management System

**Version:** 1.17.1
**Last Updated:** December 30, 2025
**Status:** ✅ Active

---

## 📋 Table of Contents

1. [Quick Start for Developers](#quick-start-for-developers)
2. [System Architecture](#system-architecture)
3. [Development Environment Setup](#development-environment-setup)
4. [Code Structure](#code-structure)
5. [Backend Development](#backend-development)
6. [Frontend Development](#frontend-development)
7. [Database & Migrations](#database--migrations)
8. [Authentication & Security](#authentication--security)
9. [API Development](#api-development)
10. [Testing](#testing)
11. [Performance Optimization](#performance-optimization)
12. [Contributing Guidelines](#contributing-guidelines)

---

## Quick Start for Developers

### Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **Docker** (optional, for containerized development)
- **Git** (version control)
- **VS Code** (recommended IDE) or PyCharm

### 5-Minute Setup

```powershell
# Clone repository
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd student-management-system

# Native development setup (hot-reload enabled)
.\NATIVE.ps1 -Setup    # Install all dependencies
.\NATIVE.ps1 -Start    # Start backend + frontend

# Access points:
# - Frontend: http://localhost:5173 (Vite HMR)
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### First Tasks Checklist

- [ ] Set up development environment
- [ ] Run backend tests: `cd backend && pytest -v`
- [ ] Run frontend dev server: `cd frontend && npm run dev`
- [ ] Review [ARCHITECTURE.md](../ARCHITECTURE.md)
- [ ] Read [CODE_STRUCTURE.md](CODE_STRUCTURE.md)
- [ ] Check [TODO.md](../../TODO.md) for tasks
- [ ] Join development discussions on GitHub

---

## System Architecture

### High-Level Overview

```text
┌──────────────────────────────────────────────────────────┐
│                   Client Browser                          │
│              (React 18 + TanStack Query)                  │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTP/REST API
                     ↓
┌──────────────────────────────────────────────────────────┐
│                 FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Routers (API Endpoints)                           │  │
│  └──────────────┬─────────────────────────────────────┘  │
│                 ↓                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Services (Business Logic)                         │  │
│  └──────────────┬─────────────────────────────────────┘  │
│                 ↓                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Models (SQLAlchemy ORM)                           │  │
│  └──────────────┬─────────────────────────────────────┘  │
└─────────────────┼─────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────────┐
│              SQLite / PostgreSQL Database                 │
└──────────────────────────────────────────────────────────┘
```

### Deployment Modes

| Mode | Description | Use Case | Ports |
|------|-------------|----------|-------|
| **Docker** | Single container (FastAPI serves built React SPA) | Production, consistent environment | 8080 |
| **Native** | Backend + Frontend separate processes | Development, hot reload | 8000 + 5173 |

**Key Features:**

- **Dual Deployment**: Docker for production, Native for development
- **Hot Reload**: Uvicorn (backend) + Vite HMR (frontend)
- **Auto-Migrations**: Alembic runs on startup via FastAPI lifespan
- **SQLAlchemy 2.0**: Modern async ORM with type hints

See: [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed architecture

---

## Development Environment Setup

### Backend Setup (Python)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development tools

# Create environment file
cp .env.example .env
# Edit .env with your settings

# Initialize database
alembic upgrade head

# Run development server (with auto-reload)
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit VITE_API_URL if needed

# Run development server (HMR enabled)
npm run dev

# Access: http://localhost:5173
```

### Docker Development

```powershell
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Stop
docker-compose down
```

### IDE Configuration

**VS Code Extensions (Recommended):**

- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Docker (ms-azuretools.vscode-docker)
- Thunder Client (REST API testing)

**VS Code Settings (.vscode/settings.json):**

```json
{
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Code Structure

### Backend Structure

```text
backend/
├── routers/              # API endpoints (route handlers)
│   ├── routers_students.py
│   ├── routers_courses.py
│   ├── routers_grades.py
│   ├── routers_attendance.py
│   └── routers_auth.py
├── services/             # Business logic layer
│   ├── student_service.py
│   ├── course_service.py
│   └── grade_service.py
├── models.py             # SQLAlchemy ORM models
├── schemas/              # Pydantic schemas (validation)
│   ├── __init__.py      # Re-exports all schemas
│   ├── student.py
│   ├── course.py
│   └── grade.py
├── security/             # Authentication & authorization
│   ├── auth.py          # JWT token handling
│   ├── dependencies.py   # Auth dependencies
│   └── password.py      # Password hashing
├── middleware/           # Request/response middleware
│   ├── request_id.py    # Request ID tracking
│   └── error_handler.py # Global error handling
├── database.py           # Database connection & session
├── rate_limiting.py      # Rate limiting configuration
├── main.py              # FastAPI app & lifespan management
├── run_migrations.py    # Alembic migration runner
└── tests/               # Backend tests
    ├── conftest.py      # Pytest fixtures
    ├── test_students_router.py
    └── test_grades_calculation.py
```

### Frontend Structure

```text
frontend/
├── src/
│   ├── api/              # API client & interceptors
│   │   ├── api.js       # Axios client configuration
│   │   └── endpoints/   # API endpoint definitions
│   ├── components/       # Reusable UI components
│   │   ├── common/      # Generic components (Button, Modal, etc.)
│   │   ├── layout/      # Layout components (Navbar, Sidebar)
│   │   └── forms/       # Form components
│   ├── features/         # Feature-specific modules
│   │   ├── students/    # Student management
│   │   ├── courses/     # Course management
│   │   ├── grades/      # Grade management
│   │   └── auth/        # Authentication UI
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useStudents.js
│   │   └── useCourses.js
│   ├── stores/           # Zustand state management
│   │   ├── authStore.js
│   │   └── themeStore.js
│   ├── utils/            # Utility functions
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── translations.js   # i18n translations (EN/EL)
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles (Tailwind)
└── tests/
    └── e2e/             # Playwright E2E tests
        ├── auth.spec.ts
        └── students.spec.ts
```

---

## Backend Development

### Creating a New Endpoint

**1. Define Pydantic Schema (`backend/schemas/example.py`):**

```python
from pydantic import BaseModel, Field

class ExampleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: int = Field(..., ge=0)

class ExampleResponse(BaseModel):
    id: int
    name: str
    value: int

    class Config:
        from_attributes = True  # SQLAlchemy 2.0 compatibility
```

**2. Export Schema (`backend/schemas/__init__.py`):**

```python
from .example import ExampleCreate, ExampleResponse
```

**3. Create Router (`backend/routers/routers_example.py`):**

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE
from backend.schemas import ExampleCreate, ExampleResponse
from backend.models import Example

router = APIRouter(prefix="/examples", tags=["examples"])

@router.post("/", response_model=ExampleResponse)
@limiter.limit(RATE_LIMIT_WRITE)  # configured via backend.rate_limiting.RATE_LIMIT_WRITE
async def create_example(
    example: ExampleCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new example item."""
    db_example = Example(**example.model_dump())
    db.add(db_example)
    db.commit()
    db.refresh(db_example)
    return db_example

@router.get("/{example_id}", response_model=ExampleResponse)
@limiter.limit(RATE_LIMIT_READ)  # configured via backend.rate_limiting.RATE_LIMIT_READ
async def get_example(
    example_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get example by ID."""
    example = db.query(Example).filter(Example.id == example_id).first()
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    return example
```

**4. Register Router (`backend/main.py`):**

```python
from backend.routers import routers_example

def register_routers(app: FastAPI):
    # ... existing routers ...
    app.include_router(routers_example.router, prefix="/api/v1")
```

### Critical Backend Patterns

#### ❌ Wrong: Direct require_role for Admin Endpoints

```python
# BYPASSES AUTH_MODE - Never use for admin endpoints
@router.get("/admin/users")
async def list_users(
    current_admin: Any = Depends(require_role("admin"))
):
    pass
```

#### ✅ Correct: optional_require_role for Admin Endpoints

```python
# RESPECTS AUTH_MODE - Always use for admin endpoints
@router.get("/admin/users")
async def list_users(
    current_admin: Any = Depends(optional_require_role("admin"))
):
    pass
```

**AUTH_MODE Behavior:**

- `disabled`: No authentication (emergency access)
- `permissive`: Authentication optional (recommended)
- `strict`: Full authentication required

See: [AUTHENTICATION.md](AUTHENTICATION.md) for complete auth guide

### Database Models

**Example Model (`backend/models.py`):**

```python
from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.database import Base

class Example(Base):
    __tablename__ = "examples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    value = Column(Integer, nullable=False, default=0)

    # Foreign key relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    user = relationship("User", back_populates="examples")

    # Index for frequent queries
    __table_args__ = (
        Index("idx_example_name", "name"),
        Index("idx_example_user", "user_id"),
    )
```

**Critical Rules:**

- Always use `ondelete="CASCADE"` for foreign keys
- Index frequently queried fields
- Use `back_populates` for bidirectional relationships
- Add `nullable=False` for required fields

---

## Frontend Development

### Creating a New Feature Component

**1. Create Component (`frontend/src/features/example/ExampleList.jsx`):**

```jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/api';

export const ExampleList = () => {
  const { t } = useTranslation();

  const { data: examples, isLoading, error } = useQuery({
    queryKey: ['examples'],
    queryFn: () => apiClient.get('/examples').then(res => res.data),
  });

  if (isLoading) return <div>{t('common.loading')}</div>;
  if (error) return <div>{t('common.error')}: {error.message}</div>;

  return (
    <div className="example-list">
      <h2 className="text-2xl font-bold mb-4">{t('example.title')}</h2>
      <ul className="space-y-2">
        {examples.map(example => (
          <li key={example.id} className="p-4 border rounded">
            {example.name}: {example.value}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**2. Add Translations (`frontend/src/translations.js`):**

```javascript
export const translations = {
  en: {
    example: {
      title: 'Example List',
      create: 'Create Example',
    },
  },
  el: {
    example: {
      title: 'Λίστα Παραδειγμάτων',
      create: 'Δημιουργία Παραδείγματος',
    },
  },
};
```

**3. Critical Frontend Patterns:**

#### ❌ Wrong: Hardcoded Strings

```jsx
<button>Save</button>  // Never hardcode UI text!
```

#### ✅ Correct: Use i18n

```jsx
const { t } = useTranslation();
<button>{t('common.save')}</button>
```

#### ❌ Wrong: Direct Axios Calls

```jsx
axios.get('http://localhost:8000/api/v1/students')  // Hardcoded URL
```

#### ✅ Correct: Use API Client

```jsx
import { apiClient } from '../api/api';
apiClient.get('/students')  // Configured client
```

### State Management with Zustand

```javascript
// frontend/src/stores/exampleStore.js
import { create } from 'zustand';

export const useExampleStore = create((set) => ({
  examples: [],
  selectedExample: null,

  setExamples: (examples) => set({ examples }),
  selectExample: (example) => set({ selectedExample: example }),
  clearSelection: () => set({ selectedExample: null }),
}));
```

### Custom Hooks

```javascript
// frontend/src/hooks/useExamples.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api';

export const useExamples = () => {
  const queryClient = useQueryClient();

  const { data: examples, isLoading } = useQuery({
    queryKey: ['examples'],
    queryFn: () => apiClient.get('/examples').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (newExample) => apiClient.post('/examples', newExample),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });

  return {
    examples,
    isLoading,
    createExample: createMutation.mutate,
  };
};
```

---

## Database & Migrations

### Creating Migrations

```bash
cd backend

# Create new migration (auto-detects model changes)
alembic revision --autogenerate -m "Add example table"

# Review generated migration file in backend/alembic/versions/

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Migration Best Practices

1. **Always review auto-generated migrations** before applying
2. **Test migrations on copy of production data** before deploying
3. **Add data migrations** in separate revision if needed
4. **Never edit applied migrations** - create new one instead
5. **Backup database** before running migrations in production

### Manual Migration Example

```python
# backend/alembic/versions/xxxx_add_column.py
def upgrade():
    # Add column
    op.add_column('students', sa.Column('middle_name', sa.String(50)))

    # Create index
    op.create_index('idx_student_middle_name', 'students', ['middle_name'])

    # Data migration
    connection = op.get_bind()
    connection.execute(
        "UPDATE students SET middle_name = '' WHERE middle_name IS NULL"
    )

def downgrade():
    op.drop_index('idx_student_middle_name')
    op.drop_column('students', 'middle_name')
```

### Database Version Mismatch

**Problem:** Native and Docker use different DB versions

**Solution:**

```powershell
# Check version mismatch
.\scripts\CHECK_VOLUME_VERSION.ps1

# Auto-migrate Docker volume
.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate
```

---

## Authentication & Security

### JWT Token Flow

```text
1. User Login (POST /auth/login)
   ↓
2. Server validates credentials
   ↓
3. Server generates access_token (15 min) + refresh_token (7 days)
   ↓
4. Client stores tokens (httpOnly cookies)
   ↓
5. Client sends access_token with each request (Authorization header)
   ↓
6. Server validates token on each request
   ↓
7. Token expired? Use refresh_token (POST /auth/refresh)
   ↓
8. New access_token issued
```

### Implementing Protected Endpoints

```python
from backend.security.dependencies import require_role, optional_require_role

# Public endpoint (no auth)
@router.get("/public/data")
async def public_data():
    return {"data": "public"}

# Protected endpoint (any authenticated user)
@router.get("/protected/data")
async def protected_data(current_user: User = Depends(require_role())):
    return {"user_id": current_user.id}

# Role-specific endpoint (respects AUTH_MODE)
@router.get("/admin/data")
async def admin_data(current_admin: Any = Depends(optional_require_role("admin"))):
    return {"admin": True}
```

### Security Checklist

- [ ] All admin endpoints use `optional_require_role("admin")`
- [ ] Sensitive operations use `require_role()` or role-specific decorator
- [ ] Rate limiting applied to all endpoints
- [ ] Input validation with Pydantic schemas
- [ ] SQL injection prevented (using SQLAlchemy ORM)
- [ ] XSS prevented (React auto-escapes)
- [ ] CSRF protection enabled in production
- [ ] HTTPS enforced in production
- [ ] SECRET_KEY is strong (64+ characters)
- [ ] Passwords hashed with bcrypt
- [ ] Token expiration configured properly

See: [AUTHENTICATION.md](AUTHENTICATION.md) for complete auth implementation

---

## API Development

### API Versioning

All endpoints are versioned under `/api/v1/`:

```python
# backend/main.py
app.include_router(students_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
```

**Future versions:**

- `/api/v2/` - Breaking changes
- `/api/v1/` - Maintained for backward compatibility

### Rate Limiting

```python
from backend.rate_limiting import limiter, RATE_LIMIT_WRITE, RATE_LIMIT_READ

# Write operations: configured via backend.rate_limiting.RATE_LIMIT_WRITE (defaults shown for high-throughput environments)
@router.post("/items")
@limiter.limit(RATE_LIMIT_WRITE)
async def create_item(request: Request, ...):
    pass

# Read operations: configured via backend.rate_limiting.RATE_LIMIT_READ
@router.get("/items")
@limiter.limit(RATE_LIMIT_READ)
async def list_items(request: Request, ...):
    pass

# Heavy operations: configured via backend.rate_limiting.RATE_LIMIT_HEAVY
@router.post("/bulk-import")
@limiter.limit(RATE_LIMIT_HEAVY)
async def bulk_import(request: Request, ...):
    pass
```

### Error Handling

```python
from fastapi import HTTPException, status

# Standard error responses
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Student not found"
)

raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid email format"
)

raise HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Email already exists"
)
```

### Pagination

```python
from typing import List
from fastapi import Query

@router.get("/students", response_model=List[StudentResponse])
async def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    students = db.query(Student).offset(skip).limit(limit).all()
    return students
```

### API Documentation

**Access Swagger UI:** [Swagger UI](http://localhost:8000/docs)
**Access ReDoc:** [ReDoc](http://localhost:8000/redoc)

**Document Endpoint:**

```python
@router.post(
    "/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student",
    description="Creates a new student record with the provided information.",
    responses={
        201: {"description": "Student created successfully"},
        400: {"description": "Invalid input data"},
        409: {"description": "Email already exists"},
    }
)
async def create_student(student: StudentCreate, ...):
    """
    Create a new student with the following information:

    - **first_name**: Student's first name (required)
    - **last_name**: Student's last name (required)
    - **email**: Unique email address (required)
    - **student_id**: Optional student ID (auto-generated if not provided)
    """
    pass
```

See: [API_EXAMPLES.md](API_EXAMPLES.md) for common API patterns

---

## Testing

### Backend Testing (Pytest)

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_students_router.py

# Run with coverage
pytest --cov=backend --cov-report=html
# View: htmlcov/index.html

# Run tests matching pattern
pytest -k "test_create"

# Stop on first failure
pytest -x
```

### Writing Backend Tests

```python
# backend/tests/test_example.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_create_example():
    response = client.post(
        "/api/v1/examples/",
        json={"name": "Test", "value": 42}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test"
    assert data["value"] == 42
    assert "id" in data

def test_get_example_not_found():
    response = client.get("/api/v1/examples/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Example not found"
```

### Frontend Testing (Playwright E2E)

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npx playwright test --ui

# Run specific test
npx playwright test tests/e2e/students.spec.ts

# Debug test
npx playwright test --debug
```

### Writing E2E Tests

```typescript
// frontend/tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('create example item', async ({ page }) => {
  // Navigate to page
  await page.goto('http://localhost:5173/examples');

  // Click create button
  await page.click('button:has-text("Create Example")');

  // Fill form
  await page.fill('input[name="name"]', 'Test Example');
  await page.fill('input[name="value"]', '42');

  // Submit
  await page.click('button:has-text("Save")');

  // Verify success message
  await expect(page.locator('.success-message')).toContainText('Created successfully');

  // Verify item appears in list
  await expect(page.locator('.example-list')).toContainText('Test Example');
});
```

### Test Coverage Goals

- **Backend**: > 80% code coverage
- **Frontend E2E**: Critical user flows covered
- **Integration**: All API endpoints tested

---

## Performance Optimization

### Recent Optimizations ($11.9.7+)

**Database Indexing (+40% query speed):**

- Indexed `students.email`, `courses.course_code`
- Indexed `grades.student_id`, `grades.course_id`
- Indexed `attendance.date`, `attendance.course_id`

**Response Caching (+70% faster):**

```python
from backend.caching import cache_response

@router.get("/students")
@cache_response(ttl=300)  # 5-minute cache
async def list_students(...):
    pass
```

**N+1 Query Fixes (100x reduction):**

```python
# ❌ Wrong: N+1 queries
students = db.query(Student).all()
for student in students:
    courses = student.courses  # Separate query per student

# ✅ Correct: Single query with join
students = db.query(Student).options(
    joinedload(Student.courses)
).all()
```

**React Optimization (+60-70% render speed):**

```jsx
// ❌ Wrong: Inline object creation causes re-renders
<Component config={{ key: 'value' }} />

// ✅ Correct: Memoized object
const config = useMemo(() => ({ key: 'value' }), []);
<Component config={config} />

// ✅ Correct: React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // ...
});
```

### Performance Monitoring

**Backend:**

```python
import time
import logging

logger = logging.getLogger(__name__)

async def slow_operation():
    start = time.time()
    # ... operation ...
    duration = time.time() - start
    if duration > 0.3:  # 300ms threshold
        logger.warning(f"Slow operation: {duration:.2f}s")
```

**Frontend:**

```javascript
// Use React DevTools Profiler
// Monitor bundle size with Vite build analysis
npm run build
npx vite-bundle-visualizer
```

See: [Performance Optimizations Guide](../../PERFORMANCE_OPTIMIZATIONS_2025-01-10.md)

---

## Contributing Guidelines

### Git Workflow

1. **Fork repository** (external contributors)
2. **Create feature branch** from `main`

   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make changes** with descriptive commits
4. **Run tests** locally

    ```bash
    # Backend
    cd backend && pytest

    # Frontend
    cd frontend && npm run test:e2e
    ```

5. **Push and create Pull Request**
6. **CI runs automated tests**
7. **Code review and merge**

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```python
feat(students): add bulk import feature
fix(auth): correct token refresh logic
docs(readme): update installation instructions
test(grades): add calculation tests
refactor(api): simplify error handling
perf(database): add indexes to improve queries
chore(deps): update dependencies
```

**Structure:**

```html
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance

### Code Style

**Python (Backend):**

- Follow PEP 8
- Use type hints
- Use Ruff for linting/formatting
- Maximum line length: 100 characters
- Docstrings: Google style

**JavaScript/React (Frontend):**

- Follow Airbnb style guide
- Use ESLint + Prettier
- Functional components with hooks
- PropTypes or TypeScript for type checking

**Pre-commit Hooks:**

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] No merge conflicts with `main`
- [ ] PR description explains changes
- [ ] Screenshots included (for UI changes)

### Getting Help

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Report bugs, request features
- **Documentation**: Check docs/ for guides
- **Code Comments**: Read inline comments in complex code

---

## Appendix

### Useful Commands

**Backend:**

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Type check
mypy backend/

# Run specific test class
pytest tests/test_students_router.py::TestStudentRouter

# Generate migration
alembic revision --autogenerate -m "description"
```

**Frontend:**

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check (if using TypeScript)
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

**Docker:**

```bash
# Rebuild specific service
docker-compose up -d --build backend

# View logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend bash

# Clean rebuild
docker-compose down -v
docker-compose up -d --build
```

### Resources

**Documentation:**

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Playwright Docs](https://playwright.dev/)
- [Alembic Docs](https://alembic.sqlalchemy.org/)

**Internal Guides:**

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
- [AUTHENTICATION.md](AUTHENTICATION.md) - Auth implementation
- [API_EXAMPLES.md](API_EXAMPLES.md) - API patterns
- [DEVELOPER_FAST_START.md](DEVELOPER_FAST_START.md) - Quick setup

**Project Management:**

- [TODO.md](../../TODO.md) - Current tasks
- [CHANGELOG.md](../../CHANGELOG.md) - Version history
- [GitHub Issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues) - Bug tracking

---

**Document Version:** 1.0
**Last Updated:** November 22, 2025
**Maintained By:** SMS Development Team
**Feedback:** Create issue with label `documentation`
