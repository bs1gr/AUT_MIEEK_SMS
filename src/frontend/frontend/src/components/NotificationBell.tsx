/**
 * Notification Bell Component
 * Shows unread notification count and toggles notification center
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';
import NotificationCenter from './NotificationCenter';
import { useNotificationWebSocket } from '../services/notificationWebSocket';

interface UnreadCountResponse {
  unread_count: number;
}

interface NotificationBellProps {
  authToken?: string;
}

/**
 * Notification Bell Component
 * Displays unread count and opens notification center
 */
export function NotificationBell({ authToken }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Initialize WebSocket for real-time notifications
  const { isConnected, notifications: realtimeNotifications } = useNotificationWebSocket(authToken || null);

  // Fetch unread count
  const { data, refetch } = useQuery<UnreadCountResponse>({
    queryKey: ['unreadNotificationCount'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    },
    enabled: !!authToken,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Refetch when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // When real-time notifications arrive, refetch unread count and notification list
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      refetch(); // Refetch unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Invalidate notification list
    }
  }, [realtimeNotifications, refetch, queryClient]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    refetch(); // Refetch count when closing
  }, [refetch]);

  if (!authToken) {
    return null;
  }

  const unreadCount = data?.unread_count || 0;

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        title={`Notifications${isConnected ? ' (Live)' : ''}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* WebSocket connection indicator */}
        {isConnected && (
          <span className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates active" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter isOpen={isOpen} onClose={handleClose} />
    </>
  );
}

export default NotificationBell;
