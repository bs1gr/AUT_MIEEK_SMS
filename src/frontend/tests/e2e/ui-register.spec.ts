import { test, expect } from '@playwright/test';
import { recordCreatedUser } from './created-users';

test.describe('Registration UI flow (smoke)', () => {
  test('register via UI files a request for approval and does not sign in', async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
    const rnd = Math.random().toString(36).slice(2, 8);
  const email = `e2e-ui-${rnd}@example.com`;
    const password = 'E2E-Ui-Password-1!';

    await page.goto(base);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Ensure unauthenticated state in case previous tests set a token
    await page.evaluate(() => {
      try { localStorage.removeItem('sms_access_token'); } catch {}
    });
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Ensure registration form is visible (inline variant may be collapsed)
    const toggle = page.locator('[data-testid="register-toggle"]');
    if (await toggle.count()) {
      // Open inline form if present and collapsed
      const formVisible = await page.locator('[data-testid="register-email"]').isVisible().catch(() => false);
      if (!formVisible) {
        await toggle.click();
        await page.waitForTimeout(500); // Brief pause for animation
      }
    } else {
      // Fallback: open dialog variant if present
      const openDialog = page.locator('[data-testid="register-open"]');
      if (await openDialog.count()) {
        await openDialog.click();
        await page.waitForTimeout(500); // Brief pause for modal animation
      }
    }

    // Wait for form fields to be visible before filling
    await page.locator('[data-testid="register-email"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-testid="register-password"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-testid="register-fullname"]').waitFor({ state: 'visible', timeout: 15000 });

    // Fill registration form using stable test ids
    await page.fill('[data-testid="register-email"]', email);
    await page.fill('[data-testid="register-password"]', password);
    await page.fill('[data-testid="register-fullname"]', 'E2E UI User');

    // Public registration only files a request (SELF_REGISTRATION_MODE=approval): the account is
    // created inactive, the form says an administrator must approve it, and no sign-in happens.
    const loginCalls: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/auth/login') && r.method() === 'POST') loginCalls.push(r.url());
    });

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/auth/register') && r.request().method() === 'POST'),
      page.click('[data-testid="register-submit"]'),
    ]);

    if (!(res.status() >= 200 && res.status() < 300)) {
      const txt = await res.text().catch(() => '');
      console.error('UI Register failed status=', res.status(), 'body=', txt);
    }
    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);
    const created = await res.json();
    recordCreatedUser(created.id, email);
    expect(created.is_active).toBe(false);

    await expect(
      page.getByText(/administrator must approve your account|διαχειριστής πρέπει να εγκρίνει τον λογαριασμό/i)
    ).toBeVisible({ timeout: 10000 });
    // The form is cleared so the request can't be resubmitted by accident.
    await expect(page.locator('[data-testid="register-email"]')).toHaveValue('');

    // Still signed out: no login attempt, no refresh cookie, still on the login page.
    expect(loginCalls).toEqual([]);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'refresh_token')).toBeUndefined();
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="auth-login-email"]')).toBeVisible();
  });
});
