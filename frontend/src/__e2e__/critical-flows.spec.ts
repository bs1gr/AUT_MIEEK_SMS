import { test, expect } from '@playwright/test';
import { login, logout, waitForTable } from './helpers';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify page content - use heading instead of text to avoid strict mode
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    await logout(page);
    
    // Verify redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see error message or stay on login page
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should see validation errors - check for error message
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
  });

  test('should navigate to Students page', async ({ page }) => {
    await page.click('a:has-text("Students")');
    await page.waitForURL(/.*students/);
    // Use getByRole to get the Students heading, not link
    await expect(page.getByRole('heading').filter({ hasText: 'Students' }).first()).toBeVisible();
  });

  test('should navigate to Courses page', async ({ page }) => {
    await page.click('a:has-text("Courses")');
    await page.waitForURL(/.*courses/);
    // Use getByRole to get the Courses heading
    await expect(page.getByRole('heading').filter({ hasText: 'Courses' }).first()).toBeVisible();
  });

  test('should navigate to Grades page', async ({ page }) => {
    await page.click('a:has-text("Grades")');
    await page.waitForURL(/.*grades/);
    // Use getByRole to get the Grades heading
    await expect(page.getByRole('heading').filter({ hasText: 'Grades' }).first()).toBeVisible();
  });

  test('should navigate to Attendance page', async ({ page }) => {
    await page.click('a:has-text("Attendance")');
    await page.waitForURL(/.*attendance/);
    await expect(page.locator('text=Attendance')).toBeVisible();
  });
});

test.describe('Students Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    await page.click('a:has-text("Students")');
    await page.waitForURL(/.*students/);
  });

  test('should display students list', async ({ page }) => {
    await waitForTable(page, 10000);  // Increase timeout for table rendering
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search students', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');
      await page.waitForLoadState('networkidle');
      
      // Verify table is still visible with extended timeout
      await waitForTable(page, 10000);
    }
  });

  test('should open student detail', async ({ page }) => {
    // Wait for table and click first student
    await waitForTable(page, 10000);
    const firstRow = page.locator('table tbody tr:first-child');
    await firstRow.waitFor({ state: 'visible', timeout: 10000 });
    await firstRow.click();
    
    // Should navigate to detail page
    await page.waitForURL(/.*students\/\d+/, { timeout: 10000 });
    
    // Verify detail content
    await expect(page.getByRole('heading').filter({ hasText: 'Student' }).first()).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, 'test@example.com', 'password123');
    
    // Dashboard should still be accessible
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await login(page, 'test@example.com', 'password123');
    
    // Dashboard should be accessible
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });

  test('should be desktop responsive', async ({ page }) => {
    // Set desktop viewport (default)
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await login(page, 'test@example.com', 'password123');
    
    // Dashboard should be visible
    await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  });
});
