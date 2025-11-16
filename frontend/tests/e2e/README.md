# E2E Testing with Playwright

## Overview

End-to-end tests using Playwright to verify critical user workflows in the Student Management System.

## Test Coverage

### Student Management (`student-management.spec.ts`)
- ✅ Create new student
- ✅ Edit existing student
- ✅ Delete student
- ✅ Create new course
- ✅ Assign grades to students
- ✅ Mark student attendance
- ✅ View student analytics with final grade calculation

### Authentication (`register.spec.ts`, `ui-register.spec.ts`)
- ✅ User registration flow
- ✅ Login with refresh token cookie

## Running Tests

### Prerequisites
```bash
# Install Playwright browsers (first time only)
npx playwright install
```

### Run All E2E Tests
```bash
cd frontend
npm run e2e
```

### Run Specific Test File
```bash
npx playwright test student-management.spec.ts
```

### Run Tests in UI Mode (interactive)
```bash
npx playwright test --ui
```

### Debug Tests
```bash
npx playwright test --debug
```

### View Test Report
```bash
npx playwright show-report
```

## Environment Configuration

### Development (Default)
Tests run against `http://localhost:5173` (frontend) and `http://localhost:8000` (backend).

Ensure both servers are running:
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn backend.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Custom Backend URL
```bash
E2E_API_BASE=http://localhost:8080 npm run e2e
```

### Docker Environment
```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 E2E_API_BASE=http://localhost:8080 npm run e2e
```

## Test Structure

### Test Helpers (`helpers.ts`)
Reusable utilities for:
- Data generation (students, courses, users)
- Authentication (register, login)
- API setup (create test data via API)
- UI interactions (fill forms, select dropdowns, wait for toasts)

### Example Usage
```typescript
import { test } from '@playwright/test';
import { loginAsTeacher, createStudentViaAPI, generateStudentData } from './helpers';

test('my test', async ({ page }) => {
  await loginAsTeacher(page);
  
  const student = generateStudentData();
  const created = await createStudentViaAPI(page, student);
  
  // ... rest of test
});
```

## Configuration

### `playwright.config.ts`
```typescript
{
  testDir: './tests/e2e',
  timeout: 30_000,              // 30s per test
  expect: { timeout: 5000 },    // 5s per assertion
  fullyParallel: false,         // Sequential execution
  retries: 0,                   // No retries in dev
  reporter: ['list', 'html'],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
}
```

## Best Practices

### 1. Use API for Test Setup
Create test data via API for speed, then test UI interactions:
```typescript
// Fast: Create via API
const student = await createStudentViaAPI(page, generateStudentData());

// Then test UI
await page.goto(`/students/${student.id}`);
// ... test edit form
```

### 2. Isolate Tests
Each test should be independent and clean up after itself:
```typescript
test('my test', async ({ page }) => {
  const student = await createStudentViaAPI(page, generateStudentData());
  
  // Test logic...
  
  // Cleanup (optional, depends on test DB strategy)
  await cleanupTestData(page, 'students', student.id);
});
```

### 3. Use Stable Selectors
Prefer data attributes over brittle CSS selectors:
```typescript
// Good: Stable selector
await page.click('[data-testid="create-student-btn"]');

// Better: Role-based selector
await page.click('button[role="button"]:has-text("Create Student")');

// Avoid: Fragile CSS
await page.click('.btn-primary.ml-4');
```

### 4. Wait for Dynamic Content
```typescript
// Wait for API response
await page.waitForResponse(resp => 
  resp.url().includes('/api/v1/students') && resp.status() === 200
);

// Wait for element
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
```

## Debugging

### Screenshots on Failure
Automatic screenshots are captured on test failure in `test-results/`.

### Video Recording
Enable in config:
```typescript
use: {
  video: 'retain-on-failure',
}
```

### Trace Viewer
View detailed traces with network logs, DOM snapshots:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run e2e
  env:
    PLAYWRIGHT_BASE_URL: ${{ secrets.E2E_BASE_URL }}
    E2E_API_BASE: ${{ secrets.E2E_API_BASE }}

- name: Upload Test Results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

## Troubleshooting

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check backend is running and accessible
- Verify no CORS issues in browser console

### Element Not Found
- Add explicit waits: `await page.waitForSelector('.my-element')`
- Check selector specificity
- Use Playwright Inspector: `npx playwright test --debug`

### Authentication Issues
- Verify registration endpoint returns success
- Check cookies are set correctly
- Ensure JWT tokens are valid

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Expand test coverage to 100% of critical flows
- [ ] Add performance benchmarks (Lighthouse)
- [ ] Test mobile responsive layouts
- [ ] Add accessibility audits (axe-core)
