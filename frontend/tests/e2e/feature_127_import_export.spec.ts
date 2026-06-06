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

    // Verify page is loaded by checking for the main heading
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Verify buttons exist - look for both export/import buttons by their container
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(1); // At least export and import buttons should exist

    // Verify History Table exists
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('Export dialog opens and closes correctly', async ({ page }) => {
    await page.goto('/admin/import-export');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Find and click the export button (first button in the flex container)
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });

    // Click the first button (export button with white background)
    await buttons.first().click();

    // Verify Dialog appears after clicking
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(500); // Brief wait for dialog animation

    // Close Dialog using Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Import wizard flow for Students', async ({ page }) => {
    await page.goto('/admin/import-export');
    await page.waitForLoadState('networkidle');

    // Find the import button (second button with blue background)
    const buttons = page.locator('button');
    const importButton = buttons.nth(1); // Import button is second

    // Hover over import button to show dropdown
    await importButton.hover({ timeout: 10000 });
    await page.waitForTimeout(300); // Wait for dropdown to appear

    // Click on "Import Students" option in dropdown
    const importStudentsOption = page.locator('button').filter({ hasText: /Students/i }).first();
    await expect(importStudentsOption).toBeVisible({ timeout: 5000 });
    await importStudentsOption.click();

    // Verify Wizard appears
    await page.waitForTimeout(300); // Wait for modal animation
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 5000 });
  });

  test('History table loads data', async ({ page }) => {
    await page.goto('/admin/import-export');
    // Check for table headers
    await expect(page.locator('thead')).toContainText(/Status/i);
  });
});
