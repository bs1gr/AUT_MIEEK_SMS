import { test, expect } from '@playwright/test';
import { loginViaAPI, generateStudentData, TestDataTracker } from './e2e/helpers';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

// Skipped until November 2026 "until helpers are verified". They could not work: the sign-in
// helper wrote a key the application deletes at start, the form was never opened on the
// Students page, and the result was looked for in a table (the page shows cards).
// e2e/student-management.spec.ts already creates a student through the form and finds the name
// in the list; this one checks the two things that one does not: what the page says, and that
// the new student is found by its Student ID.
test.describe('Student Management', () => {
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

  test('a new student is announced and can be found by its Student ID', async ({ page }) => {
    const student = generateStudentData();

    await page.getByTestId('add-student-btn').click();
    await page.getByTestId('student-id-input').fill(student.studentId);
    await page.getByTestId('first-name-input').fill(student.firstName);
    await page.getByTestId('last-name-input').fill(student.lastName);
    await page.getByTestId('email-input').fill(student.email);

    const creation = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && /\/api\/v1\/students\/?$/.test(new URL(response.url()).pathname),
      { timeout: 30000 }
    );
    await page.getByTestId('submit-student').click();
    const response = await creation;
    expect([200, 201]).toContain(response.status());
    const created = await response.json().catch(() => null);
    tracker.track('students', created?.id ?? created?.data?.id);

    await expect(page.getByText('Student added successfully!')).toBeVisible({ timeout: 15000 });

    // The Student ID alone finds the new student, and only that one.
    await page.getByTestId('student-search-input').fill(student.studentId);
    const cards = page.getByRole('listitem').filter({ hasText: student.studentId });
    await expect(page.locator('[data-testid^="student-view-profile-btn-"]')).toHaveCount(1);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(`${student.firstName} ${student.lastName}`);
  });
});
