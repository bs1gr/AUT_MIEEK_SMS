import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Performance Benchmark', () => {
  test('measure student list render time', async ({ page }) => {
    await loginAsTestUser(page);

    // Measure navigation to students list
    const startTime = Date.now();
    await page.goto('/students');

    // Wait for the virtual list container to appear
    await page.waitForSelector('div.overflow-y-auto.relative');

    // Wait for first row to ensure content is painted
    await page.waitForSelector('tbody tr');

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    console.log(`Student List Render Time: ${renderTime}ms`);

    // Performance budget: Should render under 1.5 seconds even with data load
    // (Virtual scrolling should make this constant time regardless of list size)
    expect(renderTime).toBeLessThan(1500);
  });
});
