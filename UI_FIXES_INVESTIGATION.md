# UI Fixes Investigation - E2E Test Failures

## Status Summary

**Previous Failures (Run #27263892727):**
- ✅ **52 tests PASSED** - Authentication working properly
- ❌ **3 tests FAILED** - UI/Frontend issues
- 🔧 **1 fix applied** - Dialog accessibility

## Fixed Issues

### 1. CreateEditDashboardDialog - FIXED ✅

**Test:** `custom-dashboards.spec.ts:51` - "should open create dashboard dialog"

**Problem:** 
- Test was looking for `locator('[role="dialog"]')` 
- Dialog container div did not have `role="dialog"` attribute
- This is also an accessibility issue

**Solution Applied:**
```typescript
// Before:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">

// After:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div role="dialog" aria-labelledby="create-edit-dashboard-title" className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
    ...
    <h2 id="create-edit-dashboard-title" className="text-xl font-semibold text-slate-900">
```

**Commit:** `db92c9846` - "fix: add role="dialog" and aria-labelledby to CreateEditDashboardDialog for E2E tests"

---

## Remaining Issues

### 2. Analytics Dashboard - Chart Headings NOT Rendering

**Tests:**
- `analytics-dashboard.spec.ts:49` - "should display all chart sections"
- `analytics-dashboard.spec.ts:118` - "should display date range filter selector"

**Root Causes Identified:**

#### Issue 2a: Empty Data
The charts are conditionally rendering based on data:
```typescript
{visibleCharts.has('performance') && (
  <PerformanceChart
    data={performanceData}
    title={t('analytics.chartStudentPerformance')}
    height={350}
  />
)}
```

If `performanceData` is empty, the chart doesn't render, so the heading never appears.

#### Issue 2b: Translation Keys vs Expected Text
The tests expect exact English text:
```typescript
await expect(page.getByRole('heading', { name: 'Student Performance' })).toBeVisible();
```

But the charts are rendered with translated titles:
```typescript
title={t('analytics.chartStudentPerformance')}  // Returns translated text
```

The translation key `analytics.chartStudentPerformance` might not be returning "Student Performance" in the test environment.

#### Issue 2c: Filter Controls
Test on line 118 looks for:
```typescript
await expect(page.getByText('Time Period')).toBeVisible();
await expect(page.getByRole('combobox').nth(3)).toBeVisible();
```

The filter controls exist in the Analytics Dashboard, but might not be in the correct position or visible in the test.

---

## Next Steps to Fix Remaining Issues

### Option 1: Fix Test Data Loading
Ensure that when the analytics page loads, it fetches data and renders charts:
1. Check `/analytics/lookups` endpoint response
2. Verify student/course data is being loaded  
3. Confirm performance data is being calculated and set

### Option 2: Fix Translation/Locale Setup
In test environment:
1. Configure i18n to return English strings during E2E tests
2. Or update tests to look for translated text (less ideal)
3. Or use `data-testid` attributes on chart headings for more robust selection

### Option 3: Improve Test Selectors
Use more reliable selectors than text matching:
```typescript
// Instead of looking for exact text:
await expect(page.getByRole('heading', { name: 'Student Performance' })).toBeVisible();

// Use data-testid:
await expect(page.getByTestId('chart-student-performance')).toBeVisible();
```

---

## Files Modified

1. `frontend/src/features/dashboard/components/CreateEditDashboardDialog.tsx`
   - Added `role="dialog"` ✅
   - Added `aria-labelledby` attribute ✅
   - Added `id` to heading for accessibility ✅

---

## Test Execution Details

**Workflow Run:** #27263892727
**Status:** FAILED (E2E tests)
**Duration:** ~6 minutes
**Auth Setup:** ✅ WORKING (all diagnostics passed)
**Backend:** ✅ RUNNING (health checks passed)

**Test Results:**
- 52 passed ✅
- 3 failed ❌
- 1 skipped ⏭️
- 71 not run (due to dependencies)

---

## Recommendations

1. **Priority 1:** Add `data-testid` attributes to chart components for robust E2E testing
2. **Priority 2:** Investigate data loading in analytics endpoint (`/analytics/lookups`)
3. **Priority 3:** Ensure i18n is configured correctly for test environment
4. **Priority 4:** Add more granular logging in data loading functions

---

## Commands to Investigate Further

```bash
# Check if analytics endpoint returns data
curl -H "Authorization: Bearer <token>" \
  http://127.0.0.1:8000/api/v1/analytics/lookups

# Check dashboard data endpoint
curl -H "Authorization: Bearer <token>" \
  http://127.0.0.1:8000/api/v1/dashboard/data

# Run E2E tests with verbose logging
npm run e2e -- --reporter=list --workers=1 --timeout=120000 --debug
```
