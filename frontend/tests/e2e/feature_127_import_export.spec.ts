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
    await page.waitForLoadState('networkidle');

    // Verify Main Actions are visible (these are more reliable than exact heading match)
    await expect(page.getByRole('button', { name: /Export Data/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Import Data/i })).toBeVisible({ timeout: 10000 });

    // Verify History Table exists
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('Export dialog opens and closes correctly', async ({ page }) => {
    await page.goto('/admin/import-export');
    await page.waitForLoadState('networkidle');

    // Wait for Export Data button to be visible and enabled before clicking
    const exportButton = page.getByRole('button', { name: /Export Data/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    await expect(exportButton).toBeEnabled({ timeout: 10000 });

    // Open Export Dialog
    await exportButton.click();

    // Verify Dialog Content
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Close Dialog using Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
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
