import { test, expect } from '@playwright/test';
import { login, logout, waitForTable } from './helpers';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify page content
    await expect(page.locator('text=Dashboard')).toBeVisible();
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
    
    // Should see error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should see validation errors
    await expect(page.locator('text=required')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
  });

  test('should navigate to Students page', async ({ page }) => {
    await page.click('a:has-text("Students")');
    await page.waitForURL(/.*students/);
    await expect(page.locator('text=Students')).toBeVisible();
  });

  test('should navigate to Courses page', async ({ page }) => {
    await page.click('a:has-text("Courses")');
    await page.waitForURL(/.*courses/);
    await expect(page.locator('text=Courses')).toBeVisible();
  });

  test('should navigate to Grades page', async ({ page }) => {
    await page.click('a:has-text("Grades")');
    await page.waitForURL(/.*grades/);
    await expect(page.locator('text=Grades')).toBeVisible();
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
    await waitForTable(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search students', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');
      await page.waitForLoadState('networkidle');
      
      // Verify table is still visible
      await waitForTable(page);
    }
  });

  test('should open student detail', async ({ page }) => {
    // Click first student in table
    await page.click('table tbody tr:first-child');
    
    // Should navigate to detail page
    await page.waitForURL(/.*students\/\d+/, { timeout: 5000 });
    
    // Verify detail content
    await expect(page.locator('text=Student Details')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, 'test@example.com', 'password123');
    
    // Dashboard should still be accessible
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Navigation should be visible or in menu
    const menu = page.locator('[data-testid="mobile-menu"]');
    if (await menu.isVisible()) {
      expect(menu).toBeTruthy();
    }
  });

  test('should be tablet responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await login(page, 'test@example.com', 'password123');
    
    // Dashboard should be accessible
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should be desktop responsive', async ({ page }) => {
    // Set desktop viewport (default)
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await login(page, 'test@example.com', 'password123');
    
    // All navigation should be visible
    await expect(page.locator('text=Students')).toBeVisible();
  });
});
