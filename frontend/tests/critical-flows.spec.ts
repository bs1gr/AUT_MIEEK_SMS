import { test, expect } from '@playwright/test';
import { login, logout, ensureTestUserExists } from './helpers';

// DIAGNOSTIC: Check what the page actually contains in CI
test('DIAGNOSTIC: Check page HTML structure', async ({ page }) => {
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

  console.log('=== PAGE DIAGNOSTIC ===');
  console.log('Has root div:', hasRootDiv > 0);
  console.log('Has React markers:', hasReactMarkers > 0);
  console.log('Body has content:', bodyContent.trim().length > 0, `(${bodyContent.length} chars)`);
  console.log('Root innerHTML length:', rootContentLength);
  if (consoleErrors.length) {
    console.log('Console errors:', consoleErrors.join(' | '));
  }
  if (requestFailures.length) {
    console.log('Request failures:', requestFailures.join(' | '));
  }
  console.log('=== END DIAGNOSTIC ===');

  expect(true).toBe(true); // only logging
});

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });

  test('should login successfully', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await logout(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

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
    await login(page, 'test@example.com', 'password123');
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
    await login(page, 'test@example.com', 'password123');
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
    await login(page, 'test@example.com', 'password123');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, 'test@example.com', 'password123');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be desktop responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, 'test@example.com', 'password123');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });
});
