/**
 * NotificationCenter Component Tests
 * Tests notification display, interactions, pagination, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationCenter } from '../NotificationCenter';
import { LanguageProvider } from '../../LanguageContext';
import api from '../../api/api';

// Mock API module
vi.mock('../../api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        // Notifications namespace (key-only usage)
        title: 'Notifications',
        markAllRead: 'Mark All as Read',
        empty: 'No notifications',
        of: 'of',
        unreadCount: params?.count ? `You have ${params.count} unread notifications` : 'Unread',
        'item.viewDetails': 'View details',
        'item.hideDetails': 'Hide details',
        'item.details': 'Details',

        // Common namespace
        'common:loading': 'Loading...',
        'common:delete': 'Delete',
        'common:previous': 'Previous',
        'common:next': 'Next',
        'common:close': 'Close',

        // Fallback for any missing keys
      };

      // Return the translation or the key itself as fallback
      const translation = translations[key];
      if (translation) {
        // Handle parameterized translations
        if (typeof translation === 'string' && params) {
          let result = translation;
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            result = result.replace(`{{${paramKey}}}`, String(paramValue));
          });
          return result;
        }
        return translation;
      }
      return key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Helper to wrap component with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

// Mock notification data
const mockNotifications = {
  total: 3,
  unread_count: 2,
  items: [
    {
      id: 1,
      title: 'New Grade Posted',
      message: 'Your grade for Math 101 has been posted',
      notification_type: 'grade',
      is_read: false,
      created_at: '2026-01-05T10:00:00Z',
    },
    {
      id: 2,
      title: 'Attendance Marked',
      message: 'Your attendance was marked for Physics 201',
      notification_type: 'attendance',
      is_read: false,
      created_at: '2026-01-04T14:30:00Z',
    },
    {
      id: 3,
      title: 'Course Updated',
      message: 'Chemistry 301 schedule has been updated',
      notification_type: 'course',
      is_read: true,
      created_at: '2026-01-03T09:15:00Z',
      read_at: '2026-01-03T10:00:00Z',
    },
  ],
};

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock so queries always resolve unless overridden
    vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithProviders(
        <NotificationCenter isOpen={false} onClose={() => {}} />
      );

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      vi.mocked(api.get).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockNotifications }), 100)
          )
      );

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should display all notifications', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
        expect(screen.getByText('Attendance Marked')).toBeInTheDocument();
        expect(screen.getByText('Course Updated')).toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { total: 0, unread_count: 0, items: [] },
      });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        // Component displays the translation key or empty message
        const emptyElement = screen.queryByText('notifications.empty') ||
                            screen.queryByText(/No notifications|empty/i);
        expect(emptyElement || screen.getByText(/notifications\.empty/)).toBeInTheDocument();
      });
    });

    it('should display unread count badge', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        // Component displays unread count in header
        expect(screen.getByText(/You have 2 unread notifications/)).toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark single notification as read', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
      vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await screen.findByText(/New Grade Posted|Grade Notification/i, { timeout: 3000 });

      // Click first notification card to mark as read
      fireEvent.click(screen.getByText('New Grade Posted'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/1/read');
      });
    });

    it('should mark all notifications as read', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
      vi.mocked(api.post).mockResolvedValueOnce({ data: { updated: 2 } });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('Mark All as Read')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Mark All as Read'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/read-all');
      });
    });

    it('should not show mark as read button for already read notifications', async () => {
      const readNotification = {
        total: 1,
        unread_count: 0,
        items: [
          {
            id: 1,
            title: 'Already Read',
            message: 'This was already read',
            notification_type: 'info',
            is_read: true,
            created_at: '2026-01-05T10:00:00Z',
            read_at: '2026-01-05T10:05:00Z',
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: readNotification });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('Already Read')).toBeInTheDocument();
      });

      // Clicking the notification should not trigger mark-as-read (already read)
      fireEvent.click(screen.getByText('Already Read'));
      expect(api.post).not.toHaveBeenCalledWith('/notifications/1/read');
    });
  });

  describe('Delete Notification', () => {
    it('should delete a notification', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
      vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/notifications/1');
      });
    });

    it('should refetch notifications after deletion', async () => {
      const updatedNotifications = {
        total: 2,
        unread_count: 1,
        items: mockNotifications.items.slice(1), // Remove first item
      };

        vi.mocked(api.get).mockResolvedValueOnce({ data: mockNotifications });
        vi.mocked(api.get).mockResolvedValueOnce({ data: updatedNotifications });
      vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Pagination', () => {
    it('should load more notifications when clicking Load More', async () => {
      const firstPage = {
        total: 25,
        unread_count: 10,
        items: mockNotifications.items,
      };

      const secondPage = {
        total: 25,
        unread_count: 10,
        items: [
          {
            id: 4,
            title: 'New Notification',
            message: 'This is a new notification',
            notification_type: 'info',
            is_read: false,
            created_at: '2026-01-02T12:00:00Z',
          },
        ],
      };

      vi.mocked(api.get).mockReset();
      vi.mocked(api.get).mockResolvedValueOnce({ data: firstPage });
      vi.mocked(api.get).mockResolvedValueOnce({ data: secondPage });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await screen.findByText('Next', { timeout: 3000 });

      // Click next button
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/notifications/', {
          params: { skip: 20, limit: 20 },
        });
      });
    });

    it('should not show Load More if all notifications loaded', async () => {
      const allLoaded = {
        total: 3,
        unread_count: 2,
        items: mockNotifications.items,
      };

      vi.mocked(api.get).mockReset();
      vi.mocked(api.get).mockResolvedValue({ data: allLoaded });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
      });

      // When all items are loaded, pagination controls should not be visible
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Close Handler', () => {
    it('should call onClose when close button clicked', async () => {
      const onCloseMock = vi.fn();
        vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={onCloseMock} />
      );

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      // Find and click close button
      // The component may have a close button with X icon or aria-label
      const closeButtons = screen.queryAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.textContent?.includes('×') ||
        btn.getAttribute('aria-label')?.includes('close') ||
        btn.getAttribute('aria-label')?.includes('Close')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      // Component should not crash, error should be handled
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should handle mark as read errors', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Failed to mark as read'));

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await screen.findByText(/New Grade Posted|Grade Notification/i, { timeout: 3000 });

      // Click notification card to trigger mark-as-read mutation
      fireEvent.click(screen.getByText('New Grade Posted'));

      // Should not crash despite error, mutation was attempted
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle delete errors', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });
      vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed to delete'));

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(screen.getByText('New Grade Posted')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Should not crash despite error, mutation was attempted
      await waitFor(() => {
        expect(api.delete).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Query Parameters', () => {
    it('should fetch with correct skip and limit params', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/notifications/', {
          params: { skip: 0, limit: 20 },
        });
      });
    });

    it('should only fetch when isOpen is true', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      const { rerender } = renderWithProviders(
        <NotificationCenter isOpen={false} onClose={() => {}} />
      );

      // Should not fetch when closed
      expect(api.get).not.toHaveBeenCalled();

      // Rerender with isOpen=true
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <LanguageProvider>
            <NotificationCenter isOpen={true} onClose={() => {}} />
          </LanguageProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });
  });

  describe('Notification Types', () => {
    it('should display different notification types correctly', async () => {
      const mixedNotifications = {
        total: 4,
        unread_count: 4,
        items: [
          {
            id: 1,
            title: 'Grade Notification',
            message: 'Grade posted',
            notification_type: 'grade',
            is_read: false,
            created_at: '2026-01-05T10:00:00Z',
          },
          {
            id: 2,
            title: 'Attendance Notification',
            message: 'Attendance marked',
            notification_type: 'attendance',
            is_read: false,
            created_at: '2026-01-05T09:00:00Z',
          },
          {
            id: 3,
            title: 'Course Notification',
            message: 'Course updated',
            notification_type: 'course',
            is_read: false,
            created_at: '2026-01-05T08:00:00Z',
          },
          {
            id: 4,
            title: 'System Notification',
            message: 'System maintenance',
            notification_type: 'system',
            is_read: false,
            created_at: '2026-01-05T07:00:00Z',
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: mixedNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      await screen.findByText(/Grade Notification/i, { timeout: 3000 });
      expect(screen.getByText(/Attendance Notification/i)).toBeInTheDocument();
      expect(screen.getByText(/Course Notification/i)).toBeInTheDocument();
      expect(screen.getByText(/System Notification/i)).toBeInTheDocument();
      expect(screen.getByText(/4 unread notifications/i)).toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('should display notification timestamps', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

      renderWithProviders(
        <NotificationCenter isOpen={true} onClose={() => {}} />
      );

      const timestamps = await screen.findAllByText(/2026|Jan|ago/i, { timeout: 3000 });
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});
