/**
 * NotificationItem Component
 * Individual notification card with actions
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../types/notification';
import './NotificationItem.css';
import { safeNavigate } from '../../utils/navigation';
import { useDateTimeFormatter, useDateTimeSettings } from '@/contexts/DateTimeSettingsContext';

export interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { t, i18n } = useTranslation('notifications');
  const { markAsRead, deleteNotification } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);
  const { timeZone } = useDateTimeSettings();
  const { formatDate } = useDateTimeFormatter();

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClick = () => {
    // Auto-mark as read on click
    if (!notification.is_read) {
      markAsRead(notification.id).catch((error) => {
        console.error('Failed to mark notification as read:', error);
      });
    }

    // Navigate if URL provided
    if (notification.data?.url) {
      safeNavigate(notification.data.url as string);
      return;
    }

    setIsExpanded((prev) => !prev);
  };

  const getNotificationIcon = () => {
    // Use custom icon if provided
    if (notification.icon) {
      return notification.icon;
    }

    // Default icons based on type
    switch (notification.notification_type) {
      case 'grade':
        return '🎓';
      case 'attendance':
        return '📅';
      case 'announcement':
        return '📢';
      case 'system':
        return '⚙️';
      case 'course':
        return '📚';
      case 'enrollment':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const locale = i18n?.language?.startsWith('el') ? 'el-GR' : 'en-US';

    const getZonedTimestamp = (value: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(value);

      const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      return Date.UTC(
        Number(lookup.year),
        Number(lookup.month) - 1,
        Number(lookup.day),
        Number(lookup.hour),
        Number(lookup.minute),
        Number(lookup.second)
      );
    };

    const diffMs = getZonedTimestamp(now) - getZonedTimestamp(notificationDate);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return t('time.justNow');
    } else if (diffMins < 60) {
      return t('time.minutesAgo', { count: diffMins });
    } else if (diffHours < 24) {
      return t('time.hoursAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return t('time.daysAgo', { count: diffDays });
    } else {
      return formatDate(notificationDate);
    }
  };

  const getPriorityClass = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'notification-item-priority-urgent';
      case 'high':
        return 'notification-item-priority-high';
      default:
        return '';
    }
  };

  return (
    <div
      className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityClass()}`}
      onClick={handleClick}
      onMouseEnter={() => {
        if (notification.notification_type === 'announcement') {
          setIsExpanded(true);
        }
      }}
      onMouseLeave={() => {
        if (notification.notification_type === 'announcement') {
          setIsExpanded(false);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Unread Indicator */}
      {!notification.is_read && <div className="notification-item-unread-dot" />}

      {/* Icon */}
      <div className="notification-item-icon">
        <span className="notification-item-emoji">{getNotificationIcon()}</span>
      </div>

      {/* Content */}
      <div className="notification-item-content">
        <div className="notification-item-header">
          <h4 className="notification-item-title">{notification.title}</h4>
          <span className="notification-item-time">
            {getRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className={`notification-item-message ${isExpanded ? 'notification-item-message-expanded' : ''}`}>
          {notification.message}
        </p>

        {/* Type Badge */}
        <span className={`notification-item-type notification-type-${notification.notification_type}`}>
          {t(`types.${notification.notification_type}`, {
            defaultValue: notification.notification_type
          })}
        </span>
      </div>

      {/* Actions */}
      <div className="notification-item-actions">
        {!notification.is_read && (
          <button
            className="notification-item-action"
            onClick={handleMarkAsRead}
            aria-label={`${t('item.markAsRead', { defaultValue: 'Mark as read' })} | Mark as read`}
            title={`${t('item.markAsRead', { defaultValue: 'Mark as read' })} | Mark as read`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}

        <button
          className="notification-item-action notification-item-delete"
          onClick={handleDelete}
          aria-label={`${t('item.delete', { defaultValue: 'Delete notification' })} | Delete notification`}
          title={`${t('item.delete', { defaultValue: 'Delete notification' })} | Delete notification`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;
