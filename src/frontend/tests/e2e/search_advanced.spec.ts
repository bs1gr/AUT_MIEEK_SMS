import { test, expect, type Page } from '@playwright/test';
import { loginViaAPI, generateRandomString, createStudentViaAPI, TestDataTracker } from './helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

/**
 * The Search page (#/search).
 *
 * All thirteen tests of this file were skipped until November 2026 with the note "page not yet
 * implemented". The page exists; the tests could not reach it: they signed in on "/login",
 * opened "/search" without the hash, and waited for an input that is on the Students page.
 *
 * They are now in three groups:
 *  - what the page does: these run;
 *  - what the page offers and does not do (sorting, paging, filters): `test.fixme`, each with
 *    what was seen in a running copy; they should pass once the page is repaired;
 *  - what the page does not have at all (saved searches, a "clear" control, keyboard
 *    navigation): `test.skip`, kept as they were until someone decides about them.
 * The seed has four students (John Doe, Jane Smith, Alice Johnson, Bob Williams) and two
 * courses (CS101, MATH201 "Calculus II").
 */

const results = (page: Page) => page.locator('ul.divide-y > li');

const isSearchRequest = (method: string, url: string) =>
  method === 'POST' && new URL(url).pathname.endsWith('/api/v1/search/advanced');

async function openSearchPage(page: Page) {
  await loginViaAPI(page, E2E_EMAIL, E2E_PASSWORD);
  await page.goto('/#/search');
  await expect(page.getByLabel('Query')).toBeVisible({ timeout: 15000 });
}

test.describe('Search page', () => {
  test.beforeEach(async ({ page }) => {
    await openSearchPage(page);
  });

  test('basic student search workflow', async ({ page }) => {
    await page.getByLabel('Query').fill('John');

    // "John" is in a first name and in a last name.
    await expect(results(page)).toHaveCount(2);
    await expect(results(page).filter({ hasText: 'John Doe' })).toContainText('john.doe@example.com');
    await expect(results(page).filter({ hasText: 'Alice Johnson' })).toHaveCount(1);
    await expect(page.getByText('2 total results')).toBeVisible();

    await page.getByLabel('Query').fill('no-such-student-anywhere');
    await expect(page.getByText('No results found')).toBeVisible();
    await expect(results(page)).toHaveCount(0);
  });

  test('search across different entity types', async ({ page }) => {
    const type = page.getByLabel('Type');
    await expect(type).toHaveValue('students');

    await type.selectOption('courses');
    await page.getByLabel('Query').fill('Calculus');
    await expect(results(page)).toHaveCount(1);
    await expect(results(page).first()).toContainText('Calculus II');
    await expect(results(page).first()).toContainText('MATH201');
    await expect(results(page).first().getByRole('button')).toHaveText('Course');

    // Grades are narrowed by date: the two date fields belong to that type only.
    await expect(page.getByLabel('Date from')).toHaveCount(0);
    await type.selectOption('grades');
    await expect(page.getByLabel('Date from')).toBeVisible();
    await expect(page.getByLabel('Date to')).toBeVisible();

    await type.selectOption('students');
    await expect(page.getByLabel('Date from')).toHaveCount(0);
    await page.getByLabel('Query').fill('Smith');
    await expect(results(page)).toHaveCount(1);
    await expect(results(page).first()).toContainText('Jane Smith');
  });

  test('mobile responsive search', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const query = page.getByLabel('Query');
    await expect(query).toBeVisible();
    await query.fill('Doe');

    await expect(results(page)).toHaveCount(1);
    const first = results(page).first();
    await expect(first).toContainText('John Doe');
    await first.scrollIntoViewIfNeeded();

    // The result and its button are inside the screen, not cut off to the right.
    const box = await first.getByRole('button').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });

  test('handles network errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/search/advanced**', (route) => route.abort('failed'));

    await page.getByLabel('Query').fill('John');

    // The request is tried twice, then the page says so instead of "No results found".
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No results found')).toHaveCount(0);
    await expect(results(page)).toHaveCount(0);

    // And it recovers by itself once the request works again.
    await page.unroute('**/api/v1/search/advanced**');
    await page.getByLabel('Query').fill('Doe');
    await expect(results(page)).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('debouncing prevents excessive API calls', async ({ page }) => {
    const searches: string[] = [];
    page.on('request', (request) => {
      if (isSearchRequest(request.method(), request.url())) {
        searches.push((request.postDataJSON() as { query?: string }).query ?? '');
      }
    });

    await page.getByLabel('Query').pressSequentially('John', { delay: 50 });
    await expect(results(page)).toHaveCount(2);
    await page.waitForTimeout(600);

    // Four letters typed, one search sent, for the whole word.
    expect(searches).toEqual(['John']);
  });

  test('result type badges display correctly', async ({ page }) => {
    await page.getByLabel('Query').fill('Doe');
    await expect(results(page)).toHaveCount(1);

    // The badge says what kind of record it is, and it is the way to the record.
    const badge = results(page).first().getByRole('button', { name: 'View details' });
    await expect(badge).toHaveText('Student');
    await badge.click();
    await expect(page).toHaveURL(/#\/students\/\d+$/);
    await expect(page.getByText('John Doe').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Search page: offered, and not working', () => {
  let tracker: TestDataTracker;

  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await openSearchPage(page);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // Seen in a running copy (2026-11-17): the list is the same for "relevance", "name" descending
  // and "name" ascending. The page sends `sort` in the request's body; the server does not
  // read it.
  test.fixme('sort results by different fields', async ({ page }) => {
    await page.getByLabel('Query').fill('o');
    await expect(results(page)).toHaveCount(4);

    await page.getByLabel('Sort by').selectOption('name');
    await page.getByLabel('Sort direction').selectOption('asc');
    await expect(results(page).first()).toContainText('Alice Johnson');

    await page.getByLabel('Sort direction').selectOption('desc');
    await expect(results(page).first()).toContainText('John Doe');
  });

  // Seen in a running copy (2026-11-17): "Results per page" and Previous/Next change nothing.
  // The page sends `page` and `page_size` in the body; the server takes `limit` and `offset`
  // from the address, so it always answers with the first 20, and calls that number the total.
  test.fixme('pagination through large result sets', async ({ page }) => {
    const family = `Zz${generateRandomString()}`;
    for (let i = 1; i <= 12; i++) {
      const created = await createStudentViaAPI(page, {
        firstName: `Pager${i}`,
        lastName: family,
        email: `pager-${family.toLowerCase()}-${i}@test.edu`,
        studentId: `PG${generateRandomString().toUpperCase()}${i}`,
      });
      tracker.track('students', created?.id);
    }

    await page.getByLabel('Results per page').selectOption('10');
    await page.getByLabel('Query').fill(family);
    await expect(results(page)).toHaveCount(10);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(results(page)).toHaveCount(2);
    await expect(page.getByText('Page 2')).toBeVisible();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(results(page)).toHaveCount(10);
  });

  // Seen in a running copy (2026-11-17): the panel says "No filters available" for every
  // query, although the server answers with the status filter ("active", 4). The page reads
  // the answer in another shape than the server sends.
  test.fixme('filter search results with advanced filters', async ({ page }) => {
    await page.getByLabel('Query').fill('o');
    await expect(results(page)).toHaveCount(4);

    await expect(page.getByText('No filters available')).toHaveCount(0);
    const active = page.getByRole('checkbox', { name: /active/i });
    await expect(active).toBeVisible();
    await active.check();
    await expect(results(page)).toHaveCount(4);
  });
});

// The page has none of this: no way to save or load a search, no "clear" control, no keyboard
// handling in the list. The tests are as they were written in January 2026 for a design.
test.describe.skip('Search page: not there at all', () => {
  test('save and load search', async ({ page }) => {
    // Step 1: Perform a search
    await page.fill('[data-testid="student-search-input"]', 'John');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });

    // Step 2: Open save dialog
    const saveButton = page.locator('button').filter({ hasText: /save|new search/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Step 3: Fill save form
      await page.fill('input[placeholder*="search name"]', 'My John Search');
      const confirmButton = page.locator('button').filter({ hasText: /save/i }).nth(1);
      if (await confirmButton.isVisible()) {
        await confirmButton.click();

        // Step 4: Verify save confirmation
        await page.waitForTimeout(500);
        expect(page.locator('text=saved successfully').isVisible).toBeDefined();
      }
    }
  });

  test('clear all filters and search', async ({ page }) => {
    // Step 1: Set up filters
    await page.fill('[data-testid="student-search-input"]', 'test');

    // Step 2: Add a filter
    const filterCheckbox = page.locator('input[type="checkbox"]').first();
    if (await filterCheckbox.isVisible()) {
      await filterCheckbox.check();
    }

    // Step 3: Clear all
    const clearButton = page.locator('button').filter({ hasText: /clear/i }).first();
    if (await clearButton.isVisible()) {
      await clearButton.click();

      // Step 4: Verify cleared
      const searchInput = page.locator('[data-testid="student-search-input"]');
      expect(await searchInput.inputValue()).toBe('');
    }
  });

  test('keyboard navigation in search results', async ({ page }) => {
    // Step 1: Search
    await page.fill('[data-testid="student-search-input"]', 'test');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });

    // Step 2: Tab through results
    const firstResult = page.locator('li[role="listitem"]').first();
    await firstResult.focus();
    await expect(firstResult).toBeFocused();

    // Step 3: Navigate down
    await page.keyboard.press('ArrowDown');
    const secondResult = page.locator('li[role="listitem"]').nth(1);
    // Result should be reachable via keyboard
    expect(secondResult).toBeDefined();
  });

  test('search history persists in saved searches', async ({ page }) => {
    // Step 1: Perform multiple searches
    await page.fill('[data-testid="student-search-input"]', 'John');
    await page.waitForSelector('li[role="listitem"]', { timeout: 3000 });

    // Step 2: Save search
    const saveButton = page.locator('button').filter({ hasText: /save|new search/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.fill('input[placeholder*="search name"]', 'Saved Search 1');
      await page.click('button:has-text("Save")');

      // Step 3: Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/search');

      // Step 4: Verify saved search still available
      const savedSearchButton = page.locator('button:has-text("Saved Search 1")');
      expect(await savedSearchButton.isVisible() || await page.locator('text=Saved Search 1').isVisible()).toBeDefined();
    }
  });
});
