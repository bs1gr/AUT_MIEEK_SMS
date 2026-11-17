import { test, expect } from '@playwright/test';
import { loginViaAPI, generateStudentData, TestDataTracker } from './helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

const isStudentCreation = (method: string, url: string) =>
  method === 'POST' && /\/api\/v1\/students\/?$/.test(new URL(url).pathname);

// Both tests were skipped until November 2026: they signed in on a page that does not exist
// ("/login") with an account that does not exist, and looked for a "Save" button and a disabled
// state that the Students page does not have, and for a "Try again" button that it did not
// have until then.
test.describe('Student Resilience & Security', () => {
  let tracker: TestDataTracker;

  test.beforeEach(async ({ page }) => {
    tracker = new TestDataTracker(page);
    await loginViaAPI(page, E2E_EMAIL, E2E_PASSWORD);
    await page.goto('/#/students');
    await expect(page.getByTestId('add-student-btn')).toBeVisible({ timeout: 15000 });
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  // What keeps a second click from creating a second student is not a disabled button: the
  // form closes with the first click, so there is nothing left to press.
  test('a second click on the submit button cannot create a second student', async ({ page }) => {
    const student = generateStudentData();
    const creations: number[] = [];
    page.on('response', async (response) => {
      if (!isStudentCreation(response.request().method(), response.url())) return;
      creations.push(response.status());
      const created = await response.json().catch(() => null);
      tracker.track('students', created?.id ?? created?.data?.id);
    });

    await page.getByTestId('add-student-btn').click();
    await page.getByTestId('student-id-input').fill(student.studentId);
    await page.getByTestId('first-name-input').fill(student.firstName);
    await page.getByTestId('last-name-input').fill(student.lastName);
    await page.getByTestId('email-input').fill(student.email);

    const submit = page.getByTestId('submit-student');
    await submit.click();
    await expect(submit).toHaveCount(0);
    await expect(page.getByText('Student added successfully!')).toBeVisible({ timeout: 15000 });

    // Time for a second request to show up, if one had been sent.
    await page.waitForTimeout(1500);
    expect(creations).toHaveLength(1);
    expect([200, 201]).toContain(creations[0]);

    await page.getByTestId('student-search-input').fill(student.studentId);
    await expect(page.locator('[data-testid^="student-view-profile-btn-"]')).toHaveCount(1);
  });

  // Until November 2026 the page said "No students found" when its list could not be loaded,
  // with no message and nothing to try again with (work plan, todo 60). As first written the
  // test opened the address the page was already on, which loads nothing again: it reloads.
  test('a list that cannot be loaded says so, and loads when asked again', async ({ page }) => {
    const students = page.locator('[data-testid^="student-view-profile-btn-"]');
    await expect(students.first()).toBeVisible({ timeout: 15000 });

    let refused = 0;
    await page.route('**/api/v1/students/**', (route) => {
      refused += 1;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated Backend Failure' }),
      });
    });
    await page.reload();

    // The request is tried twice, then the page says what happened.
    const message = page.getByTestId('students-load-error');
    const retryButton = page.getByRole('button', { name: /try again/i });
    await expect(retryButton).toBeVisible({ timeout: 15000 });
    await expect(message).toContainText('The list of students could not be loaded.');
    await expect(page.getByText('No students found')).toHaveCount(0);
    await expect(students).toHaveCount(0);

    // Asked again while the server still fails: the message is back, not an empty list.
    const refusedAtFirst = refused;
    await retryButton.click();
    await expect.poll(() => refused, { timeout: 15000 }).toBeGreaterThanOrEqual(refusedAtFirst + 2);
    await expect(retryButton).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No students found')).toHaveCount(0);

    await page.unroute('**/api/v1/students/**');
    await retryButton.click();

    await expect(students.first()).toBeVisible({ timeout: 15000 });
    await expect(retryButton).toHaveCount(0);
    await expect(message).toHaveCount(0);
  });
});
