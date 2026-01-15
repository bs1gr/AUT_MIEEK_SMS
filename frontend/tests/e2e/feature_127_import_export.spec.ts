import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'YourSecurePassword123!',
};

// Helper to login via API (inlined to ensure self-containment)
async function loginViaAPI(page: any) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: ADMIN_CREDENTIALS
  });
  expect(response.ok()).toBeTruthy();
  const { access_token } = await response.json();

  // Set cookie for authentication
  await page.context().addCookies([{
    name: 'token',
    value: access_token,
    domain: 'localhost',
    path: '/'
  }]);
}

test.describe('Feature #127: Bulk Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('Admin can access Import/Export page', async ({ page }) => {
    await page.goto('/admin/import-export');

    // Verify Page Title
    await expect(page.getByRole('heading', { name: /Data Import\/Export/i })).toBeVisible();

    // Verify Main Actions
    await expect(page.getByRole('button', { name: /Export Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import Data/i })).toBeVisible();

    // Verify History Table
    await expect(page.getByText(/History/i)).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Export dialog opens and closes correctly', async ({ page }) => {
    await page.goto('/admin/import-export');

    // Open Export Dialog
    await page.getByRole('button', { name: /Export Data/i }).click();

    // Verify Dialog Content
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Note: Exact text depends on translation, checking for common elements
    await expect(dialog.getByRole('button', { name: /Export/i })).toBeVisible();

    // Close Dialog (assuming clicking outside or cancel button)
    // If there is a close button or we can press Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Import wizard flow for Students', async ({ page }) => {
    await page.goto('/admin/import-export');

    // Open Import Menu
    await page.getByRole('button', { name: /Import Data/i }).click();

    // Select Students Import
    await page.getByText(/Import Students/i).click();

    // Verify Wizard Steps
    // Step 1: Upload
    await expect(page.getByText(/Select File/i)).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();

    // Verify Cancel works
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText(/Select File/i)).not.toBeVisible();
  });

  test('History table loads data', async ({ page }) => {
    await page.goto('/admin/import-export');
    // Check for table headers
    await expect(page.locator('thead')).toContainText(/Status/i);
  });
});
