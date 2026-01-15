import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Bulk Import/Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to the Import/Export page (adjust URL if different in implementation)
    await page.goto('/admin/import-export');
  });

  test('should display import/export dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Import\/Export|Data Management/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /History/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Import/i })).toBeVisible();
  });

  test('should open export dialog and select options', async ({ page }) => {
    // Click Export button (assuming one exists for Students or generic)
    await page.getByRole('button', { name: /Export/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Export Data/i)).toBeVisible();

    // Check format selection
    await expect(dialog.getByLabel(/Format/i)).toBeVisible();
    await dialog.getByLabel(/Format/i).click();
    await page.getByRole('option', { name: 'Excel' }).click();

    // Close dialog
    await dialog.getByRole('button', { name: /Cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('should navigate through import wizard steps', async ({ page }) => {
    await page.getByRole('button', { name: /New Import/i }).click();

    const wizard = page.getByRole('dialog');
    await expect(wizard).toBeVisible();

    // Step 1: Upload
    await expect(wizard.getByText(/Step 1/i)).toBeVisible();
    await expect(wizard.getByText(/Select File/i)).toBeVisible();

    // Verify we can't proceed without file
    const nextButton = wizard.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeDisabled();

    // Close wizard
    await wizard.getByRole('button', { name: /Cancel/i }).click();
    await expect(wizard).not.toBeVisible();
  });

  test('should display import history', async ({ page }) => {
    // Ensure history tab is active or click it
    const historyTab = page.getByRole('tab', { name: /History/i });
    if (await historyTab.getAttribute('aria-selected') !== 'true') {
      await historyTab.click();
    }

    // Check for history table headers
    await expect(page.getByRole('cell', { name: /Filename/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Date/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Status/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Records/i })).toBeVisible();
  });
});
