import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Feature #127: Bulk Import/Export', () => {

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('YourSecurePassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to import/export page', async ({ page }) => {
    // Navigate via sidebar or direct URL
    await page.goto('/admin/import-export');
    await expect(page.getByRole('heading', { name: /import|export/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /import/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /export/i })).toBeVisible();
  });

  test('should validate CSV file upload for students', async ({ page }) => {
    await page.goto('/admin/import-export');

    // Select Students import type
    await page.getByRole('button', { name: /import students/i }).click();

    // Create dummy CSV file
    const testFile = path.join(__dirname, 'test_students.csv');
    const csvContent = 'first_name,last_name,email,date_of_birth,enrollment_date\nTest,User,test.import@example.com,2000-01-01,2023-09-01';
    fs.writeFileSync(testFile, csvContent);

    try {
      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByText(/click to upload|drag and drop/i).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(testFile);

      // Check preview data
      await expect(page.getByText('test.import@example.com')).toBeVisible();
      await expect(page.getByText('Test')).toBeVisible();
      await expect(page.getByText('User')).toBeVisible();

      // Verify validation status (assuming UI shows "Valid" or similar)
      await expect(page.getByText(/valid/i)).toBeVisible();

    } finally {
      // Cleanup
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test('should show history of imports', async ({ page }) => {
    await page.goto('/admin/import-export');
    await page.getByRole('tab', { name: /history/i }).click();

    // Verify table headers exist
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });
});
