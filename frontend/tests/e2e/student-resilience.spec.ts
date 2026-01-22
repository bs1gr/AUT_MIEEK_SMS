import { test, expect } from '@playwright/test';

test.describe('Student Resilience & Security', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher
    await page.goto('/login');
    await page.getByLabel('Email').fill('teacher1@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('/dashboard');
  });

  test('should prevent double submission (Rate Limiting)', async ({ page }) => {
    await page.goto('/students');
    await page.getByRole('button', { name: /add student/i }).click();

    // Fill form with dummy data
    await page.getByLabel(/first name/i).fill('Rate');
    await page.getByLabel(/last name/i).fill('Limit');
    await page.getByLabel(/email/i).fill(`ratelimit-${Date.now()}@test.com`);

    // Intercept the create request to delay it
    // This allows us to verify the button state while "submitting"
    await page.route('**/api/v1/students', async route => {
      await new Promise(f => setTimeout(f, 1000)); // 1s delay
      await route.fulfill({ status: 201, body: JSON.stringify({ id: 999 }) });
    });

    const saveButton = page.getByRole('button', { name: /save/i });

    // Click once
    await saveButton.click();

    // Verify button is disabled immediately (preventing double submit)
    // It might change text to "Saving...", so we check disabled state primarily
    await expect(saveButton).toBeDisabled();

    // Wait for the modal to close (indicating success)
    await expect(page.locator('text=Add Student')).not.toBeVisible();
  });

  test('should show error recovery UI when API fails', async ({ page }) => {
    // 1. Mock API failure (500 Error)
    await page.route('**/api/v1/students*', route => route.fulfill({
      status: 500,
      body: JSON.stringify({ message: 'Simulated Backend Failure' })
    }));

    await page.goto('/students');

    // 2. Verify ErrorRetry component appears
    await expect(page.getByText(/simulated backend failure/i)).toBeVisible();
    const retryButton = page.getByRole('button', { name: /try again/i });
    await expect(retryButton).toBeVisible();

    // 3. Remove failure mock to allow recovery
    await page.unroute('**/api/v1/students*');

    // 4. Click Retry
    await retryButton.click();

    // 5. Verify "Retrying..." state (optional, happens fast)
    // await expect(page.getByText(/retrying/i)).toBeVisible();

    // 6. Verify success (List should load)
    // We expect the table or "No students found" message, but definitely not the error
    await expect(retryButton).not.toBeVisible();
    // Check for common list elements
    const listContainer = page.locator('div.overflow-y-auto.relative');
    await expect(listContainer).toBeVisible();
  });
});
