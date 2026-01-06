/**
 * NotificationBell Component Tests
 * Tests bell icon, unread count badge, and notification center opening
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { NotificationBell } from '../NotificationBell';
import { LanguageProvider } from '../../LanguageContext';
import api from '../../api/api';

// Mock WebSocket hook to avoid real connections and spurious refetches
vi.mock('../../services/notificationWebSocket', () => ({
  useNotificationWebSocket: () => ({
    isConnected: false,
    notifications: [],
  }),
}));

// Mock API module
vi.mock('../../api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock NotificationCenter component
vi.mock('../NotificationCenter', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="notification-center">
      {isOpen && (
        <>
          <div>Notification Center Open</div>
          <button onClick={onClose}>Close Center</button>
        </>
      )}
    </div>
  ),
}));

// Mock translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
        refetchIntervalInBackground: true,
      },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );

  return { ...renderResult, queryClient };
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 0 } });
    focusManager.setFocused(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when no authToken provided', () => {
      renderWithProviders(<NotificationBell />);

      expect(screen.queryByTitle('Notifications')).not.toBeInTheDocument();
    });

    it('should render bell icon when authToken provided', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 0 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });
    });

    it('should render without unread badge when count is 0', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 0 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show unread count badge when count > 0', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 5 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should show 99+ badge when unread count exceeds 99', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 150 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });

    it('should display exact count when between 1 and 99', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 42 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch unread count on mount', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 3 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      });
    });

    it('should not fetch when authToken is not provided', () => {
      renderWithProviders(<NotificationBell />);

      expect(api.get).not.toHaveBeenCalled();
    });

    it('should refetch unread count every 30 seconds', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 1 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      // Manually trigger refetch (simulating 30s interval)
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['unreadNotificationCount'] });
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch when window regains focus', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 2 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      // Simulate window focus event
      window.dispatchEvent(new Event('focus'));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Notification Center Toggle', () => {
    it('should open notification center when bell is clicked', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 3 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      // Click the bell button
      fireEvent.click(screen.getByTitle('Notifications'));

      await waitFor(() => {
        expect(screen.getByText('Notification Center Open')).toBeInTheDocument();
      });
    });

    it('should close notification center when close is triggered', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 1 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      // Open the notification center
      fireEvent.click(screen.getByTitle('Notifications'));

      await waitFor(() => {
        expect(screen.getByText('Notification Center Open')).toBeInTheDocument();
      });

      // Close the notification center
      fireEvent.click(screen.getByText('Close Center'));

      await waitFor(() => {
        expect(screen.queryByText('Notification Center Open')).not.toBeInTheDocument();
      });
    });

    it('should refetch unread count when notification center closes', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: { unread_count: 5 } })
        .mockResolvedValueOnce({ data: { unread_count: 2 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Open notification center
      fireEvent.click(screen.getByTitle('Notifications'));

      await waitFor(() => {
        expect(screen.getByText('Notification Center Open')).toBeInTheDocument();
      });

      // Close notification center (should trigger refetch)
      fireEvent.click(screen.getByText('Close Center'));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Unread Count Updates', () => {
    it('should update badge when unread count changes', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: { unread_count: 3 } })
        .mockResolvedValueOnce({ data: { unread_count: 7 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      // Manually trigger refetch (simulating 30s interval)
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['unreadNotificationCount'] });
      });

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument();
      });
    });

    it('should remove badge when unread count becomes 0', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: { unread_count: 5 } })
        .mockResolvedValueOnce({ data: { unread_count: 0 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Manually trigger refetch (simulating 30s interval)
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['unreadNotificationCount'] });
      });

      await waitFor(() => {
        expect(screen.queryByText('5')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      // Component should still render without crashing
      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      // Should show no badge when error occurs
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('should recover from errors on retry', async () => {
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { unread_count: 4 } });

      const { queryClient } = renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      // Manually trigger refetch (simulating 30s interval)
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['unreadNotificationCount'] });
      });

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });
  });

  describe('Button Styling', () => {
    it('should have correct hover styles', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 0 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        const button = screen.getByTitle('Notifications');
        expect(button).toHaveClass('hover:text-gray-900');
        expect(button).toHaveClass('hover:bg-gray-100');
      });
    });

    it('should display red badge with correct styling', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 10 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('10');
        expect(badge).toHaveClass('bg-red-600');
        expect(badge).toHaveClass('text-white');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible title attribute', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 0 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        const button = screen.getByTitle('Notifications');
        expect(button).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 2 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        const button = screen.getByTitle('Notifications');
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { unread_count: 1 } });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderWithProviders(
        <NotificationBell authToken="test-token" />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Notifications')).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    });
  });

  describe('Multiple Badge Scenarios', () => {
    it('should display single digit correctly', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 1 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('1');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should display double digits correctly', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 42 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('42');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should display 99 exactly', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 99 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('99');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should display 99+ for 100', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 100 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('99+');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should display 99+ for very large numbers', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { unread_count: 9999 } });

      renderWithProviders(<NotificationBell authToken="test-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        const badge = screen.getByText('99+');
        expect(badge).toBeInTheDocument();
      });
    });
  });
});
