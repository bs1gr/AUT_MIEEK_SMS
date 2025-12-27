import { test, expect } from '@playwright/test';

test.describe('Registration UI flow (smoke)', () => {
  test('register via UI and ensure backend sets HttpOnly refresh cookie and auto-login', async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
    const rnd = Math.random().toString(36).slice(2, 8);
  const email = `e2e-ui-${rnd}@example.com`;
    const password = 'E2E-Ui-Password-1!';

    await page.goto(base);
    // Ensure unauthenticated state in case previous tests set a token
    await page.evaluate(() => {
      try { localStorage.removeItem('sms_access_token'); } catch {}
    });
    await page.reload();

    // Ensure registration form is visible (inline variant may be collapsed)
    const toggle = page.locator('[data-testid="register-toggle"]');
    if (await toggle.count()) {
      // Open inline form if present and collapsed
      const formVisible = await page.locator('[data-testid="register-email"]').isVisible().catch(() => false);
      if (!formVisible) {
        await toggle.click();
      }
    } else {
      // Fallback: open dialog variant if present
      const openDialog = page.locator('[data-testid="register-open"]');
      if (await openDialog.count()) {
        await openDialog.click();
      }
    }

    // Fill registration form using stable test ids
    await page.fill('[data-testid="register-email"]', email);
    await page.fill('[data-testid="register-password"]', password);
    await page.fill('[data-testid="register-fullname"]', 'E2E UI User');

    // Wait for the network response that performs login (auto-login happens
    // after register) and capture headers.
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST'),
      page.click('[data-testid="register-submit"]'),
    ]);

    if (!(res.status() >= 200 && res.status() < 300)) {
      const txt = await res.text().catch(() => '');
      console.error('UI Register failed status=', res.status(), 'body=', txt);
    }

    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);

  // Browsers do not expose Set-Cookie headers to JS fetch/XHR responses for security.
  // Instead, check the browser context cookies for the HttpOnly refresh token.
  const cookies = await page.context().cookies();
  const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
  expect(refreshCookie).toBeDefined();
  expect(refreshCookie?.httpOnly).toBe(true);

    // Validate auto-login by checking access token in localStorage (UI text is localized)
    const token = await page.evaluate(() => localStorage.getItem('sms_access_token'));
    expect(token).toBeTruthy();
  });
});
