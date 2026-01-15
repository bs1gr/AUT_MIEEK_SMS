import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  createStudent,
  searchTable,
  getTableRowCount,
  waitForNotification,
  ensureTestUserExists
} from './helpers';

test.describe('Student Management', () => {
  // Setup: Ensure backend has the user we need
  test.beforeAll(async () => {
    await ensureTestUserExists();
  });

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should create a new student successfully', async ({ page }) => {
    // Generate unique data to avoid collisions
    const uniqueId = Date.now().toString();
    const newStudent = {
      firstName: 'Test',
      lastName: `Student-${uniqueId}`,
      email: `test.${uniqueId}@example.com`,
      studentId: `ST-${uniqueId}`
    };

    // Use helper to create
    await createStudent(page, newStudent);

    // Verify success notification
    await waitForNotification(page, 'success');

    // Verify student appears in search
    await searchTable(page, newStudent.studentId);

    // Assert table has at least one row
    const rowCount = await getTableRowCount(page);
    expect(rowCount).toBeGreaterThan(0);

    // Optional: Verify specific text in the row
    await expect(page.locator('table')).toContainText(newStudent.email);
  });
});
