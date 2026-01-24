# E2E Testing Troubleshooting & FAQ

**Version:** 1.15.0
**Last Updated:** 2025-01-05

---

## 🔧 Troubleshooting Guide

### Quick Diagnosis Flow

```text
┌─ Tests won't start?
│  ├─ Port 8000 in use? → Run: netstat -ano | findstr ":8000"
│  ├─ Backend down? → Run: python -m uvicorn backend.main:app --reload
│  └─ npm error? → Run: npm ci (clean install)
│
├─ Tests start but hang on login?
│  ├─ Wrong credentials? → Check: seed_e2e_data.py (TEST_USER)
│  ├─ No test user? → Run: python seed_e2e_data.py
│  └─ Auth endpoint fails? → Check: backend health with: curl http://localhost:8000/health
│
├─ Tests login but fail on student creation?
│  ├─ Database locked? → Restart backend
│  ├─ Student ID duplicate? → Use unique test data
│  └─ API error? → Check: backend logs, request payload
│
└─ Tests run but timeout?
   ├─ Slow machine? → PLAYWRIGHT_TEST_TIMEOUT=120000 npm run test
   ├─ Network slow? → Reduce: waitForLoadState('networkidle')
   └─ Selector broken? → Use fallback: .or() chains

```text
---

## ❓ FAQ

### **Q: How do I run a single test?**

A: Use `--grep` to filter by test name:

```bash
npx playwright test --grep "should create a new student" --run

```text
Or run a specific file:

```bash
npx playwright test tests/e2e/student-management.spec.ts --run

```text
---

### **Q: Why does my test timeout?**

A: Common causes and fixes:

1. **Machine is slow:**
   ```bash
   # Increase timeout
   PLAYWRIGHT_TEST_TIMEOUT=120000 npm run test
   ```

2. **Waiting for wrong thing:**
   ```typescript
   // ❌ SLOW - Wait for ALL network requests
   await page.waitForLoadState('networkidle');

   // ✅ FAST - Wait for page to render
   await page.waitForLoadState('domcontentloaded');
   ```

3. **Element doesn't exist:**
   ```typescript
   // ❌ TIMEOUT - Waits full timeout then fails
   await page.waitForSelector('[data-testid="missing"]');

   // ✅ BETTER - Use catch for optional elements
   await page
     .locator('[data-testid="optional"]')
     .isVisible({ timeout: 2000 })
     .catch(() => false);
   ```

---

### **Q: How do I see what's happening in the test?**

A: Use Playwright Inspector:

```bash
# Interactive debugging with UI

npx playwright test --ui

# Paused at start of test

npx playwright test --debug

# See full page HTML

npx playwright test --reporter=list  # stdout shows page content

```text
Or add logging:

```typescript
test('my test', async ({ page }) => {
  console.log('[DEBUG] Current URL:', page.url());
  console.log('[DEBUG] Page title:', await page.title());

  // Dump HTML
  const html = await page.content();
  console.log('[DEBUG] HTML:', html.substring(0, 500));
});

```text
---

### **Q: How do I test a specific browser?**

A: Use `--project` flag:

```bash
# Just Chrome

npx playwright test --project=chromium --run

# Just Firefox

npx playwright test --project=firefox --run

# Just Safari

npx playwright test --project=webkit --run

# Mobile Safari

npx playwright test --project="Mobile Safari" --run

```text
---

### **Q: Why do tests pass locally but fail in GitHub Actions?**

A: Likely causes:

1. **Environment variables missing:**
   ```bash
   # Check .env file exists in frontend/
   cat frontend/.env.test

   # Should have:
   VITE_API_URL=http://localhost:8000/api/v1
   PLAYWRIGHT_BASE_URL=http://localhost:8000
   ```

2. **Port conflict in CI:**
   - Ensure backend starts on :8000 before tests
   - GitHub Actions might have different ports

3. **Timing differences (CI slower):**
   ```typescript
   // Increase timeout for CI
   const timeout = process.env.CI ? 30000 : 10000;
   await page.waitForSelector(selector, { timeout });
   ```

4. **Browser differences:**
   - CI uses headless browsers
   - Test more robust selectors
   - Avoid browser-specific APIs

---

### **Q: How do I capture screenshots/videos of failures?**

A: Configured in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',  // Capture on failure
  video: 'retain-on-failure',      // Record on failure
  trace: 'on-first-retry',          // Full trace on retry
}

```text
Files saved to:

```text
test-results/
├── [test-name]/
│   ├── test-failed-1.png         # Screenshot
│   ├── video.webm                # Video
│   └── trace.zip                 # Full trace

```text
View trace:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip

```text
---

### **Q: My test creates data but next test fails. Why?**

A: Tests aren't isolated properly. Solutions:

1. **Each test should set up its own data:**
   ```typescript
   test('my test', async ({ page }) => {
     // Create test data INSIDE this test
     const student = generateStudentDataLocal();

     // DON'T rely on data from previous test
   });
   ```

2. **Use beforeEach for setup:**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Login before each test
     await loginAsTestUser(page);
   });

   test('my test', async ({ page }) => {
     // Already logged in
   });
   ```

3. **Use afterEach for cleanup:**
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clean up if needed
     await page.close();
   });
   ```

---

### **Q: How do I test if my fix actually works?**

A: Complete validation checklist:

```bash
# 1. Code quality

npx eslint tests/e2e/student-management.spec.ts

# 2. Build works

npm run build

# 3. Tests run

npm run test -- --run

# 4. Check specific test

npx playwright test --grep "should create" --run

# 5. View diagnostics

ls -la test-diagnostics/  # Check for failures

# 6. Full report

npx playwright show-report test-results/

```text
---

### **Q: Can I run tests in watch mode?**

A: Yes! Tests rerun on file changes:

```bash
# Watch mode (rerun on save)

npm run test

# Or explicitly

npx playwright test --watch

```text
Changes to rerun tests:
- `tests/e2e/*.spec.ts` (test files)
- `tests/e2e/helpers.ts` (helper changes)
- Backend code (after restart)

---

### **Q: How do I test with a custom base URL?**

A: Set environment variable:

```bash
# Custom backend URL

PLAYWRIGHT_BASE_URL=http://192.168.1.100:8000 npm run test

# Custom API endpoint

VITE_API_URL=http://api.example.com/v1 npm run test

```text
Or in `.env.test`:

```text
PLAYWRIGHT_BASE_URL=http://192.168.1.100:8000
VITE_API_URL=http://api.example.com/v1

```text
---

### **Q: Tests are flaky (sometimes pass, sometimes fail). What do I do?**

A: Flakiness usually means timing issues:

1. **Increase waits:**
   ```typescript
   // ❌ Too short
   await page.waitForSelector(selector, { timeout: 2000 });

   // ✅ Better
   await page.waitForSelector(selector, { timeout: 10000 });
   ```

2. **Don't rely on timing:**
   ```typescript
   // ❌ Flaky - element might not be ready
   await page.click(selector);

   // ✅ Better - explicit wait
   await page.locator(selector).click({ force: false });
   ```

3. **Verify API responses:**
   ```typescript
   // ✅ GOOD - Wait for API success
   await page.waitForResponse(
     resp => resp.status() === 201,
     { timeout: 10000 }
   );
   ```

4. **Use retries for flaky tests:**
   ```typescript
   test('flaky test', async ({ page }) => {
     // Test code
   });

   // Mark as flaky in playwright.config.ts:
   expect.configure({ timeout: 5000 });

   // Or: npx playwright test --retries=2
   ```

---

### **Q: How do I debug in VS Code?**

A: Use Playwright Inspector:

```bash
# Start with inspector

npx playwright test --debug

# Then in VS Code:

# 1. Open Terminal
# 2. Run above command

# 3. Playwright Inspector opens in separate window
# 4. Set breakpoints in VS Code

# 5. Step through execution

```text
Or add Node debug:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Playwright Debug",
  "program": "${workspaceFolder}/node_modules/.bin/playwright",
  "args": ["test", "--debug"],
  "cwd": "${workspaceFolder}/frontend"
}

```text
---

### **Q: How do I test on mobile?**

A: Use mobile device configs:

```bash
# Mobile Chrome

npx playwright test --project="Mobile Chrome" --run

# Mobile Safari

npx playwright test --project="Mobile Safari" --run

# Pixel 5

npx playwright test --project="Pixel 5" --run

# iPhone 12

npx playwright test --project="iPhone 12" --run

```text
---

### **Q: How do I report a test failure?**

A: Include this info:

1. **Test name:**
   ```
   Test: "should create a new student successfully"
   ```

2. **Error message:**
   ```
   Timeout waiting for selector [data-testid="add-student-btn"]
   ```

3. **Reproduction steps:**
   ```bash
   PLAYWRIGHT_TEST_TIMEOUT=10000 npm run test -- --grep "create" --run
   ```

4. **Environment:**
   ```
   - Node: 18.0.0
   - OS: Windows 11
   - Backend: Running on localhost:8000

   ```

5. **Logs/Screenshots:**
   ```
   Check test-results/ and test-diagnostics/ folders
   ```

6. **Playwright version:**
   ```bash
   npx playwright --version
   ```

---

## 🎯 Common Fixes by Symptom

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Timeout waiting for..." | Element doesn't exist | Use `.or()` fallbacks |
| "Authentication fails" | Wrong credentials | Run `python seed_e2e_data.py` |
| "Port already in use" | Backend already running | Kill process on :8000 |
| "Test hangs" | Network.idle never occurs | Use `domcontentloaded` instead |
| "Element click fails" | Element not visible | Add explicit wait before click |
| "Flaky tests" | Race condition | Increase timeout or wait for API |
| "Works local, fails CI" | Environment difference | Set `CI=true npm run test` |
| "Console errors" | JavaScript exception | Check browser console in Inspector |

---

## 📞 Get Help

**Before asking for help, run:**

```bash
# Collect diagnostics

mkdir -p debug
npx playwright test --reporter=json > debug/test-results.json
npx playwright test --reporter=html && cp -r playwright-report debug/

# Package for sharing

zip -r debug.zip debug/

# Then provide:

# 1. debug.zip file
# 2. Terminal output (copy/paste)

# 3. Test name that's failing

```text
---

**Last Updated:** 2025-01-05
**Related Docs:**
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - Main testing guide
- [E2E_AUTHENTICATION_FIX.md](./E2E_AUTHENTICATION_FIX.md) - Auth fix details

