# GitHub Actions Workflow Failure Report

**Repository:** bs1gr/AUT_MIEEK_SMS
**Branch:** main
**Report Date:** December 27, 2025
**Most Recent Failures:** Run #398 (COMMIT_READY) and Run #226 (E2E Tests)

---

## Summary

Two critical workflows have failed on the most recent commit (`6941bbd`) with the message: "security: strengthen path traversal protection in backup operations"

| Workflow | Run # | Status | Duration | Issue |
|----------|-------|--------|----------|-------|
| COMMIT_READY Smoke (quick) | #398 | ❌ FAILED | 1m 12s | Process exited with code 1 on Ubuntu |
| E2E Tests | #226 | ❌ FAILED | 13m 24s | 21 test failures (timeout errors) |

---

## 1. COMMIT_READY Smoke (quick) - Run #398

### Failure Details

- **Workflow:** `commit-ready-smoke.yml`
- **Status:** FAILED ❌
- **Duration:** 1m 12s
- **Commit:** `6941bbd7f56566681eb50a0617ef002b6684d126`
- **Triggered:** Push to main branch

### Failed Jobs

**Job 1: Run COMMIT_READY quick (smoke) (ubuntu-latest)** ❌
- **Result:** Process completed with exit code 1
- **Duration:** 1m 2s
- **Error Annotation:** "Process completed with exit code 1."

**Job 2: Run COMMIT_READY quick (smoke) (windows-latest)** ⏹️
- **Result:** CANCELED (due to Ubuntu job failure)
- **Error Annotation:** "The strategy configuration was canceled because "commit-ready-quick.ubuntu-latest" failed"

### Step Sequence (Ubuntu Job)

The job completed the following steps before failing:
1. ✅ Set up job (0s)
2. ✅ Checkout repository (1s)
3. ✅ Setup Python (3s)
4. ✅ Setup Node.js (0s)
5. ✅ Install backend dependencies (fast) (14s)
6. ✅ Install backend dev dependencies (4s)
7. ✅ Install frontend deps (8s)
8. ✅ Run backend fast tests (pytest) and produce JUnit (29s)
9. ✅ Run frontend fast tests (vitest) and produce JUnit (0s)
10. ✅ Prepare installer Greek text assets (0s)
11. ❌ **Run COMMIT_READY quick smoke (skip tests + cleanup for speed) & save logs** (FAILED)
12. ⏹️ Upload smoke logs + JUnit test reports (0s) - Not executed due to previous failure

### Root Cause Analysis

The failure occurs at step 11: **"Run COMMIT_READY quick smoke (skip tests + cleanup for speed) & save logs"**

This step likely runs the PowerShell script `COMMIT_READY.ps1` with the `-Quick` flag. The exit code 1 indicates a non-zero return, but the detailed error message is not visible in the publicly available logs.

**Possible causes:**
1. **Script execution error** - The COMMIT_READY.ps1 script may have encountered an error
2. **Linting/formatting failure** - The `-Quick` flag runs format and lint checks
3. **Import/dependency issue** - Python import errors or missing dependencies
4. **PowerShell compatibility** - Ubuntu uses bash/sh, not PowerShell native execution
5. **Environment variable issues** - Missing SMS_ENV or other required environment variables
6. **Code formatting mismatch** - Black/Ruff formatting found issues that need fixing

### Logs Access Issue

GitHub requires authentication to view the detailed job logs. The specific error message in the "Run COMMIT_READY quick smoke..." step is not visible without signing in to GitHub.

---

## 2. E2E Tests - Run #226

### Failure Details

- **Workflow:** `e2e-tests.yml`
- **Status:** FAILED ❌
- **Duration:** 13m 24s (13m 5s for the "e2e" job)
- **Commit:** `6941bbd7f56566681eb50a0617ef002b6684d126`
- **Triggered:** Push to main branch
- **Browser:** Chromium (Playwright)

### Test Results Summary

- **Total Failures:** 21 failed test cases
- **Error Type:** TimeoutError (consistent across all failures)
- **Failure Rate:** 100% (all tests in critical-flows.spec.ts failed)

### Failed Test Cases

All failures occurred in `tests/critical-flows.spec.ts` with the following pattern:

#### Authentication Flow Tests

1. **Test:** "should login successfully" (Retry #2, #1, and initial attempt)
2. **Test:** "should logout successfully" (Retry #2, #1, and initial attempt)

#### Dashboard Navigation Tests

3. **Test:** "should navigate to Students page" (Retry #2, #1, and initial attempt)
4. **Test:** "should navigate to Courses page" (Retry #2, #1, and initial attempt)
5. **Test:** "should navigate to Grades page" (All attempts)
6. **Test:** "should navigate to Attendance page" (All attempts)

#### Students Management Tests

7. **Test:** "should display students list" (All attempts)
8. **Test:** "should search students" (implied - included in "21 failed" count)

### Root Cause: Timeout Error

**Error Type:** `TimeoutError`
**Error Message Template:**

```text
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
at ../src/__e2e__/helpers.ts:56

  54 | // Wait for redirect
> 56 | await page.waitForURL(/\/dashboard/, { timeout: 10000 });
   |       ^
  57 | await page.waitForLoadState('networkidle');
  58 | }
  59 |

```text
### Location of Error

**File:** [frontend/src/__e2e__/helpers.ts](frontend/src/__e2e__/helpers.ts#L56)
**Function:** `login()` helper function
**Line:** 56

### Error Analysis

The error indicates that:

1. **Navigation Failure:** The page is not navigating to `/dashboard` after login
2. **Timeout:** The wait timeout is 10,000ms (10 seconds), which is being exceeded
3. **All tests blocked:** Since all tests depend on the login helper, they all fail cascadingly
4. **Root issue:** The backend is likely not responding or returning a redirect/response

**Probable causes:**
1. **Backend not starting:** The application backend might not be running or accessible
2. **API endpoint failure:** The login endpoint (`/api/v1/auth/login`) is not responding correctly
3. **Redirect issue:** The login response is not redirecting to `/dashboard` as expected
4. **Page load state:** The page is not reaching the "networkidle" state
5. **Database issue:** Backend database might not be initialized (no sample data)
6. **Authentication state:** Session/token not being set properly
7. **Network connectivity:** GitHub Actions runner cannot reach localhost:8000/API

### Test Artifacts

- **Artifact Generated:** `e2e-test-results` (17.1 MB)
- **SHA256:** `99ba3a37772dc2d2e1fa3ca9d4a783a1d71e8cb0bcf60f3e3d26a1e60a319b89`
- **Location:** Can be downloaded from GitHub Actions run results

### Test Configuration Details

- **Framework:** Playwright with Chromium browser
- **Test Suite:** `critical-flows.spec.ts`
- **Retry Policy:** 2 retries per test (all retries also failed)
- **Timeout:** 10,000ms per navigation wait

---

## Additional Failures in Same Push

The same commit (`6941bbd`) also triggered failures in other workflows:

| Workflow | Status | Issue |
|----------|--------|-------|
| `.github/workflows/ci-cd-pipeline.yml` | ❌ FAILED | Generic CI/CD pipeline failure |
| `.github/workflows/docker-publish.yml` | ❌ FAILED | Docker build/publish failure |

These are likely cascading failures from the backend startup issues that also affect the E2E tests.

### Successful Workflows (Same Commit)

- ✅ COMMIT_READY cleanup smoke test (#336)
- ✅ Trivy Security Scan (#11)
- ✅ CodeQL (#396)
- ✅ Markdown Lint (Reporting) (#462)

---

## Diagnostic Steps to Resolve

### For COMMIT_READY Smoke Failure

1. **Check the detailed logs** by viewing the GitHub Actions run with authentication
2. **Run locally:**
   ```powershell
   # On Ubuntu/Linux
   bash -c "cd /path/to/repo && ./COMMIT_READY.ps1 -Quick"

   # Or with PowerShell 7+
   pwsh COMMIT_READY.ps1 -Quick
   ```
3. **Check for:**
   - Python version compatibility (expected 3.10+)
   - Required dependencies installed
   - Code formatting issues (Black, Ruff)
   - Import errors in backend/frontend

### For E2E Tests Failure

1. **Start the backend manually:**
   ```bash
   cd backend
   python -m uvicorn backend.main:app --reload --port 8000
   ```

2. **Verify the backend is accessible:**
   ```bash
   curl http://localhost:8000/api/v1/auth/login -X POST -H "Content-Type: application/json"
   ```

3. **Check if sample data is initialized:**
   - The test needs valid test user credentials
   - Verify [backend/tests/conftest.py](backend/tests/conftest.py) is creating fixtures properly

4. **Run E2E tests locally:**
   ```bash
   cd frontend
   npm run test:e2e
   ```

5. **Check login flow in [frontend/src/__e2e__/helpers.ts](frontend/src/__e2e__/helpers.ts):**
   - Verify credentials in the login helper
   - Check if backend is responding with correct redirect
   - Verify API endpoint URL in test environment

---

## Recommendations

### Immediate Actions

1. **Verify the recent commit `6941bbd`** - Check what changes were made to backup operations code
2. **Check backend startup** - The E2E failure suggests backend isn't starting in CI environment
3. **Review environment setup in CI** - `.github/workflows/e2e-tests.yml` may need Docker setup or backend startup

### Code Changes to Investigate

The commit message mentions: **"security: strengthen path traversal protection in backup operations"**

This might have introduced:
- File system path validation that's too strict
- Missing dependencies
- Backend startup errors
- Database initialization issues

### Testing Recommendations

1. Run `COMMIT_READY.ps1 -Quick` locally to verify all checks pass
2. Run E2E tests locally with backend running
3. Check all recent changes to:
   - `backend/backup_operations.py` or similar
   - `backend/main.py` startup sequence
   - Environment variable handling

---

## Next Steps

To get detailed error messages, you need to:
1. Visit: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/runs/20542009610/job/59007617259
2. Sign in to your GitHub account
3. Expand the "Run COMMIT_READY quick smoke (skip tests + cleanup for speed) & save logs" step
4. View the full error output

For E2E tests:
1. Visit: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/runs/20542009613
2. Download the `e2e-test-results` artifact (17.1 MB)
3. Check the HTML report for detailed failure screenshots and logs

