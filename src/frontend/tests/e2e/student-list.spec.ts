import { test, expect } from '@playwright/test';

// Not runnable: the Students page is a list of cards. It has no table, no column headers and no
// virtual-scroll container (the component with one, VirtualStudentList, is used by no page).
// What the page does have is tested elsewhere: the list and a student's page in
// critical-flows.spec.ts, editing and deleting in student-management.spec.ts.
// Kept as it was written, until it is deleted (work plan, todo 53).
test.describe.skip('Student List Component (Virtual Scroll)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher
    await page.goto('/login');
    await page.getByLabel('Email').fill('teacher1@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('/dashboard');
  });

  test('should render student list with virtual scrolling structure', async ({ page }) => {
    await page.goto('/students');

    // 1. Verify the virtual scroll container exists
    // The component uses a specific structure: div.overflow-y-auto.relative
    const scrollContainer = page.locator('div.overflow-y-auto.relative');
    await expect(scrollContainer).toBeVisible();

    // 2. Verify table headers are fixed and visible
    await expect(page.getByRole('columnheader', { name: /enrollment/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();

    // 3. Verify rows are rendered
    // Note: Virtual scroll only renders rows that fit in the viewport + overscan
    const rows = page.locator('tbody tr');
    // We expect at least one row if seed data is present
    await expect(rows.first()).toBeVisible();

    // 4. Verify action buttons in the first row
    await expect(rows.first().getByRole('button', { name: /view/i })).toBeVisible();
    await expect(rows.first().getByRole('button', { name: /edit/i })).toBeVisible();
  });
});
