/**
 * useNotifications Hook Tests
 * Comprehensive test suite for notification management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNotifications } from '../useNotifications';
import * as apiModule from '../../api/api';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

// Mock API client
vi.mock('../../api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useNotifications Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('access_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have all required methods', () => {
      const { result } = renderHook(() => useNotifications());

      expect(typeof result.current.fetchNotifications).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
      expect(typeof result.current.deleteNotification).toBe('function');
      expect(typeof result.current.refreshUnreadCount).toBe('function');
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications and update state', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 1, unread_count: 1 },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications({ limit: 10 });
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].title).toBe('Grade Update');
        expect(result.current.unreadCount).toBe(1);
      });
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch');
      vi.spyOn(apiModule.default, 'get').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        try {
          await result.current.fetchNotifications();
        } catch (e) {
          // Error expected
        }
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should update unreadCount based on is_read status', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Read Notification',
          message: 'This is read',
          is_read: true,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: new Date().toISOString(),
          deleted_at: null,
        },
        {
          id: 2,
          user_id: 1,
          notification_type: 'attendance' as const,
          title: 'Unread Notification',
          message: 'This is unread',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 2, unread_count: 1 },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and update state', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      // Initial fetch
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 1, unread_count: 1 },
      });

      // Mark as read
      vi.spyOn(apiModule.default, 'post').mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });

      await act(async () => {
        await result.current.markAsRead(1);
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.notifications[0].is_read).toBe(true);
      });
    });

    it('should handle mark as read errors', async () => {
      const error = new Error('Failed to mark as read');
      vi.spyOn(apiModule.default, 'post').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        try {
          await result.current.markAsRead(1);
        } catch (e) {
          // Error expected
        }
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
        {
          id: 2,
          user_id: 1,
          notification_type: 'attendance' as const,
          title: 'Attendance Update',
          message: 'Your attendance has been updated',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      // Initial fetch
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 2, unread_count: 2 },
      });

      // Mark all as read
      vi.spyOn(apiModule.default, 'post').mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2);
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.notifications.every((n) => n.is_read)).toBe(true);
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification from state', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: true,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: new Date().toISOString(),
          deleted_at: null,
        },
      ];

      // Initial fetch
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 1, unread_count: 0 },
      });

      // Delete
      vi.spyOn(apiModule.default, 'delete').mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteNotification(1);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });

    it('should decrement unreadCount when deleting unread notification', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      // Initial fetch
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 1, unread_count: 1 },
      });

      // Delete
      vi.spyOn(apiModule.default, 'delete').mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
      });

      await act(async () => {
        await result.current.deleteNotification(1);
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });
    });
  });

  describe('refreshUnreadCount', () => {
    it('should refresh unread count from API', async () => {
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { unread_count: 5 },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.refreshUnreadCount();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(5);
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle connect event', async () => {
      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: [], total: 0, unread_count: 0 },
      });

      const { result } = renderHook(() => useNotifications());

      // Note: In a real test, you'd trigger the socket.io 'connect' event
      // This is a simplified test showing the expected behavior
      expect(result.current.isConnected).toBe(false);
    });

    it('should have proper cleanup on unmount', () => {
      const { unmount } = renderHook(() => useNotifications());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should set error state on API failure', async () => {
      const error = new Error('API Error');
      vi.spyOn(apiModule.default, 'get').mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        try {
          await result.current.fetchNotifications();
        } catch (e) {
          // Error expected
        }
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistency between notifications and unreadCount', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          notification_type: 'grade' as const,
          title: 'Notification 1',
          message: 'Message 1',
          is_read: false,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
        {
          id: 2,
          user_id: 1,
          notification_type: 'attendance' as const,
          title: 'Notification 2',
          message: 'Message 2',
          is_read: true,
          priority: 'normal' as const,
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: new Date().toISOString(),
          deleted_at: null,
        },
      ];

      vi.spyOn(apiModule.default, 'get').mockResolvedValueOnce({
        data: { data: mockNotifications, total: 2, unread_count: 1 },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        const unreadInState = result.current.notifications.filter((n) => !n.is_read).length;
        expect(unreadInState).toBe(result.current.unreadCount);
      });
    });
  });
});
