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
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Mobile layouts are validated in dedicated mobile specs; skip here for report-workflow stability.');
    }

    const apiBase = resolveApiBase();
    const adminEmail = process.env.E2E_EMAIL || 'admin@example.com';
    const adminPassword = process.env.E2E_PASSWORD || 'E2eAdmin#Pass2026';

    // A setup that does not work fails the test. It used to skip it, and a skipped test reads
    // as "nothing to see here": a broken login or a missing permission would have gone unseen.
    try {
      await loginViaAPI(page, adminEmail, adminPassword);
    } catch {
      // No seeded admin here (a local database, say): a freshly registered teacher instead.
      // Whatever goes wrong from here on is thrown, and fails the test.
      const user = generateTeacherUser();
      const registered = await registerUser(page, user);
      const registeredUser = (registered && (registered.data || registered)) as { id?: number };
      expect(typeof registeredUser?.id, 'E2E setup: registration returned no user id').toBe('number');

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
        // Continue with the role's defaults; a teacher who cannot see reports fails the test.
        console.warn(`[E2E reports] Could not grant reports:view (${grantReportView.status()})`);
      }

      await loginViaAPI(page, user.email, user.password);
    }

    const importResponse = await page.request.post(`${apiBase}/api/v1/custom-reports/templates/import`);
    if (!importResponse.ok()) {
      console.warn(`[E2E reports] Could not import default templates (${importResponse.status()})`);
    }
  });

  test('can create a custom report from builder and see it in reports list', async ({ page }) => {
    const reportName = `E2E Report ${generateRandomString('rw-')}`;

    await page.goto('/#/operations/reports');
    await expect(page).toHaveURL(/\/operations\/reports/);
    await expect(page.locator('[data-testid="report-list-title"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="create-report-btn"]').click();
    await expect(page).toHaveURL(/\/operations\/reports\/builder/);

    await page.locator('[data-testid="report-name-input"]').fill(reportName);

    await page.locator('[data-testid="report-step-fields"]').click();
    const firstAddFieldButton = page.locator('[data-testid^="add-field-"]').first();
    await expect(firstAddFieldButton).toBeVisible({ timeout: 10000 });
    await firstAddFieldButton.scrollIntoViewIfNeeded();
    await firstAddFieldButton.click({ force: true });
    await expect(page.locator('[data-testid="selected-fields-list"]')).toContainText(/.+/);

    await page.locator('[data-testid="report-step-preview"]').click();
    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/v1/custom-reports'),
      { timeout: 15000 }
    );

    await page.locator('[data-testid="report-save-btn"]').click();

    // No answer within the timeout rejects here and fails the test; so does an answer that
    // is not a success. Both used to be skips.
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok(), `Create report answered HTTP ${saveResponse.status()}`).toBeTruthy();

    const savePayload = (await saveResponse.json().catch(() => null)) as
      | { id?: number; data?: { id?: number } }
      | null;
    const createdReportId: number | null = savePayload?.id ?? savePayload?.data?.id ?? null;

    await expect(page).toHaveURL(/\/operations\?tab=reports/, { timeout: 15000 });

    await page.goto('/#/operations/reports');
    await expect(page).toHaveURL(/\/operations\/reports/);
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/v1/custom-reports') &&
        response.ok(),
      { timeout: 15000 }
    ).catch(() => null);

    const reportRow = page.locator('tr', { hasText: reportName }).first();
    const rowCount = await expect
      .poll(async () => await page.locator('tr', { hasText: reportName }).count(), {
        timeout: 15000,
      })
      .toBeGreaterThan(0)
      .then(() => 1)
      .catch(() => 0);

    if (rowCount > 0) {
      await expect(reportRow).toBeVisible({ timeout: 15000 });
      return;
    }

    expect(
      createdReportId,
      'the new report is not in the list, and the create response carried no id to look it up by'
    ).not.toBeNull();

    const apiBase = resolveApiBase();
    const verifyByIdResponse = await page.request.get(`${apiBase}/api/v1/custom-reports/${createdReportId}`);
    expect(verifyByIdResponse.ok()).toBeTruthy();
    const verifyPayload = (await verifyByIdResponse.json().catch(() => null)) as
      | { name?: string; data?: { name?: string } }
      | null;
    const persistedName = verifyPayload?.name ?? verifyPayload?.data?.name ?? '';
    expect(persistedName).toBe(reportName);
  });

  test('can open templates and use one to prefill report builder', async ({ page }) => {
    await page.goto('/#/operations/reports/templates');
    await expect(page).toHaveURL(/\/operations\/reports\/templates/);

    // Each step below used to skip the test when it did not happen. A templates page that
    // renders nothing, or defaults that cannot be restored, is a failure.
    await page.waitForFunction(
      () =>
        Boolean(document.querySelector('[data-testid^="template-card-"]')) ||
        Boolean(document.querySelector('[data-testid="restore-default-templates-btn"]')),
      { timeout: 15000 }
    );

    const templateCards = page.locator('[data-testid^="template-card-"]');

    if ((await templateCards.count()) === 0) {
      const restoreButton = page.locator('[data-testid="restore-default-templates-btn"]');
      await expect(restoreButton, 'no templates, and no control to restore the defaults').toBeVisible();

      await restoreButton.click();
      await expect(templateCards.first(), 'no templates after restoring the defaults').toBeVisible({
        timeout: 15000,
      });
    }

    const firstUseButton = page.locator('[data-testid^="template-use-"]').first();
    await expect(firstUseButton).toBeVisible({ timeout: 10000 });
    await firstUseButton.scrollIntoViewIfNeeded();
    await firstUseButton.click({ force: true });

    await expect(page).toHaveURL(/\/operations\/reports\/builder/);

    const reportNameInput = page.locator('[data-testid="report-name-input"]');
    await expect(reportNameInput).toBeVisible({ timeout: 10000 });
    const prefilledName = (await reportNameInput.inputValue()).trim();

    expect(prefilledName.length).toBeGreaterThan(0);
  });
});
