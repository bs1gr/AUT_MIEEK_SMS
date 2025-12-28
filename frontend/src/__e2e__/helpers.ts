// --- Playwright global setup for E2E test user ---
import axios from 'axios';

export async function ensureTestUserExists() {
  const apiBase = (process.env.PLAYWRIGHT_BASE_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const client = axios.create({ baseURL: `${apiBase}/api/v1` });

  const email = 'test@example.com'; // pragma: allowlist secret
  const password = 'Test@Pass123'; // pragma: allowlist secret

  try {
    await client.post('auth/login', { email, password });
    return;
  } catch (err) {
    // Try to register if login failed
    try {
      await client.post('auth/register', {
        email,
        password,
        full_name: 'Test User',
      });
    } catch (regErr) {
      // If registration also fails (likely because user exists), ignore
    }
  }
}
import { Page } from '@playwright/test';

export async function login(
  page: Page,
  email: string,
  password: string
) {
  // Use relative paths - Playwright will resolve against baseURL from config
  // Auth page is at root '/', not '/login'
  console.log('🔐 [E2E] Starting login for', email);
  await page.goto('/');

  // Wait for login form - increase timeout for slow CI environments
  console.log('🔐 [E2E] Waiting for network idle (timeout: 20s)...');
  try {
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  } catch (e) {
    console.warn('⚠️  [E2E] Network idle timeout (continuing anyway)');
  }

  // Prefer stable data-testid/ids, fallback to name
  const emailInput = page.locator('[data-testid="auth-login-email"], #auth-login-email, input[name="email"]');
  const passwordInput = page.locator('[data-testid="auth-login-password"], #auth-login-password, input[name="password"]');

  console.log('🔐 [E2E] Waiting for email input (timeout: 25s)...');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 25_000 });
  } catch (e) {
    console.error('❌ [E2E] Email input not visible. Page HTML:', (await page.content()).substring(0, 1000));
    throw e;
  }

  console.log('🔐 [E2E] Waiting for password input (timeout: 25s)...');
  await passwordInput.waitFor({ state: 'visible', timeout: 25_000 });

  // Fill credentials
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect
  console.log('🔐 [E2E] Waiting for dashboard redirect (timeout: 20s)...');
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  } catch (e) {
    console.error('❌ [E2E] Redirect to /dashboard failed. Current URL:', page.url());
    console.error('Page HTML snapshot:', (await page.content()).substring(0, 1500));
    throw e;
  }

  // Ensure dashboard is interactive
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await page.waitForTimeout(500);
}

export async function logout(page: Page) {
  // Click logout button using data-testid
  const logoutButton = page.locator('[data-testid="logout-button"]');
  await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  await logoutButton.click();

  // Wait for redirect to root (auth page) - match full URL with protocol and host
  await page.waitForURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 });
}

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
  // Click add student button
  const addStudentButton = page.locator('[data-testid="add-student-btn"], button:has-text("Add Student")');
  await addStudentButton.waitFor({ state: 'visible', timeout: 15_000 });
  await addStudentButton.first().click();

  // Wait for modal
  await page.waitForSelector('[data-testid="student-id-input"]', { timeout: 15_000 });

  // Fill form
  await page.fill('[data-testid="first-name-input"], input[name="firstName"], input[aria-label="first name"]', data.firstName);
  await page.fill('[data-testid="last-name-input"], input[name="lastName"], input[aria-label="last name"]', data.lastName);
  await page.fill('[data-testid="email-input"], input[name="email"], input[aria-label="email"]', data.email);
  await page.fill('[data-testid="student-id-input"], input[name="studentId"], input[aria-label="student id"]', data.studentId);

  // Submit
  const submitButton = page.locator('[data-testid="submit-student"], button:has-text("Add Student"), button:has-text("Save")');
  await submitButton.first().click();

  // Wait for success message
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
  const selector =
    type === 'success'
      ? 'text=successfully'
      : type === 'error'
        ? 'text=error'
        : 'text=warning';

  await page.waitForSelector(selector, { timeout });
}
