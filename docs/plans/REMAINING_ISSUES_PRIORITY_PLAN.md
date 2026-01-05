# Remaining Issues - Priority & Fix Plan
**Date:** January 5, 2026
**Status:** ✅ E2E Authentication Fixed
**Latest Win:** ✅ E2E tests now successfully authenticate and navigate past login

---

## ✅ **RESOLVED ISSUES**

### 1. **E2E Authentication & Navigation Fixed** [WAS BLOCKING]
- **Resolution Date:** January 5, 2026
- **Status:** ✅ FIXED - Authentication layer working perfectly
- **What Was Fixed:**
  1. ✅ TypeScript compilation error (line 242-244 selectOption RegExp → string)
  2. ✅ Enhanced seed script validation (logs user creation, entity counts)
  3. ✅ Improved login helpers with diagnostics (pre-flight checks, error capture)
  4. ✅ Fixed token persistence - now sets both `sms_access_token` AND `sms_user_v1`
  5. ✅ E2E workflow validation (database verification, login health check)

- **Root Cause (Final):** The `loginViaAPI()` helper only set the JWT token in localStorage but didn't set the user object. The AuthContext requires both `sms_access_token` and `sms_user_v1` for `RequireAuth` to recognize authenticated state.

- **Solution:** Modified `loginViaAPI()` to:
  1. POST to `/auth/login` → get token
  2. GET from `/auth/me` → fetch user profile
  3. Set both in localStorage

- **Validation:**
  - ✅ Login succeeds (200 OK, token length: 139-148 chars)
  - ✅ User profile fetched (test@example.com)
  - ✅ Navigation to `/dashboard` successful
  - ✅ No authentication redirects

- **Documentation:** See [E2E_AUTHENTICATION_FIX.md](../E2E_AUTHENTICATION_FIX.md)

---

## 📊 Issues by Criticality

### 🔴 **CRITICAL (Blocks Main Branch / CI Pipeline)**

#### 1. **E2E Test Implementation Issues** [BLOCKING]
- **Status:** Authentication works ✅ | CRUD operations fail ❌
- **Symptom:** Tests fail after successful login with various errors:
  - Student creation doesn't capture ID → edit/delete fail with `undefined` ID
  - Course creation succeeds but verification looks in wrong element (`<option>` instead of table)
  - Attendance/grades pages timeout waiting for data or selectors
  - Analytics page can't find course codes

- **Root Causes:**
  1. Tests don't wait for/capture API response IDs after creating entities
  2. Selectors target wrong elements (e.g., dropdown options vs table cells)
  3. Test data setup incomplete (missing enrollments/prerequisites)
  4. Timing issues (networkidle timeout vs actual data loading)

**Impact:** All 7 E2E test cases fail despite successful authentication

**Files to Review:**
- [frontend/tests/e2e/student-management.spec.ts](../../frontend/tests/e2e/student-management.spec.ts) - All test cases
- [frontend/tests/e2e/helpers.ts](../../frontend/tests/e2e/helpers.ts) - Helper functions
- [backend/seed_e2e_data.py](../../backend/seed_e2e_data.py) - Test data seeding

**Proposed Fixes:**
```
1. Capture created entity IDs:
   - Add helper to wait for API response and extract ID
   - Store in test context for later use

2. Fix verification selectors:
   - Use table rows instead of dropdown options
   - Add data-testid attributes to key elements

3. Enhance test data seeding:
   - Ensure enrollments exist for grade/attendance tests
   - Add courses with proper configuration

4. Improve wait strategies:
   - Use waitForResponse() for API calls
   - Add explicit waits for data to appear in UI
```

**Priority:** HIGH - Tests pass authentication but fail on core features

---

### 🟠 **HIGH (Degrades CI/Deployment Capability)**

#### 2. **Diagnostic Test Not Running / Not Collecting Output** [DEPRECATED]
- **Status:** 🔄 May be obsolete now that authentication works
- **Note:** Original diagnostic test was to debug authentication. Now that it's fixed, this may not be needed.
  - Test output captured in browser console, not in test results
  - Reporter may not preserve console logs from diagnostic runs

**Impact:** Cannot validate backend response structure, makes debugging harder

**Proposed Fixes:**
```
1. Move diagnostic logic to separate fixture:
   - Run once before all tests
   - Write results to stdout/file

2. Add explicit artifact upload:
   - Save diagnostic output to file
   - Upload as GitHub artifact

3. Add request/response logging to test:
   - Capture all network requests
   - Save to JSON file in test-results/
```

**Time to Fix:** 30 minutes

---

#### 4. **E2E Test Data Seeding May Be Incomplete** [HIGH]
- **Status:** ⚠️ Seed script exists, but unclear if running correctly
- **File:** [backend/seed_e2e_data.py](backend/seed_e2e_data.py)
- **Issue:**
  - May not be seeding all required tables (students, courses, enrollments)
  - User may be created but without proper permissions
  - Database schema changes may invalidate old seed data

**Impact:** Tests have no data to work with, leading to "no students found" timeouts

**Proposed Fixes:**
```
1. Add validation to seed script:
   - Count records after seeding
   - Log what was created
   - Exit with error if empty

2. Verify in workflow:
   - Run seed and capture output
   - Check database directly
   - Report counts before starting tests

3. Create comprehensive seed:
   - Seed admin user (test@example.com)
   - Seed 5-10 test students
   - Seed 2-3 test courses
   - Create enrollments linking students to courses
```

**Time to Fix:** 45 minutes

---

### 🟡 **MEDIUM (Reduces Code Quality / Test Coverage)**

#### 5. **Test Coverage Not Fully Visible** [MEDIUM]
- **Status:** ⚠️ Coverage reports generated but not aggregated
- **Issue:** Backend tests have coverage, frontend tests have coverage, but not combined
- **Impact:** Cannot see overall project coverage percentage

**Proposed Fixes:**
```
1. Add coverage step to workflow:
   - Collect backend coverage
   - Collect frontend coverage
   - Combine into single report
   - Upload to code quality service

2. Set coverage thresholds:
   - Backend: >60%
   - Frontend: >50%
```

**Time to Fix:** 1 hour

---

#### 6. **E2E Tests Don't Cover Happy Path Fully** [MEDIUM]
- **Status:** ⚠️ Tests exist but many are skipped or flaky
- **Issue:**
  - `test.skip()` used for several scenarios
  - Retry policy = 2 retries (indicates flakiness)
  - Some selectors may be brittle (too specific)

**Proposed Fixes:**
```
1. Replace skipped tests with parameterized versions
2. Add better waits/retry logic for UI elements
3. Test both EN and EL interfaces
```

**Time to Fix:** 2 hours

---

### 🔵 **LOW (Nice-to-Have Improvements)**

#### 7. **GitHub Actions Caching Not Optimized** [LOW]
- **Status:** ⚠️ Caches exist but may not be efficient
- **Issue:** Docker layer caching, npm cache, pip cache could be better tuned

**Proposed Fixes:**
```
1. Add docker buildkit with layer caching
2. Improve pip dependency cache keying
3. Pre-cache playwright browsers
```

**Time to Fix:** 2 hours

---

#### 8. **Load Testing Workflow Disabled** [LOW]
- **Status:** ⚠️ Exists but not running regularly
- **Issue:** Not integrated into main pipeline

**Proposed Fixes:**
```
1. Schedule monthly load tests
2. Add performance metrics tracking
3. Create performance regression alerts
```

**Time to Fix:** 1.5 hours

---

## 🎯 Recommended Fix Order

### **TODAY (Next 2-3 hours) - Unblock E2E**
1. ✅ ~~Fix TypeScript error~~ - 10 min
2. **Review seed_e2e_data.py** - 20 min
3. **Fix test helpers (login/logout)** - 30 min
4. **Add login validation to workflow** - 20 min
5. **Run local E2E test** - 15 min
6. **Verify CI E2E passes** - 30 min wait

### **TOMORROW (2 hours) - Improve Observability**
7. **Move diagnostic test to fixture** - 30 min
8. **Add data validation logging** - 20 min
9. **Create comprehensive seed** - 20 min
10. **Document test data requirements** - 20 min

### **THIS WEEK (4 hours) - Polish**
11. **Fix remaining E2E flakiness** - 2 hours
12. **Add coverage aggregation** - 1 hour
13. **Optimize caching** - 1 hour

### **NEXT WEEK (Optional) - Nice-to-Have**
14. **Enable load testing** - 1.5 hours
15. **Add performance metrics** - 2 hours

---

## 📋 Success Criteria

### For Each Fix:
- [ ] Local reproduction of issue
- [ ] Root cause identified
- [ ] Fix applied and tested locally
- [ ] Committed to GitHub
- [ ] CI workflow passes
- [ ] Documentation updated

### Overall:
- [ ] All 21 E2E tests pass consistently (0 flakes)
- [ ] Diagnostic information visible in CI logs
- [ ] Test coverage >60% backend, >50% frontend
- [ ] Zero test timeouts
- [ ] Seed data validation in place

---

## 🔗 Key Files to Review

**Critical Path:**
1. [frontend/tests/helpers.ts](frontend/tests/helpers.ts) - Login/logout functions
2. [backend/seed_e2e_data.py](backend/seed_e2e_data.py) - Test data creation
3. [backend/routers/auth.py](backend/routers/auth.py) - Auth endpoints
4. [.github/workflows/e2e-tests.yml](.github/workflows/e2e-tests.yml) - CI configuration
5. [frontend/tests/e2e/student-management.spec.ts](frontend/tests/e2e/student-management.spec.ts) - Test suite

**Secondary:**
6. [frontend/tests/critical-flows.spec.ts](frontend/tests/critical-flows.spec.ts) - Core flows
7. [backend/routers/root_router.py](backend/routers/root_router.py) - SPA serving
8. [frontend/playwright.config.ts](frontend/playwright.config.ts) - Playwright config

---

## 📝 Notes

- The **frontend SPA rendering fix** is done ✅
- Page **DOES load** in E2E environment ✅
- Issue is now **functional** (login, data, test logic), not infrastructure ✅
- Tests are **close to working** - likely 70% of the way there
- Focus should be on test data and auth in permissive mode

---

**Next Action:** Start with #1 (TypeScript error) and #2 (seed review)
