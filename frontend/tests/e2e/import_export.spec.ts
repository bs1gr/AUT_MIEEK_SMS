import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Bulk Import/Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to the Import/Export page (adjust URL if different in implementation)
    await page.goto('/admin/import-export');
  });

  test('should display import/export dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Data Import/Export' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import Data/i })).toBeVisible();
    await expect(page.getByTestId('history-table-root')).toBeVisible();
  });

  test('should open export dialog and select options', async ({ page }) => {
    await page.getByRole('button', { name: /Export Data/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Export Data/i })).toBeVisible();

    const exportType = dialog.getByLabel(/Export type/i);
    await expect(exportType).toBeVisible();
    await exportType.selectOption('grades');

    await dialog.getByRole('button', { name: /Close/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('should navigate through import wizard steps', async ({ page }) => {
    await page.getByRole('button', { name: /Import Data/i }).click();
    await page.getByRole('menuitem', { name: /Import Students/i }).click();

    const wizard = page.getByTestId('import-wizard-students');
    await expect(wizard).toBeVisible();

    // Step 1: Upload
    await expect(wizard.getByTestId('step-0')).toBeVisible();
    await expect(wizard.getByTestId('file-input')).toBeAttached();

    await wizard.getByRole('button', { name: /Cancel/i }).click();
    await expect(wizard).not.toBeVisible();
  });

  test('should display import history', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
    await expect(page.getByTestId('history-table-root')).toBeVisible();
  });
});
