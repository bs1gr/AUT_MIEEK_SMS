import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Performance Benchmark', () => {
  test('measure student list render time', async ({ page }) => {
    await loginAsTestUser(page);

    // Measure navigation to students list
    const startTime = Date.now();
    await page.goto('/students');

    await expect(page.getByTestId('student-search-input')).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible();

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    console.log(`Student List Render Time: ${renderTime}ms`);

    expect(renderTime).toBeLessThan(3000);
  });
});
