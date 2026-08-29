import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  globalSetup: './playwright-global-setup.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['github', { outputFolder: 'playwright-report' }]
  ],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // 127.0.0.1 (not 'localhost') so the page origin always matches the default
    // API origin in tests/e2e/helpers.ts's getApiBase() — a mismatch here means
    // the HttpOnly refresh_token cookie set by a direct API login never reaches
    // the page's own (proxied) requests, and loginViaAPI's post-login redirect
    // silently times out. Also matches how every CI workflow pins this.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: process.env.CI ? [
    // In CI, only test on Chromium for speed
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ] : [
    // Locally, test on all browsers
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  // Only start webServer if not explicitly configured (e.g., in CI with PLAYWRIGHT_BASE_URL)
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
