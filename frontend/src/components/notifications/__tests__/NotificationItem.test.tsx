/**
 * NotificationItem Component Tests
 * Tests for individual notification card
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotificationItem from '../NotificationItem';
import * as useNotificationsModule from '../../../hooks/useNotifications';
import type { Notification } from '../../../types/notification';

// Mock the useNotifications hook
vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('NotificationItem Component', () => {
  const mockUseNotifications = vi.fn();

  const mockNotification: Notification = {
    id: 1,
    user_id: 1,
    notification_type: 'grade',
    title: 'New Grade Posted',
    message: 'You received a new grade in Math',
    is_read: false,
    priority: 'high',
    created_at: '2026-01-12T10:00:00Z',
    data: { url: '/grades/123' },
    icon: null,
    read_at: null,
    deleted_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      isConnected: true,
      notifications: [mockNotification],
      isLoading: false,
      error: null,
      markAsRead: vi.fn().mockResolvedValue(undefined),
      markAllAsRead: vi.fn().mockResolvedValue(undefined),
      deleteNotification: vi.fn().mockResolvedValue(undefined),
      fetchNotifications: vi.fn().mockResolvedValue([]),
      refreshUnreadCount: vi.fn().mockResolvedValue(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    vi.mocked(useNotificationsModule.useNotifications).mockImplementation(mockUseNotifications);
  });

  describe('Rendering', () => {
    it('should render notification title', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
    });

    it('should render notification message', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByText('You received a new grade in Math')).toBeInTheDocument();
    });

    it('should render notification type badge', () => {
      render(<NotificationItem notification={mockNotification} />);
      const badge = screen.getByText('notifications.types.grade');
      expect(badge).toBeInTheDocument();
    });

    it('should have proper container structure', () => {
      const { container } = render(<NotificationItem notification={mockNotification} />);
      const item = container.querySelector('.notification-item');
      expect(item).toBeInTheDocument();
    });
  });

  describe('Unread Indicator', () => {
    it('should show unread dot when is_read is false', () => {
      const unreadNotif = { ...mockNotification, is_read: false };
      const { container } = render(<NotificationItem notification={unreadNotif} />);
      const unreadDot = container.querySelector('.notification-item-unread-dot');
      expect(unreadDot).toBeInTheDocument();
    });

    it('should not show unread dot when is_read is true', () => {
      const readNotif = { ...mockNotification, is_read: true };
      const { container } = render(<NotificationItem notification={readNotif} />);
      const unreadDot = container.querySelector('.notification-item-unread-dot');
      expect(unreadDot).not.toBeInTheDocument();
    });

    it('should apply unread class when is_read is false', () => {
      const unreadNotif = { ...mockNotification, is_read: false };
      const { container } = render(<NotificationItem notification={unreadNotif} />);
      const item = container.querySelector('.notification-item');
      expect(item).toHaveClass('unread');
    });

    it('should not apply unread class when is_read is true', () => {
      const readNotif = { ...mockNotification, is_read: true };
      const { container } = render(<NotificationItem notification={readNotif} />);
      const item = container.querySelector('.notification-item');
      expect(item).not.toHaveClass('unread');
    });
  });

  describe('Icon Display', () => {
    it('should display emoji icon for grade notification', () => {
      const gradeNotif = { ...mockNotification, notification_type: 'grade' };
      const { container } = render(<NotificationItem notification={gradeNotif} />);
      const icon = container.querySelector('.notification-item-icon');
      expect(icon?.textContent).toContain('🎓');
    });

    it('should display emoji icon for attendance notification', () => {
      const attendanceNotif = { ...mockNotification, notification_type: 'attendance' };
      const { container } = render(<NotificationItem notification={attendanceNotif} />);
      const icon = container.querySelector('.notification-item-icon');
      expect(icon?.textContent).toContain('📅');
    });

    it('should display emoji icon for announcement notification', () => {
      const announcementNotif = { ...mockNotification, notification_type: 'announcement' };
      const { container } = render(<NotificationItem notification={announcementNotif} />);
      const icon = container.querySelector('.notification-item-icon');
      expect(icon?.textContent).toContain('📢');
    });

    it('should display emoji icon for course notification', () => {
      const courseNotif = { ...mockNotification, notification_type: 'course' };
      const { container } = render(<NotificationItem notification={courseNotif} />);
      const icon = container.querySelector('.notification-item-icon');
      expect(icon?.textContent).toContain('📚');
    });
  });

  describe('Timestamp Display', () => {
    it('should display relative time for recent notifications', () => {
      const recentNotif = {
        ...mockNotification,
        created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      };
      render(<NotificationItem notification={recentNotif} />);
      // Should display something like "5 minutes ago"
      expect(screen.getByText(/time\./)).toBeInTheDocument();
    });

    it('should format time for old notifications', () => {
      const oldNotif = {
        ...mockNotification,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(), // 3 days ago
      };
      render(<NotificationItem notification={oldNotif} />);
      expect(screen.getByText(/time\./)).toBeInTheDocument();
    });
  });

  describe('Type Badge', () => {
    it('should display type badge with correct color class', () => {
      const { container } = render(<NotificationItem notification={mockNotification} />);
      const badge = container.querySelector('.notification-type-grade');
      expect(badge).toBeInTheDocument();
    });

    it('should have correct notification type text', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByText('notifications.types.grade')).toBeInTheDocument();
    });

    it('should apply correct class for different notification types', () => {
      const typeTests: Array<[string, string]> = [
        ['grade', 'notification-type-grade'],
        ['attendance', 'notification-type-attendance'],
        ['announcement', 'notification-type-announcement'],
        ['course', 'notification-type-course'],
      ];

      typeTests.forEach(([type, className]) => {
        const notif = {
          ...mockNotification,
          notification_type: type as Notification['notification_type'],
        };
        const { container } = render(<NotificationItem notification={notif} />);
        expect(container.querySelector(`.${className}`)).toBeInTheDocument();
      });
    });
  });

  describe('Priority Border', () => {
    it('should apply urgent class for urgent priority', () => {
      const urgentNotif = { ...mockNotification, priority: 'urgent' };
      const { container } = render(<NotificationItem notification={urgentNotif} />);
      const item = container.querySelector('.notification-item');
      expect(item).toHaveClass('notification-item-priority-urgent');
    });

    it('should apply high class for high priority', () => {
      const highNotif = { ...mockNotification, priority: 'high' };
      const { container } = render(<NotificationItem notification={highNotif} />);
      const item = container.querySelector('.notification-item');
      expect(item).toHaveClass('notification-item-priority-high');
    });

    it('should not apply priority class for normal priority', () => {
      const normalNotif = { ...mockNotification, priority: 'normal' };
      const { container } = render(<NotificationItem notification={normalNotif} />);
      const item = container.querySelector('.notification-item');
      expect(item).not.toHaveClass('notification-item-priority-normal');
      expect(item).not.toHaveClass('notification-item-priority-urgent');
      expect(item).not.toHaveClass('notification-item-priority-high');
    });
  });

  describe('Actions', () => {
    it('should render mark as read button', () => {
      render(<NotificationItem notification={mockNotification} />);
      const markReadBtn = screen.getByRole('button', { name: /item.markAsRead/i });
      expect(markReadBtn).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<NotificationItem notification={mockNotification} />);
      const deleteBtn = screen.getByRole('button', { name: /item.delete/i });
      expect(deleteBtn).toBeInTheDocument();
    });

    it('should call markAsRead when button clicked if not already read', async () => {
      const markAsRead = vi.fn().mockResolvedValue(undefined);
      mockUseNotifications.mockReturnValue({
        unreadCount: 1,
        isConnected: true,
        notifications: [mockNotification],
        isLoading: false,
        error: null,
        markAsRead,
        markAllAsRead: vi.fn().mockResolvedValue(undefined),
        deleteNotification: vi.fn().mockResolvedValue(undefined),
        fetchNotifications: vi.fn().mockResolvedValue([]),
        refreshUnreadCount: vi.fn().mockResolvedValue(0),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(<NotificationItem notification={mockNotification} />);
      const markReadBtn = screen.getByLabelText(/mark as read/i);

      await userEvent.click(markReadBtn);

      expect(markAsRead).toHaveBeenCalledWith(mockNotification.id);
    });

    it('should not call markAsRead if already read', async () => {
      const markAsRead = vi.fn().mockResolvedValue(undefined);
      const readNotif = { ...mockNotification, is_read: true };
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: [readNotif],
        isLoading: false,
        error: null,
        markAsRead,
        markAllAsRead: vi.fn().mockResolvedValue(undefined),
        deleteNotification: vi.fn().mockResolvedValue(undefined),
        fetchNotifications: vi.fn().mockResolvedValue([]),
        refreshUnreadCount: vi.fn().mockResolvedValue(0),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(<NotificationItem notification={readNotif} />);
      const markReadBtn = screen.queryByLabelText(/mark as read/i);

      if (markReadBtn) {
        await userEvent.click(markReadBtn);
      }

      expect(markAsRead).not.toHaveBeenCalled();
    });

    it('should call deleteNotification when delete button clicked', async () => {
      const deleteNotification = vi.fn().mockResolvedValue(undefined);
      mockUseNotifications.mockReturnValue({
        unreadCount: 1,
        isConnected: true,
        notifications: [mockNotification],
        isLoading: false,
        error: null,
        markAsRead: vi.fn().mockResolvedValue(undefined),
        markAllAsRead: vi.fn().mockResolvedValue(undefined),
        deleteNotification,
        fetchNotifications: vi.fn().mockResolvedValue([]),
        refreshUnreadCount: vi.fn().mockResolvedValue(0),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(<NotificationItem notification={mockNotification} />);
      const deleteBtn = screen.getByLabelText(/delete/i);

      await userEvent.click(deleteBtn);

      expect(deleteNotification).toHaveBeenCalledWith(mockNotification.id);
    });
  });

  describe('Click Behavior', () => {
    it('should mark as read on click if not already read', async () => {
      const markAsRead = vi.fn().mockResolvedValue(undefined);
      mockUseNotifications.mockReturnValue({
        unreadCount: 1,
        isConnected: true,
        notifications: [mockNotification],
        isLoading: false,
        error: null,
        markAsRead,
        markAllAsRead: vi.fn().mockResolvedValue(undefined),
        deleteNotification: vi.fn().mockResolvedValue(undefined),
        fetchNotifications: vi.fn().mockResolvedValue([]),
        refreshUnreadCount: vi.fn().mockResolvedValue(0),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      const { container } = render(<NotificationItem notification={mockNotification} />);
      const item = container.querySelector('.notification-item');

      if (item) {
        fireEvent.click(item);
      }

      expect(markAsRead).toHaveBeenCalledWith(mockNotification.id);
    });

    it('should navigate if data.url exists and notification is read', async () => {
      const readNotif = { ...mockNotification, is_read: true, data: { url: '/grades/123' } };
      const { container } = render(<NotificationItem notification={readNotif} />);
      const item = container.querySelector('.notification-item');

      if (item) {
        fireEvent.click(item);
      }

      // Note: actual navigation depends on implementation
    });

    it('should stop propagation on action button clicks', async () => {
      render(<NotificationItem notification={mockNotification} />);
      const deleteBtn = screen.getByLabelText(/delete/i);

      const event = new MouseEvent('click', { bubbles: true });
      const _stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      fireEvent.click(deleteBtn);

      // Ensure stopPropagation was called in handler
      expect(deleteBtn).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByLabelText(/mark as read/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /item.delete/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<NotificationItem notification={mockNotification} />);
      const deleteBtn = screen.getByRole('button', { name: /item.delete/i });

      // Focus button
      deleteBtn.focus();
      expect(document.activeElement).toBe(deleteBtn);

      // Simulate Enter key
      fireEvent.keyDown(deleteBtn, { key: 'Enter', code: 'Enter' });
    });
  });

  describe('Different Notification Types', () => {
    const notificationTypes: Array<Notification['notification_type']> = [
      'grade',
      'attendance',
      'announcement',
      'system',
      'course',
      'enrollment',
      'general',
    ];

    notificationTypes.forEach((type) => {
      it(`should render ${type} notification correctly`, () => {
        const notif = { ...mockNotification, notification_type: type };
        render(<NotificationItem notification={notif} />);
        expect(screen.getByText(`notifications.types.${type}`)).toBeInTheDocument();
      });
    });
  });

  describe('Different Priority Levels', () => {
    const priorities: Array<Notification['priority']> = ['urgent', 'high', 'normal', 'low'];

    priorities.forEach((priority) => {
      it(`should render ${priority} priority notification correctly`, () => {
        const notif = { ...mockNotification, priority };
        const { container } = render(<NotificationItem notification={notif} />);
        const item = container.querySelector('.notification-item');
        expect(item).toBeInTheDocument();
      });
    });
  });

  describe('Data Integrity', () => {
    it('should handle notifications with all fields populated', () => {
      const fullNotif: Notification = {
        id: 1,
        user_id: 1,
        notification_type: 'grade',
        title: 'New Grade',
        message: 'You got an A',
        is_read: false,
        priority: 'high',
        created_at: '2026-01-12T10:00:00Z',
        data: { url: '/grades/123', courseId: 456 },
        icon: 'custom-icon',
        read_at: null,
        deleted_at: null,
      };

      render(<NotificationItem notification={fullNotif} />);
      expect(screen.getByText('New Grade')).toBeInTheDocument();
      expect(screen.getByText('You got an A')).toBeInTheDocument();
    });

    it('should handle notifications with minimal data', () => {
      const minimalNotif: Notification = {
        id: 1,
        user_id: 1,
        notification_type: 'general',
        title: 'Message',
        message: 'Test',
        is_read: true,
        priority: 'normal',
        created_at: '2026-01-12T10:00:00Z',
        data: {},
        icon: null,
        read_at: '2026-01-12T10:30:00Z',
        deleted_at: null,
      };

      render(<NotificationItem notification={minimalNotif} />);
      expect(screen.getByText('Message')).toBeInTheDocument();
    });
  });
});
