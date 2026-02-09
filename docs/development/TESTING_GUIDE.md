# Testing Guide - Student Management System

**Version**: 1.15.1
**Last Updated**: February 9, 2026
**Status**: Production Ready

This guide covers all testing strategies, tools, and procedures for the Student Management System.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Load Testing](#load-testing)
7. [Running Tests](#running-tests)
8. [Coverage Requirements](#coverage-requirements)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Testing Philosophy

- **Fast**: Unit tests run in seconds
- **Isolated**: Tests don't depend on each other
- **Reliable**: Tests pass consistently
- **Comprehensive**: Cover critical paths and edge cases

### Test Coverage Targets

| Component | Minimum | Target |
|-----------|---------|--------|
| Backend | 75% | 85%+ |
| Frontend | 70% | 80%+ |
| Critical Paths | 95% | 100% |

### Test Types at a Glance

| Type | Purpose | Tool | Speed | Priority |
|------|---------|------|-------|----------|
| **Unit** | Individual function/component | pytest/Vitest | <1s | HIGH |
| **Integration** | Service layer + DB | pytest | 1-5s | HIGH |
| **E2E** | Complete user workflows | Playwright | 5-15m | HIGH |
| **Load** | Performance baselines | k6/Locust | 5-10m | MEDIUM |

---

## Test Types

### Unit Tests

**Purpose**: Test individual functions, components, or utilities in isolation.

**Tools**:
- Backend: `pytest` with `pytest-mock` for mocking
- Frontend: `Vitest` with `@testing-library/react`

**Characteristics**:
- Fast (milliseconds to seconds)
- No external dependencies
- Extensive mocking
- High code coverage

**Example - Backend**:

```python
def test_has_permission_admin_user(db):
    """Test that admin users have all permissions."""
    admin = create_test_admin(db)
    assert has_permission(admin, "students:create")
    assert has_permission(admin, "*:*")

```text
**Example - Frontend**:

```tsx
test('renders button with correct text', () => {
  render(<SubmitButton />);
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
});

```text
---

### Integration Tests

**Purpose**: Test multiple components working together (API + database, services + models).

**Tools**:
- Backend: `pytest` with `TestClient` + test database
- Frontend: `Vitest` with `@testing-library/react` + mock API

**Characteristics**:
- Medium speed (seconds)
- Test actual database operations
- Mock external services
- Cover realistic workflows

**Example - Backend**:

```python
def test_create_student_with_permission(client, admin_headers, db):
    """Test creating student via API with permission check."""
    response = client.post(
        "/api/v1/students/",
        json={"first_name": "John", ...},
        headers=admin_headers
    )
    assert response.status_code == 201
    assert response.json()["data"]["first_name"] == "John"

```text
**Example - Frontend**:

```tsx
test('submits form and shows success message', async () => {
  render(<StudentForm />);
  await userEvent.type(screen.getByLabelText(/name/i), 'John');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(await screen.findByText(/success/i)).toBeInTheDocument();
});

```text
---

### E2E Tests

**Purpose**: Test complete user workflows from UI perspective (login → create → view).

**Tools**:
- `Playwright` (cross-browser testing)
- Supported browsers: Chromium, Firefox, WebKit
- HTML report with screenshots/videos on failure

**Characteristics**:
- Slowest (minutes)
- No mocking - real API calls
- Multi-browser coverage
- Visual regression detection

**Test Inventory** (19/24 critical):
- ✅ Student CRUD (create, read, update, delete)
- ✅ Course management
- ✅ Authentication & navigation
- ✅ Responsive design
- ⏳ Notifications (deferred)

**Example**:

```typescript
test('should create a new student successfully', async ({ page }) => {
  await loginViaAPI(page, ADMIN_CREDENTIALS);
  await page.goto('/students');
  await page.click('button:has-text("New Student")');
  await page.fill('input[name="first_name"]', 'John');
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=John')).toBeVisible();
});

```text
**Reference**: [E2E Testing Guide](../operations/E2E_TESTING_GUIDE.md)

---

### Load Testing

**Purpose**: Establish performance baselines and detect regressions.

**Tools**:
- Primary: `k6` (cloud-native)
- Alternative: `Locust` (Python-based)

**Scenarios**:
- Student list retrieval
- Grade calculation
- Attendance logging
- Login performance
- Analytics queries

**Performance Targets (p95)**:
- Student list: <100ms
- Grades: <200ms
- Attendance: <80ms
- Login: <500ms

**Execution**:

```bash
cd load-testing
k6 run scripts/student_list.js  # Single scenario
k6 run scripts/main_scenario.js --vus 100 --duration 5m  # Load test

```text
**Reference**: `load-testing/README.md`

---

## Unit Testing

### Backend Unit Tests

**Location**: `backend/tests/test_*.py`

**Framework**: pytest with fixtures

**Key Fixtures** (from `conftest.py`):
- `db` - Clean test database per test
- `client` - TestClient for API calls
- `admin_headers` - Auth headers for admin user
- `admin_user` - Pre-created admin user

**Running**:

```powershell
# Single test file

cd backend && pytest tests/test_students.py -v

# Single test

cd backend && pytest tests/test_students.py::test_create_student -v

# With coverage

cd backend && pytest --cov=. --cov-report=html

# Batch runner (REQUIRED for all tests)

.\RUN_TESTS_BATCH.ps1

```text
**Coverage Target**: ≥75% (backend), target 85%+

**Excluded from Coverage**:
- `tests/` directory itself
- Configuration files
- Migration scripts
- CLI utilities

---

### Frontend Unit Tests

**Location**: `frontend/src/**/__tests__/*.test.{ts,tsx}`

**Framework**: Vitest with React Testing Library

**Key Utilities**:
- `renderWithProviders()` - Render with Redux/Query/Router context
- `screen` - Query DOM by accessible queries
- `userEvent` - Simulate user interactions
- `waitFor()` - Wait for async operations

**Running**:

```bash
# All tests

cd frontend && npm test

# Watch mode (development)

cd frontend && npm test -- --watch

# Single file

npm test -- src/features/Students/__tests__/StudentList.test.tsx

# With coverage

npm test -- --coverage

# CI mode (single run)

npm test -- --run

```text
**Coverage Target**: ≥70% (frontend), target 80%+

**Best Practices**:
- Test behavior, not implementation
- Use accessible queries (getByRole, getByLabelText)
- Mock API calls, not internal functions
- Test user workflows, not individual props

---

## Integration Testing

### Backend Integration Tests

**Focus**: API endpoints + business logic + database

**Pattern**:

```python
def test_endpoint_with_auth_and_db(client, admin_headers, db):
    # 1. Set up test data
    student = Student(first_name="John", ...)
    db.add(student)
    db.commit()

    # 2. Call API
    response = client.post("/api/v1/students/", headers=admin_headers)

    # 3. Assert response
    assert response.status_code == 201

    # 4. Assert database state
    assert db.query(Student).count() == 2

```text
**Test Organization**:
- `backend/tests/test_*_router.py` - API endpoint tests
- `backend/tests/test_*_service.py` - Business logic tests
- `backend/tests/test_models.py` - ORM model tests
- `backend/tests/test_rbac*.py` - Permission tests

---

### Frontend Integration Tests

**Focus**: Components + API interactions + state management

**Pattern**:

```tsx
test('StudentForm submits and updates list', async () => {
  const { getByRole, findByText } = render(
    <QueryClientProvider client={queryClient}>
      <StudentList />
    </QueryClientProvider>
  );

  // Submit form
  await userEvent.click(getByRole('button', { name: /new/i }));
  await userEvent.type(getByRole('textbox'), 'John');
  await userEvent.click(getByRole('button', { name: /save/i }));

  // Wait for API call and re-render
  await findByText('John');
});

```text
**Test Organization**:
- `src/features/*/tests/` - Feature-level tests
- `src/components/*/tests/` - Component tests
- `src/api/__tests__/` - API client tests

---

## E2E Testing

### Setup

**Prerequisites**:
- Node.js 18+
- Playwright browsers installed

**Installation**:

```bash
npm install @playwright/test
npx playwright install

```text
### Running E2E Tests

**Locally**:

```bash
# Run all tests

npm run e2e

# Run specific test

npm run e2e -- --grep "should create a student"

# Interactive mode (debug)

npm run e2e -- --ui

# Single browser

npm run e2e -- --project=chromium

```text
**In CI**:

```bash
npm run e2e:ci  # Runs in GitHub Actions environment

```text
### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, ADMIN_CREDENTIALS);
  });

  test('should create and view student', async ({ page }) => {
    await page.goto('/students');
    await page.click('text=New Student');
    // ... test steps
  });
});

```text
### Common Patterns

**Authentication via API**:

```typescript
async function loginViaAPI(page, credentials) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: credentials
  });
  const { access_token } = await response.json();
  await page.context().addCookies([{
    name: 'token',
    value: access_token,
    domain: 'localhost'
  }]);
}

```text
**Wait for API Response**:

```typescript
const responsePromise = page.waitForResponse('/api/v1/students');
await page.click('button:has-text("Save")');
await responsePromise;

```text
**Screenshot on Failure**:

```typescript
test.afterEach(async ({ page }, info) => {
  if (info.status !== 'passed') {
    await page.screenshot({ path: `failure-${Date.now()}.png` });
  }
});

```text
### Monitoring E2E Tests

**Dashboard**: [E2E_CI_MONITORING.md](../operations/E2E_CI_MONITORING.md)

**Metrics Tracked**:
- Success rate (target: 95%+)
- Duration trends
- Flakiness detection
- Browser coverage

**Reference**: [E2E Testing Guide](../operations/E2E_TESTING_GUIDE.md)

---

## Load Testing

### Setup

**k6 Installation**:

```bash
# Windows

choco install k6

# macOS

brew install k6

# Linux

apt install k6

```text
### Running Load Tests

**Single Scenario**:

```bash
cd load-testing
k6 run scripts/student_list.js

```text
**Full Load Test**:

```bash
k6 run scripts/main_scenario.js \
  --vus 100 \
  --duration 5m \
  --ramp-up 30s \
  --ramp-down 30s

```text
**With Output**:

```bash
k6 run scripts/main_scenario.js --out json=results.json

```text
### Performance Baselines

**Established Baselines** (1.15.2):

```json
{
  "student_list": {
    "p50": "40ms",
    "p95": "100ms",
    "p99": "150ms",
    "throughput": "600 req/s"
  },
  "grades_calculate": {
    "p50": "80ms",
    "p95": "200ms",
    "p99": "300ms"
  }
}

```text
### Regression Detection

**Automated Check**:

```bash
python load-testing/scripts/check_regression.py results.json

```text
**Thresholds**:
- Fail if p95 increases >20% from baseline
- Fail if error rate increases >50%
- Fail if throughput decreases >15%

**Reference**: `load-testing/docs/baseline_performance.md`

---

## Running Tests

### Quick Reference

| Task | Command | Time |
|------|---------|------|
| Backend unit tests | `.\RUN_TESTS_BATCH.ps1` | 2-3m |
| Frontend tests | `npm --prefix frontend run test -- --run` | 2-3m |
| E2E tests | `npm --prefix frontend run e2e` | 10-15m |
| Load tests | `cd load-testing && k6 run scripts/main_scenario.js` | 5m |
| Pre-commit check | `.\COMMIT_READY.ps1 -Quick` | 2-3m |
| Full validation | `.\COMMIT_READY.ps1 -Full` | 15-20m |

### Running All Tests Safely

**❌ NEVER do this** (crashes VS Code):

```powershell
cd backend && pytest -q

```text
**✅ ALWAYS do this**:

```powershell
.\RUN_TESTS_BATCH.ps1              # Backend tests (batched)
npm --prefix frontend run test -- --run  # Frontend tests
npm --prefix frontend run e2e      # E2E tests

```text
### Frontend Test Log Noise (DEBUG_TEST_LOGS)

Frontend tests suppress console output by default to keep CI and local runs readable.
To re-enable full logging for debugging, set the environment variable:

```powershell
$env:DEBUG_TEST_LOGS=1
npm --prefix frontend run test -- --run

```text
When `DEBUG_TEST_LOGS` is set, all console output (warn/error/info/log) is shown.

### Test Execution in CI

**Automatic on every push to main**:
1. Backend tests (batched, 370+ tests)
2. Frontend tests (1,249+ tests)
3. Linting & type checking
4. Security scans
5. E2E tests (Playwright)
6. Deploy to staging

**Coverage Summary**:
- Shown in workflow job summary
- Available as artifacts (HTML/XML)
- Minimum thresholds enforced via `codecov.yml`

---

## Coverage Requirements

### Minimum Thresholds

Enforced via `codecov.yml`:

```yaml
coverage:
  status:
    project:
      backend:
        target: 75%
        threshold: 2%  # Allow 2% drop
      frontend:
        target: 70%
        threshold: 2%
    patch:
      default:
        target: 75%
        threshold: 2%

```text
### Viewing Coverage

**Backend**:

```bash
cd backend
pytest --cov=. --cov-report=html
open htmlcov/index.html

```text
**Frontend**:

```bash
cd frontend
npm test -- --coverage
open coverage/index.html

```text
**CI Artifacts**:
- Coverage reports saved to GitHub Actions artifacts
- Job summary shows coverage percentages
- Available for download for 30 days

### Coverage Exclusions

Files excluded from coverage requirements:
- Test files themselves (`tests/`, `__tests__/`)
- Configuration files (config.py, setup.py)
- Migration scripts (alembic/)
- CLI utilities
- Type stubs

---

## Best Practices

### Write Testable Code

**✅ Good**:

```python
def calculate_grade(scores: List[float]) -> float:
    """Pure function, easy to test."""
    return sum(scores) / len(scores) if scores else 0.0

@router.post("/grades/")
def create_grade(data: GradeCreate, user = Depends(get_current_user)):
    """Call pure function from endpoint."""
    grade = Grade(average=calculate_grade(data.scores))
    return grade

```text
**❌ Poor**:

```python
@router.post("/grades/")
async def create_grade(data: GradeCreate):
    # Complex logic mixed with HTTP handling
    scores = [s for s in data.scores if s > 0]
    average = sum(scores) / len(scores)
    db.add(Grade(average=average))
    db.commit()
    return Grade

```text
### Naming Conventions

**Test Names**: `test_<function>_<scenario>_<expected>`

```python
# ✅ Good

def test_create_student_with_valid_data_returns_201():
def test_create_student_without_permission_returns_403():
def test_calculate_grade_with_empty_scores_returns_zero():

# ❌ Poor

def test_student():
def test_1():
def test_create():

```text
### Organization

```text
backend/tests/
├── test_students.py          # Related tests grouped
├── test_grades.py
├── test_permissions.py
├── test_rbac.py
├── fixtures/                 # Shared test data
│   └── sample_data.py
└── conftest.py              # Shared fixtures

```text
### Mocking Strategy

**✅ Mock external services**:

```python
@patch('backend.services.email.send_email')
def test_creates_student_and_sends_email(mock_email):
    # Test only our logic, mock email service
    create_student(...)
    mock_email.assert_called_once()

```text
**✅ Use real database**:

```python
def test_student_soft_delete(db):
    # Use real SQLAlchemy/DB for complex queries
    student = Student(name="John")
    db.add(student)
    db.commit()

    student.soft_delete()
    # Test actual DB behavior

```text
### Parametrized Tests

```python
@pytest.mark.parametrize("role,allowed", [
    ("admin", True),
    ("teacher", False),
    ("student", False),
])
def test_create_student_permission(role, allowed, db, client):
    # Run same test with different inputs
    user = create_user(role=role, db=db)
    response = client.post("/api/v1/students/", headers=auth(user))
    assert (response.status_code == 201) == allowed

```text
---

## Troubleshooting

### Backend Test Crashes

**Symptom**: "Direct pytest execution is disabled"

**Solution**:

```powershell
# ❌ WRONG

cd backend && pytest -q

# ✅ CORRECT

.\RUN_TESTS_BATCH.ps1

```text
### Tests Pass Locally, Fail in CI

**Common Causes**:
1. **Timing issues**: Use `waitFor()` for async operations
2. **Environment differences**: Check env vars (AUTH_MODE, VITE_API_URL)
3. **Port conflicts**: E2E tests need port 5173/8000 free
4. **Stale data**: Tests should be isolated with clean database

**Solutions**:

```python
# ✅ Wait for database change

def test_creates_student(client, admin_headers, db):
    response = client.post("/api/v1/students/", ...)
    assert response.status_code == 201
    # Verify in database
    assert db.query(Student).filter_by(name="John").first()

```text
### E2E Flakiness

**Symptoms**: Tests pass randomly, fail on re-run

**Solutions**:

```typescript
// ✅ Wait for element instead of fixed delay
await expect(page.locator('text=Success')).toBeVisible();

// ❌ AVOID
await page.waitForTimeout(2000);

// ✅ Wait for response
const response = page.waitForResponse('/api/v1/students');
await page.click('button');
await response;

// ✅ Retry flaky selectors
const button = await page.locator('button:has-text("Save")').or(
  page.locator('button[aria-label="Save"]')
);

```text
### Coverage Not Updating

**Symptom**: Coverage stays at same % despite code changes

**Solution**:

```bash
# Clear coverage cache

rm -rf .coverage htmlcov coverage/

# Regenerate

pytest --cov=. --cov-report=html
npm test -- --coverage

```text
### Load Test Connection Errors

**Symptom**: "Connection refused" running load tests

**Solution**:

```bash
# 1. Start the application

.\DOCKER.ps1 -Start

# 2. Wait for startup (20s)

Start-Sleep -Seconds 20

# 3. Run load test

cd load-testing && k6 run scripts/main_scenario.js

```text
---

## Resources

### Documentation

- [E2E Testing Guide](../operations/E2E_TESTING_GUIDE.md) - Detailed E2E procedures
- [E2E CI Monitoring](../operations/E2E_CI_MONITORING.md) - Monitoring dashboard
- [Load Testing](../../load-testing/README.md) - Performance testing
- [Database Migration](../operations/DATABASE_MIGRATION_GUIDE.md) - Database setup

### Tools & Links

- pytest: https://pytest.org
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev
- k6: https://k6.io

### CI/CD

- Main CI: `.github/workflows/ci-cd-pipeline.yml`
- E2E CI: `.github/workflows/e2e-tests.yml`
- Batch Runner: `RUN_TESTS_BATCH.ps1`
- Pre-commit: `COMMIT_READY.ps1`

---

**Last Updated**: February 9, 2026
**Author**: Solo Developer + AI Agent
**Status**: Production Ready
