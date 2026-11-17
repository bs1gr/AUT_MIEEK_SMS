/**
 * useNotifications Hook Tests
 * Comprehensive test suite for notification management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { publishUnreadCount, resetNotifications, useNotifications } from '../useNotifications';
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
    // The state is shared by every user of the hook, so by every test as well.
    resetNotifications();
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
  describe('One state for every component', () => {
    const unread = (id: number) => ({
      id,
      user_id: 1,
      notification_type: 'system',
      title: `Notice ${id}`,
      message: `Message ${id}`,
      is_read: false,
      priority: 'normal',
      created_at: new Date().toISOString(),
    });
    const answerList = (items: ReturnType<typeof unread>[], unreadCount: number) =>
      apiGetSpy.mockResolvedValueOnce({
        data: {
          success: true,
          data: { items, unread_count: unreadCount },
          meta: { request_id: 'test-123' },
        },
      });

    it('shows a second user of the hook what the first one fetched', async () => {
      answerList([unread(1), unread(2)], 2);
      const dropdown = renderHook(() => useNotifications());
      const bell = renderHook(() => useNotifications());

      await act(async () => {
        await dropdown.result.current.fetchNotifications({ limit: 10 });
      });

      expect(bell.result.current.notifications).toHaveLength(2);
      expect(bell.result.current.unreadCount).toBe(2);
    });

    it('changes the list and the count everywhere when one user marks an item as read', async () => {
      answerList([unread(1), unread(2)], 2);
      apiPostSpy.mockResolvedValue({ data: { success: true, data: null } });
      const dropdown = renderHook(() => useNotifications());
      const bell = renderHook(() => useNotifications());
      const item = renderHook(() => useNotifications());
      await act(async () => {
        await dropdown.result.current.fetchNotifications({ limit: 10 });
      });

      await act(async () => {
        await item.result.current.markAsRead(1);
      });

      expect(dropdown.result.current.notifications.map((n) => n.is_read)).toEqual([true, false]);
      expect(bell.result.current.unreadCount).toBe(1);
      expect(apiGetSpy).toHaveBeenCalledTimes(1);
    });

    it('counts an item once when it is marked as read twice', async () => {
      // The item's own button, then a click on the item: two requests for one item.
      answerList([unread(1), unread(2)], 2);
      apiPostSpy.mockResolvedValue({ data: { success: true, data: null } });
      const { result } = renderHook(() => useNotifications());
      await act(async () => {
        await result.current.fetchNotifications();
      });

      await act(async () => {
        await result.current.markAsRead(1);
        await result.current.markAsRead(1);
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('removes a deleted item everywhere and takes it off the count', async () => {
      answerList([unread(1), unread(2)], 2);
      apiDeleteSpy.mockResolvedValue({ data: { success: true, data: null } });
      const dropdown = renderHook(() => useNotifications());
      const bell = renderHook(() => useNotifications());
      const item = renderHook(() => useNotifications());
      await act(async () => {
        await dropdown.result.current.fetchNotifications();
      });

      await act(async () => {
        await item.result.current.deleteNotification(2);
      });

      expect(dropdown.result.current.notifications.map((n) => n.id)).toEqual([1]);
      expect(bell.result.current.unreadCount).toBe(1);
    });

    it('clears the count everywhere when one user marks all as read', async () => {
      answerList([unread(1), unread(2)], 2);
      apiPostSpy.mockResolvedValue({ data: { success: true, data: null } });
      const dropdown = renderHook(() => useNotifications());
      const bell = renderHook(() => useNotifications());
      await act(async () => {
        await dropdown.result.current.fetchNotifications();
      });
      expect(bell.result.current.unreadCount).toBe(2);

      await act(async () => {
        await dropdown.result.current.markAllAsRead();
      });

      expect(bell.result.current.unreadCount).toBe(0);
      expect(bell.result.current.notifications).toHaveLength(2);
      expect(bell.result.current.notifications.every((n) => n.is_read)).toBe(true);
    });

    it('takes a count that another reader of the API was given', () => {
      const bell = renderHook(() => useNotifications());

      act(() => publishUnreadCount(7));
      expect(bell.result.current.unreadCount).toBe(7);

      // Not a count: left alone.
      act(() => publishUnreadCount(undefined));
      act(() => publishUnreadCount(Number.NaN));
      expect(bell.result.current.unreadCount).toBe(7);

      act(() => publishUnreadCount(-3));
      expect(bell.result.current.unreadCount).toBe(0);
    });

    it('is emptied by a reset, and drops an answer that was asked for before it', async () => {
      answerList([unread(1)], 1);
      const { result } = renderHook(() => useNotifications());
      await act(async () => {
        await result.current.fetchNotifications();
      });
      expect(result.current.notifications).toHaveLength(1);

      // A list still on its way when the account signs out...
      let deliver: (value: unknown) => void = () => undefined;
      apiGetSpy.mockReturnValueOnce(
        new Promise((resolve) => {
          deliver = resolve;
        }) as never
      );
      let pending: Promise<void> = Promise.resolve();
      act(() => {
        pending = result.current.fetchNotifications();
      });
      expect(result.current.isLoading).toBe(true);

      act(() => resetNotifications());
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.isLoading).toBe(false);

      // ...arrives after it, and is not shown to whoever signs in next.
      await act(async () => {
        deliver({
          data: { success: true, data: { items: [unread(9)], unread_count: 1 }, meta: {} },
        });
        await pending;
      });
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);

      // The next account's own list is fetched and shown.
      answerList([unread(5)], 1);
      await act(async () => {
        await result.current.fetchNotifications();
      });
      expect(result.current.notifications.map((n) => n.id)).toEqual([5]);
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
