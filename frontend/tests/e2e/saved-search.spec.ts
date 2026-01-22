import { test, expect } from '@playwright/test';

test.describe('Saved Search Authorization', () => {
  // Unique search name to avoid collisions
  const searchName = `Private Search ${Date.now()}`;

  test('users should not see searches created by others', async ({ browser }) => {
    // 1. Login as User A (Teacher)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Assuming a helper or direct login flow
    await pageA.goto('/login');
    await pageA.getByLabel('Email').fill('teacher1@example.com');
    await pageA.getByLabel('Password').fill('password123');
    await pageA.getByRole('button', { name: 'Login' }).click();

    // 2. User A creates a saved search
    await pageA.goto('/students');
    // Open advanced search (assuming UI flow)
    await pageA.getByRole('button', { name: /advanced search/i }).click();
    await pageA.getByLabel(/name/i).fill('Test Student');
    await pageA.getByRole('button', { name: /save search/i }).click();

    await pageA.getByLabel(/search name/i).fill(searchName);
    await pageA.getByRole('button', { name: /save/i }).click();

    // Verify it exists for User A
    await pageA.goto('/saved-searches');
    await expect(pageA.getByText(searchName)).toBeVisible();

    // 3. Login as User B (Admin or another Teacher)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('/login');
    await pageB.getByLabel('Email').fill('admin@example.com');
    await pageB.getByLabel('Password').fill('password123');
    await pageB.getByRole('button', { name: 'Login' }).click();

    // 4. Verify User B CANNOT see User A's search
    await pageB.goto('/saved-searches');
    await expect(pageB.getByText(searchName)).not.toBeVisible();

    // Cleanup (User A deletes the search)
    await pageA.getByRole('button', { name: `Delete ${searchName}` }).click();
    await pageA.getByRole('button', { name: /confirm/i }).click();

    await contextA.close();
    await contextB.close();
  });
});
