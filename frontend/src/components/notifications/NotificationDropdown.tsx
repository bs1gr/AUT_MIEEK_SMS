/**
 * NotificationDropdown Component
 * Dropdown list showing recent notifications with actions
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationDropdown.css';

export interface NotificationDropdownProps {
  onClose: () => void;
  isOpen: boolean;
  maxNotifications?: number;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
  isOpen,
  maxNotifications = 10,
}) => {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ limit: maxNotifications });
    }
  }, [isOpen, maxNotifications, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const displayNotifications = notifications.slice(0, maxNotifications);
  const hasNotifications = displayNotifications.length > 0;

  return (
    <div
      className={`notification-dropdown ${isOpen ? 'open' : ''}`}
      ref={dropdownRef}
      role="dialog"
      aria-label={t('notifications.dropdown.ariaLabel')}
    >
      {/* Header */}
      <div className="notification-dropdown-header">
        <h3 className="notification-dropdown-title">
          {t('notifications.dropdown.title')}
        </h3>

        {unreadCount > 0 && (
          <button
            className="notification-dropdown-mark-all"
            onClick={handleMarkAllAsRead}
            aria-label={t('notifications.dropdown.markAllRead')}
          >
            {t('notifications.dropdown.markAllRead')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="notification-dropdown-body">
        {isLoading && (
          <div className="notification-dropdown-loading">
            <div className="notification-loading-spinner" />
            <p>{t('notifications.dropdown.loading')}</p>
          </div>
        )}

        {!isLoading && !hasNotifications && (
          <div className="notification-dropdown-empty">
            <svg
              className="notification-empty-icon"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
            <p>{t('notifications.dropdown.empty')}</p>
          </div>
        )}

        {!isLoading && hasNotifications && (
          <div className="notification-dropdown-list">
            {displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasNotifications && (
        <div className="notification-dropdown-footer">
          <a
            href="/notifications"
            className="notification-dropdown-view-all"
            onClick={onClose}
          >
            {t('notifications.dropdown.viewAll')}
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
