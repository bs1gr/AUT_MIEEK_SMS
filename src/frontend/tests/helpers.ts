import { Page, expect } from '@playwright/test';
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

/**
 * Logs in via API and injects the session token into the browser context.
 *
 * This is the recommended approach for E2E tests because it's:
 * - **Faster**: Bypasses the UI login flow (typing, clicking, waiting for navigation).
 * - **More Reliable**: Not affected by UI changes to the login form.
 * - **Isolated**: Test state is cleanly set up before the test begins.
 *
 * It works by calling the API to get a token and then using `page.context().addInitScript()`
 * to set that token in `localStorage` before any page loads.
 *
 * @param page The Playwright Page object.
 * @param email The user's email.
 * @param password The user's password.
 */
export async function loginViaAPI(page: Page, email: string, password: string) {
  // 1. Request the access token from the backend API.
  const response = await page.request.post('/api/v1/auth/login', {
    data: {
      email: email,
      password: password,
    },
  });
  expect(response.ok(), `Login via API failed for user ${email}`).toBeTruthy();
  const data = await response.json();
  const access_token = data.access_token || (data.data && data.data.access_token);
  expect(access_token, `No access token in login response for ${email}`).toBeTruthy();

  // 2. Inject a script to set the token in localStorage on all new pages.
  // This is more robust than navigating to a page just to set the token.
  await page.context().addInitScript((token) => {
    window.localStorage.setItem('sms_access_token', token);
  }, access_token);
}

/**
 * Logs in as the default administrator using environment variables or fallback credentials.
 *
 * This is a convenience wrapper around `loginViaAPI` for tests that require admin privileges.
 * For better security and flexibility, it reads credentials from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
 * environment variables, falling back to hardcoded defaults if they are not set.
 *
 * @param page The Playwright Page object.
 */
export async function loginAsAdmin(page: Page) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'YourSecurePassword123!';

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('WARNING: Using default admin credentials. For better security, set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  }

  await loginViaAPI(page, adminEmail, adminPassword);
}

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

  await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

// Alias for backward compatibility with older tests
export const login = loginViaUI;

export async function logout(page: Page) {
  const logoutButton = page.locator('[data-testid="logout-button"]');
  await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  await logoutButton.click();
  await page.waitForURL(/^https?:\/\/[^/]+\/?#?\/?(\?.*)?$/, { timeout: 10000 });
}

// --- Navigation & Interaction Helpers ---

export async function navigateTo(page: Page, path: string) {
  await page.click(`a[href="${path}"]`);
  await page.waitForLoadState('networkidle');
}

export async function createStudent(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    studentId: string;
  }
) {
  const addStudentButton = page.locator('[data-testid="add-student-btn"], button:has-text("Add Student")');
  await addStudentButton.waitFor({ state: 'visible', timeout: 15_000 });
  await addStudentButton.first().click();

  await page.waitForSelector('[data-testid="student-id-input"]', { timeout: 15_000 });

  await page.fill('[data-testid="first-name-input"], input[name="firstName"]', data.firstName);
  await page.fill('[data-testid="last-name-input"], input[name="lastName"]', data.lastName);
  await page.fill('[data-testid="email-input"], input[name="email"]', data.email);
  await page.fill('[data-testid="student-id-input"], input[name="studentId"]', data.studentId);

  const submitButton = page.locator('[data-testid="submit-student"], button:has-text("Add Student"), button:has-text("Save")');
  await submitButton.first().click();

  await page.waitForSelector('text=successfully', { timeout: 10_000 });
}

export async function waitForTable(page: Page, timeout = 5000) {
  await page.waitForSelector('table tbody tr', { timeout });
}

export async function getTableRowCount(page: Page): Promise<number> {
  return page.locator('table tbody tr').count();
}

export async function searchTable(page: Page, searchTerm: string) {
  const searchInput = page.locator('input[placeholder*="Search"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill(searchTerm);
    await page.waitForLoadState('networkidle');
  }
}

export async function waitForNotification(
  page: Page,
  type: 'success' | 'error' | 'warning' = 'success',
  timeout = 5000
) {
  const selector = type === 'success' ? 'text=successfully' : type === 'error' ? 'text=error' : 'text=warning';
  await page.waitForSelector(selector, { timeout });
}
