import { test, expect, type Page } from '@playwright/test';
import { loginViaAPI, generateRandomString, createStudentViaAPI, getApiBase, TestDataTracker } from './helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

/**
 * The Search page (#/search).
 *
 * All thirteen tests of this file were skipped until November 2026 with the note "page not yet
 * implemented". The page exists; the tests could not reach it: they signed in on "/login",
 * opened "/search" without the hash, and waited for an input that is on the Students page.
 *
 * They are now in two groups:
 *  - what the page does: these run;
 *  - sorting, paging and filters: offered by the page and doing nothing until they were
 *    repaired in November 2026 (work plan, todo 60); they run since.
 * Four more described what the page does not have (saving and loading a search, a "clear"
 * control for the query, keyboard navigation in the list); they were deleted in November 2026
 * (the owner's decision).
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

test.describe('Search page: sorting, paging and filters', () => {
  let tracker: TestDataTracker;

  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await openSearchPage(page);
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // Until the repair the list was the same for "relevance", "name" descending and "name"
  // ascending: the page sent `sort` in the request's body and the server did not read it.
  test('sort results by different fields', async ({ page }) => {
    await page.getByLabel('Query').fill('o');
    await expect(results(page)).toHaveCount(4);

    // Best match first: an "o" in a name before an "o" only in the ".com" of the address.
    await expect(results(page).last()).toContainText('Jane Smith');

    await page.getByLabel('Sort by').selectOption('name');
    await page.getByLabel('Sort direction').selectOption('asc');
    await expect(results(page).first()).toContainText('Alice Johnson');
    await expect(results(page).last()).toContainText('John Doe');

    await page.getByLabel('Sort direction').selectOption('desc');
    await expect(results(page).first()).toContainText('John Doe');
    await expect(results(page).last()).toContainText('Alice Johnson');

    await page.getByLabel('Sort by').selectOption('email');
    await expect(results(page).first()).toContainText('john.doe@example.com');
    await page.getByLabel('Sort direction').selectOption('asc');
    await expect(results(page).first()).toContainText('alice.j@example.com');
  });

  // Until the repair "Results per page" and Previous/Next changed nothing: the page sent `page`
  // and `page_size` in the body, the server took `limit` and `offset` from the address, so it
  // always answered with the first 20, and called that number the total.
  test('pagination through large result sets', async ({ page }) => {
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
    await expect(page.getByText('12 total results')).toBeVisible();
    await expect(page.getByText('1-10 of 12 results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(results(page)).toHaveCount(2);
    await expect(page.getByText('Page 2')).toBeVisible();
    await expect(page.getByText('11-12 of 12 results')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(results(page)).toHaveCount(10);
    await expect(page.getByText('Page 1')).toBeVisible();

    // All twelve on one page of twenty, each once.
    await page.getByLabel('Results per page').selectOption('20');
    await expect(results(page)).toHaveCount(12);
    const listed = await results(page).locator('p.font-semibold').allTextContents();
    expect(new Set(listed).size).toBe(12);
  });

  // Until the repair the panel said "No filters available" for every query, although the
  // server answered with the status filter ("active", 4): the page read the answer in another
  // shape than the server sends.
  test('filter search results with advanced filters', async ({ page }) => {
    await page.getByLabel('Query').fill('o');
    await expect(results(page)).toHaveCount(4);

    await expect(page.getByText('No filters available')).toHaveCount(0);
    const active = page.getByRole('checkbox', { name: /active/i });
    await expect(active).toBeVisible();
    await active.check();
    await expect(results(page)).toHaveCount(4);
  });

  // The same with a student who has left, so that a filter has something to take away.
  test('a ticked filter narrows the list, a cleared one stops narrowing', async ({ page }) => {
    const family = `Ff${generateRandomString()}`;
    const ids: number[] = [];
    for (const first of ['Stays', 'Left']) {
      const created = await createStudentViaAPI(page, {
        firstName: first,
        lastName: family,
        email: `${first.toLowerCase()}-${family.toLowerCase()}@test.edu`,
        studentId: `FF${generateRandomString().toUpperCase()}${first[0]}`,
      });
      tracker.track('students', created?.id);
      ids.push(created.id);
    }
    const deactivated = await page.request.put(`${getApiBase()}/api/v1/students/${ids[1]}`, {
      data: { is_active: false },
    });
    expect(deactivated.ok()).toBeTruthy();

    await page.getByLabel('Query').fill(family);
    await expect(results(page)).toHaveCount(2);

    const status = page.getByRole('group', { name: 'Status' });
    const active = status.getByRole('checkbox', { name: 'Active (1)', exact: true });
    const inactive = status.getByRole('checkbox', { name: 'Inactive (1)', exact: true });
    await expect(active).toBeVisible();

    await inactive.check();
    await expect(results(page)).toHaveCount(1);
    await expect(results(page).first()).toContainText(`Left ${family}`);
    await expect(page.getByText('1 total results')).toBeVisible();

    // Both boxes: either of the two.
    await active.check();
    await expect(results(page)).toHaveCount(2);

    await inactive.uncheck();
    await expect(results(page)).toHaveCount(1);
    await expect(results(page).first()).toContainText(`Stays ${family}`);

    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(results(page)).toHaveCount(2);
    await expect(active).not.toBeChecked();
    await expect(inactive).not.toBeChecked();
  });
});
