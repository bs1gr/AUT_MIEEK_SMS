/**
 * Notification Center Component
 * Displays real-time notifications with settings
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { extractAPIResponseData } from '../api/api';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import { safeNavigate } from '../utils/navigation';
import { getNotificationText } from './notifications/notificationText';
import { notificationActions, publishUnreadCount } from '../hooks/useNotifications';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  data?: unknown;
}

interface NotificationListResponse {
  total: number;
  unread_count: number;
  items: Notification[];
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Notification Center Component
 * Shows notification history and allows marking as read
 */
export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { t } = useTranslation('notifications');
  const { formatDateTime } = useDateTimeFormatter();
  const [skip, setSkip] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const limit = 20;

  // Fetch notifications. The list is asked for again at every opening (`staleTime: 0`; the
  // application's default would show a list up to five minutes old, without what the
  // dropdown has marked or deleted since), and each answer's unread count goes to the bell.
  const { data, isLoading, refetch } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', skip],
    queryFn: async () => {
      const response = await api.get('/notifications/', {
        params: { skip, limit },
      });
      const list = extractAPIResponseData<NotificationListResponse>(response.data);
      publishUnreadCount(list?.unread_count);
      return list;
    },
    enabled: isOpen,
    staleTime: 0,
  });

  // The three actions go through the shared notification state (the same requests as before),
  // so the dropdown's list and the bell's count change with this window's own list.

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationActions.markAsRead(notificationId),
    onSuccess: () => {
      refetch();
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationActions.markAllAsRead(),
    onSuccess: () => {
      refetch();
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => notificationActions.deleteNotification(notificationId),
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = useCallback(
    (notificationId: number, isRead: boolean) => {
      if (!isRead) {
        markAsReadMutation.mutate(notificationId);
      }
    },
    [markAsReadMutation]
  );

  const handleOpen = useCallback(
    (notification: Notification) => {
      handleMarkAsRead(notification.id, notification.is_read);
      const url = (notification.data as { url?: unknown } | null | undefined)?.url;
      if (typeof url === 'string' && url) {
        onClose();
        safeNavigate(url);
      }
    },
    [handleMarkAsRead, onClose]
  );

  const handleDelete = useCallback((notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const toggleExpanded = useCallback((notificationId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'grade_update':
        return '📊';
      case 'attendance_change':
        return '✓';
      case 'course_update':
        return '📚';
      case 'system_message':
        return 'ℹ️';
      case 'assignment_posted':
        return '📝';
      case 'registration':
        return '👤';
      case 'activation_email_failed':
        return '✉️';
      case 'backup_failed':
        return '💾';
      default:
        return '🔔';
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full sm:w-96 h-[600px] sm:h-screen sm:rounded-l-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <div className="flex items-center gap-2">
            {data?.unread_count ? (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {t('markAllRead')}
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Unread count */}
        {data?.unread_count ? (
          <div className="bg-blue-50 px-4 py-2 text-sm text-blue-700">
            {t('unreadCount', { count: data.unread_count })}
          </div>
        ) : null}

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">{t('common:loading')}</div>
            </div>
          ) : data?.items?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p>{t('empty')}</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {data?.items?.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleOpen(notification)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpen(notification);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm">{getNotificationText(notification, t).title}</h3>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p
                        className={`text-sm text-gray-600 mt-1 ${
                          expandedIds.has(notification.id) ? 'whitespace-pre-line' : 'line-clamp-2'
                        }`}
                      >
                        {getNotificationText(notification, t).message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(notification.created_at)}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(notification.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {expandedIds.has(notification.id)
                              ? t('item.hideDetails', { defaultValue: 'Hide details' })
                              : t('item.viewDetails', { defaultValue: 'View details' })}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {t('common:delete')}
                          </button>
                        </div>
                      </div>
                      {expandedIds.has(notification.id) && notification.data != null && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                          <div className="font-semibold text-slate-700 mb-1">
                            {t('item.details', { defaultValue: 'Details' })}
                          </div>
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(notification.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.total > limit ? (
          <div className="border-t p-4 flex items-center justify-between">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {t('common:previous')}
            </button>
            <span className="text-sm text-gray-600">
              {skip + 1}-{Math.min(skip + limit, data.total)} {t('common:of')} {data.total}
            </span>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= data.total}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {t('common:next')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default NotificationCenter;
