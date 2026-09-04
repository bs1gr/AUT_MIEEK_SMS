import { test, expect } from '@playwright/test';
import { registerUser, generateTeacherUser, loginViaAPI } from './helpers';

test.describe('Login flow (smoke)', () => {
  test('shows an error and stays on the login page for wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="auth-page-loaded"]').waitFor({ state: 'attached', timeout: 15000 });

    await page.fill('[data-testid="auth-login-email"]', 'no-such-user@example.com');
    await page.fill('[data-testid="auth-login-password"]', 'wrong-password-1!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid|unable to sign in/i)).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="auth-login-email"]')).toBeVisible();
  });

  test('logs in via the UI, reaches the dashboard, and logging out returns to the login page', async ({ page }) => {
    const user = generateTeacherUser();
    await registerUser(page, user);
    // registerUser authenticates via the shared cookie jar; clear it so the
    // UI login below is the thing actually under test, not a stale session.
    await page.context().clearCookies();

    await page.goto('/');
    await page.locator('[data-testid="auth-page-loaded"]').waitFor({ state: 'attached', timeout: 15000 });

    await page.fill('[data-testid="auth-login-email"]', user.email);
    await page.fill('[data-testid="auth-login-password"]', user.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('[data-testid="auth-login-email"]')).toBeVisible({ timeout: 10000 });

    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
    expect(refreshCookie).toBeUndefined();
  });

  test('RequireAdmin redirects a non-admin user away from an admin-only route', async ({ page }) => {
    const user = generateTeacherUser();
    await registerUser(page, user);
    await loginViaAPI(page, user.email, user.password);

    await page.goto('/#/admin/permissions');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/admin\/permissions/);
  });
});
