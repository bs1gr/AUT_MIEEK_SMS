/**
 * NotificationDropdown Component
 * Dropdown list showing recent notifications with actions
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationDropdown.css';

export interface NotificationDropdownProps {
  onClose: () => void;
  isOpen: boolean;
  maxNotifications?: number;
  onViewAll?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
  isOpen,
  maxNotifications = 10,
  onViewAll,
}) => {
  const { t } = useTranslation('notifications');
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for pending software update notification
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; url: string | null } | null>(() => {
    const raw = localStorage.getItem('sms.updateAvailable');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem('sms.updateAvailable');
      setUpdateAvailable(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener('sms:update-status', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('sms:update-status', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

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
  const hasNotifications = displayNotifications.length > 0 || !!updateAvailable;

  // Return null if dropdown is not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`notification-dropdown ${isOpen ? 'open' : ''}`}
      ref={dropdownRef}
      role="region"
      aria-label={t('dropdown.ariaLabel')}
    >
      {/* Header */}
      <div className="notification-dropdown-header">
        <h3 className="notification-dropdown-title">
          {t('dropdown.title')}
        </h3>

        {unreadCount > 0 && (
          <button
            className="notification-dropdown-mark-all"
            onClick={handleMarkAllAsRead}
            aria-label={t('dropdown.markAllRead')}
          >
            {t('dropdown.markAllRead')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="notification-dropdown-body">
        {/* Software update notification */}
        {updateAvailable && (
          <div className="notification-dropdown-update" style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 16L7 11H10V4H14V11H17L12 16Z" fill="#3b82f6" />
              <path d="M20 18H4V20H20V18Z" fill="#3b82f6" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                {t('dropdown.updateAvailable', 'Update Available')}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6', opacity: 0.85 }}>
                {t('dropdown.updateVersion', { version: updateAvailable.version, defaultValue: `Version ${updateAvailable.version}` })}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="notification-dropdown-loading">
            <div className="notification-loading-spinner" />
            <p>{t('dropdown.loading')}</p>
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
            <p>{t('dropdown.empty')}</p>
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
          {onViewAll ? (
            <button
              type="button"
              className="notification-dropdown-view-all"
              onClick={() => {
                onClose();
                onViewAll();
              }}
            >
              {t('dropdown.viewAll')}
            </button>
          ) : (
            <a
              href="/notifications"
              className="notification-dropdown-view-all"
              onClick={onClose}
            >
              {t('dropdown.viewAll')}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
