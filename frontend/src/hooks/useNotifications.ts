/**
 * useNotifications Hook
 * Real-time notifications with WebSocket and API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import apiClient, { extractAPIResponseData } from '../api/api';
import authService from '../services/authService';
import type {
  Notification,
  NotificationListResponse,
  UseNotificationsReturn,
  WebSocketMessage,
} from '../types/notification';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const MIN_FETCH_INTERVAL_MS = 3000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const IS_TEST_ENV =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchAtRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const rateLimitUntilRef = useRef(0);

  const hasAccessToken = () => {
    if (authService.getAccessToken()) {
      return true;
    }
    try {
      return Boolean(localStorage.getItem('sms_access_token') || localStorage.getItem('access_token'));
    } catch {
      return false;
    }
  };
  const getAccessToken = () => {
    const token = authService.getAccessToken();
    if (token) return token;
    try {
      return localStorage.getItem('sms_access_token') || localStorage.getItem('access_token');
    } catch {
      return null;
    }
  };
  const getUserId = (): number | null => {
    try {
      const raw = localStorage.getItem('sms_user_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: number };
      return typeof parsed.id === 'number' ? parsed.id : null;
    } catch {
      return null;
    }
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

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      // Already connected, skip reconnection
      return;
    }

    try {
      const token = getAccessToken();
      const userId = getUserId();

      if (!token || !userId) {
        setIsConnected(false);
        return;
      }

      socketRef.current = io(WEBSOCKET_URL, {
        path: '/socket.io/',
        auth: {
          token,
          user_id: userId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        // Refresh unread count on reconnect
        refreshUnreadCount();
      });

      socket.on('disconnect', (_reason: string) => {
        setIsConnected(false);
      });

      socket.on('connect_error', (err: Error) => {
        console.error('WebSocket connection error:', err);
        setError(new Error('WebSocket connection failed'));
        reconnectAttemptsRef.current++;

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Max reconnection attempts reached');
          socket.disconnect();
        }
      });

      // Notification events
      socket.on('notification', (data: WebSocketMessage) => {
        // New notification received

        if (data.type === 'notification' && data.data) {
          const newNotification = data.data as unknown as Notification;

          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);

          // Increment unread count
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      });

      socket.on('notification_read', (data: WebSocketMessage) => {
        if (data.data && typeof data.data === 'object' && 'notification_id' in data.data) {
          const notificationId = (data.data as { notification_id: number }).notification_id;

          setNotifications(prev =>
            prev.map(n =>
              n.id === notificationId
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n
            )
          );

          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });

      socket.on('notification_deleted', (data: WebSocketMessage) => {
        if (data.data && typeof data.data === 'object' && 'notification_id' in data.data) {
          const notificationId = (data.data as { notification_id: number }).notification_id;
          let wasUnread = false;

          setNotifications(prev => {
            const target = prev.find(n => n.id === notificationId);
            wasUnread = Boolean(target && !target.is_read);
            return prev.filter(n => n.id !== notificationId);
          });

          if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      });

      socket.on('message', (_data: WebSocketMessage) => {
        // WebSocket message received
      });

      socket.on('error', (err: Error) => {
        console.error('WebSocket error:', err);
        setError(err);
      });

    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
      setError(err instanceof Error ? err : new Error('WebSocket connection failed'));
    }
  }, [refreshUnreadCount]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-connect on mount (deferred) and disconnect on unmount
  useEffect(() => {
    const shouldAutoConnect = !IS_TEST_ENV;
    const timeout = shouldAutoConnect
      ? setTimeout(() => {
          if (hasAccessToken()) {
            connect();
            refreshUnreadCount();
          }
        }, 0)
      : null;

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (socketRef.current) {
        socketRef.current.off?.();
      }

      disconnect();
    };
  }, [connect, refreshUnreadCount, disconnect]);

  return {
    // State
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    refreshUnreadCount,

    // WebSocket
    connect,
    disconnect,
  };
}
