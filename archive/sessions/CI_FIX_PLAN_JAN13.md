# CI/CD Test Failures - Fix Plan (Jan 13, 2026)

**Status**: 🔴 BLOCKING - 2 critical failures preventing Feature #127
**Priority**: CRITICAL
**Impact**: Blocks all new feature development

---

## Failure Summary

### Run ID: 20951105749
**Commit**: docs: Add production validation documentation and test utilities (04dd22285)
**Date**: 2026-01-13 09:12 UTC
**Failed Jobs**: 2/18

---

## Critical Failure #1: Backend Tests (Exit Code 2)

### Error Details
```
ERROR tests/test_control_endpoints.py - ValueError: Invalid async_mode specified
ERROR tests/test_control_path_traversal.py - ValueError: Invalid async_mode specified
```

**Location**: `backend/main.py:25`
**Root Cause**: SocketIO server initialization with invalid async_mode parameter

### Error Stack Trace
```python
tests/test_control_endpoints.py:12: in <module>
    import backend.main as main
main.py:25: in <module>
    # SocketIO initialization line
engineio/base_server.py:81: in __init__
    raise ValueError('Invalid async_mode specified')
```

### Impact
- 610 test items collected but 2 errors during collection
- Tests cannot run due to import failure
- Affects ALL tests that import `backend.main`

### Fix Required
1. Check `backend/main.py` line 25 for SocketIO initialization
2. Verify `async_mode` parameter value
3. Expected values: `'asgi'`, `'aiohttp'`, `'tornado'`, `'sanic'`, `'eventlet'`, `'gevent'`, or `None`
4. Likely issue: Invalid string or typo in async_mode parameter

---

## Critical Failure #2: Frontend Linting (Exit Code 1)

### Error Details
```
##[error]  57:30  error  A `require()` style import is forbidden
@typescript-eslint/no-require-imports
```

**Location**: `frontend/src/features/analytics/components/__tests__/AnalyticsDashboard.test.tsx:57`

### Additional Warnings (118 total - non-blocking)
- Hardcoded strings (i18next/no-literal-string) - 6 instances
- Unused imports/variables - 5 instances
- Console statements in useNotifications.ts - 5 instances
- Missing React Hook dependencies - 2 instances
- `@ts-ignore` should be `@ts-expect-error` - 1 instance

### Impact
- 1 ESLint error (blocking)
- 118 ESLint warnings (non-blocking but should be fixed)

### Fix Required
1. Replace `require()` with ES6 `import` in AnalyticsDashboard.test.tsx line 57
2. (Optional) Fix hardcoded strings with i18n `t()` calls
3. (Optional) Remove unused imports
4. (Optional) Replace console.log with console.warn/error or remove

---

## Fix Execution Plan

### Step 1: Fix Backend Test Import Error (CRITICAL)
**Time**: 15 minutes
**Files**: `backend/main.py`

```bash
# Actions
1. Read backend/main.py line 25 (SocketIO initialization)
2. Identify invalid async_mode value
3. Correct to valid value (likely 'asgi' for FastAPI)
4. Run local backend tests to verify fix: .\RUN_TESTS_BATCH.ps1
```

### Step 2: Fix Frontend Linting Error (CRITICAL)
**Time**: 10 minutes
**Files**: `frontend/src/features/analytics/components/__tests__/AnalyticsDashboard.test.tsx`

```bash
# Actions
1. Read AnalyticsDashboard.test.tsx line 57
2. Replace require() with import statement
3. Verify TypeScript types are correct
4. Run frontend linting locally: npm run lint --prefix frontend
```

### Step 3: Verify Fixes Locally
**Time**: 20 minutes

```powershell
# Backend tests
.\RUN_TESTS_BATCH.ps1 -BatchSize 5

# Frontend linting
npm --prefix frontend run lint

# Frontend tests
npm --prefix frontend run test
```

### Step 4: Commit Fixes
**Time**: 10 minutes

```powershell
.\COMMIT_READY.ps1 -Quick
git add .
git commit -m "fix: Resolve CI/CD test failures (SocketIO async_mode + ESLint require)"
git push origin main
```

### Step 5: Monitor CI/CD
**Time**: 15 minutes

```powershell
# Watch for CI completion
gh run watch

# Verify all checks pass
gh run list --limit 1
```

---

## Success Criteria

✅ **Backend Tests**: All 610+ tests passing (no collection errors)
✅ **Frontend Linting**: 0 errors (warnings acceptable for now)
✅ **CI/CD Pipeline**: All 18 jobs passing
✅ **Ready for Feature #127**: Can begin Bulk Import/Export implementation

---

## Timeline

- **Fix Backend (Step 1-2)**: 25 minutes
- **Local Testing (Step 3)**: 20 minutes
- **Commit & Push (Step 4)**: 10 minutes
- **CI/CD Monitoring (Step 5)**: 15 minutes
- **Total**: ~70 minutes (1.2 hours)

---

## Next Steps After Fix

1. ✅ Verify all CI/CD checks passing
2. ✅ Update UNIFIED_WORK_PLAN.md (mark CI fixes complete)
3. ✅ Begin Feature #127: Bulk Import/Export (per Phase 3 roadmap)

---

**Created**: 2026-01-13
**Owner**: AI Agent / QA
**Status**: Ready to Execute
