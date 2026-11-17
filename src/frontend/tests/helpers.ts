import { Page } from '@playwright/test';
import axios from 'axios';

// --- Setup Helpers ---

export async function ensureTestUserExists() {
  const apiBase = (process.env.PLAYWRIGHT_BASE_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const client = axios.create({ baseURL: `${apiBase}/api/v1` });

  const email = 'test@example.com'; // pragma: allowlist secret
  const password = 'Test@Pass123'; // pragma: allowlist secret

  try {
    await client.post('auth/login', { email, password });
    return;
  } catch {
    // Try to register if login failed
    try {
      await client.post('auth/register', {
        email,
        password,
        full_name: 'Test User',
      });
    } catch {
      // If registration also fails (likely because user exists), ignore
    }
  }
}

// --- Auth Helpers ---

// The helpers that stood here until November 2026 (loginViaAPI, loginAsAdmin, navigateTo,
// createStudent, waitForTable, getTableRowCount, searchTable, waitForNotification) were used by
// one skipped spec only and could not work: the sign-in wrote a key the application deletes at
// start, and the rest looked for a table the Students page does not have. Use e2e/helpers.ts.

/**
 * Logs in via the UI form.
 * Useful for testing the login flow itself, but slower than loginViaAPI.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  console.warn('🔐 [E2E] Starting login for', email);
  // No sms_server_url injection needed: Capacitor.isNativePlatform() now returns false
  // in web/CI, so needsServerSetup() never redirects and getApiBaseUrl() correctly
  // falls back to VITE_API_URL (http://localhost:8000/api/v1).
  // Setting sms_server_url here caused getApiBaseUrl() to return a URL without /api/v1,
  // breaking the login API call.
  // Navigate with explicit hash so HashRouter starts at the auth route
  await page.goto('/#/');

  // Wait for the auth page component to be attached (hidden div signals AuthPage mounted)
  try {
    await page.waitForSelector('[data-testid="auth-page-loaded"]', { state: 'attached', timeout: 20_000 });
  } catch {
    console.warn('⚠️  [E2E] Auth page marker not found (continuing anyway)');
  }

  const emailInput = page.locator('[data-testid="auth-login-email"], #auth-login-email, input[name="email"], input[type="email"]');
  const passwordInput = page.locator('[data-testid="auth-login-password"], #auth-login-password, input[name="password"], input[type="password"]');

  await emailInput.waitFor({ state: 'visible', timeout: 25_000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 25_000 });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.click('button[type="submit"]');

  // Wait for redirect
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  } catch (e) {
    console.error('❌ [E2E] Redirect to /dashboard failed. Current URL:', page.url());
    throw e;
  }

  // Use 'load' not 'networkidle' — dashboard polls API data and never reaches networkidle.
  await page.waitForLoadState('load', { timeout: 15_000 });
}

// Alias for backward compatibility with older tests
export const login = loginViaUI;

export async function logout(page: Page) {
  const logoutButton = page.locator('[data-testid="logout-button"]');
  await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  await logoutButton.click();
  await page.waitForURL(/^https?:\/\/[^/]+\/?#?\/?(\?.*)?$/, { timeout: 10000 });
}
