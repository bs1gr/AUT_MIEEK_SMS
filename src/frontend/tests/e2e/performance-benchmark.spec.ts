import { test, expect } from '@playwright/test';
import { loginViaAPI } from './helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

// From asking for the Students page to the first student on it. The page asks the server for
// the whole list and draws one card per student (it is not a virtual list), so a list that got
// slow shows here. Five seconds is the budget the dashboard specs use for a page with its data
// (custom-dashboards.spec.ts). With the four students of the seed it took under one second
// on the development PC; the test prints what it measured.
const BUDGET_MS = 5000;

// Skipped until November 2026: it signed in on a page that does not exist ("/login"), with an
// account that does not exist, and waited for a table inside a virtual-scroll container that
// the Students page never had.
test.describe('Performance Benchmark', () => {
  test('the students list shows its first student within the budget', async ({ page }) => {
    await loginViaAPI(page, E2E_EMAIL, E2E_PASSWORD);

    const startedAt = Date.now();
    await page.goto('/#/students');
    await expect(page.locator('[data-testid^="student-view-profile-btn-"]').first()).toBeVisible({ timeout: 15000 });
    const elapsed = Date.now() - startedAt;

    // eslint-disable-next-line no-console
    console.log(`Students list: first student visible after ${elapsed} ms`);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
