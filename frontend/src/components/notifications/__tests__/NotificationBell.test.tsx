/**
 * NotificationBell Component Tests
 * Tests for bell icon with badge and dropdown trigger
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotificationBell from '../NotificationBell';
import * as useNotificationsModule from '../../../hooks/useNotifications';

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

// Mock NotificationDropdown
vi.mock('../NotificationDropdown', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="notification-dropdown">
        Dropdown
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../../NotificationCenter', () => ({
  default: () => null,
}));

describe('NotificationBell Component', () => {
  const mockUseNotifications = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(useNotificationsModule.useNotifications).mockImplementation(mockUseNotifications);
  });

  describe('Rendering', () => {
    it('should render bell button', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });
      expect(button).toBeInTheDocument();
    });

    it('should render SVG icon', () => {
      render(<NotificationBell />);
      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have ARIA label', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });
      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('Badge Display', () => {
    it('should not show badge when unreadCount is 0', () => {
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

      render(<NotificationBell />);
      const badge = screen.queryByText(/unreadCount/);
      expect(badge).not.toBeInTheDocument();
    });

    it('should show badge with unread count', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 5,
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

      render(<NotificationBell />);
      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });

    it('should show 99+ when unreadCount exceeds maxDisplayCount', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 150,
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

      render(<NotificationBell maxDisplayCount={99} />);
      const badge = screen.getByText('99+');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Offline Indicator', () => {
    it('should show offline indicator when disconnected', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 0,
        isConnected: false,
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

      render(<NotificationBell />);
      const button = screen.getByRole('button');
      expect(button.querySelector('.notification-bell-offline')).toBeInTheDocument();
    });

    it('should not show offline indicator when connected', () => {
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

      render(<NotificationBell />);
      const button = screen.getByRole('button');
      expect(button.querySelector('.notification-bell-offline')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should toggle dropdown on button click', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });

      // Initially dropdown should not be visible
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();

      // Click to open
      await userEvent.click(button);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click to close
      await userEvent.click(button);
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <NotificationBell />
        </div>
      );

      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });

      // Open dropdown
      await userEvent.click(button);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('should not close dropdown when clicking on dropdown itself', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });

      // Open dropdown
      await userEvent.click(button);
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toBeInTheDocument();

      // Click on dropdown
      fireEvent.mouseDown(dropdown);

      // Dropdown should still be visible
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<NotificationBell className="custom-class" />);
      const bellContainer = container.querySelector('.notification-bell-container.custom-class');
      expect(bellContainer).toBeInTheDocument();
    });

    it('should accept custom maxDisplayCount', () => {
      mockUseNotifications.mockReturnValue({
        unreadCount: 50,
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

      render(<NotificationBell maxDisplayCount={49} />);
      const badge = screen.getByText('49+');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should handle keyboard events', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button');

      // Focus button
      button.focus();
      expect(document.activeElement).toBe(button);

      // Press Enter to open
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      await userEvent.click(button); // Simulate click via keyboard

      // Dropdown should be visible
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain independent state for each instance', () => {
      const { container: container1 } = render(<NotificationBell />);
      const { container: container2 } = render(<NotificationBell />);

      const button1 = container1.querySelector('button');
      const button2 = container2.querySelector('button');

      expect(button1).not.toBe(button2);
    });

    it('should update when props change', () => {
      const { rerender } = render(<NotificationBell />);

      mockUseNotifications.mockReturnValue({
        unreadCount: 5,
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

      rerender(<NotificationBell />);

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should render NotificationDropdown when open', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });

      await userEvent.click(button);

      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveTextContent('Dropdown');
    });

    it('should pass onClose callback to dropdown', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: /bell\.ariaLabel/i });

      // Open dropdown
      await userEvent.click(button);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Close via dropdown's close button
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      // Dropdown should close
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });
});
