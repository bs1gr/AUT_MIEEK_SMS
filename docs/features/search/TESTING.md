# Advanced Search & Filtering - Testing Guide

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Total Tests**: 422+ (Backend: 208, Frontend: 214)
**Last Updated**: January 17, 2026

## Overview

Complete testing guide for Feature #128, covering all test types, execution procedures, and quality metrics.

## Test Suite Summary

### Backend Tests (208 total)

| Test Type | Count | Status | Command |
|-----------|-------|--------|---------|
| Unit Tests | 33 | ✅ Ready | pytest tests/test_search_service.py |
| API Endpoint Tests | 95 | ✅ Ready | pytest tests/test_search_api_endpoints.py |
| Integration Tests | 80 | ✅ Ready | pytest tests/test_search_integration.py |
| **Total Backend** | **208** | **✅** | **pytest tests/test_search_*.py** |

### Frontend Tests (214 total)

| Test Type | Count | Status | Command |
|-----------|-------|--------|---------|
| Hook Tests | 20 | ✅ Ready | vitest src/hooks/__tests__/useSearch.test.ts |
| Component Tests | 114 | ✅ Ready | vitest src/components/__tests__/SearchBar.test.tsx (+ 3 more) |
| E2E Tests | 80 | ✅ Ready | playwright tests/e2e/advanced_search.spec.ts |
| **Total Frontend** | **214** | **✅** | **npm run test -- --run** |

### Grand Total: 422+ Tests

---

## Part 1: Running Tests

### Quick Test (Backend Only)

```bash
cd backend
pytest tests/test_search_service.py -v
```

**Expected Output**:
```
tests/test_search_service.py::test_search_students PASSED
tests/test_search_service.py::test_search_students_with_filters PASSED
... (33 tests total)

====== 33 passed in 2.45s ======
```

### Quick Test (Frontend Only)

```bash
cd frontend
npm run test -- --run src/hooks/__tests__/useSearch.test.ts
```

**Expected Output**:
```
 ✓ src/hooks/__tests__/useSearch.test.ts (20)

Test Files  1 passed (1)
     Tests  20 passed (20)
```

### Complete Backend Test Suite

```bash
cd backend

# Run all search tests
pytest tests/test_search_*.py -v

# Or run with coverage
pytest tests/test_search_*.py --cov=backend.services.search_service --cov-report=html

# Or run with output
pytest tests/test_search_*.py -v --tb=short
```

**Duration**: ~5-10 minutes
**Expected**: 208 tests passing

### Complete Frontend Test Suite

```bash
cd frontend

# Run all component tests
npm run test -- --run

# Or run with coverage
npm run test -- --run --coverage

# Or run watch mode (for development)
npm run test
```

**Duration**: ~3-5 minutes
**Expected**: 214 tests passing

### Complete E2E Test Suite

```bash
cd frontend

# Run E2E tests (Playwright)
npm run e2e

# Or with specific browser
npx playwright test tests/e2e/advanced_search.spec.ts --project=chromium

# Or run with headed browser (see what's happening)
npx playwright test tests/e2e/advanced_search.spec.ts --headed
```

**Duration**: ~10-15 minutes
**Expected**: 80 tests passing

### Run All Tests (Complete Suite)

```bash
# Terminal 1: Backend tests
cd backend
pytest tests/test_search_*.py -v --tb=short

# Terminal 2: Frontend tests
cd frontend
npm run test -- --run

# Terminal 3: E2E tests
cd frontend
npm run e2e

# Or use batch runner
./RUN_TESTS_BATCH.ps1
```

**Total Duration**: ~20-30 minutes
**Expected**: 422+ tests passing

---

## Part 2: Test Coverage

### Backend Coverage

```bash
cd backend

# Generate coverage report
pytest tests/test_search_*.py \
  --cov=backend.services.search_service \
  --cov=backend.routers.routers_search \
  --cov-report=html \
  --cov-report=term

# Open HTML report
start htmlcov/index.html  # Windows
# or open htmlcov/index.html  # Mac/Linux
```

**Expected Coverage**:
- `search_service.py`: >95%
- `routers_search.py`: >90%
- Overall: >92%

### Frontend Coverage

```bash
cd frontend

# Generate coverage report
npm run test -- --run --coverage

# Open coverage report
start coverage/index.html  # Windows
# or open coverage/index.html  # Mac/Linux
```

**Expected Coverage**:
- Hooks: >90%
- Components: >85%
- Overall: >88%

---

## Part 3: Writing New Tests

### Adding Backend Unit Test

```python
# backend/tests/test_search_service.py

import pytest
from backend.services.search_service import SearchService
from backend.models import Student, Course, Grade

class TestNewFeature:
    """Tests for new search feature"""

    def test_new_search_functionality(self, search_service, session):
        """Test new search functionality"""
        # Arrange
        student = Student(first_name='Alice', email='alice@example.com')
        session.add(student)
        session.commit()

        # Act
        results = search_service.search_students('Alice')

        # Assert
        assert len(results) == 1
        assert results[0].first_name == 'Alice'
```

### Adding Frontend Component Test

```typescript
// frontend/src/components/__tests__/MyComponent.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render search results', async () => {
    // Arrange
    render(<MyComponent />);
    const input = screen.getByPlaceholderText('Search...');

    // Act
    await userEvent.type(input, 'Alice');

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });
});
```

### Adding E2E Test

```typescript
// frontend/tests/e2e/my_feature.spec.ts

import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should complete workflow', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:5173');

    // Act
    await page.fill('[placeholder="Search"]', 'Alice');
    await page.click('button:has-text("Search")');

    // Assert
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
  });
});
```

---

## Part 4: Test Organization

### Backend Test Files

```
backend/tests/
├── test_search_service.py          # 33 unit tests
├── test_search_api_endpoints.py    # 95 endpoint tests
├── test_search_integration.py      # 80 integration tests
└── conftest.py                     # Shared fixtures
```

**Fixtures in conftest.py**:
```python
@pytest.fixture
def search_service(session):
    """Provide SearchService instance"""
    return SearchService(session)

@pytest.fixture
def admin_headers():
    """Provide admin auth headers"""
    return {'Authorization': f'Bearer {admin_token}'}

@pytest.fixture
def student_user(session):
    """Create test student"""
    return session.add(Student(...))
```

### Frontend Test Files

```
frontend/src/
├── hooks/__tests__/
│   └── useSearch.test.ts                    # 20 tests
├── components/__tests__/
│   ├── SearchBar.test.tsx                   # 21 tests
│   ├── SearchResults.test.tsx               # 26 tests
│   ├── AdvancedFilters.test.tsx             # 31 tests
│   └── SavedSearches.test.tsx               # 36 tests
└── tests/e2e/
    └── advanced_search.spec.ts              # 80 tests
```

---

## Part 5: Debugging Failed Tests

### Backend Test Failure

```bash
# Run single failing test with verbose output
cd backend
pytest tests/test_search_service.py::TestSearch::test_search_students -vv

# Run with detailed output and print statements
pytest tests/test_search_service.py -vv -s

# Run with Python debugger
pytest tests/test_search_service.py --pdb

# Run with coverage for specific test
pytest tests/test_search_service.py::test_search_students --cov --cov-report=term-missing
```

### Frontend Test Failure

```bash
cd frontend

# Run single component test
npm run test -- src/components/__tests__/SearchBar.test.tsx

# Run with verbose output
npm run test -- --reporter=verbose

# Run in watch mode to debug interactively
npm run test -- src/components/__tests__/SearchBar.test.tsx --watch

# Run with coverage
npm run test -- --coverage
```

### E2E Test Failure

```bash
cd frontend

# Run single E2E test with headed browser
npx playwright test tests/e2e/advanced_search.spec.ts -g "test name" --headed

# Run with inspector (step through)
npx playwright test tests/e2e/advanced_search.spec.ts --debug

# Run with video recording
npx playwright test tests/e2e/advanced_search.spec.ts --headed

# Check test artifacts
ls -la test-results/
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Test timeout** | Increase timeout: `pytest --timeout=10` or in test: `@pytest.mark.timeout(10)` |
| **Database connection fails** | Verify `TEST_DATABASE_URL` env var is set |
| **API tests fail** | Check mock server is running and responding |
| **E2E test flaky** | Add explicit waits: `await page.waitForNavigation()` |
| **Coverage report missing** | Run: `pytest --cov --cov-report=html` |

---

## Part 6: Performance Testing

### Load Testing with Locust

```python
# load-testing/search_load_test.py

from locust import HttpUser, task, between

class SearchUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def search_students(self):
        self.client.post(
            "/api/v1/search/students",
            json={"query": "Alice", "page": 1, "page_size": 20}
        )

    @task(2)
    def get_suggestions(self):
        self.client.get("/api/v1/search/suggestions?entity=student&query=Ali")

    @task(1)
    def get_statistics(self):
        self.client.get("/api/v1/search/statistics")
```

Run load test:

```bash
cd load-testing
locust -f search_load_test.py --host=http://localhost:8000

# Or with parameters
locust -f search_load_test.py \
  --host=http://localhost:8000 \
  --users=100 \
  --spawn-rate=10 \
  --run-time=10m
```

### Expected Performance

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Search endpoint | <200ms | <500ms |
| Suggestions endpoint | <100ms | <300ms |
| Statistics endpoint | <150ms | <400ms |
| Database index scan | >95% | >80% |
| CPU usage | <40% | <70% |
| Memory usage | <60% | <80% |

---

## Part 7: CI/CD Integration

### GitHub Actions

Tests run automatically on push/PR:

```yaml
# .github/workflows/ci-cd-pipeline.yml

name: Search Feature Tests
on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/test_search_*.py -v --cov

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: |
          cd frontend
          npm install
          npm run test -- --run

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: |
          cd frontend
          npm install
          npx playwright install
          npm run e2e
```

### Pre-Commit Hooks

Run tests before commit:

```bash
# Install pre-commit hooks
pre-commit install

# This will run:
# - Backend: pytest tests/test_search_*.py
# - Frontend: npm run test -- --run
# Before allowing commit
```

---

## Part 8: Test Quality Metrics

### Expected Results

✅ **All Tests Passing**:
- Backend: 208/208 ✅
- Frontend: 214/214 ✅
- **Total: 422/422** ✅

### Coverage Goals

- **Backend**: >90% coverage
- **Frontend**: >85% coverage
- **Overall**: >88% coverage

### Performance Targets

- **Backend tests**: <10 minutes
- **Frontend tests**: <5 minutes
- **E2E tests**: <15 minutes
- **Total**: <30 minutes

---

## Part 9: Test Categories

### Unit Tests (83 total)

Focus: Single function/method behavior

```python
# Test a single method
def test_search_students_name_only(self):
    results = self.service.search_students('Alice')
    assert len(results) > 0
```

### Integration Tests (80 total)

Focus: Multiple components working together

```python
# Test API -> Service -> Database flow
def test_search_api_to_database(self):
    response = self.client.post('/api/v1/search/students',
                                json={'query': 'Alice'})
    assert response.status_code == 200
    results = response.json()['data']['results']
    assert len(results) > 0
```

### Component Tests (114 total)

Focus: React component behavior

```typescript
it('should display search results', async () => {
  render(<SearchResults results={mockResults} />);
  expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
});
```

### E2E Tests (80 total)

Focus: Complete user workflows

```typescript
test('should search and filter results', async ({ page }) => {
  await page.fill('[placeholder="Search"]', 'Alice');
  await page.click('button:has-text("Search")');
  await expect(page.locator('text=Alice')).toBeVisible();
});
```

---

## Part 10: Test Maintenance

### Add New Tests

1. Create test file in appropriate directory
2. Write test using existing patterns
3. Run test locally
4. Add to CI/CD pipeline
5. Document test purpose

### Update Existing Tests

1. Identify test to update
2. Make changes locally
3. Run test to verify
4. Commit with clear message
5. Monitor for flakiness

### Deprecate Tests

1. Mark test with `@pytest.mark.skip("reason")`
2. Note deprecation in test docstring
3. Plan replacement test
4. Remove in next version

### Monitor Test Health

```bash
# Check test flakiness over time
pytest tests/test_search_*.py --co  # List all tests

# Look for patterns in failures
grep -r "FAILED" test-results/

# Analyze test duration
pytest tests/test_search_*.py --durations=10
```

---

## Test Checklist

Before deploying Feature #128:

- [ ] All 208 backend tests passing
- [ ] All 214 frontend tests passing
- [ ] Backend code coverage >90%
- [ ] Frontend code coverage >85%
- [ ] E2E tests passing in CI/CD
- [ ] Load testing targets met
- [ ] No flaky tests detected
- [ ] Documentation reviewed
- [ ] Performance benchmarks verified

---

## Changelog

### Version 1.0.0 (January 17, 2026)
- Initial testing guide
- 422+ tests documented
- Coverage targets defined
- Performance benchmarks
- CI/CD integration
- Debugging procedures
- Test maintenance guidelines
