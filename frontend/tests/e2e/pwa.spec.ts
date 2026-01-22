import { test, expect } from '@playwright/test';

test.describe('PWA Compliance & Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app root
    await page.goto('/');
    // Wait for hydration/network idle to ensure SW registration logic runs
    await page.waitForLoadState('networkidle');
  });

  test('should have valid web app manifest', async ({ page }) => {
    // Vite PWA plugin injects this
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    const href = await manifestLink.getAttribute('href');
    expect(href).toBeTruthy();

    if (href) {
      const response = await page.request.get(href);
      expect(response.ok()).toBeTruthy();
      const json = await response.json();

      // Verify critical PWA properties
      expect(json.name).toBe('Student Management System');
      expect(json.short_name).toBe('SMS');
      expect(json.display).toBe('standalone');
      expect(json.start_url).toBe('/');
      expect(json.icons.length).toBeGreaterThan(0);
    }
  });

  test('should register service worker', async ({ page }) => {
    // Check if SW is registered
    const isRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0 || (await navigator.serviceWorker.ready) !== undefined;
    });

    expect(isRegistered).toBeTruthy();
  });

  test('should show install prompt on event', async ({ page }) => {
    // Simulate the beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-ignore
      event.prompt = async () => {};
      // @ts-ignore
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    // The PwaInstallPrompt component should appear
    await expect(page.getByText('Install App')).toBeVisible();
  });

  test('should apply mobile optimizations', async ({ page }) => {
    // Check if mobile.css is loaded (touch-action: manipulation on buttons)
    const button = page.locator('button').first();
    await expect(button).toHaveCSS('touch-action', 'manipulation');
  });
});
