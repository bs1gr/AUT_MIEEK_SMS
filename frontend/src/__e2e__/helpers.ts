import { Page } from '@playwright/test';

export async function login(
  page: Page,
  email: string,
  password: string,
  baseURL = 'http://localhost:5173'
) {
  await page.goto(`${baseURL}/login`);
  
  // Wait for login form
  await page.waitForLoadState('networkidle');
  
  // Fill credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page, baseURL = 'http://localhost:5173') {
  // Click user menu or logout button
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-btn"]');
  
  // Wait for redirect to login
  await page.waitForURL(`${baseURL}/login`, { timeout: 5000 });
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
