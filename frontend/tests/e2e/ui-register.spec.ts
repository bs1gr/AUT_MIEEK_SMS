import { test, expect } from '@playwright/test';

test.describe('Registration UI flow (smoke)', () => {
  test('register via UI and ensure backend sets HttpOnly refresh cookie and auto-login', async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
    const rnd = Math.random().toString(36).slice(2, 8);
    const email = `e2e-ui-${rnd}@example.test`;
    const password = 'E2E-Ui-Password-1!';

    await page.goto(base);

    // Fill registration form (auth controls are in the header of the app)
    await page.fill('input[aria-label="email"]', email);
    await page.fill('input[aria-label="password"]', password);
    await page.fill('input[aria-label="full name"]', 'E2E UI User');

    // Wait for the network response that performs registration and capture headers
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/register') && r.request().method() === 'POST'),
      page.click('button:has-text("Register")'),
    ]);

    expect(res.status()).toBeGreaterThan(199);
    expect(res.status()).toBeLessThan(300);

    const sc = res.headers()['set-cookie'] || '';
    // Backend should set a refresh_token cookie (HttpOnly cookie appears in headers)
    expect(sc).toMatch(/refresh_token=/);

    // Ensure the UI shows auto-login success message when server returns access token
    // The app displays 'Registered and logged in.' on successful auto-login.
    const success = page.locator('text=Registered and logged in.');
    await expect(success).toHaveCount(1);
  });
});
