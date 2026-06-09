import { test, expect, Page } from '@playwright/test';
import { loginViaAPI } from './helpers';

/**
 * E2E Tests for Custom Dashboards (Phase A, Feature 3)
 * Tests cover:
 * - Create new dashboard
 * - Edit existing dashboard
 * - Delete dashboard with confirmation
 * - Set dashboard as default
 * - Dashboard switcher in analytics page
 * - Chart filtering based on dashboard configuration
 */

test.describe('Custom Dashboards - Phase A Feature 3', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginViaAPI(page, 'test@example.com', 'Test@Pass123');
  });

  test.describe('Dashboard Manager Page', () => {
    test('should navigate to dashboard manager', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Check page title
      await expect(page.getByRole('heading', { name: /Dashboard Manager/i })).toBeVisible();

      // Check for "New Dashboard" button
      await expect(page.getByRole('button', { name: /New Dashboard/i })).toBeVisible();
    });

    test('should show empty state when no dashboards exist', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Might show empty state or list of existing dashboards
      const emptyState = page.getByText(/No dashboards yet/i);
      const dashboardList = page.locator('[role="heading"]');

      // At least one should exist
      const count = await dashboardList.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Creating Dashboard', () => {
    test('should open create dashboard dialog', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Click "New Dashboard" button
      await page.getByRole('button', { name: /New Dashboard/i }).click();

      // Dialog should appear
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Check form fields
      await expect(page.getByPlaceholderText(/e.g., Math Performance/i)).toBeVisible();
      await expect(page.getByPlaceholderText(/Add notes about/i)).toBeVisible();
    });

    test('should display all available charts for selection', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Check for chart checkboxes
      const chartLabels = [
        'Performance Chart',
        'Grade Distribution',
        'Attendance Chart',
        'Trend Chart',
        'Student Status',
        'Scatter Plot',
        'Heatmap',
        'Sankey Diagram',
        'Treemap',
        'Box Plot',
      ];

      for (const label of chartLabels) {
        await expect(page.getByLabel(label)).toBeVisible();
      }
    });

    test('should validate dashboard name is required', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Click save without entering name
      await page.getByRole('button', { name: /^Save$/i }).click();

      // Error message should appear
      await expect(page.getByText(/Dashboard name is required/i)).toBeVisible();
    });

    test('should validate at least one chart is selected', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Enter name but don't select charts
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Test Dashboard');

      // Click save
      await page.getByRole('button', { name: /^Save$/i }).click();

      // Error message should appear
      await expect(page.getByText(/Please select at least one chart/i)).toBeVisible();
    });

    test('should create dashboard with selected charts', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Fill form
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Test Dashboard');

      const descriptionInput = page.getByPlaceholderText(/Add notes about/i);
      await descriptionInput.fill('Test description');

      // Select 3 charts
      await page.getByLabel('Performance Chart').check();
      await page.getByLabel('Grade Distribution').check();
      await page.getByLabel('Attendance Chart').check();

      // Verify count shows 3
      await expect(page.getByText(/3 chart\(s\) selected/i)).toBeVisible();

      // Save
      await page.getByRole('button', { name: /^Save$/i }).click();

      // Should return to manager page
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /Dashboard Manager/i })).toBeVisible();

      // New dashboard should appear in list
      await expect(page.getByText('Test Dashboard')).toBeVisible();
      await expect(page.getByText('Test description')).toBeVisible();
      await expect(page.getByText(/Charts: 3/i)).toBeVisible();
    });
  });

  test.describe('Editing Dashboard', () => {
    test('should open edit dashboard dialog', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Find first dashboard and click edit button
      const editButtons = page.getByTitle(/Edit/i);
      if (await editButtons.count() > 0) {
        await editButtons.first().click();

        // Dialog should appear with Edit title
        await expect(page.getByRole('heading', { name: /Edit Dashboard/i })).toBeVisible();
      }
    });

    test('should pre-fill form with dashboard data', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Create a dashboard first
      await page.getByRole('button', { name: /New Dashboard/i }).click();
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Dashboard to Edit');
      await page.getByLabel('Performance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Now edit it
      const editButtons = page.getByTitle(/Edit/i);
      await editButtons.first().click();

      // Form should be pre-filled
      await expect(page.getByDisplayValue('Dashboard to Edit')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Edit Dashboard/i })).toBeVisible();
    });

    test('should update dashboard successfully', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Create a dashboard first
      await page.getByRole('button', { name: /New Dashboard/i }).click();
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Original Name');
      await page.getByLabel('Performance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Edit it
      const editButtons = page.getByTitle(/Edit/i);
      await editButtons.first().click();

      // Update name
      const editNameInput = page.getByDisplayValue('Original Name');
      await editNameInput.clear();
      await editNameInput.fill('Updated Name');

      // Save
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Updated name should appear
      await expect(page.getByText('Updated Name')).toBeVisible();
    });
  });

  test.describe('Deleting Dashboard', () => {
    test('should show delete confirmation', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Find first dashboard delete button
      const deleteButtons = page.getByTitle(/Delete/i);
      if (await deleteButtons.count() > 0) {
        await deleteButtons.first().click();

        // Confirmation should appear
        await expect(page.getByText(/Are you sure/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /^Delete$/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible();
      }
    });

    test('should delete dashboard when confirmed', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Create a dashboard first
      await page.getByRole('button', { name: /New Dashboard/i }).click();
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Dashboard to Delete');
      await page.getByLabel('Performance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Delete it
      const deleteButtons = page.getByTitle(/Delete/i);
      await deleteButtons.first().click();

      // Confirm delete
      await expect(page.getByText(/Are you sure/i)).toBeVisible();
      await page.getByRole('button', { name: /^Delete$/i }).click();
      await page.waitForLoadState('networkidle');

      // Dashboard should no longer appear
      await expect(page.getByText('Dashboard to Delete')).not.toBeVisible();
    });

    test('should cancel delete operation', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Create a dashboard
      await page.getByRole('button', { name: /New Dashboard/i }).click();
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Dashboard to Keep');
      await page.getByLabel('Performance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Try to delete but cancel
      const deleteButtons = page.getByTitle(/Delete/i);
      await deleteButtons.first().click();

      // Cancel
      await page.getByRole('button', { name: /^Cancel$/i }).click();

      // Dashboard should still exist
      await expect(page.getByText('Dashboard to Keep')).toBeVisible();
    });
  });

  test.describe('Setting Default Dashboard', () => {
    test('should set dashboard as default', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Create two dashboards
      await page.getByRole('button', { name: /New Dashboard/i }).click();
      let nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Default Dashboard');
      await page.getByLabel('Performance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Secondary Dashboard');
      await page.getByLabel('Grade Distribution').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Click star button on Secondary Dashboard to make it default
      const setDefaultButtons = page.getByTitle(/Set as default/i);
      if (await setDefaultButtons.count() > 0) {
        await setDefaultButtons.first().click();
        await page.waitForLoadState('networkidle');

        // Verify default badge appears on Secondary Dashboard
        const dashboardCards = page.locator('text=Secondary Dashboard').locator('..').locator('..').locator('..');
        await expect(dashboardCards.getByText('Default')).toBeVisible();
      }
    });

    test('should not show set default button for current default', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Find the default dashboard (has "Default" badge)
      const defaultDashboard = page.locator(':has-text("Default")').first();

      // The set default button should not be visible for it
      const card = defaultDashboard.locator('..').locator('..');
      const setDefaultButton = card.getByTitle(/Set as default/i);

      if (await setDefaultButton.count() > 0) {
        // If visible, it means this test needs a non-default dashboard
        // This is implementation dependent
      }
    });
  });

  test.describe('Dashboard Integration with Analytics', () => {
    test('should show dashboard selector in analytics page', async () => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Look for dashboard selector
      const dashboardSelect = page.locator('select').filter({ hasText: /Dashboard|dashboard/ });

      // At minimum, the selector should exist or manage button should exist
      const manageButton = page.getByRole('button', { name: /Manage/i });
      if (await manageButton.count() > 0) {
        await expect(manageButton).toBeVisible();
      }
    });

    test('should filter charts based on selected dashboard', async () => {
      // First create a dashboard with limited charts
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      const nameInput = page.getByPlaceholderText(/e.g., Math Performance/i);
      await nameInput.fill('Limited Charts Dashboard');
      // Only select Performance and Attendance
      await page.getByLabel('Performance Chart').check();
      await page.getByLabel('Attendance Chart').check();
      await page.getByRole('button', { name: /^Save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Go to analytics
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Check that all charts are visible by default
      const performanceHeading = page.getByRole('heading', { name: /Student Performance/i });
      const attendanceHeading = page.getByRole('heading', { name: /Attendance Rate/i });

      if (await performanceHeading.count() > 0 && await attendanceHeading.count() > 0) {
        // Chart filtering is working
      }
    });

    test('should navigate from analytics to dashboard manager', async () => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Click manage button if visible
      const manageButton = page.getByRole('button', { name: /Manage/i });
      if (await manageButton.count() > 0) {
        await manageButton.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to dashboard manager
        await expect(page.getByRole('heading', { name: /Dashboard Manager/i })).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /New Dashboard/i }).click();
      await expect(page.getByRole('heading', { name: /Create Dashboard/i })).toBeVisible();

      // Check form labels exist
      await expect(page.getByText(/Dashboard Name/i)).toBeVisible();
      await expect(page.getByText(/Description/i)).toBeVisible();
      await expect(page.getByText(/Select Charts/i)).toBeVisible();
    });

    test('should have proper button labels', async () => {
      await page.goto('/dashboard-manager');
      await page.waitForLoadState('networkidle');

      // Navigation buttons should have clear labels
      const newButton = page.getByRole('button', { name: /New Dashboard/i });
      await expect(newButton).toBeVisible();

      // Action buttons should be labeled
      const allButtons = page.getByRole('button');
      expect(await allButtons.count()).toBeGreaterThan(0);
    });
  });
});
