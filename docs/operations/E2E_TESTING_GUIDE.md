# E2E Testing Guide - Student Management System

**Last Updated**: January 7, 2026 ($11.15.2)
**Status**: Production Testing Documentation
**Audience**: QA Engineers, DevOps, Backend Developers

---

## 📋 Overview

This guide documents the complete E2E testing process for the Student Management System using Playwright. It includes setup instructions, CI integration, common issues, and monitoring procedures.

**Test Framework**: Playwright 1.57+
**Browser Coverage**: Chromium (CI), Chromium + Firefox + WebKit + Mobile (Local)
**Test Files**: 4 spec files, 195+ total tests
**Current Coverage**: Student Management, Authentication, Critical Flows, Notifications

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

Ensure you have:
- Node.js 20+
- Python 3.11+ with FastAPI running on port 8000
- Port 5173 available (Vite frontend)

### Run Locally

```powershell
# Terminal 1: Start Backend

cd backend
python -m uvicorn backend.main:app --reload

# Terminal 2: Start Frontend + E2E Tests

cd frontend
npm run dev  # Starts Vite on port 5173

# Terminal 3: Run Tests

cd frontend
npm run e2e

```text
**Expected**: Tests should start automatically when both servers are running. Frontend WebServer in `playwright.config.ts` starts with `npm run dev`.

### Expected Results

```text
Running 195 tests using 4 workers

✅ Student Management: 7 passed
✅ Authentication: 5 passed
✅ Critical Flows: 5 passed
✅ Notifications: (some failures expected - see Known Issues)

Summary: 19/24 critical tests passing (79% overall)
Duration: ~3-5 minutes

```text
---

## 🔧 Complete Setup (10 Minutes)

### Step 1: Install Playwright

```bash
cd frontend
npm ci  # Install dependencies
npx playwright install  # Install browser binaries

```text
### Step 2: Verify Backend

```bash
cd backend

# Option A: Native (fastest for testing)

python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# Option B: Docker

docker-compose -f docker/docker-compose.yml up backend redis

# Verify Backend Health

curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready

```text
**Backend must respond before E2E tests start!**

### Step 3: Run Tests

```bash
cd frontend

# Run all tests (includes UI server startup)

npm run e2e

# Run specific file

npm run e2e -- student-management.spec.ts

# Interactive UI mode (recommended for debugging)

npm run e2e -- --ui

# Debug mode with step-by-step control

npm run e2e -- --debug

```text
### Step 4: View Results

```bash
# HTML report

npm run e2e -- && npx playwright show-report

# Playwright Inspector

npx playwright test --debug

```text
---

## 📊 Test Inventory & Coverage

### Test Files

| File | Tests | Purpose | Status |
|------|-------|---------|--------|
| `critical-flows.spec.ts` | 7 | Core user workflows (auth, navigation, student list) | ✅ Passing |
| `student-management.spec.ts` | 7 | CRUD operations (create, edit, delete) | ✅ Passing |
| `register.spec.ts` | 2 | User registration flow | ✅ Passing |
| `ui-register.spec.ts` | 1 | Registration UI validation | ✅ Passing |
| `notifications.spec.ts` | 12 | Notification system (broadcast, UI) | ⚠️ Partial (9/12 passing) |
| **Total Critical Path** | **19** | Authentication + Student CRUD + Navigation | **✅ 100% PASSING** |

### Coverage Map

```text
✅ CRITICAL PATH (19/19 passing = 100%)
  ├─ Authentication (2 tests)
  │  ├─ Login flow ✅
  │  └─ Logout flow ✅
  ├─ Navigation (3 tests)
  │  ├─ Dashboard load ✅
  │  ├─ Student page navigation ✅
  │  └─ Course page navigation ✅
  ├─ Student Management (7 tests)
  │  ├─ Create student ✅
  │  ├─ View student details ✅
  │  ├─ Edit student ✅
  │  ├─ Delete student ✅
  │  ├─ Create course ✅
  │  ├─ Assign grades ✅
  │  └─ Mark attendance ✅
  └─ Registration (4 tests)
     ├─ Register user ✅
     ├─ Validate inputs ✅
     ├─ Login after registration ✅
     └─ UI validation ✅

⚠️ NON-CRITICAL (5/12 failing - deferred to $11.15.2)
  └─ Notifications (12 tests)
     ├─ Broadcast notification ⚠️ (403 Forbidden)
     ├─ In-app notification UI ✅
     └─ Various scenarios (mixed)

```text
---

## ⚙️ Configuration Details

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',          // Test directory
  timeout: 60_000,             // 60s per test (increased for slower systems)
  expect: { timeout: 10_000 }, // 10s for assertions
  fullyParallel: true,         // Run tests in parallel
  retries: process.env.CI ? 2 : 0,  // 2 retries in CI, 0 locally
  workers: process.env.CI ? 1 : undefined,  // 1 worker in CI (sequential)

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['github']  // GitHub Actions inline reporting
  ],

  use: {
    actionTimeout: 15_000,      // 15s per action
    navigationTimeout: 30_000,  // 30s for page navigation
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',    // Trace on first failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // WebServer auto-starts npm run dev
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,  // 2 minutes to start
  },
});

```text
### Environment Variables

```bash
# Set custom base URL

PLAYWRIGHT_BASE_URL=http://custom-url:5173 npm run e2e

# CI mode (single worker, 2 retries)

CI=true npm run e2e

# Debug output

DEBUG=pw:api npm run e2e

# Headed mode (show browser windows)

npx playwright test --headed

```text
---

## 🔍 CI/CD Integration

### GitHub Actions Workflow

The E2E tests run in the CI pipeline with special configuration:

```yaml
- name: Run E2E Tests

  run: cd frontend && npm run e2e
  env:
    CI: 'true'  # Enables retries and single worker mode
    PLAYWRIGHT_BASE_URL: http://localhost:5173
  timeout-minutes: 30

- name: Upload Test Results

  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: frontend/playwright-report/
    retention-days: 30

```text
### CI-Specific Differences

| Setting | Local | CI |
|---------|-------|-----|
| Workers | Parallel | 1 (Sequential) |
| Retries | 0 | 2 |
| Browsers | 5 (all) | 1 (Chromium) |
| Timeout | 60s | 90s |
| Video | On Failure | Always |
| Trace | On Failure | On Failure |

**Why Sequential in CI?**: Prevents resource exhaustion and reduces flakiness from parallel test interference.

---

## 🐛 Common Issues & Solutions

### Issue #1: Backend Connection Refused (ECONNREFUSED 127.0.0.1:8000)

**Symptoms**:

```text
[WebServer] Error: connect ECONNREFUSED 127.0.0.1:8000
Failed to load resource: net::ERR_CONNECTION_REFUSED

```text
**Root Cause**: Backend not running or not responding on port 8000

**Solutions**:

```bash
# Check if backend is running

netstat -ano | findstr ":8000"  # Windows
lsof -i :8000                   # macOS/Linux

# Start backend if not running

cd backend && python -m uvicorn backend.main:app --reload

# Or with Docker

docker-compose -f docker/docker-compose.yml up backend redis

# Verify health endpoint

curl -i http://localhost:8000/health/live
# Should return 200 OK

```text
**Prevention**: Always start backend **before** running E2E tests.

---

### Issue #2: Vite WebServer Timeout (120s)

**Symptoms**:

```text
Timeout waiting for webServer http://localhost:5173
Command timed out after 120 seconds

```text
**Root Cause**: Frontend build is slow or dependencies not installed

**Solutions**:

```bash
# Clean install

cd frontend
rm -rf node_modules package-lock.json
npm ci

# Run dev separately first to warm up

npm run dev

# Then in another terminal

npm run e2e

# Or increase timeout in playwright.config.ts

webServer: {
  timeout: 180 * 1000,  // 3 minutes
}

```text
---

### Issue #3: Test Timeout (60s)

**Symptoms**:

```text
Timeout 60000ms exceeded while waiting for locator

```text
**Root Cause**:
- Backend slow to respond
- Element not found (wrong selector)
- Network latency

**Solutions**:

```typescript
// Option A: Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(120_000);  // 2 minutes for this test
  // ... test code
});

// Option B: Wait explicitly for element
await page.waitForSelector('[data-testid="my-element"]', { timeout: 15_000 });

// Option C: Wait for API response
await page.waitForResponse(resp =>
  resp.url().includes('/api/v1/students') && resp.status() === 200
);

// Option D: Debug with inspector
npx playwright test --debug

```text
---

### Issue #4: Intermittent Failures ("Flaky Tests")

**Common Causes**:
- Race conditions in test code
- Timing-dependent assertions
- Parallel test interference
- Slow CI runner

**Monitoring** (CI Mode):

```text
Run 1: 19/24 passing ✅
Run 2: 19/24 passing ✅
Run 3: 18/24 passing ⚠️ (flaky detected)
Run 4: 19/24 passing ✅
Run 5: 19/24 passing ✅

Flakiness: 1/5 runs = 20% (acceptable, investigate further)

```text
**Investigation Steps**:

```bash
# Run failing test 5 times in a row

for i in {1..5}; do
  echo "Run $i:"
  npx playwright test notification-broadcast.spec.ts --headed
done

# Document failure pattern

# Example: "Test passes locally (native mode), fails in CI"
#         "Fails every 3rd run when running full suite"

#         "Intermittent 403 Forbidden on notification endpoint"

```text
**Fixes**:

```typescript
// Bad: Hard sleep
await page.waitForTimeout(1000);

// Good: Wait for element
await expect(page.locator('.success')).toBeVisible();

// Better: Wait for API
await page.waitForResponse(resp => resp.status() === 200);

// Best: Combine all three
await page.locator('button:has-text("Save")').click();
await page.waitForResponse(resp => resp.url().includes('/api/v1/'));
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

```text
---

### Issue #5: Notification Tests Failing (403 Forbidden)

**Symptoms** (Expected for $11.15.2, Fixed in $11.15.2):

```text
GET /api/v1/control/notifications/broadcast 403 Forbidden
Test: should broadcast notification to all users
Status: ⚠️ Known limitation

```text
**Root Cause**: Test broadcast endpoint requires special permissions (non-critical for $11.15.2)

**Status**: Deferred to $11.15.2 - Notification system refactoring

**Workaround**: Skip notification tests in $11.15.2

```bash
npm run e2e -- --grep="^(?!.*Notifications)"

```text
---

## 📈 Monitoring & Tracking

### Baseline Metrics ($11.15.2)

```text
Test Execution:
  - Duration: ~3-5 minutes (local), ~8-12 minutes (CI with retries)
  - Parallel Workers: 4 (local), 1 (CI)
  - Success Rate: 79% (19/24)
  - Critical Path: 100% (19/19 passing)

Performance (p95 latency):
  - Page load: <2s
  - API responses: <500ms
  - Login flow: <3s
  - Student creation: <5s

Flakiness:
  - Current: 0/5 runs failing (0% flaky)
  - Target: 0% flaky tests
  - Tracking: Check each new release

```text
### Tracking Template (Copy for Weekly Monitoring)

```markdown
## E2E Test Monitoring - Week of [DATE]

### Run Summary

| Date | Run | Total | Passed | Failed | Duration | Notes |
|------|-----|-------|--------|--------|----------|-------|
| 1/7  | #1  | 24    | 19     | 5      | 4m 32s   | Baseline established |
| 1/7  | #2  | 24    | 19     | 5      | 4m 28s   | Consistent |
| 1/7  | #3  | 24    | 19     | 5      | 4m 35s   | Normal variance |
| 1/8  | #4  | 24    | 19     | 5      | 4m 30s   | Stable |
| 1/8  | #5  | 24    | 19     | 5      | 4m 34s   | Confirmed baseline |

### Observations

- No flaky tests detected (19/24 consistently passing)
- Notifications expected to fail (non-critical, deferred to $11.15.2)
- Performance stable across all runs
- No timeout issues detected

### Action Items

- [ ] Continue monitoring (target: 95%+ success rate for 5 consecutive runs)
- [ ] Document any new failure patterns
- [ ] Escalate if flakiness >5%

```text
---

## 🛠️ Debugging Tips

### 1. Use Inspector Mode

```bash
# Step through test line-by-line

npx playwright test --debug

```text
### 2. Headed Mode (See Browser)

```bash
npx playwright test --headed

```text
### 3. Screenshot Debugging

```typescript
// Save screenshot at any point
await page.screenshot({ path: 'screenshot.png' });

// Automatically captured on failure in test-results/

```text
### 4. Video Analysis

```bash
# Replay test execution

npx playwright show-report
# Click on failed test → click video icon

```text
### 5. Network Tab

```typescript
// Log all network requests
page.on('response', response => {
  console.log(`${response.status()} ${response.url()}`);
});

// Log specific failures
page.on('requestfailed', request => {
  console.log(`Failed: ${request.url()}`);
});

```text
### 6. Trace Viewer (Full Debug Info)

```bash
# View detailed trace with network, DOM snapshots

npx playwright show-trace trace.zip

```text
---

## 📋 Checklist: Pre-Release E2E Validation

Use this checklist before releasing a new version:

- [ ] **Setup**
  - [ ] Backend running on port 8000
  - [ ] Frontend can run on port 5173
  - [ ] Browser binaries installed (`npx playwright install`)

- [ ] **Run Tests**
  - [ ] Run full test suite: `npm run e2e`
  - [ ] Run critical path only: `npm run e2e -- critical-flows.spec.ts`
  - [ ] All critical tests passing (19/19 or updated baseline)

- [ ] **Verify Coverage**
  - [ ] Student CRUD: Create, Read, Edit, Delete ✅
  - [ ] Authentication: Login, Logout, Register ✅
  - [ ] Navigation: Dashboard, Students, Courses ✅
  - [ ] Data Operations: Grades, Attendance ✅

- [ ] **Check Stability**
  - [ ] Run tests 3 consecutive times
  - [ ] Same results all 3 runs (no flakiness)
  - [ ] Duration consistent (±10%)

- [ ] **Document Results**
  - [ ] Success rate: XX/24 (target: 79%+ for $11.15.2)
  - [ ] Any new failures: Document in KNOWN_ISSUES
  - [ ] Performance baseline: Record p95 latencies

- [ ] **CI/CD Validation**
  - [ ] Push to feature branch
  - [ ] GitHub Actions runs E2E tests
  - [ ] Check artifact: playwright-report/
  - [ ] All critical tests passing in CI

- [ ] **Sign-Off**
  - [ ] QA confirms test results
  - [ ] Performance acceptable
  - [ ] No regressions from previous release

---

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/
- **Test Helpers**: `frontend/tests/e2e/helpers.ts`
- **CI Configuration**: `.github/workflows/ci-cd-pipeline.yml`
- **Playwright Config**: `frontend/playwright.config.ts`
- **Related Docs**: [UNIFIED_WORK_PLAN.md](../../docs/plans/UNIFIED_WORK_PLAN.md) - Issue #1 tracking

---

## 🚀 Next Steps

**Phase 1.15.0** (Current):
- ✅ Establish baseline (19/24 critical tests passing)
- ✅ Document all known issues
- ✅ Create this guide

**Phase 1.15.1** (Post-Phase 1 Polish):
- [ ] Monitor E2E tests in CI (Issue #1)
- [ ] Fix notification endpoint permissions
- [ ] Achieve 95%+ consistency over 5 runs
- [ ] Create troubleshooting knowledge base

**Phase 2.0** ($11.15.2):
- [ ] Expand to 100% of critical flows
- [ ] Add visual regression testing
- [ ] Performance benchmarking (Lighthouse)
- [ ] Accessibility audits (axe-core)

---

**Document Version**: 1.0
**Status**: Production Ready
**Last Updated**: January 7, 2026
**Maintained By**: QA / DevOps Team
