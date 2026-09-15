import { test, expect } from '@playwright/test';
import { loginViaAPI } from './helpers';

const LINKEDIN_URL = 'https://www.linkedin.com/in/vasilis-samaras/';

test.describe('System > Credits', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'test@example.com', 'Test@Pass123'); // pragma: allowlist secret
    await page.goto('/#/power');
    await page.waitForLoadState('networkidle');
  });

  test('is collapsed by default and toggles open and shut', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Show Credits|Εμφάνιση Συντελεστών/i });
    await expect(toggle).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#system-credits-content')).toHaveCount(0);

    await toggle.click();
    await expect(page.locator('#system-credits-content')).toBeVisible();

    await page.getByRole('button', { name: /Hide Credits|Απόκρυψη Συντελεστών/i }).click();
    await expect(page.locator('#system-credits-content')).toHaveCount(0);
  });

  test('shows the logo, author link, licence and stack credits', async ({ page }) => {
    await page.getByRole('button', { name: /Show Credits|Εμφάνιση Συντελεστών/i }).click();
    const panel = page.locator('#system-credits-content');
    await expect(panel).toBeVisible();

    // naturalWidth > 0 proves the image actually loaded. A plain visibility check
    // would still pass if the file went missing from public/ and the browser
    // rendered a broken-image placeholder.
    const logo = panel.locator('img');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    const link = panel.getByRole('link', { name: /LinkedIn/i });
    await expect(link).toHaveAttribute('href', LINKEDIN_URL);
    await expect(link).toHaveAttribute('target', '_blank');
    // rel must carry noopener: target="_blank" without it lets the opened page
    // reach back through window.opener.
    await expect(link).toHaveAttribute('rel', /noopener/);

    // .first() throughout: the author name also appears in the copyright line.
    await expect(panel.getByText(/Vasilis Samaras|Βασίλης Σαμαράς/).first()).toBeVisible();
    await expect(panel.getByText(/MIT/).first()).toBeVisible();
    await expect(panel.getByText(/FastAPI/).first()).toBeVisible();
    await expect(panel.getByText(/React/).first()).toBeVisible();
  });

  test('renders translated copy rather than raw i18n keys', async ({ page }) => {
    await page.getByRole('button', { name: /Show Credits|Εμφάνιση Συντελεστών/i }).click();
    const panel = page.locator('#system-credits-content');
    await expect(panel).toBeVisible();

    // i18next echoes a missing key back verbatim, so unresolved keys surface as
    // literal "system.creditsX" text instead of failing loudly.
    await expect(panel.getByText(/system\.credits/)).toHaveCount(0);
  });
});
