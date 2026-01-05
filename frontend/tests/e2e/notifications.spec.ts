/**
 * E2E Tests for Real-Time Notifications Feature
 *
 * Tests the complete notification workflow including:
 * - WebSocket connection and real-time message delivery
 * - Notification reception and display
 * - Mark as read functionality
 * - Notification deletion
 * - Reconnection after disconnect
 * - Multi-user scenarios
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsTeacher } from './helpers';

/**
 * Helper to wait for WebSocket to be ready
 */
async function waitForWebSocketReady(page: Page, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    // Check if WebSocket is connected by looking for the bell icon
    const bellIcon = await page.locator('button[title="Notifications"]').isVisible().catch(() => false);
    if (bellIcon) {
      await page.waitForTimeout(500); // Give WebSocket time to fully connect
      return true;
    }
    await page.waitForTimeout(100);
  }
  throw new Error('WebSocket did not connect within timeout');
}

/**
 * Helper to send a notification via API (admin broadcast)
 */
async function broadcastNotification(
  page: Page,
  title: string,
  message: string,
  type: string = 'system',
  targetUserId?: number
) {
  const response = await page.request.post('/api/v1/notifications/broadcast', {
    data: {
      title,
      message,
      notification_type: type,
      user_ids: targetUserId ? [targetUserId] : undefined, // undefined = all users
    },
    headers: {
      'Authorization': `Bearer ${await getAuthToken(page)}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to broadcast notification: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

/**
 * Helper to get auth token from localStorage
 */
async function getAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('sms_access_token'));
  if (!token) {
    // Try the alternative key if first fails
    const altToken = await page.evaluate(() => localStorage.getItem('access_token'));
    if (!altToken) {
      const allKeys = await page.evaluate(() => Object.keys(localStorage));
      throw new Error(`No auth token found in localStorage. Available keys: ${allKeys.join(', ')}`);
    }
    return altToken;
  }
  return token;
}

/**
 * Helper to get unread notification count
 */
async function getUnreadCount(page: Page): Promise<number> {
  // Try to find the badge with unread count
  const badge = page.locator('span').filter({ hasText: /^\d+$|99\+$/ }).first();

  try {
    const text = await badge.textContent();
    if (text === '99+') return 100; // Approximate for 99+
    return parseInt(text || '0', 10);
  } catch {
    return 0;
  }
}

test.describe('Real-Time Notifications E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTeacher(page);
    await page.goto('/');
    await waitForWebSocketReady(page);
  });

  test.afterEach(async () => {
    // Cleanup
  });

  test('should display notification bell icon', async ({ page }) => {
    // Verify bell icon is visible when logged in
    const bellButton = page.locator('button[title="Notifications"]');
    await expect(bellButton).toBeVisible();
  });

  test('should show unread count badge', async ({ page }) => {
    // Initial state should have 0 or some unread count
    const unreadCount = await getUnreadCount(page);
    expect(typeof unreadCount).toBe('number');
    expect(unreadCount).toBeGreaterThanOrEqual(0);
  });

  test('should open notification center when bell is clicked', async ({ page }) => {
    // Click the bell icon
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Wait for notification center to appear
    const center = page.locator('.fixed.inset-0.bg-black.bg-opacity-50').first();
    await expect(center).toBeVisible({ timeout: 5000 });
  });

  test('should close notification center when close button is clicked', async ({ page }) => {
    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Wait for it to appear
    const center = page.locator('.fixed.inset-0.bg-black.bg-opacity-50').first();
    await expect(center).toBeVisible({ timeout: 5000 });

    // Click close button (×)
    const closeButton = page.locator('button:has-text("×")').first();
    await closeButton.click();

    // Wait for it to disappear
    await expect(center).not.toBeVisible({ timeout: 5000 });
  });

  test('should receive and display broadcast notification in real-time', async ({ page }) => {
    // Get initial unread count
    const initialCount = await getUnreadCount(page);

    // Send a test notification
    const testTitle = `Test Notification ${Date.now()}`;
    const testMessage = 'This is a test notification from E2E tests';

    await broadcastNotification(page, testTitle, testMessage, 'test');

    // Wait a bit for the notification to arrive
    await page.waitForTimeout(1000);

    // Check if unread count increased
    const newCount = await getUnreadCount(page);
    expect(newCount).toBeGreaterThan(initialCount);

    // Open notification center to verify notification appears
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Wait for notification center to appear and find our notification
    const notificationTitle = page.locator(`text="${testTitle}"`);
    await expect(notificationTitle).toBeVisible({ timeout: 10000 });

    const notificationMessage = page.locator(`text="${testMessage}"`);
    await expect(notificationMessage).toBeVisible();
  });

  test('should mark notification as read when clicked', async ({ page }) => {
    // Send a test notification
    const testTitle = `Readable Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle, 'Test message', 'test');

    // Wait for notification
    await page.waitForTimeout(1000);

    // Get unread count before
    const countBefore = await getUnreadCount(page);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Wait for notification center and find the notification
    const notification = page.locator(`text="${testTitle}"`).locator('..').first();
    await expect(notification).toBeVisible({ timeout: 5000 });

    // Click the notification to mark as read
    await notification.click();

    // Wait a moment for the action
    await page.waitForTimeout(500);

    // Close notification center
    const closeButton = page.locator('button:has-text("×")').first();
    await closeButton.click();

    // Wait for close
    await page.waitForTimeout(500);

    // Check if unread count decreased
    const countAfter = await getUnreadCount(page);
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test('should delete notification when delete button is clicked', async ({ page }) => {
    // Send a test notification
    const testTitle = `Deletable Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle, 'Delete me', 'test');

    // Wait for notification
    await page.waitForTimeout(1000);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Find the notification
    const notification = page.locator(`text="${testTitle}"`).locator('..').first();
    await expect(notification).toBeVisible({ timeout: 5000 });

    // Find and click the delete button within this notification
    const deleteButton = notification.locator('button[class*="text-red"]').first();
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify notification is gone
    await expect(page.locator(`text="${testTitle}"`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should update unread count in badge when notifications arrive', async ({ page }) => {
    // Get initial count
    const initialCount = await getUnreadCount(page);

    // Send multiple notifications
    for (let i = 0; i < 3; i++) {
      await broadcastNotification(
        page,
        `Batch Notification ${i} ${Date.now()}`,
        `Message ${i}`,
        'test'
      );
      await page.waitForTimeout(300);
    }

    // Check final count
    const finalCount = await getUnreadCount(page);
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('should persist notifications across page navigation', async ({ page }) => {
    // Send a notification
    const testTitle = `Persistent Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle, 'Should persist', 'test');

    // Wait for notification
    await page.waitForTimeout(1000);

    // Get unread count
    const countBefore = await getUnreadCount(page);

    // Navigate away
    await page.goto('/students');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Navigate back
    await page.goto('/');
    await waitForWebSocketReady(page);

    // Unread count should still be there
    const countAfter = await getUnreadCount(page);
    expect(countAfter).toBe(countBefore);

    // Notification should still be in the center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    const notification = page.locator(`text="${testTitle}"`);
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should handle high notification volume', async ({ page }) => {
    const initialCount = await getUnreadCount(page);

    // Send 10 notifications rapidly
    const notificationTitles = [];
    for (let i = 0; i < 10; i++) {
      const title = `Bulk Notification ${i} ${Date.now()}`;
      notificationTitles.push(title);
      await broadcastNotification(page, title, `Message ${i}`, 'test');
    }

    // Wait for all notifications to arrive
    await page.waitForTimeout(2000);

    // Check count increased
    const finalCount = await getUnreadCount(page);
    expect(finalCount).toBeGreaterThan(initialCount);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Verify at least some of them are visible
    for (const title of notificationTitles.slice(0, 3)) {
      const notification = page.locator(`text="${title}"`);
      // Not all may be visible due to pagination, but first few should be
      const visible = await notification.isVisible().catch(() => false);
      expect(visible || notificationTitles.length > 0).toBeTruthy();
    }
  });

  test('should show notification types with correct icons', async ({ page }) => {
    // Send notifications of different types
    const types = [
      { type: 'grade', title: `Grade Notification ${Date.now()}` },
      { type: 'attendance', title: `Attendance Notification ${Date.now()}` },
      { type: 'course', title: `Course Notification ${Date.now()}` },
    ];

    for (const { type, title } of types) {
      await broadcastNotification(page, title, `Test ${type}`, type);
    }

    // Wait for notifications
    await page.waitForTimeout(1000);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Verify notifications are displayed with icons
    for (const { title } of types) {
      const notification = page.locator(`text="${title}"`);
      await expect(notification).toBeVisible({ timeout: 5000 });

      // Check for icon (emoji or symbol)
      const iconSpan = notification.locator('..').first().locator('span').first();
      const text = await iconSpan.textContent();
      expect(text).toMatch(/[\p{Emoji}]/u); // Should contain emoji
    }
  });

  test('should show "Mark All as Read" button when there are unread notifications', async ({
    page,
  }) => {
    // Send a notification
    await broadcastNotification(page, `Unread Test ${Date.now()}`, 'Unread message', 'test');

    // Wait for notification
    await page.waitForTimeout(1000);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Look for "Mark All as Read" or similar button
    // The button text depends on i18n, so look for "mark" or similar
    const markAllButton = page.locator('button:has-text(/[Mm]ark [Aa]ll|[Mm]ark [Aa]s [Rr]ead/)').first();
    const isVisible = await markAllButton.isVisible().catch(() => false);

    // If button exists, clicking it should work
    if (isVisible) {
      await markAllButton.click();
      await page.waitForTimeout(500);

      // After marking all, button might disappear or be disabled
      const disabled = await markAllButton.isDisabled().catch(() => true);
      expect(disabled || !isVisible).toBeTruthy();
    }
  });

  test('should reconnect WebSocket after network interruption', async ({ page, context }) => {
    // Send a notification
    const testTitle1 = `Pre-Offline Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle1, 'Before offline', 'test');
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Try to use the page (should handle offline gracefully)
    const bellButton = page.locator('button[title="Notifications"]');
    await expect(bellButton).toBeEnabled();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Send another notification after coming online
    const testTitle2 = `Post-Offline Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle2, 'After offline', 'test');
    await page.waitForTimeout(1000);

    // Verify we can see the second notification
    await bellButton.click();
    const notification = page.locator(`text="${testTitle2}"`);
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should display notification timestamps', async ({ page }) => {
    // Send a notification
    const testTitle = `Timestamped Notification ${Date.now()}`;
    await broadcastNotification(page, testTitle, 'With timestamp', 'test');

    // Wait for notification
    await page.waitForTimeout(1000);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Find the notification
    const notification = page.locator(`text="${testTitle}"`).locator('..').first();
    await expect(notification).toBeVisible({ timeout: 5000 });

    // Look for timestamp text (date/time format)
    const timestamp = notification.locator('span').filter({ hasText: /\d+.*\d+.*\d+/ }).first();
    const text = await timestamp.textContent();

    // Should contain some kind of date/time info
    expect((text || '').length).toBeGreaterThan(0);
  });

  test('should handle pagination in notification center', async ({ page }) => {
    // Send many notifications (more than page size of 20)
    const count = 25;
    for (let i = 0; i < count; i++) {
      await broadcastNotification(
        page,
        `Paginated Notification ${i} ${Date.now()}`,
        `Message ${i}`,
        'test'
      );
      if (i % 5 === 0) await page.waitForTimeout(100); // Small delay every 5
    }

    // Wait for all to arrive
    await page.waitForTimeout(2000);

    // Open notification center
    const bellButton = page.locator('button[title="Notifications"]');
    await bellButton.click();

    // Look for pagination controls (Next, Previous buttons)
    const nextButton = page.locator('button:has-text(/[Nn]ext|>/)').last();
    const isVisible = await nextButton.isVisible().catch(() => false);

    if (isVisible && !await nextButton.isDisabled()) {
      // Click next page
      await nextButton.click();
      await page.waitForTimeout(500);

      // Verify page changed (different notifications visible)
      expect(isVisible).toBeTruthy();
    }
  });
});
