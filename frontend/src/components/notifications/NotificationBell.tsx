/**
 * NotificationBell Component
 * Bell icon with unread count badge - clickable to toggle notification dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import './NotificationBell.css';

export interface NotificationBellProps {
  className?: string;
  maxDisplayCount?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  maxDisplayCount = 99,
}) => {
  const { t } = useTranslation();
  const { unreadCount, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const displayCount = unreadCount > maxDisplayCount ? `${maxDisplayCount}+` : unreadCount;
  const hasUnread = unreadCount > 0;

  return (
    <div className={`notification-bell-container ${className}`} ref={bellRef}>
      <button
        className={`notification-bell-button ${hasUnread ? 'has-unread' : ''}`}
        onClick={toggleDropdown}
        aria-label={t('notifications.bell.ariaLabel', { count: unreadCount })}
        title={t('notifications.bell.title')}
      >
        {/* Bell Icon (SVG) */}
        <svg
          className="notification-bell-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
            fill="currentColor"
          />
        </svg>

        {/* Unread Count Badge */}
        {hasUnread && (
          <span className="notification-bell-badge" aria-label={t('notifications.bell.unreadCount', { count: unreadCount })}>
            {displayCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        {!isConnected && (
          <span
            className="notification-bell-offline"
            title={t('notifications.bell.offline')}
            aria-label={t('notifications.bell.offline')}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          isOpen={isOpen}
        />
      )}
    </div>
  );
};

export default NotificationBell;
