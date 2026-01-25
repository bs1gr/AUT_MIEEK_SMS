# E2E Testing Guide - Running, Debugging & Best Practices

**Version:** 1.15.0
**Last Updated:** 2025-01-05
**Status:** ✅ All E2E tests functional with authentication fix

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Debugging Failing Tests](#debugging-failing-tests)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Best Practices](#best-practices)
6. [Architecture Overview](#architecture-overview)

---

## Quick Start

### Minimum Setup (5 minutes)

```bash
# 1. Ensure backend is running

cd backend
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# 2. Seed test data

python seed_e2e_data.py

# 3. In another terminal, run frontend tests

cd frontend
npm run test -- --run  # Single run
npm run test           # Watch mode (rerun on file changes)

```text
### Full Setup with All Checks (10 minutes)

```bash
# Clean install (if first time)

cd frontend
npm ci  # Clean install from package-lock.json
npx playwright install  # Install browser binaries

# Seed test data

cd ../backend
python seed_e2e_data.py

# Run tests with detailed reporting

cd ../frontend
npx playwright test --reporter=list
npx playwright test --reporter=html  # Open in browser
npx playwright test --reporter=json > test-results.json

```text
---

## Running Tests

### All Tests (Default)

```bash
cd frontend
npm run test -- --run  # Run all tests once

```text
**Output:**

```text
✓ should create a new student successfully
✓ should edit an existing student
✓ should delete a student successfully
✓ should create a course successfully
✓ should assign a grade to a student
✓ should track attendance successfully
✓ should load analytics and reports page

```text
### Specific Test File

```bash
cd frontend
npx playwright test tests/e2e/student-management.spec.ts --run

```text
### Specific Test Case

```bash
cd frontend
npx playwright test --grep "should create a new student" --run

```text
### Watch Mode (Auto-rerun on changes)

```bash
cd frontend
npm run test  # Watches for file changes

```text
### Debug Mode (Interactive with UI)

```bash
cd frontend
npx playwright test --ui  # Opens Playwright Inspector
npx playwright test --debug  # Opens Inspector with execution paused

```text
### With Specific Browser

```bash
cd frontend
npx playwright test --project=chromium --run
npx playwright test --project=firefox --run
npx playwright test --project=webkit --run

```text
### With Extended Timeouts (for slow machines)

```bash
cd frontend
PLAYWRIGHT_TEST_TIMEOUT=60000 npx playwright test --run

```text
---

## Debugging Failing Tests

### 1. **Visual Inspection with Playwright Inspector**

```bash
cd frontend
npx playwright test --ui

```text
**Features:**
- ✅ Step through test line-by-line
- ✅ Hover over elements to highlight them
- ✅ See full page HTML
- ✅ Check network requests
- ✅ View console messages

### 2. **Capture Screenshots & Videos**

**Configuration in `frontend/playwright.config.ts`:**

```typescript
use: {
  screenshot: 'only-on-failure',  // Capture on failure
  video: 'retain-on-failure',      // Record on failure
  trace: 'on-first-retry',          // Full trace on retry
}

```text
**View Results:**

```bash
cd frontend
npx playwright show-trace trace.zip  # View full trace

```text
### 3. **Add Debugging Logs**

**In Test File:**

```typescript
test('my test', async ({ page }) => {
  // Add detailed logging
  console.log('[DEBUG] Starting test');
  console.log('[DEBUG] Current URL:', page.url());

  // Check element exists
  const button = page.locator('[data-testid="add-student-btn"]');
  const visible = await button.isVisible().catch(() => false);
  console.log('[DEBUG] Button visible:', visible);

  // Dump page HTML
  const html = await page.content();
  console.log('[DEBUG] Page HTML:', html.substring(0, 500));
});

```text
**Run with Logging:**

```bash
npx playwright test --reporter=list  # Shows all console.log output

```text
### 4. **Increase Timeouts for Debugging**

```bash
cd frontend
PLAYWRIGHT_TEST_TIMEOUT=120000 npx playwright test --debug --grep "failing test"

```text
### 5. **Common Debugging Patterns**

#### Check if Element Exists

```typescript
const exists = await page.locator('[data-testid="element"]').count() > 0;
console.log('Element exists:', exists);

```text
#### Wait for Element with Logging

```typescript
try {
  await page.waitForSelector('[data-testid="element"]', { timeout: 5000 });
  console.log('[SUCCESS] Element found');
} catch (err) {
  console.log('[FAILED] Element not found:', err.message);
  // Dump what's actually on page
  const content = await page.content();
  console.log('Page content sample:', content.substring(0, 1000));
}

```text
#### Check Element Value

```typescript
const value = await page.inputValue('[data-testid="input"]');
console.log('Input value:', value);

```text
#### Verify API Calls

```typescript
const apiCall = await page.waitForResponse(
  resp => resp.url().includes('/api/v1/students') && resp.status() === 201,
  { timeout: 10000 }
);
const responseData = await apiCall.json();
console.log('[API] Response:', responseData);

```text
---

## Common Issues & Solutions

### 🔴 **Authentication Fails - Tests Redirect to Login**

**Symptoms:**

```text
❌ Test starts but redirects to /auth/login
❌ localStorage shows empty sms_access_token
❌ Console: "Unauthorized"

```text
**Root Cause:**
- Test user credentials incorrect
- Backend auth endpoint down
- Database missing test user

**Solutions:**

1. **Verify test user exists:**
   ```bash
   cd backend
   python seed_e2e_data.py
   # Output: [OK] Test data already exists, skipping seed
   ```

2. **Check test credentials match:**
   ```bash
   # In seed_e2e_data.py:
   TEST_USER = {
       "first_name": "Test",
       "last_name": "User",
       "email": "test@example.com",  # ← Must match
       "password": "TestPassword123!",  # ← Must match
   }
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status": "ok"}
   ```

4. **Check loginAsTestUser in helpers.ts:**
   ```bash
   cd frontend/tests/e2e
   grep -n "test@example.com" helpers.ts
   # Email must match seed script
   ```

**If Still Failing:**

```bash
# Run with debug mode to see auth response

npx playwright test --debug --grep "create a new student"
# Check browser console in Inspector for error messages

```text
---

### 🟠 **Selector Not Found - "element.click() timed out"**

**Symptoms:**

```text
❌ Timeout waiting for selector [data-testid="add-student-btn"]
❌ Could not find element

```text
**Root Cause:**
- Element not rendered yet (timing issue)
- Wrong data-testid name
- Element hidden (display: none)
- Page not loaded

**Solutions:**

1. **Add explicit wait before action:**
   ```typescript
   // ✅ GOOD - Wait for element to be visible
   await page.waitForSelector('[data-testid="add-student-btn"]', {
     state: 'visible',
     timeout: 10000
   });
   await page.click('[data-testid="add-student-btn"]');

   // ❌ BAD - No wait, immediate click
   await page.click('[data-testid="add-student-btn"]');
   ```

2. **Use locator with fallback:**
   ```typescript
   // ✅ GOOD - Try multiple selectors
   const button = page
     .locator('[data-testid="add-student-btn"]')
     .or(page.locator('button:has-text("Add Student")'))
     .or(page.locator('text=Add Student'));

   await button.click();
   ```

3. **Wait for page to load:**
   ```typescript
   // ✅ GOOD - Wait for network idle
   await page.goto('/students');
   await page.waitForLoadState('networkidle');  // or 'domcontentloaded'
   ```

4. **Check element visibility:**
   ```typescript
   const isVisible = await page
     .locator('[data-testid="add-student-btn"]')
     .isVisible({ timeout: 5000 })
     .catch(() => false);

   if (!isVisible) {
     console.log('Element not visible, dumping HTML:');
     const html = await page.content();
     console.log(html);
   }
   ```

---

### 🟡 **Test Times Out - Slower Machine**

**Symptoms:**

```text
❌ Timeout waiting for network idle
❌ Takes >60 seconds per test

```text
**Solutions:**

1. **Increase default timeout:**
   ```bash
   PLAYWRIGHT_TEST_TIMEOUT=120000 npm run test
   ```

2. **Increase specific waits:**
   ```typescript
   await page.waitForSelector('[data-testid="element"]', {
     timeout: 30000  // 30 seconds instead of default
   });
   ```

3. **Use shorter wait strategies:**
   ```typescript
   // ✅ GOOD - Don't wait for full networkidle
   await page.goto('/page');
   await page.waitForLoadState('domcontentloaded');

   // ❌ SLOW - Wait for all network to complete
   await page.waitForLoadState('networkidle');
   ```

4. **Reduce browser overhead:**
   ```bash
   # Run fewer browsers in parallel
   npx playwright test --workers=1  # Single worker instead of auto
   ```

---

### 🟢 **Tests Pass Locally but Fail in CI**

**Symptoms:**

```text
✅ All tests pass locally
❌ Fail in GitHub Actions

```text
**Common Causes & Solutions:**

1. **Environment differences:**
   ```bash
   # Set CI environment variable to match GitHub Actions
   CI=true npm run test
   ```

2. **Missing environment variables:**
   ```bash
   # Create .env.test file
   PLAYWRIGHT_BASE_URL=http://localhost:8000
   API_URL=http://localhost:8000/api/v1
   ```

3. **Browser differences (more strict in CI):**
   ```typescript
   // Use more robust selectors
   // ❌ Brittle
   page.click('button:nth-of-type(3)')

   // ✅ Robust
   page.click('[data-testid="submit-button"]')
   ```

4. **Timing differences (CI slower than local):**
   ```typescript
   // Increase timeouts in CI
   const timeout = process.env.CI ? 30000 : 10000;
   await page.waitForSelector(selector, { timeout });
   ```

5. **Check GitHub Actions logs:**
   - Go to repository → Actions tab
   - Click failed workflow
   - View "Run tests" step output
   - Look for timeouts, missing elements, network errors

---

## Best Practices

### ✅ DO

#### 1. **Use Data-TestIDs**

```typescript
// ✅ GOOD - Stable, not brittle to UI changes
await page.click('[data-testid="add-student-btn"]');

// ❌ BAD - Breaks if label text changes
await page.click('button:has-text("Add Student")');

```text
#### 2. **Wait Explicitly**

```typescript
// ✅ GOOD - Wait before action
await page.waitForSelector('[data-testid="element"]', { state: 'visible' });
await page.click('[data-testid="element"]');

// ❌ BAD - Hope element exists
await page.click('[data-testid="element"]');

```text
#### 3. **Verify API Responses**

```typescript
// ✅ GOOD - Verify API success
await page.waitForResponse(
  resp => resp.url().includes('/api/v1/students') && resp.status() === 201,
  { timeout: 10000 }
);

// ❌ BAD - Hope element appears
await page.waitForSelector('[data-testid="success"]');

```text
#### 4. **Use Locator Chains for Robustness**

```typescript
// ✅ GOOD - Multiple fallbacks
const button = page
  .locator('[data-testid="submit"]')
  .or(page.locator('button.primary'))
  .or(page.locator('text=Submit'));
await button.click();

// ❌ BAD - Single selector fails if element not found
await page.click('[data-testid="submit"]');

```text
#### 5. **Handle Async Gracefully**

```typescript
// ✅ GOOD - Catch timing failures
await page
  .locator('[data-testid="optional"]')
  .isVisible({ timeout: 2000 })
  .catch(() => false);

// ❌ BAD - Let test crash on timeout
await page.waitForSelector('[data-testid="optional"]', { timeout: 2000 });

```text
---

### ❌ DON'T

#### 1. **Hard-Code Waits**

```typescript
// ❌ BAD - Magic number, unreliable
await page.waitForTimeout(5000);

// ✅ GOOD - Wait for specific condition
await page.waitForSelector('[data-testid="element"]');

```text
#### 2. **Click Without Visibility Check**

```typescript
// ❌ BAD - Element might be off-screen
await page.click('[data-testid="button"]');

// ✅ GOOD - Ensure visible first
await page.locator('[data-testid="button"]').click({ force: false });

```text
#### 3. **Assume Element State**

```typescript
// ❌ BAD - Assume checkbox is visible
const checked = await page.isChecked('[data-testid="checkbox"]');

// ✅ GOOD - Check existence first
const exists = await page.locator('[data-testid="checkbox"]').count() > 0;
if (exists) {
  const checked = await page.isChecked('[data-testid="checkbox"]');
}

```text
#### 4. **Ignore Setup Failures**

```typescript
// ❌ BAD - Silently fail setup
try {
  await createTestUser();
} catch { }

// ✅ GOOD - Log and abort
try {
  await createTestUser();
} catch (err) {
  console.error('[SETUP FAILED] Could not create test user:', err);
  throw err;  // Fail test if setup fails
}

```text
#### 5. **Test Multiple Concerns in One Test**

```typescript
// ❌ BAD - Tests too much
test('complex flow', async ({ page }) => {
  // Create student
  // Edit student
  // Delete student
  // Create course
  // Assign grade
  // All in one test!
});

// ✅ GOOD - One concern per test
test('should create a student', async ({ page }) => {
  // Just test creation
});

test('should edit a student', async ({ page }) => {
  // Just test editing
});

```text
---

## Architecture Overview

### Test Structure

```text
frontend/
├── tests/
│   └── e2e/
│       ├── helpers.ts              # Login, data generation helpers
│       ├── diagnostics.ts          # Screenshot, HTML capture
│       ├── student-management.spec.ts  # Main test suite (7 tests)
│       └── playwright.config.ts    # Browser/timeout config
├── playwright.config.ts            # Global config
└── ...rest of app

```text
### Key Helpers

#### `loginAsTestUser(page)`

```typescript
// Logs in as test@example.com
// Sets both JWT token AND user object in localStorage
// Navigates to /dashboard
await loginAsTestUser(page);

```text
#### `generateStudentData()`

```typescript
// Generates unique test data
const student = generateStudentData();
// Returns: { firstName, lastName, email, studentId }

```text
#### `captureAndLogDiagnostics(page, testName)`

```typescript
// Captures screenshot + HTML on failure
// Saves to test-diagnostics/ folder
await captureAndLogDiagnostics(page, testInfo.title);

```text
### Authentication Flow

```text
┌─────────────────────────────────────────┐
│ Test Starts                             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ loginAsTestUser(page)                   │
│ ✓ POST /auth/login → JWT token          │
│ ✓ GET /auth/me → User profile           │
│ ✓ Set localStorage (2 keys)             │
│ ✓ Navigate /dashboard                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ AuthContext initializes                 │
│ ✓ Reads sms_access_token                │
│ ✓ Reads sms_user_v1                     │
│ ✓ Sets user state                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ RequireAuth allows navigation            │
│ ✓ User object exists                    │
│ ✓ No redirect to /auth/login            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Test Proceeds                           │
│ ✓ User operations work                  │
│ ✓ API calls succeed                     │
└──────────────────────────────────────────┘

```text
---

## CI Integration

### GitHub Actions

Tests run automatically on:
- ✅ Push to main branch
- ✅ Pull requests
- ✅ Manual workflow dispatch

**View Results:**
1. Go to repository → Actions tab
2. Click workflow run
3. View "Run tests" step for details

### Local CI Simulation

```bash
# Run tests exactly as CI does

CI=true npm run test

# With verbose output

CI=true npm run test -- --reporter=verbose

# With HTML report

CI=true npm run test && npx playwright show-report

```text
---

## Troubleshooting Checklist

Before reporting issues:

- [ ] Backend running on port 8000?
- [ ] Test data seeded (`python seed_e2e_data.py`)?
- [ ] npm dependencies installed (`npm ci`)?
- [ ] Playwright browsers installed (`npx playwright install`)?
- [ ] Correct test user credentials in helpers.ts?
- [ ] No firewall blocking localhost:8000?
- [ ] Port 5173 available for Vite dev server?
- [ ] Enough disk space for browser caches?
- [ ] Running with Node.js 18+?

---

## References

- **Playwright Docs:** https://playwright.dev/
- **Best Practices:** https://playwright.dev/docs/best-practices
- **Debugging:** https://playwright.dev/docs/debug
- **CI/CD:** https://playwright.dev/docs/ci
- **SMS E2E Fix:** [E2E_AUTHENTICATION_FIX.md](./E2E_AUTHENTICATION_FIX.md)
- **Test Summary:** [E2E_SESSION_SUMMARY_2025-01-05.md](./development/E2E_SESSION_SUMMARY_2025-01-05.md)

---

**Last Updated:** 2025-01-05
**Status:** ✅ All tests functional
