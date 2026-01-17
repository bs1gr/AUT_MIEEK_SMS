import React from 'react';
import { useTranslation } from 'react-i18next';
import { Notification } from '../types';
import '../styles/NotificationItem.css';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleMarkAsRead = async () => {
    if (!onMarkAsRead) return;
    try {
      setIsLoading(true);
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsLoading(true);
      await onDelete(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`notification-item ${!notification.read ? 'unread' : ''}`}>
      <div className="notification-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <small className="notification-time">
          {new Date(notification.createdAt).toLocaleString()}
        </small>
      </div>
      <div className="notification-actions">
        {!notification.read && onMarkAsRead && (
          <button
            className="btn-mark-read"
            onClick={handleMarkAsRead}
            disabled={isLoading}
            title={t('notifications.markAsRead')}
          >
            {t('notifications.markAsRead')}
          </button>
        )}
        {onDelete && (
          <button
            className="btn-delete"
            onClick={handleDelete}
            disabled={isLoading}
            title={t('notifications.delete')}
          >
            {t('notifications.delete')}
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
