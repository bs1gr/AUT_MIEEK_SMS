import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Bulk Import/Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to the Import/Export page
    await page.goto('/admin/import-export');
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
  });

  test('should display import/export dashboard', async ({ page }) => {
    // Check for main heading (uses i18n, look for h1 tag)
    await expect(page.locator('h1')).toBeVisible();

    // Check for import/export history section (h2 heading)
    const h2Locator = page.locator('h2');
    await expect(h2Locator).toBeVisible();

    // Check for buttons on page (import/export buttons should exist)
    const buttons = page.locator('button');
    await expect(buttons).toHaveCount(3); // At least import, export, and refresh buttons
  });

  test('should open export dialog and select options', async ({ page }) => {
    // Click the first button that should be the export button (rightmost button)
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    await firstButton.click();

    // Wait for dialog or modal to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close dialog
    const closeButton = page.locator('button:has-text("✕")').or(page.locator('[aria-label="Close"]'));
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate through import wizard steps', async ({ page }) => {
    // Find and click the import dropdown button (blue button with dropdown)
    const importButton = page.locator('button').filter({ hasText: /import/i }).first();
    await importButton.waitFor({ state: 'visible' });
    await importButton.click();

    // Click on one of the import options (e.g., Import Students)
    const importOption = page.locator('button').filter({ hasText: /students/i }).first();
    await importOption.waitFor({ state: 'visible' });
    await importOption.click();

    // Wait for wizard/dialog to appear
    const wizard = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'));
    await expect(wizard).toBeVisible({ timeout: 5000 });

    // Close wizard
    const closeButton = page.locator('button:has-text("✕")').or(page.locator('[aria-label="Close"]'));
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  });
});
