/**
 * useNotifications Hook Tests
 * Comprehensive test suite for notification management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNotifications } from '../useNotifications';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock API client with proper response structure
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../../api/api', () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
    delete: mockApiDelete,
  },
  extractAPIResponseData: (response: any) => response?.data?.data || response?.data,
  extractAPIError: (error: any) => ({
    message: error?.message || 'Unknown error',
    code: 'ERROR',
  }),
}));

describe('useNotifications Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
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
          notification_type: 'grade',
          title: 'Grade Update',
          message: 'Your math grade has been updated',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
          data: null,
          icon: null,
          read_at: null,
          deleted_at: null,
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
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
      mockApiGet.mockRejectedValueOnce(error);

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
          notification_type: 'grade',
          title: 'Read Notification',
          message: 'This is read',
          is_read: true,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          notification_type: 'attendance',
          title: 'Unread Notification',
          message: 'This is unread',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
        expect(result.current.notifications).toHaveLength(2);
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and update state', async () => {
      const mockNotifications = [
        {
          id: 1,
          notification_type: 'grade',
          title: 'Test',
          message: 'Test message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      mockApiPost.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        await result.current.markAsRead(1);
      });

      await waitFor(() => {
        expect(result.current.notifications[0].is_read).toBe(true);
        expect(result.current.unreadCount).toBe(0);
      });
    });

    it('should handle mark as read errors', async () => {
      const mockNotifications = [
        {
          id: 1,
          notification_type: 'grade',
          title: 'Test',
          message: 'Test message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const error = new Error('Failed to mark as read');
      mockApiPost.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        try {
          await result.current.markAsRead(1);
        } catch (e) {
          // Error expected
        }
      });

      expect(mockApiPost).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockNotifications = [
        {
          id: 1,
          notification_type: 'grade',
          title: 'Test 1',
          message: 'Message 1',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          notification_type: 'attendance',
          title: 'Test 2',
          message: 'Message 2',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 2 },
          meta: { request_id: 'test-123' },
        },
      });

      mockApiPost.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.unreadCount).toBe(2);

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(result.current.notifications.every(n => n.is_read)).toBe(true);
        expect(result.current.unreadCount).toBe(0);
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification from state', async () => {
      const mockNotifications = [
        {
          id: 1,
          notification_type: 'grade',
          title: 'Test',
          message: 'Test message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      mockApiDelete.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.notifications).toHaveLength(1);

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
          notification_type: 'grade',
          title: 'Unread Test',
          message: 'Test message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      mockApiDelete.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.unreadCount).toBe(1);

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
      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { unread_count: 5 },
          meta: { request_id: 'test-123' },
        },
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
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        result.current.connect();
      });

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });

    it('should have proper cleanup on unmount', () => {
      const { unmount } = renderHook(() => useNotifications());

      unmount();

      expect(mockSocket.off).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should set error state on API failure', async () => {
      const error = new Error('API Error');
      mockApiGet.mockRejectedValueOnce(error);

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
          notification_type: 'grade',
          title: 'Test',
          message: 'Message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      mockApiGet.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await waitFor(() => {
        const unreadNotifications = result.current.notifications.filter(n => !n.is_read);
        expect(unreadNotifications).toHaveLength(result.current.unreadCount);
      });
    });
  });
});
