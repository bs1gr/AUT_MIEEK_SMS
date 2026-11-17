/**
 * The bell, the dropdown, its items and the "View all" window, together and unmocked.
 *
 * The other notification tests replace `useNotifications` by a mock, one component at a time,
 * so none of them could see that every component had a copy of the state of its own: an item
 * marked as read stayed unread in the list, and the bell kept its count. Here only the HTTP
 * client is replaced, by a small server that remembers what it was told.
 */

import React from 'react';
import { render, renderHook, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import NotificationBell from '../NotificationBell';
import { resetNotifications, useNotifications } from '../../../hooks/useNotifications';
import apiClient from '../../../api/api';
import { DateTimeSettingsProvider } from '../../../contexts/DateTimeSettingsContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

interface ServerNotification {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
  created_at: string;
  data: null;
}

let server: ServerNotification[] = [];
let getSpy: ReturnType<typeof vi.spyOn>;

const notice = (id: number, isRead = false): ServerNotification => ({
  id,
  user_id: 1,
  notification_type: 'system',
  title: `Notice ${id}`,
  message: `Message ${id}`,
  is_read: isRead,
  priority: 'normal',
  created_at: '2026-11-17T08:00:00Z',
  data: null,
});

const unreadOnServer = () => server.filter((n) => !n.is_read).length;
const answer = (data: unknown) => ({ data: { success: true, data, meta: { request_id: 't' } } });
const listRequests = () => getSpy.mock.calls.filter(([url]) => url === '/notifications/').length;
const countRequests = () =>
  getSpy.mock.calls.filter(([url]) => url === '/notifications/unread-count').length;

const renderBell = () => {
  // The application's own setting: a list counts as fresh for five minutes.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DateTimeSettingsProvider>
        <NotificationBell />
      </DateTimeSettingsProvider>
    </QueryClientProvider>
  );
};

const badge = () => document.querySelector('.notification-bell-badge');
const bellButton = () => document.querySelector('.notification-bell-button') as HTMLElement;
const dropdownItems = () => Array.from(document.querySelectorAll('.notification-item'));
const unreadDropdownItems = () => dropdownItems().filter((el) => el.classList.contains('unread'));

const openDropdown = async (expectedItems: number) => {
  fireEvent.click(bellButton());
  await waitFor(() => expect(dropdownItems()).toHaveLength(expectedItems));
};

describe('Notifications: one state for the bell, the dropdown and the window', () => {
  beforeEach(() => {
    resetNotifications();
    localStorage.clear();
    server = [notice(1), notice(2), notice(3, true)];

    getSpy = vi.spyOn(apiClient, 'get').mockImplementation((async (url: string) => {
      if (url === '/notifications/unread-count') {
        return answer({ unread_count: unreadOnServer() });
      }
      if (url === '/notifications/') {
        return answer({
          items: server.map((n) => ({ ...n })),
          total: server.length,
          unread_count: unreadOnServer(),
        });
      }
      throw new Error(`unexpected GET ${url}`);
    }) as never);

    vi.spyOn(apiClient, 'post').mockImplementation((async (url: string) => {
      if (url === '/notifications/read-all') {
        server = server.map((n) => ({ ...n, is_read: true }));
        return answer(null);
      }
      const match = /^\/notifications\/(\d+)\/read$/.exec(url);
      if (match) {
        server = server.map((n) => (n.id === Number(match[1]) ? { ...n, is_read: true } : n));
        return answer(null);
      }
      throw new Error(`unexpected POST ${url}`);
    }) as never);

    vi.spyOn(apiClient, 'delete').mockImplementation((async (url: string) => {
      const match = /^\/notifications\/(\d+)$/.exec(url);
      if (match) {
        server = server.filter((n) => n.id !== Number(match[1]));
        return answer(null);
      }
      throw new Error(`unexpected DELETE ${url}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the server\'s unread count on the bell', async () => {
    renderBell();

    await waitFor(() => expect(badge()).toHaveTextContent('2'));
  });

  it('marks an item as read in the list and on the bell at once, without asking again', async () => {
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));
    await openDropdown(3);
    expect(unreadDropdownItems()).toHaveLength(2);
    const lists = listRequests();
    const counts = countRequests();

    fireEvent.click(screen.getAllByRole('button', { name: /Mark as read/ })[0]);

    await waitFor(() => expect(badge()).toHaveTextContent('1'));
    expect(unreadDropdownItems()).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Mark as read/ })).toHaveLength(1);
    expect(server.find((n) => n.id === 1)?.is_read).toBe(true);
    expect(listRequests()).toBe(lists);
    expect(countRequests()).toBe(counts);
  });

  it('takes a deleted item out of the list and off the bell', async () => {
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));
    await openDropdown(3);

    fireEvent.click(screen.getAllByRole('button', { name: /Delete notification/ })[1]);

    await waitFor(() => expect(dropdownItems()).toHaveLength(2));
    expect(badge()).toHaveTextContent('1');
    expect(screen.queryByText('Notice 2')).not.toBeInTheDocument();
    expect(server.map((n) => n.id)).toEqual([1, 3]);
  });

  it('removes the bell\'s badge when the dropdown marks all as read', async () => {
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));
    await openDropdown(3);

    fireEvent.click(screen.getByRole('button', { name: 'dropdown.markAllRead' }));

    await waitFor(() => expect(badge()).not.toBeInTheDocument());
    expect(unreadDropdownItems()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'dropdown.markAllRead' })).not.toBeInTheDocument();
  });

  it('follows what the "View all" window does', async () => {
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));
    await openDropdown(3);

    fireEvent.click(screen.getByRole('button', { name: 'dropdown.viewAll' }));
    const markAll = await screen.findByRole('button', { name: 'markAllRead' });
    fireEvent.click(markAll);

    await waitFor(() => expect(badge()).not.toBeInTheDocument());
    expect(unreadOnServer()).toBe(0);
  });

  it('gives the dropdown\'s list what the "View all" window marks and deletes', async () => {
    // A second user of the hook stands for the dropdown, which is closed while the window
    // is open: the list it will show next must already hold the window's changes.
    const shared = renderHook(() => useNotifications());
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));
    await openDropdown(3);
    fireEvent.click(screen.getByRole('button', { name: 'dropdown.viewAll' }));
    const windowList = await waitFor(() => {
      const el = document.querySelector('.fixed.inset-0');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    await within(windowList).findByText('Notice 1');
    const dropdownLists = listRequests();

    // Opening an unread notice marks it as read.
    fireEvent.click(within(windowList).getByText('Notice 1'));
    await waitFor(() => expect(badge()).toHaveTextContent('1'));
    expect(shared.result.current.notifications.find((n) => n.id === 1)?.is_read).toBe(true);

    // Deleting the other unread one.
    fireEvent.click(within(windowList).getAllByRole('button', { name: 'common:delete' })[1]);
    await waitFor(() => expect(badge()).not.toBeInTheDocument());
    expect(shared.result.current.notifications.map((n) => n.id)).toEqual([1, 3]);
    expect(shared.result.current.unreadCount).toBe(0);

    // The window asked for its own list again after each action, and for nothing else.
    expect(listRequests()).toBe(dropdownLists + 2);
  });

  it('asks for the list again each time the "View all" window opens', async () => {
    renderBell();
    await waitFor(() => expect(badge()).toHaveTextContent('2'));

    // First opening: two unread.
    await openDropdown(3);
    fireEvent.click(screen.getByRole('button', { name: 'dropdown.viewAll' }));
    await screen.findByText('unreadCount');
    const afterFirstOpening = listRequests();
    fireEvent.click(screen.getByRole('button', { name: '×' }));

    // Both marked as read in the dropdown, seconds later.
    await openDropdown(3);
    fireEvent.click(screen.getByRole('button', { name: 'dropdown.markAllRead' }));
    await waitFor(() => expect(badge()).not.toBeInTheDocument());

    // Second opening: the window shows the list as it is now, not the one it kept.
    const beforeSecondOpening = listRequests();
    fireEvent.click(screen.getByRole('button', { name: 'dropdown.viewAll' }));
    await waitFor(() => expect(listRequests()).toBe(beforeSecondOpening + 1));
    await waitFor(() => expect(screen.queryByText('unreadCount')).not.toBeInTheDocument());
    expect(afterFirstOpening).toBeGreaterThan(0);
    const windowList = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(within(windowList).getByText('Notice 1')).toBeInTheDocument();
  });
});
