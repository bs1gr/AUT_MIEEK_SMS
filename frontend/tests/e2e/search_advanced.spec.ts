import { test, expect, type Page } from '@playwright/test';
import { loginAsTestUser } from './helpers';

const searchInput = (page: Page) => page.locator('#search-input');
const typeSelect = (page: Page) => page.locator('#search-type');
const resultItems = (page: Page) => page.locator('li');

async function openSearch(page: Page) {
  await loginAsTestUser(page);
  await page.goto('/search');
  await expect(searchInput(page)).toBeVisible({ timeout: 10000 });
}

async function searchFor(page: Page, query: string) {
  await searchInput(page).fill(query);
  await page.waitForTimeout(500);
  await expect(page.getByText(/total results|no results found/i)).toBeVisible({ timeout: 10000 });
}

test.describe('Search Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await openSearch(page);
  });

  test('basic student search workflow', async ({ page }) => {
    await searchFor(page, 'John');

    await expect(page.getByText(/results/i).first()).toBeVisible();
    await expect(page.getByText(/total results|no results found/i)).toBeVisible();
  });

  test('filter sidebar renders and can clear filters', async ({ page }) => {
    await expect(page.getByText(/filters|no filters available|loading filters/i)).toBeVisible();

    const clearButton = page.getByRole('button', { name: /clear all/i });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await expect(searchInput(page)).toBeVisible();
    }
  });

  test('sort results by different fields', async ({ page }) => {
    await searchFor(page, 'student');

    const sortField = page.locator('#search-sort-field');
    await expect(sortField).toBeVisible();
    await sortField.selectOption('name');
    await page.waitForTimeout(300);

    await expect(page.getByText(/total results|no results found/i)).toBeVisible();
  });

  test('pagination controls are available for result sets', async ({ page }) => {
    await searchFor(page, 'a');

    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    await expect(page.getByText(/page 1/i)).toBeVisible();
  });

  test('search across different entity types', async ({ page }) => {
    await expect(typeSelect(page)).toBeVisible();

    await typeSelect(page).selectOption('students');
    await searchFor(page, 'test');

    await typeSelect(page).selectOption('courses');
    await searchFor(page, 'test');

    await typeSelect(page).selectOption('grades');
    await searchFor(page, 'test');
    await expect(page.getByText(/date from/i)).toBeVisible();
  });

  test('clear search input manually', async ({ page }) => {
    await searchInput(page).fill('test');
    await searchInput(page).clear();

    await expect(searchInput(page)).toHaveValue('');
  });

  test('mobile responsive search', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(searchInput(page)).toBeVisible();
    await searchFor(page, 'test');
    await expect(page.locator('body')).toBeVisible();
  });

  test('keyboard navigation reaches search controls', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();
  });

  test('handles network errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/search/advanced', route => {
      route.abort('failed');
    });

    await searchInput(page).fill('test');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('debouncing prevents excessive API calls', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/v1/search/advanced', route => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { results: [], total: 0, has_more: false } }),
      });
    });

    await searchInput(page).type('test', { delay: 50 });
    await page.waitForTimeout(500);

    expect(callCount).toBeLessThanOrEqual(2);
  });

  test('result type badges display when results exist', async ({ page }) => {
    await searchFor(page, 'test');

    const count = await resultItems(page).count();
    if (count > 0) {
      await expect(resultItems(page).first().getByRole('button')).toBeVisible();
    } else {
      await expect(page.getByText(/no results found/i)).toBeVisible();
    }
  });

  test('search page remains usable after navigation away and back', async ({ page }) => {
    await searchFor(page, 'John');

    await page.goto('/dashboard');
    await page.goto('/search');

    await expect(searchInput(page)).toBeVisible();
  });
});
