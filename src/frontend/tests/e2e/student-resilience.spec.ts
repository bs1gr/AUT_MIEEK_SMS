import { test, expect } from '@playwright/test';
import { loginViaAPI, generateStudentData, TestDataTracker } from './helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

const isStudentCreation = (method: string, url: string) =>
  method === 'POST' && /\/api\/v1\/students\/?$/.test(new URL(url).pathname);

// Both tests were skipped until November 2026: they signed in on a page that does not exist
// ("/login") with an account that does not exist, and looked for a "Save" button, a disabled
// state and a "Try again" button that the Students page does not have.
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

  // Not runnable: the Students page has no error state. When the list cannot be loaded it shows
  // "No students found", with no message and nothing to try again with. The test stays as the
  // description of what is missing (work plan, todo 60).
  test.skip('should show error recovery UI when API fails', async ({ page }) => {
    await page.route('**/api/v1/students/**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ message: 'Simulated Backend Failure' }) })
    );

    await page.goto('/#/students');

    const retryButton = page.getByRole('button', { name: /try again/i });
    await expect(retryButton).toBeVisible();

    await page.unroute('**/api/v1/students/**');
    await retryButton.click();

    await expect(retryButton).not.toBeVisible();
    await expect(page.locator('[data-testid^="student-view-profile-btn-"]').first()).toBeVisible();
  });
});
