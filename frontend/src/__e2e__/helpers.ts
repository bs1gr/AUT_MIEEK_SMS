// --- Playwright global setup for E2E test user ---
import axios from 'axios';

export async function ensureTestUserExists() {
  // Use relative API path so Playwright uses Vite proxy in dev
  const email = 'test@example.com'; // pragma: allowlist secret
  const password = 'password123'; // pragma: allowlist secret
  try {
    // Try to login first
    await axios.post('/api/v1/auth/login', { email, password });
    // If login succeeds, user exists
    return;
  } catch (err) {
    // If login fails, try to register as teacher (default role)
    try {
      await axios.post('/api/v1/auth/register', {
        email,
        password,
        full_name: 'Test User',
        // Do not set role: backend will default to 'teacher' for anonymous registration
      });
    } catch (regErr) {
      // Ignore if already exists or registration fails
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
  console.log('🔐 [E2E] Waiting for network idle (timeout: 15s)...');
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch (e) {
    console.warn('⚠️  [E2E] Network idle timeout (continuing anyway)');
  }

  // Prefer stable data-testid/ids, fallback to name
  const emailInput = page.locator('[data-testid="auth-login-email"], #auth-login-email, input[name="email"]');
  const passwordInput = page.locator('[data-testid="auth-login-password"], #auth-login-password, input[name="password"]');

  console.log('🔐 [E2E] Waiting for email input (timeout: 20s)...');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });
  } catch (e) {
    console.error('❌ [E2E] Email input not visible. Page HTML:', (await page.content()).substring(0, 1000));
    throw e;
  }

  console.log('🔐 [E2E] Waiting for password input (timeout: 20s)...');
  await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });

  // Fill credentials
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
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
  await page.click('button:has-text("Add Student")');

  // Wait for modal
  await page.waitForSelector('[data-testid="student-form"]');

  // Fill form
  await page.fill('input[name="firstName"]', data.firstName);
  await page.fill('input[name="lastName"]', data.lastName);
  await page.fill('input[name="email"]', data.email);
  await page.fill('input[name="studentId"]', data.studentId);

  // Submit
  await page.click('button:has-text("Save")');

  // Wait for success message
  await page.waitForSelector('text=Student created successfully', { timeout: 5000 });
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
