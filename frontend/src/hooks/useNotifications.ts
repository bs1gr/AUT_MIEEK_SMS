/**
 * useNotifications Hook
 * Real-time notifications with WebSocket and API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import apiClient, { extractAPIResponseData, extractAPIError } from '../api/api';
import type {
  Notification,
  NotificationListResponse,
  UseNotificationsReturn,
  WebSocketMessage,
} from '../types/notification';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async (params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params?.unread_only) queryParams.append('unread_only', 'true');

      const response = await apiClient.get<NotificationListResponse>(
        `/notifications?${queryParams.toString()}`
      );

      // Extract data from APIResponse wrapper
      const data = extractAPIResponseData(response);

      if (data && typeof data === 'object') {
        setNotifications((data as any).notifications || []);
        setUnreadCount((data as any).unread_count || 0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(new Error(errorMessage));
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh unread count from API
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
      const data = extractAPIResponseData(response);

      if (data && typeof data === 'object' && 'unread_count' in data) {
        setUnreadCount((data as any).unread_count);
      }
    } catch (err) {
      console.error('Failed to refresh unread count:', err);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: number) => {
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
    try {
      await apiClient.delete(`/notifications/${notificationId}`);

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Decrease unread count if notification was unread
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, [notifications]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');

      socketRef.current = io(WEBSOCKET_URL, {
        path: '/socket.io/',
        auth: {
          token: token || '',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('WebSocket connected:', socket.id);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Refresh notifications on reconnect
        fetchNotifications({ limit: 20 });
        refreshUnreadCount();
      });

      socket.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnected:', reason);
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
        console.log('New notification received:', data);

        if (data.type === 'notification' && data.data) {
          const newNotification = data.data as Notification;

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
          const notification = notifications.find(n => n.id === notificationId);

          setNotifications(prev => prev.filter(n => n.id !== notificationId));

          if (notification && !notification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      });

      socket.on('message', (data: WebSocketMessage) => {
        console.log('WebSocket message:', data);
      });

      socket.on('error', (err: Error) => {
        console.error('WebSocket error:', err);
        setError(err);
      });

    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
      setError(err instanceof Error ? err : new Error('WebSocket connection failed'));
    }
  }, [fetchNotifications, refreshUnreadCount, notifications]);

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

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    fetchNotifications({ limit: 20 });

    return () => {
      disconnect();
    };
  }, []);  // Only run on mount/unmount

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
