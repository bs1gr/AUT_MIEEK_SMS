/**
 * E2E Test Hooks
 *
 * Integrates logging into Playwright test lifecycle
 */

import { test } from '@playwright/test';
import { exportLogsAsJSON, logPhase, clearLogs } from './logging';
import fs from 'fs';
import path from 'path';

// Hook into each test
test.beforeEach(async ({ page }, testInfo) => {
  clearLogs();
  logPhase('TEST_START', `Starting: ${testInfo.title}`);

  // Intercept all API calls for logging
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    logPhase('API_REQUEST', `${method} ${url}`);

    const response = await route.continue();
    logPhase('API_RESPONSE', `${method} ${url}`, {
      status: response.status(),
    });

    return response;
  });
});

test.afterEach(async ({}, testInfo) => {
  // Export logs to file after each test
  if (process.env.E2E_EXPORT_LOGS === '1') {
    const logsDir = path.join(process.cwd(), 'frontend/test-logs');

    // Create directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const filename = path.join(
      logsDir,
      `${testInfo.title.replace(/\s+/g, '_')}_${Date.now()}.json`
    );

    fs.writeFileSync(filename, exportLogsAsJSON());
    console.log(`📝 Test logs exported to: ${filename}`);
  }
});
