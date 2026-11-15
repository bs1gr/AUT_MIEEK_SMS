/**
 * useNotifications Hook Tests
 * Comprehensive test suite for notification management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNotifications } from '../useNotifications';
import authService from '../../services/authService';
import apiClient from '../../api/api';


let apiGetSpy: ReturnType<typeof vi.spyOn>;
let apiPostSpy: ReturnType<typeof vi.spyOn>;
let apiDeleteSpy: ReturnType<typeof vi.spyOn>;

const setAuthToken = () => {
  authService.setAccessToken('test-token');
  localStorage.setItem('access_token', 'test-token');
};


describe('useNotifications Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetSpy = vi.spyOn(apiClient, 'get');
    apiPostSpy = vi.spyOn(apiClient, 'post');
    apiDeleteSpy = vi.spyOn(apiClient, 'delete');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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
      apiGetSpy.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

      await act(async () => {
        try {
          await result.current.fetchNotifications();
        } catch {
          // Error expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      apiPostSpy.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const error = new Error('Failed to mark as read');
      apiPostSpy.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        try {
          await result.current.markAsRead(1);
        } catch {
          // Error expected
        }
      });

      expect(apiPostSpy).toHaveBeenCalled();
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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 2 },
          meta: { request_id: 'test-123' },
        },
      });

      apiPostSpy.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      apiDeleteSpy.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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
          notification_type: 'grade',
          title: 'Unread Test',
          message: 'Test message',
          is_read: false,
          priority: 'normal',
          created_at: new Date().toISOString(),
        },
      ];

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      apiDeleteSpy.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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
      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { unread_count: 5 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

      await act(async () => {
        await result.current.refreshUnreadCount();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(5);
      });
    });
  });

  describe('No push channel', () => {
    it('does not offer a connection to open, close or report on', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current).not.toHaveProperty('isConnected');
      expect(result.current).not.toHaveProperty('connect');
      expect(result.current).not.toHaveProperty('disconnect');
    });
  });

  describe('watchUnreadCount', () => {
    const answerCount = (count: number) =>
      apiGetSpy.mockResolvedValueOnce({
        data: { success: true, data: { unread_count: count }, meta: { request_id: 'test-123' } },
      });
    const countRequests = () =>
      apiGetSpy.mock.calls.filter(([url]) => url === '/notifications/unread-count').length;

    it('asks for nothing on its own when it is not switched on', async () => {
      // Every NotificationItem uses the hook for its actions; none of them may fetch a count.
      const { unmount } = renderHook(() => useNotifications());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        window.dispatchEvent(new Event('online'));
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(apiGetSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('reads the unread count when the component appears', async () => {
      answerCount(4);
      const { result } = renderHook(() => useNotifications({ watchUnreadCount: true }));

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(4);
      });
      expect(countRequests()).toBe(1);
    });

    it('reads it again when the browser comes back online', async () => {
      answerCount(1);
      const { result } = renderHook(() => useNotifications({ watchUnreadCount: true }));
      await waitFor(() => expect(result.current.unreadCount).toBe(1));

      answerCount(6);
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => expect(result.current.unreadCount).toBe(6));
      expect(countRequests()).toBe(2);
    });

    it('reads it again when the page becomes visible, not when it is hidden', async () => {
      answerCount(1);
      const { result } = renderHook(() => useNotifications({ watchUnreadCount: true }));
      await waitFor(() => expect(result.current.unreadCount).toBe(1));

      const visibility = vi.spyOn(document, 'visibilityState', 'get');
      visibility.mockReturnValue('hidden');
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(countRequests()).toBe(1);

      answerCount(3);
      visibility.mockReturnValue('visible');
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      expect(countRequests()).toBe(2);
      visibility.mockRestore();
    });

    it('stops listening when the component goes away', async () => {
      answerCount(2);
      const { result, unmount } = renderHook(() => useNotifications({ watchUnreadCount: true }));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      unmount();
      await act(async () => {
        window.dispatchEvent(new Event('online'));
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(countRequests()).toBe(1);
    });
  });
  describe('Error Handling', () => {
    it('should set error state on API failure', async () => {
      const error = new Error('API Error');
      apiGetSpy.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

      await act(async () => {
        try {
          await result.current.fetchNotifications();
        } catch {
          // Error expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
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

      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { notifications: mockNotifications, unread_count: 1 },
          meta: { request_id: 'test-123' },
        },
      });

      const { result } = renderHook(() => useNotifications());
      setAuthToken();

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
