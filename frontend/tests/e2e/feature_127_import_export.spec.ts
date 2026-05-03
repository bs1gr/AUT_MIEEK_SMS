import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Feature #127: Bulk Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
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
    await expect(page.getByTestId('history-table-root')).toBeVisible();
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

    await dialog.getByRole('button', { name: /Close/i }).click();
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
    await expect(page.getByTestId('file-input')).toBeAttached();

    // Verify Cancel works
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText(/Select File/i)).not.toBeVisible();
  });

  test('History table loads data', async ({ page }) => {
    await page.goto('/admin/import-export');
    await expect(page.getByTestId('history-table-root')).toBeVisible();
  });
});
