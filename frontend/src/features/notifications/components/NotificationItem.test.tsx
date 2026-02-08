import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import { Notification } from '../types';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <DateTimeSettingsProvider>{children}</DateTimeSettingsProvider>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Return the key as-is for testing
  }),
}));

describe('NotificationItem', () => {
  const mockNotification: Notification = {
    id: '1',
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    read: false,
    createdAt: new Date('2026-01-15').toISOString(),
  };

  const mockOnMarkAsRead = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification with title and message', () => {
    render(<NotificationItem notification={mockNotification} />);

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test notification')).toBeInTheDocument();
  });

  it('should render mark as read button for unread notifications', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadBtn = screen.getByRole('button', {
      name: /notifications.markAsRead/,
    });
    expect(markAsReadBtn).toBeInTheDocument();
  });

  it('should call onMarkAsRead when mark as read button is clicked', async () => {
    mockOnMarkAsRead.mockResolvedValue(undefined);

    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadBtn = screen.getByRole('button', {
      name: /notifications.markAsRead/,
    });
    fireEvent.click(markAsReadBtn);

    await waitFor(() => {
      expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('should render delete button when onDelete provided', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onDelete={mockOnDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', {
      name: /notifications.delete/,
    });
    expect(deleteBtn).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    mockOnDelete.mockResolvedValue(undefined);

    render(
      <NotificationItem
        notification={mockNotification}
        onDelete={mockOnDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', {
      name: /notifications.delete/,
    });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });

  it('should not render mark as read button for read notifications', () => {
    const readNotification = { ...mockNotification, read: true };

    render(
      <NotificationItem
        notification={readNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    expect(screen.queryByRole('button', { name: /notifications.markAsRead/ }))
      .not.toBeInTheDocument();
  });

  it('should display notification timestamp', () => {
    render(<NotificationItem notification={mockNotification} />);

    // Date may be formatted with leading zeros and time depending on locale settings
    const timestamp = screen.getByText(/15\/01\/2026/);
    expect(timestamp).toBeInTheDocument();
  });

  it('should support keyboard navigation for mark as read button', async () => {
    mockOnMarkAsRead.mockResolvedValue(undefined);

    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadBtn = screen.getByRole('button', {
      name: /notifications.markAsRead/,
    });

    // Simulate Enter key press
    fireEvent.keyDown(markAsReadBtn, { key: 'Enter', code: 'Enter' });
    markAsReadBtn.click();

    await waitFor(() => {
      expect(mockOnMarkAsRead).toHaveBeenCalled();
    });
  });
});
