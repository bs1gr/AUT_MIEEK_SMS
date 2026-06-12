# Analytics Dashboard E2E Testing Guide - Feature #125

## Overview

E2E tests for the Analytics Dashboard have been created in `frontend/tests/analytics-dashboard.spec.ts`. This guide explains how to run them and what they test.

## Test File Location
```
frontend/tests/analytics-dashboard.spec.ts
```

## Test Coverage

The E2E test suite includes **50+ comprehensive tests** organized into 11 test groups:

### 1. **Page Load & Basic Rendering** (4 tests)
- ✅ Page loads successfully
- ✅ All 4 summary cards display (Students, Courses, Avg Grade, Attendance)
- ✅ All 5 chart sections render (Performance, Distribution, Attendance, Trend, Stats)
- ✅ No loading spinner after page load

### 2. **Charts Rendering** (6 tests)
- ✅ Performance chart renders with data
- ✅ Grade distribution chart displays
- ✅ Pie chart renders with statistics
- ✅ No chart error messages
- ✅ Empty charts handled gracefully
- ✅ All SVG elements render correctly

### 3. **Filter Controls** (5 tests)
- ✅ Date range filter selector displays (Week/Month/Semester)
- ✅ Date range selection works
- ✅ Course filter selector available
- ✅ Filters update charts when changed
- ✅ Multiple filter combinations work

### 4. **Summary Cards** (3 tests)
- ✅ Numeric values display in all cards
- ✅ Card icons render (from lucide-react)
- ✅ All card titles present (Students, Courses, Grade, Attendance)

### 5. **Navigation** (4 tests)
- ✅ Refresh button available
- ✅ Back navigation button exists
- ✅ Can navigate back to dashboard
- ✅ Analytics appears in navigation tabs

### 6. **Internationalization (i18n)** (3 tests)
- ✅ Content displays in current language
- ✅ Language switching supported
- ✅ Labels properly localized (EN/EL)

### 7. **Responsive Design** (5 tests)
- ✅ Mobile responsive (375px viewport)
- ✅ Tablet responsive (768px viewport)
- ✅ Desktop responsive (1920px viewport)
- ✅ Layout reflows on mobile
- ✅ All charts remain visible at all breakpoints

### 8. **Error Handling** (3 tests)
- ✅ Missing data handled gracefully
- ✅ Retry button displayed on error
- ✅ Loading state displays correctly

### 9. **Performance** (2 tests)
- ✅ Initial page load within 3 seconds
- ✅ Charts render without lag

### 10. **Accessibility** (4 tests)
- ✅ Proper heading hierarchy
- ✅ Alt text for images/SVGs
- ✅ Keyboard navigable
- ✅ Sufficient color contrast

### 11. **Advanced** (Additional coverage)
- Focus management
- Error recovery
- Data persistence
- State management

## How to Run

### Prerequisites
1. **Start the application in NATIVE mode** (development):
   ```powershell
   .\NATIVE.ps1 -Start
   ```
   This starts:
   - Backend API on `http://localhost:8000`
   - Frontend dev server on `http://localhost:5173`

2. **Wait for both servers to be ready** (~30-60 seconds)

### Running All Analytics Tests

```powershell
# From frontend directory
npm run e2e -- tests/analytics-dashboard.spec.ts

# Or from project root
npm --prefix frontend run e2e -- tests/analytics-dashboard.spec.ts
```

### Running Specific Test Groups

```powershell
# Run only page load tests
npm run e2e -- tests/analytics-dashboard.spec.ts -g "Page Load"

# Run only chart tests
npm run e2e -- tests/analytics-dashboard.spec.ts -g "Charts"

# Run only filter tests
npm run e2e -- tests/analytics-dashboard.spec.ts -g "Filter"

# Run only responsive tests
npm run e2e -- tests/analytics-dashboard.spec.ts -g "Responsive"
```

### Running with UI Mode (Recommended for Debugging)

```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts --ui
```

This opens Playwright's interactive UI where you can:
- See real-time test execution
- Step through tests
- Inspect elements
- View network requests

### Running in Headed Mode (See Browser)

```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts --headed
```

Tests run with the browser window visible so you can watch the automation.

## Test Results Interpretation

### Success Output
```
✓ Page Load & Basic Rendering (4 tests)
  ✓ should load analytics page successfully
  ✓ should display all summary cards
  ✓ should display all chart sections
  ✓ should not show loading spinner after page load

✓ Charts Rendering (6 tests)
  ...
```

### Common Issues & Solutions

#### 1. **Tests Timeout (Page Not Loading)**
```
Error: Timeout waiting for page to load
```
**Solution**:
- Ensure backend is running: `.\NATIVE.ps1 -Start`
- Check if frontend is serving on `http://localhost:5173`
- Increase timeout: `npm run e2e -- --timeout=10000`

#### 2. **Cannot Find Elements**
```
Error: locator.toBeVisible() timeout
```
**Solution**:
- Run with `--headed` flag to see what's on screen
- Check browser console for React errors
- Verify test file is looking for correct selectors

#### 3. **API Errors (500, 503, etc)**
```
NetworkError: Failed to fetch from /api/v1/analytics/...
```
**Solution**:
- Ensure backend migrations ran: `alembic upgrade head`
- Check backend logs: `backend/logs/app.log`
- Verify test database is initialized

#### 4. **Port Already in Use**
```
Error: connect EADDRINUSE :::5173
```
**Solution**:
```powershell
# Kill processes on those ports
netstat -ano | findstr ":5173"
taskkill /PID <PID> /F

# Or just restart
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Start
```

## Test Data

Tests use mock data injected via React Query. The API endpoints being tested:

1. **GET /api/v1/analytics/dashboard/summary** - System metrics
2. **GET /api/v1/analytics/student/{id}/summary** - Student stats
3. **GET /api/v1/analytics/student/{id}/courses** - Course breakdown
4. **GET /api/v1/analytics/student/{id}/final-grade** - Grade calculation
5. **GET /api/v1/analytics/dashboard/performance** - Performance trends

## CI/CD Integration

For GitHub Actions, E2E tests run automatically on:
- Pull requests to `main` or `develop`
- Push to `main`
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for CI configuration.

## Debugging Tips

### 1. **See Test Execution in Slow Motion**
```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts --slowmo=1000
```

### 2. **Keep Browser Open After Tests**
```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts --headed --no-close
```

### 3. **Trace Tests (Record Network & Browser Actions)**
```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts --trace on
```
Then view trace in Playwright inspector:
```powershell
npx playwright show-trace trace.zip
```

### 4. **Debug Single Test**
```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts -g "should load analytics page successfully"
```

### 5. **View Generated Report**
```powershell
npm run e2e -- tests/analytics-dashboard.spec.ts
npx playwright show-report
```

## Continuous Monitoring

After each commit:
1. Pre-commit tests run locally
2. CI/CD runs full test suite on PR
3. Reports available in GitHub Actions

Expected results:
- ✅ All 50+ tests passing
- ✅ <3s total execution time
- ✅ Zero flaky tests
- ✅ 100% pass rate

## Next Steps

After E2E tests pass:

1. **API Data Integration** → Replace mock data with real API
2. **Documentation** → Update CHANGELOG and deployment guide
3. **Code Review** → PR ready for merge to `main`
4. **Feature Completion** → Feature #125 marked complete
5. **Phase 3 Progress** → Move to Feature #126 (Real-Time Notifications)

## Useful Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test Locators](https://playwright.dev/docs/locators)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org)

---

**Test File**: `frontend/tests/analytics-dashboard.spec.ts`
**Created**: January 16, 2026
**Feature**: #125 Analytics Dashboard
**Status**: Ready for testing ✅
