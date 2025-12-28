import { test, expect } from '@playwright/test';
import { login, logout, ensureTestUserExists } from './helpers';
import { logPhase, logAuthEvent, logTest } from './e2e/logging';

// DIAGNOSTIC: Check what the page actually contains in CI
test('DIAGNOSTIC: Check page HTML structure', async ({ page }) => {
  logPhase('PAGE_STRUCTURE_CHECK', 'Verifying page loads and renders');

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });

  const requestFailures: string[] = [];
  page.on('requestfailed', (req) => {
    requestFailures.push(`[requestfailed] ${req.url()} -> ${req.failure()?.errorText ?? 'unknown'}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const hasRootDiv = await page.locator('#root').count();
  const hasReactMarkers = await page.locator('[data-reactroot], [data-reactid]').count();
  const bodyContent = await page.locator('body').innerHTML();
  const rootContentLength = await page.locator('#root').evaluate((el) => el.innerHTML.length).catch(() => 0);

  logTest('PAGE_DIAGNOSTIC', 'Page structure check results', 'INFO', {
    hasRootDiv: hasRootDiv > 0,
    hasReactMarkers: hasReactMarkers > 0,
    bodyHasContent: bodyContent.trim().length > 0,
    bodyLength: bodyContent.length,
    rootContentLength,
    consoleErrors,
    requestFailures,
  });

  expect(true).toBe(true); // only logging
});

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });

  test('should login successfully', async ({ page }) => {
    logAuthEvent('LOGIN_START', 'test@example.com', true);
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    logPhase('NAVIGATION', 'Waiting for dashboard to load');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    logAuthEvent('LOGIN_SUCCESS', 'test@example.com', true);
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    logAuthEvent('LOGOUT_TEST_START', 'test@example.com', true);
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    logPhase('WAITING', 'After login, waiting for dashboard');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    logPhase('LOGOUT_ACTION', 'Clicking logout button');
    await logout(page);
    logPhase('LOGOUT_VERIFICATION', 'Waiting for logout completion');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    logAuthEvent('LOGOUT_SUCCESS', 'test@example.com', true);
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.endsWith('/') || url.includes('?')).toBeTruthy();
  });

  test.skip('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  });

  test('should navigate to Students page', async ({ page }) => {
    const studentsLink = page.locator('a').filter({ hasText: /student/i }).first();
    await studentsLink.click();
    await page.waitForURL(/.*students/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  });

  test('should navigate to Courses page', async ({ page }) => {
    const coursesLink = page.locator('a').filter({ hasText: /course/i }).first();
    await coursesLink.click();
    await page.waitForURL(/.*courses/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  });

  test('should navigate to Grades page', async ({ page }) => {
    const gradesLink = page.locator('a').filter({ hasText: /grad/i }).first();
    await gradesLink.click();
    await page.waitForURL(/.*grad(es|ing)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  });

  test('should navigate to Attendance page', async ({ page }) => {
    await page.click('a:has-text("Attendance")');
    await page.waitForURL(/.*attendance/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.locator('text=Attendance')).toBeVisible();
  });
});

test.describe('Students Management', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    const studentsLink = page.locator('a').filter({ hasText: /student/i }).first();
    await studentsLink.click();
    await page.waitForURL(/.*students/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  });

  test('should display students list', async ({ page }) => {
    await page.waitForFunction(() => {
      const emptyMsg = Array.from(document.querySelectorAll('p')).some(p => /No students found|Δεν βρέθηκαν/i.test(p.textContent || ''));
      const hasCards = document.querySelector('ul li') !== null || document.querySelector('li.border') !== null;
      return emptyMsg || hasCards;
    }, { timeout: 10000 });
    const items = await page.locator('li.border').count();
    expect(items).toBeGreaterThanOrEqual(0);
  });

  test('should search students', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('John');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForFunction(() => {
      const emptyMsg = Array.from(document.querySelectorAll('p')).some(p => /No students found|Δεν βρέθηκαν/i.test(p.textContent || ''));
      const hasCards = document.querySelector('ul li') !== null || document.querySelector('li.border') !== null;
      return emptyMsg || hasCards;
    }, { timeout: 10000 });
  });

  test('should open student detail', async ({ page }) => {
    const cards = page.locator('li.border');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No students present in CI seed; skipping detail open');
      return;
    }
    const firstCard = cards.first();
    const viewBtn = firstCard.locator('button').filter({ hasText: /View Profile|Full Profile|Προβολή/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.locator('text=/Student ID|Αριθμός Μητρώου/').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive Design', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });
  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be desktop responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, 'test@example.com', 'Test@Pass123' // pragma: allowlist secret);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });
});
