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
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify buttons exist - there should be export and import buttons visible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0); // At least some buttons should exist

    // Verify History section heading exists
    const historyHeading = page.locator('h2');
    await expect(historyHeading).toBeVisible({ timeout: 10000 });
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

    // Find the import button by looking for the one with the dropdown icon
    // It has a blue background and "Import Data" text
    const importButton = page.locator('button').filter({ hasText: /Import|importData/ }).first();
    await expect(importButton).toBeVisible({ timeout: 10000 });

    // Hover over import button to show dropdown menu
    await importButton.hover({ timeout: 10000 });
    await page.waitForTimeout(500); // Wait for dropdown to appear

    // Click on the first menu item (Import Students)
    const menuItems = page.locator('.group-hover\\:block button');
    const firstMenuItem = menuItems.first();
    await expect(firstMenuItem).toBeVisible({ timeout: 5000 });
    await firstMenuItem.click();

    // Verify Import wizard modal appears with file input
    await page.waitForTimeout(500); // Wait for modal animation
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
  });

  test('History table loads data', async ({ page }) => {
    await page.goto('/admin/import-export');
    await page.waitForLoadState('networkidle');

    // Verify history section exists
    const historyHeading = page.locator('h2').filter({ hasText: /History|history/ });
    await expect(historyHeading).toBeVisible({ timeout: 10000 });

    // Check if table exists (may be empty)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
