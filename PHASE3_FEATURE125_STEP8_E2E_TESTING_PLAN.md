# Feature #125: Analytics Dashboard - Step 8 E2E Testing Plan

**Status**: 🟢 **READY TO BEGIN**
**Date**: January 12, 2026
**Estimated Duration**: 2-3 hours
**Owner**: AI Agent / QA

---

## 📋 E2E Testing Overview

### Objective
Test all user workflows for the analytics dashboard to ensure:
- ✅ All components render correctly
- ✅ Data loads from backend API
- ✅ User interactions work as expected
- ✅ Error handling functions properly
- ✅ Responsive design on all screen sizes
- ✅ Performance meets targets (<2s load time)

### Test Scope
- **User Workflows**: 3+ critical paths
- **Browsers**: Chromium, Firefox, WebKit
- **Devices**: Mobile (375px), Tablet (768px), Desktop (1024px+)
- **Coverage**: Feature-complete validation

### Test Framework
- **Playwright**: E2E test runner
- **Testing Library**: Component queries
- **@playwright/test**: Assertion library

---

## 🎯 Critical User Workflows (3+ E2E Tests)

### Workflow 1: Student Dashboard Load

**Description**: User opens analytics dashboard and views student performance

**Steps**:
1. Login as teacher
2. Navigate to analytics page
3. Select a specific student
4. Wait for data to load
5. Verify all 4 cards display
6. Check data is current (not stale)

**Expected Results**:
- ✅ Performance card shows grade (A-F) and percentage
- ✅ Trends chart displays line with trend indicator
- ✅ Attendance card shows percentage and status
- ✅ Grade distribution shows histogram with legend
- ✅ All widgets have actual data (not loading state)
- ✅ No console errors

**Assertions**:
```
expect(page.locator('[data-testid="performance-card"]')).toBeVisible()
expect(page.locator('[data-testid="trends-chart"]')).toBeVisible()
expect(page.locator('[data-testid="attendance-card"]')).toBeVisible()
expect(page.locator('[data-testid="grade-distribution"]')).toBeVisible()
expect(page.locator('text=Grade:')).toBeTruthy()
```

### Workflow 2: Performance Card Analysis

**Description**: User views and interprets student performance card

**Steps**:
1. Dashboard loaded (from Workflow 1)
2. Look at performance card
3. Verify grade letter matches percentage
4. Hover over course breakdown
5. See individual course averages
6. Check status color (green/blue/yellow/orange/red)

**Expected Results**:
- ✅ Grade letter is A-F (not invalid)
- ✅ Percentage is 0-100 (valid range)
- ✅ Grade matches percentage range:
  - A: 90-100%, B: 80-89%, C: 70-79%, D: 60-69%, F: <60%
- ✅ Course breakdown is accurate
- ✅ Color matches performance level

**Assertions**:
```
expect(gradeText).toMatch(/^[A-F]$/)
expect(percentage).toBeGreaterThanOrEqual(0)
expect(percentage).toBeLessThanOrEqual(100)
expect(courses).toHaveLength(1) // at least 1 course
```

### Workflow 3: Trends Analysis

**Description**: User analyzes grade trends over time

**Steps**:
1. Dashboard loaded
2. Look at trends chart
3. Read trend direction (improving/declining/stable)
4. Hover over data points
5. See tooltip with date and grade
6. Observe moving average line

**Expected Results**:
- ✅ Trend badge displays (📈 / 📉 / ➡️)
- ✅ Data points cover last 30 days
- ✅ Moving average line visible
- ✅ Tooltip shows date and grade on hover
- ✅ Chart is interactive (zoom, pan ready)

**Assertions**:
```
expect(page.locator('[data-testid="trend-badge"]')).toContainText(/📈|📉|➡️/)
expect(dataPoints).toHaveLength(30) // or less if fewer grades
expect(page.locator('.recharts-tooltip')).toBeDefined()
```

### Workflow 4: Attendance Tracking

**Description**: User monitors student attendance rate

**Steps**:
1. Dashboard loaded
2. View attendance card
3. Check overall attendance percentage
4. Review course-by-course breakdown
5. Verify status indicator (good/warning)
6. See present/absent counts

**Expected Results**:
- ✅ Overall attendance is 0-100%
- ✅ Status is "Good" (≥75%) or "Warning" (<75%)
- ✅ All courses listed with present/absent
- ✅ Math adds up: present + absent = total
- ✅ Color matches status level

**Assertions**:
```
expect(percentage).toBeGreaterThanOrEqual(0)
expect(percentage).toBeLessThanOrEqual(100)
expect(status).toMatch(/Good|Warning/)
expect(present + absent).toEqual(total)
```

### Workflow 5: Refresh & Error Handling

**Description**: User refreshes data and handles errors gracefully

**Steps**:
1. Dashboard loaded
2. Click refresh button
3. System fetches fresh data
4. Verify data updated (new timestamp)
5. Simulate API error (mock failure)
6. Verify error message shows
7. Click retry button
8. Data loads successfully

**Expected Results**:
- ✅ Refresh button disables during loading
- ✅ Spinner shows while loading
- ✅ Data refreshes without full page reload
- ✅ Error message is clear and actionable
- ✅ Retry button works
- ✅ Data recovers after error

**Assertions**:
```
expect(refreshButton).toBeDisabled()
expect(page.locator('.spinner')).toBeVisible()
expect(page.locator('[data-testid="error-message"]')).toContainText(/Error|Failed/)
expect(retryButton).toBeClickable()
```

### Workflow 6: Responsive Design

**Description**: User views dashboard on different device sizes

**Steps**:
1. Set viewport to mobile (375px)
2. Dashboard loads and adapts
3. Cards stack vertically
4. Text is readable
5. Charts scale properly
6. Set viewport to tablet (768px)
7. 2-column layout appears
8. Set viewport to desktop (1024px+)
9. 4-column grid appears

**Expected Results**:
- ✅ Mobile: 1 column layout
- ✅ Tablet: 2 column layout
- ✅ Desktop: 4 column layout
- ✅ All content visible (no horizontal scroll)
- ✅ Text is legible (font size reasonable)
- ✅ Charts render properly on all sizes

**Assertions**:
```
// Mobile
await page.setViewportSize({ width: 375, height: 667 })
expect(cards).toHaveLength(4) // all 4 visible (stacked)
expect(pageWidth).toBeLessThanOrEqual(375)

// Tablet
await page.setViewportSize({ width: 768, height: 1024 })
// Check grid has 2 columns

// Desktop
await page.setViewportSize({ width: 1280, height: 720 })
// Check grid has 4 columns
```

---

## 🧪 Test File Structure

### File: `frontend/tests/e2e/analytics-dashboard.spec.ts`

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Analytics Dashboard - Feature #125', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    // Login as teacher
    // Select student
  });

  test('Workflow 1: Load dashboard with all widgets', async ({ page }) => {
    // Implementation
  });

  test('Workflow 2: Analyze student performance card', async ({ page }) => {
    // Implementation
  });

  test('Workflow 3: View grade trends', async ({ page }) => {
    // Implementation
  });

  test('Workflow 4: Monitor attendance', async ({ page }) => {
    // Implementation
  });

  test('Workflow 5: Handle refresh and errors', async ({ page }) => {
    // Implementation
  });

  test('Workflow 6: Responsive design on mobile/tablet/desktop', async ({ page }) => {
    // Implementation
  });
});
```

---

## 📝 Test Implementation Details

### Setup Steps (beforeEach)

```typescript
test.beforeEach(async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:5173');

  // 2. Login as teacher
  await page.fill('[name="email"]', 'teacher@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button:has-text("Login")');

  // 3. Wait for login to complete
  await page.waitForNavigation();

  // 4. Navigate to analytics
  await page.click('a:has-text("Analytics")');

  // 5. Wait for analytics page to load
  await page.waitForSelector('[data-testid="analytics-dashboard"]');

  // 6. Select a student from dropdown
  await page.click('[data-testid="student-select"]');
  await page.click('[role="option"]:first-child');

  // 7. Wait for data to load
  await page.waitForSelector('[data-testid="performance-card"]');
});
```

### Test 1: Dashboard Load

```typescript
test('Workflow 1: Load dashboard with all widgets', async ({ page }) => {
  // Verify all 4 cards are visible
  const performanceCard = page.locator('[data-testid="performance-card"]');
  const trendsChart = page.locator('[data-testid="trends-chart"]');
  const attendanceCard = page.locator('[data-testid="attendance-card"]');
  const gradeDistribution = page.locator('[data-testid="grade-distribution"]');

  await expect(performanceCard).toBeVisible();
  await expect(trendsChart).toBeVisible();
  await expect(attendanceCard).toBeVisible();
  await expect(gradeDistribution).toBeVisible();

  // Verify data is loaded (not in loading state)
  const spinner = page.locator('.spinner');
  await expect(spinner).not.toBeVisible();

  // Verify no console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  expect(errors).toHaveLength(0);
});
```

### Test 2: Performance Analysis

```typescript
test('Workflow 2: Analyze student performance card', async ({ page }) => {
  const gradeElement = page.locator('[data-testid="grade-letter"]');
  const percentageElement = page.locator('[data-testid="grade-percentage"]');

  // Get values
  const grade = await gradeElement.textContent();
  const percentage = parseInt(await percentageElement.textContent());

  // Verify grade is valid
  expect(grade).toMatch(/^[A-F]$/);
  expect(percentage).toBeGreaterThanOrEqual(0);
  expect(percentage).toBeLessThanOrEqual(100);

  // Verify grade matches percentage
  if (percentage >= 90) expect(grade).toBe('A');
  else if (percentage >= 80) expect(grade).toBe('B');
  else if (percentage >= 70) expect(grade).toBe('C');
  else if (percentage >= 60) expect(grade).toBe('D');
  else expect(grade).toBe('F');

  // Verify course breakdown exists
  const courseBreakdown = page.locator('[data-testid="course-breakdown"]');
  await expect(courseBreakdown).toBeVisible();

  const courses = page.locator('[data-testid="course-item"]');
  expect(await courses.count()).toBeGreaterThan(0);
});
```

### Test 3: Trends Analysis

```typescript
test('Workflow 3: View grade trends', async ({ page }) => {
  // Verify trend badge exists
  const trendBadge = page.locator('[data-testid="trend-badge"]');
  await expect(trendBadge).toBeVisible();

  const trendText = await trendBadge.textContent();
  expect(trendText).toMatch(/improving|declining|stable/i);

  // Verify chart is rendered
  const chart = page.locator('[data-testid="trends-chart"] svg');
  await expect(chart).toBeVisible();

  // Verify moving average line exists
  const movingAverageLine = page.locator('.moving-average-line');
  await expect(movingAverageLine).toBeVisible();

  // Hover over data point to trigger tooltip
  const firstDataPoint = page.locator('.recharts-scatter-dot').first();
  await firstDataPoint.hover();

  // Verify tooltip appears
  const tooltip = page.locator('.recharts-tooltip');
  await expect(tooltip).toBeVisible();

  const tooltipText = await tooltip.textContent();
  expect(tooltipText).toContain('Date');
  expect(tooltipText).toContain('Grade');
});
```

### Test 4: Attendance Tracking

```typescript
test('Workflow 4: Monitor attendance', async ({ page }) => {
  const attendanceCard = page.locator('[data-testid="attendance-card"]');
  const percentage = await attendanceCard.locator('[data-testid="attendance-percentage"]').textContent();
  const status = await attendanceCard.locator('[data-testid="attendance-status"]').textContent();

  // Verify percentage is valid
  const percentNum = parseInt(percentage);
  expect(percentNum).toBeGreaterThanOrEqual(0);
  expect(percentNum).toBeLessThanOrEqual(100);

  // Verify status matches percentage
  if (percentNum >= 75) {
    expect(status).toContain('Good');
  } else {
    expect(status).toContain('Warning');
  }

  // Verify course breakdown
  const courseItems = attendanceCard.locator('[data-testid="course-item"]');
  const courseCount = await courseItems.count();
  expect(courseCount).toBeGreaterThan(0);

  // Verify attendance math: present + absent = total
  for (let i = 0; i < courseCount; i++) {
    const present = parseInt(await courseItems.nth(i).locator('[data-testid="present"]').textContent());
    const absent = parseInt(await courseItems.nth(i).locator('[data-testid="absent"]').textContent());
    const total = parseInt(await courseItems.nth(i).locator('[data-testid="total"]').textContent());
    expect(present + absent).toBe(total);
  }
});
```

### Test 5: Refresh & Error Handling

```typescript
test('Workflow 5: Handle refresh and errors', async ({ page }) => {
  // Get initial data
  const initialPerformance = await page.locator('[data-testid="grade-percentage"]').textContent();

  // Click refresh button
  const refreshButton = page.locator('[data-testid="refresh-button"]');
  await refreshButton.click();

  // Verify button is disabled during loading
  await expect(refreshButton).toBeDisabled();

  // Verify spinner shows
  const spinner = page.locator('.spinner');
  await expect(spinner).toBeVisible({ timeout: 2000 });

  // Wait for data to load
  await page.waitForSelector('[data-testid="performance-card"]');

  // Verify button is enabled again
  await expect(refreshButton).toBeEnabled();

  // Now test error handling
  // Mock API error
  await page.route('**/api/v1/analytics/**', route => {
    route.abort('failed');
  });

  await refreshButton.click();

  // Wait for error message
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });

  // Verify error text is helpful
  const errorText = await errorMessage.textContent();
  expect(errorText).toMatch(/error|failed|unable/i);

  // Verify retry button exists and works
  const retryButton = page.locator('[data-testid="retry-button"]');
  await expect(retryButton).toBeVisible();

  // Stop mocking errors
  await page.unroute('**/api/v1/analytics/**');

  // Click retry
  await retryButton.click();

  // Verify data loads successfully
  await page.waitForSelector('[data-testid="performance-card"]');
  await expect(errorMessage).not.toBeVisible();
});
```

### Test 6: Responsive Design

```typescript
test('Workflow 6: Responsive design on all devices', async ({ page }) => {
  // Test mobile (375px)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload();

  // Wait for dashboard to load on mobile
  await page.waitForSelector('[data-testid="analytics-dashboard"]');

  // Verify cards are visible (should be stacked)
  const cards = page.locator('[data-testid="analytics-card"]');
  const cardCount = await cards.count();
  expect(cardCount).toBe(4);

  // Verify no horizontal scroll
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(375 + 16); // +16 for scrollbar

  // Test tablet (768px)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await page.waitForSelector('[data-testid="analytics-dashboard"]');

  // Test desktop (1280px)
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await page.waitForSelector('[data-testid="analytics-dashboard"]');

  // Verify all 4 cards visible side-by-side
  await expect(cards.first()).toBeVisible();
  await expect(cards.last()).toBeVisible();
});
```

---

## 🚀 Running E2E Tests

### Command Line

```powershell
# Run all analytics E2E tests
npx playwright test frontend/tests/e2e/analytics-dashboard.spec.ts

# Run with specific browser
npx playwright test --project chromium frontend/tests/e2e/analytics-dashboard.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui frontend/tests/e2e/analytics-dashboard.spec.ts

# Run single test
npx playwright test -g "Workflow 1"

# Run with headed browser (see what happens)
npx playwright test --headed frontend/tests/e2e/analytics-dashboard.spec.ts
```

### Via VS Code Task

```powershell
.\RUN_E2E_TESTS.ps1
```

---

## ✅ Success Criteria

### For Step 8 Completion
- ✅ 6+ E2E tests written and passing
- ✅ All critical workflows covered
- ✅ No flaky tests (consistent pass rate)
- ✅ Cross-browser testing (Chromium, Firefox, WebKit)
- ✅ Responsive design verified
- ✅ Error handling tested
- ✅ Performance within targets (<2s load)
- ✅ No console errors
- ✅ Accessibility verified
- ✅ All tests documented

### Test Results to Expect
```
✓ Workflow 1: Load dashboard with all widgets (1.2s)
✓ Workflow 2: Analyze student performance card (0.8s)
✓ Workflow 3: View grade trends (1.5s)
✓ Workflow 4: Monitor attendance (0.9s)
✓ Workflow 5: Handle refresh and errors (2.1s)
✓ Workflow 6: Responsive design on all devices (3.2s)

Total: 9.7s (6 tests)
Pass Rate: 100%
Flakiness: 0%
```

---

## 📊 Expected Outcomes

### Performance Metrics
- Dashboard load time: <1.5s
- Data fetch time: <0.5s
- Chart render time: <1s
- Refresh cycle: <1s
- Overall page load: <2s target

### Quality Metrics
- Test pass rate: 100%
- Test coverage: 100% of user workflows
- No console errors
- No accessibility violations
- Cross-browser compatibility: 100%
- Responsive design: All breakpoints working

---

## 🔧 Troubleshooting

### Common Issues & Solutions

**Test: "Unable to find selector"**
- Solution: Verify data-testid attributes are added to components

**Test: "Timeout waiting for selector"**
- Solution: Increase timeout, verify API is responding

**Test: "Element not visible"**
- Solution: Check loading state, wait for animations

**Test: "API error 404"**
- Solution: Verify backend is running, check endpoint URL

**Test: "Responsive design fails"**
- Solution: Check CSS media queries, verify grid layout

---

## 📋 Checklist for Step 8

- [ ] Create `analytics-dashboard.spec.ts` file
- [ ] Implement setup/beforeEach hook
- [ ] Implement Test 1: Dashboard Load
- [ ] Implement Test 2: Performance Analysis
- [ ] Implement Test 3: Trends Analysis
- [ ] Implement Test 4: Attendance Tracking
- [ ] Implement Test 5: Refresh & Error Handling
- [ ] Implement Test 6: Responsive Design
- [ ] Run tests and verify all passing
- [ ] Check for flaky tests (rerun 3x)
- [ ] Cross-browser testing (Chromium, Firefox, WebKit)
- [ ] Performance verification (<2s load)
- [ ] Accessibility verification
- [ ] Update work plan with completion
- [ ] Create final validation document
- [ ] Feature #125 COMPLETE ✅

---

**Ready to Begin Step 8: E2E Testing**

Estimated time: 2-3 hours
Next: Run `npx playwright test frontend/tests/e2e/analytics-dashboard.spec.ts`
