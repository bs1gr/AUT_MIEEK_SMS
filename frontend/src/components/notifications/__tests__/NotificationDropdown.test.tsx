/**
 * NotificationDropdown Component Tests
 * Tests for dropdown panel with notification list
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotificationDropdown from '../NotificationDropdown';
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

// Mock NotificationItem
vi.mock('../NotificationItem', () => ({
  default: ({ notification }: { notification: Notification }) => (
    <div data-testid={`notification-item-${notification.id}`}>
      {notification.title}
    </div>
  ),
}));

describe('NotificationDropdown Component', () => {
  const mockUseNotifications = vi.fn();
  const mockOnClose = vi.fn();

  const mockNotifications: Notification[] = [
    {
      id: 1,
      user_id: 1,
      notification_type: 'grade',
      title: 'New Grade',
      message: 'You received a new grade',
      is_read: false,
      priority: 'high',
      created_at: '2026-01-12T10:00:00Z',
      data: {},
      icon: null,
      read_at: null,
      deleted_at: null,
    },
    {
      id: 2,
      user_id: 1,
      notification_type: 'announcement',
      title: 'Announcement',
      message: 'New course announcement',
      is_read: true,
      priority: 'normal',
      created_at: '2026-01-12T09:00:00Z',
      data: {},
      icon: null,
      read_at: '2026-01-12T09:30:00Z',
      deleted_at: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      isConnected: true,
      notifications: mockNotifications,
      isLoading: false,
      error: null,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      fetchNotifications: vi.fn(),
      refreshUnreadCount: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    vi.mocked(useNotificationsModule.useNotifications).mockImplementation(mockUseNotifications);
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <NotificationDropdown isOpen={false} onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should have proper role and aria-label', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );
      const container = screen.getByRole('region');
      expect(container).toHaveAttribute('aria-label');
    });
  });

  describe('Header', () => {
    it('should display header with title', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );
      expect(screen.getByText('dropdown.title')).toBeInTheDocument();
    });

    it('should show "Mark all as read" button when unreadCount > 0', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );
      const markAllButton = screen.getByRole('button', { name: /dropdown.markAllRead/i });
      expect(markAllButton).toBeInTheDocument();
    });

    it('should not show "Mark all as read" button when unreadCount is 0', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: mockNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );
      const markAllButton = screen.queryByRole('button', { name: /dropdown.markAllRead/i });
      expect(markAllButton).not.toBeInTheDocument();
    });

    it('should call markAllAsRead when button clicked', async () => {
      const markAllAsRead = vi.fn();
      mockUseNotifications.mockReturnValue({
        unreadCount: 1,
        isConnected: true,
        notifications: mockNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead,
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      const markAllButton = screen.getByRole('button', { name: /dropdown.markAllRead/i });
      await userEvent.click(markAllButton);

      expect(markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: [],
        isLoading: true,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('dropdown.loading')).toBeInTheDocument();
    });

    it('should not show loading spinner when not loading', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: mockNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.queryByText('dropdown.loading')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no notifications', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: [],
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText('dropdown.empty')).toBeInTheDocument();
    });

    it('should not show empty state when notifications exist', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.queryByText('dropdown.empty')).not.toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('should render all notifications up to maxNotifications', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} maxNotifications={10} />
      );

      mockNotifications.forEach((notif) => {
        expect(screen.getByTestId(`notification-item-${notif.id}`)).toBeInTheDocument();
      });
    });

    it('should limit rendered notifications to maxNotifications', () => {
      const manyNotifications = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        user_id: 1,
        notification_type: 'grade' as const,
        title: `Notification ${i}`,
        message: `Message ${i}`,
        is_read: false,
        priority: 'normal' as const,
        created_at: '2026-01-12T10:00:00Z',
        data: {},
        icon: null,
        read_at: null,
        deleted_at: null,
      }));

      mockUseNotifications.mockReturnValue({
        unreadCount: 10,
        isConnected: true,
        notifications: manyNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} maxNotifications={5} />
      );

      // Should only render 5 notifications
      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`notification-item-${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByTestId('notification-item-5')).not.toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should show "View all" link when notifications exist', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      const viewAllLink = screen.getByRole('link', { name: /dropdown.viewAll/i });
      expect(viewAllLink).toBeInTheDocument();
    });

    it('should show "View all" button when onViewAll is provided', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} onViewAll={vi.fn()} />
      );

      const viewAllButton = screen.getByRole('button', { name: /dropdown.viewAll/i });
      expect(viewAllButton).toBeInTheDocument();
    });

    it('should not show "View all" link when no notifications', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: [],
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.queryByRole('link', { name: /dropdown.viewAll/i })).not.toBeInTheDocument();
    });

    it('should link to notifications page', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      const viewAllLink = screen.getByRole('link', { name: /dropdown.viewAll/i });
      expect(viewAllLink).toHaveAttribute('href', '/notifications');
    });
  });

  describe('Effects', () => {
    it('should fetch notifications when opened', async () => {
      const fetchNotifications = vi.fn();
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: mockNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications,
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(fetchNotifications).toHaveBeenCalled();
      });
    });

    it('should re-fetch when maxNotifications changes', async () => {
      const fetchNotifications = vi.fn();
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: mockNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications,
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      const { rerender } = render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} maxNotifications={5} />
      );

      expect(fetchNotifications).toHaveBeenCalledTimes(1);

      rerender(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} maxNotifications={10} />
      );

      await waitFor(() => {
        expect(fetchNotifications).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Custom Props', () => {
    it('should accept custom maxNotifications', () => {
      const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        user_id: 1,
        notification_type: 'grade' as const,
        title: `Notification ${i}`,
        message: `Message ${i}`,
        is_read: false,
        priority: 'normal' as const,
        created_at: '2026-01-12T10:00:00Z',
        data: {},
        icon: null,
        read_at: null,
        deleted_at: null,
      }));

      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: true,
        notifications: manyNotifications,
        isLoading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        fetchNotifications: vi.fn(),
        refreshUnreadCount: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} maxNotifications={8} />
      );

      // Verify exactly 8 are rendered
      for (let i = 0; i < 8; i++) {
        expect(screen.getByTestId(`notification-item-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      const container = screen.getByRole('region');
      expect(container).toHaveAttribute('aria-label');
    });

    it('should have semantic HTML structure', () => {
      render(
        <NotificationDropdown isOpen={true} onClose={mockOnClose} />
      );

      // Should have heading
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });
});
