/**
 * useNotifications Hook
 * Notifications over the REST API: the list, the unread count and the actions on them.
 *
 * There is no push channel. The Socket.IO connection this hook used to open carried no events
 * (nothing on the server ever emitted one) and was removed in November 2026.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient, { extractAPIResponseData } from '../api/api';
import authService from '../services/authService';
import type {
  Notification,
  NotificationListResponse,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from '../types/notification';

const MIN_FETCH_INTERVAL_MS = 3000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const IS_TEST_ENV =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { watchUnreadCount = false } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const lastFetchAtRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const rateLimitUntilRef = useRef(0);

  // Tokens are kept in memory only (see authService.ts) - no localStorage
  // fallback here, so a stray localStorage write can never be silently
  // trusted as a valid session.
  const hasAccessToken = () => Boolean(authService.getAccessToken());
  const getAccessToken = () => authService.getAccessToken();
  const getErrorStatus = (err: unknown): number | null => {
    if (typeof err !== 'object' || err === null || !('response' in err)) {
      return null;
    }
    const response = (err as { response?: { status?: unknown } }).response;
    return typeof response?.status === 'number' ? response.status : null;
  };

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async (params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
  }) => {
    if (!IS_TEST_ENV && !hasAccessToken()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    if (fetchInFlightRef.current) {
      return;
    }
    if (!IS_TEST_ENV) {
      const now = Date.now();
      if (now < rateLimitUntilRef.current) {
        return;
      }
      if (now - lastFetchAtRef.current < MIN_FETCH_INTERVAL_MS) {
        return;
      }
    }
    fetchInFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params?.unread_only) queryParams.append('unread_only', 'true');

      const token = getAccessToken();
      const response = await apiClient.get<NotificationListResponse>('/notifications/', {
        params: Object.fromEntries(queryParams.entries()),
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // Extract data from APIResponse wrapper
      const data = extractAPIResponseData(response.data);
      const normalizedData =
        data && typeof data === 'object' && 'data' in data
          ? (data as { data: unknown }).data
          : data;

      if (normalizedData && typeof normalizedData === 'object') {
        const typedData = normalizedData as unknown as {
          items?: Notification[];
          notifications?: Notification[];
          unread_count?: number;
        };
        const items = typedData.items ?? typedData.notifications ?? [];
        setNotifications(items);
        setUnreadCount(typedData.unread_count || 0);
      }
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 401 || status === 403) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(new Error(errorMessage));
      console.error('Failed to fetch notifications:', err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 429
      ) {
        rateLimitUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
    } finally {
      lastFetchAtRef.current = Date.now();
      fetchInFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh unread count from API
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!IS_TEST_ENV && !hasAccessToken()) {
      setUnreadCount(0);
      return;
    }
    try {
      const token = getAccessToken();
      const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = extractAPIResponseData(response.data);
      const normalizedData =
        data && typeof data === 'object' && 'data' in data
          ? (data as { data: unknown }).data
          : data;

      if (normalizedData && typeof normalizedData === 'object' && 'unread_count' in normalizedData) {
        setUnreadCount((normalizedData as unknown as { unread_count: number }).unread_count);
      }
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 401 || status === 403) {
        setUnreadCount(0);
        return;
      }
      console.error('Failed to refresh unread count:', err);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    if (!IS_TEST_ENV && !hasAccessToken()) {
      return;
    }
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!IS_TEST_ENV && !hasAccessToken()) {
      return;
    }
    try {
      await apiClient.post('/notifications/read-all');

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  }, []);

  /**
   * Delete notification (soft delete)
   */
  const deleteNotification = useCallback(async (notificationId: number) => {
    if (!IS_TEST_ENV && !hasAccessToken()) {
      return;
    }
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(prev => {
        const target = prev.find(n => n.id === notificationId);
        if (target && !target.is_read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, []);

  // Keep the unread count current, for the component that shows it (the bell). It is read
  // when the component appears, and again when the browser comes back online or the page
  // becomes visible again: the moments at which the removed socket reconnected and did the
  // same. Off by default, because every NotificationItem uses this hook for its actions and
  // none of them needs a count of its own.
  useEffect(() => {
    if (!watchUnreadCount) {
      return undefined;
    }

    const refresh = () => {
      void refreshUnreadCount();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const timeout = setTimeout(refresh, 0);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [watchUnreadCount, refreshUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    refreshUnreadCount,
  };
}
