# Remaining Issues - Priority & Fix Plan
**Date:** December 28, 2025
**Status:** Post-Frontend-SPA-Rendering-Fix
**Previous Win:** ✅ E2E page rendering now working (SPA served correctly)

---

## 📊 Issues by Criticality

### 🔴 **CRITICAL (Blocks Main Branch / CI Pipeline)**

#### 1. **E2E Tests Still Failing Post-Login** [BLOCKING]
- **Status:** Page renders ✅ | Tests fail at login/navigation ❌
- **Symptom:** All 21 E2E test cases timeout after page loads
- **Root Causes:**
  - Test credentials (`test@example.com / password123`) may not exist in seeded test data
  - Login endpoint (`/api/v1/auth/login`) not working in CI environment
  - Test helpers (`login()`, `logout()`, etc.) may have wrong selectors or timing
  - CSRF or session management issues in CI (permissive auth mode)

- **Impact:** Complete E2E test suite unavailable for deployment validation
- **Evidence:** Error artifacts show login form renders, but tests timeout on login attempts

**Files to Review:**
- [frontend/tests/helpers.ts](frontend/tests/helpers.ts) - Login/logout helper implementation
- [backend/seed_e2e_data.py](backend/seed_e2e_data.py) - E2E test data seeding
- [backend/routers/auth.py](backend/routers/auth.py) - Auth endpoints

**Proposed Fixes:**
```
1. Verify test user exists after seeding:
   - Check seed_e2e_data.py creates user with email "test@example.com"
   - Verify password hash matches "password123"
   - Add logging to seed script

2. Test login endpoint directly in CI:
   - Add health check that validates auth endpoint
   - Test with sample credentials before E2E runs

3. Update test helpers with better error reporting:
   - Catch login errors with details
   - Add page.on('console') to capture JS errors
   - Improve selector specificity for buttons/forms

4. Check CSRF/Session config in permissive mode:
   - Ensure CSRF_ENABLED=0 is respected
   - Verify session cookies are set/sent
```

---

#### 2. **TypeScript Compilation Error in E2E Tests** [BLOCKING]
- **Status:** ❌ Syntax error in test file
- **File:** `frontend/tests/e2e/student-management.spec.ts` Line 232
- **Error:** `Argument of type '{ label: RegExp; }' is not assignable to parameter...`
- **Root Cause:** Using RegExp in `selectOption()` - expects string or array

**Impact:** TypeScript/vitest cannot compile test suite, preventing execution

**Proposed Fix:**
```typescript
// WRONG (current):
await page.selectOption('select', { label: /Option/i });

// CORRECT:
const options = await page.locator('select option').allTextContents();
const matching = options.find(o => /Option/i.test(o));
if (matching) await page.selectOption('select', matching);
```

**Time to Fix:** 10 minutes

---

### 🟠 **HIGH (Degrades CI/Deployment Capability)**

#### 3. **Diagnostic Test Not Running / Not Collecting Output** [HIGH]
- **Status:** ❌ Added diagnostic test, but output not visible in results
- **Root Cause:**
  - Diagnostic test may be skipped due to Playwright test filters
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
