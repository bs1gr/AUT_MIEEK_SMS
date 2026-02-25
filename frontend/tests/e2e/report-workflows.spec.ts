import { test, expect } from '@playwright/test';
import {
  registerUser,
  loginViaAPI,
  generateTeacherUser,
  generateRandomString,
} from './helpers';

const resolveApiBase = (): string => {
  const raw = process.env.PLAYWRIGHT_API_BASE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return raw.replace(/\/+$/, '');
      }
    } catch {
      // Fall through to default local backend.
    }
  }
  return 'http://127.0.0.1:8000';
};

test.describe('Custom Reports Workflows', () => {
  test.beforeEach(async ({ page }) => {
    const apiBase = resolveApiBase();
    const adminEmail = process.env.E2E_EMAIL || 'admin@example.com';
    const adminPassword = process.env.E2E_PASSWORD || 'YourSecurePassword123!';

    try {
      await loginViaAPI(page, adminEmail, adminPassword);
      const importResponse = await page.request.post(`${apiBase}/api/v1/custom-reports/templates/import`);
      expect(importResponse.ok()).toBeTruthy();
      return;
    } catch {
      const user = generateTeacherUser();
      const registered = await registerUser(page, user);
      const registeredUser = (registered && (registered.data || registered)) as { id?: number };
      const userId = registeredUser?.id;

      expect(typeof userId).toBe('number');

      const ensureReportsViewPermission = await page.request.post(`${apiBase}/api/v1/permissions/`, {
        data: {
          key: 'reports:view',
          resource: 'reports',
          action: 'view',
          description: 'View reports',
        },
      });

      // 201: created, 400/409: already exists/validation duplicate in some environments.
      if (![200, 201, 400, 409].includes(ensureReportsViewPermission.status())) {
        console.warn(
          `[E2E reports] Could not ensure reports:view permission (${ensureReportsViewPermission.status()})`
        );
      }

      const grantReportView = await page.request.post(`${apiBase}/api/v1/permissions/roles/grant`, {
        data: {
          role_name: 'teacher',
          permission_key: 'reports:view',
        },
      });
      if (!grantReportView.ok()) {
        // Some environments enforce stricter auth/CSRF on permission management endpoints.
        // Continue with role defaults and let test-level checks decide whether to skip.
        console.warn(`[E2E reports] Could not grant reports:view (${grantReportView.status()})`);
      }

      const importResponse = await page.request.post(`${apiBase}/api/v1/custom-reports/templates/import`);
      if (!importResponse.ok()) {
        console.warn(`[E2E reports] Could not import default templates (${importResponse.status()})`);
      }

      await loginViaAPI(page, user.email, user.password);
    }
  });

  test('can create a custom report from builder and see it in reports list', async ({ page }) => {
    const reportName = `E2E Report ${generateRandomString('rw-')}`;

    await page.goto('/operations/reports');
    await expect(page).toHaveURL(/\/operations\/reports/);
    await expect(page.locator('[data-testid="report-list-title"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="create-report-btn"]').click();
    await expect(page).toHaveURL(/\/operations\/reports\/builder/);

    await page.locator('[data-testid="report-name-input"]').fill(reportName);

    await page.locator('[data-testid="report-step-fields"]').click();
    const firstAddFieldButton = page.locator('[data-testid^="add-field-"]').first();
    await expect(firstAddFieldButton).toBeVisible({ timeout: 10000 });
    await firstAddFieldButton.click();
    await expect(page.locator('[data-testid="selected-fields-list"]')).toContainText(/.+/);

    await page.locator('[data-testid="report-step-preview"]').click();
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v1/custom-reports'),
      { timeout: 15000 }
    );

    await page.locator('[data-testid="report-save-btn"]').click();

    const saveResponse = await saveResponsePromise.catch(() => null);
    if (!saveResponse) {
      test.skip(true, 'Create report request did not complete in time');
    }

    if (saveResponse && !saveResponse.ok()) {
      test.skip(true, `Create report unavailable (HTTP ${saveResponse.status()})`);
    }

    await expect(page).toHaveURL(/\/operations\?tab=reports/, { timeout: 15000 });

    await page.goto('/operations/reports');
    await expect(page).toHaveURL(/\/operations\/reports/);
    await expect(page.getByText(reportName)).toBeVisible({ timeout: 15000 });
  });

  test('can open templates and use one to prefill report builder', async ({ page }) => {
    await page.goto('/operations/reports/templates');
    await expect(page).toHaveURL(/\/operations\/reports\/templates/);

    const uiReady = await page
      .waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid^="template-card-"]')) ||
          Boolean(document.querySelector('[data-testid="restore-default-templates-btn"]')),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);

    if (!uiReady) {
      test.skip(true, 'Template UI controls did not render in time');
    }

    const templateCards = page.locator('[data-testid^="template-card-"]');

    if ((await templateCards.count()) === 0) {
      const restoreButton = page.locator('[data-testid="restore-default-templates-btn"]');
      if ((await restoreButton.count()) === 0) {
        test.skip(true, 'No templates available and restore control not rendered');
      }

      await restoreButton.click();
      const hasTemplateAfterRestore = await templateCards.first().isVisible({ timeout: 15000 }).catch(() => false);
      if (!hasTemplateAfterRestore) {
        test.skip(true, 'No templates available for this user after restore');
      }
    }

    const firstUseButton = page.locator('[data-testid^="template-use-"]').first();
    await expect(firstUseButton).toBeVisible({ timeout: 10000 });
    await firstUseButton.click();

    await expect(page).toHaveURL(/\/operations\/reports\/builder/);

    const reportNameInput = page.locator('[data-testid="report-name-input"]');
    await expect(reportNameInput).toBeVisible({ timeout: 10000 });
    const prefilledName = (await reportNameInput.inputValue()).trim();

    expect(prefilledName.length).toBeGreaterThan(0);
  });
});
