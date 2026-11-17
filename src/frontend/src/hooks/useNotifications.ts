/**
 * useNotifications Hook
 * Notifications over the REST API: the list, the unread count and the actions on them.
 *
 * One state for the whole page. The bell, the dropdown and every item in it use this hook,
 * and until November 2026 each of them got a copy of its own: an item marked as read stayed
 * unread in the dropdown's list, and the bell kept its count until it next asked the server.
 * The state now lives in this module, and every component that uses the hook reads it.
 *
 * There is no push channel. The Socket.IO connection this hook used to open carried no events
 * (nothing on the server ever emitted one) and was removed in November 2026.
 */

import { useEffect, useSyncExternalStore } from 'react';
import apiClient, { extractAPIResponseData } from '../api/api';
import authService from '../services/authService';
import type {
  Notification,
  NotificationListResponse,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from '../types/notification';

const MIN_FETCH_INTERVAL_MS = 3000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const IS_TEST_ENV =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
}

const INITIAL_STATE: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

let state: NotificationState = INITIAL_STATE;
const listeners = new Set<() => void>();

// Counts the resets. An answer that was asked for before a reset (a sign-out) belongs to the
// account that asked, and is dropped when it arrives.
let generation = 0;
let lastFetchAt = 0;
let fetchInFlight = false;
let rateLimitUntil = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

const update = (patch: Partial<NotificationState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

// Tokens are kept in memory only (see authService.ts) - no localStorage
// fallback here, so a stray localStorage write can never be silently
// trusted as a valid session.
const hasAccessToken = () => Boolean(authService.getAccessToken());
const getAccessToken = () => authService.getAccessToken();
const getErrorStatus = (err: unknown): number | null => {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return null;
  }
  const response = (err as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : null;
};

/**
 * Empty the shared state: at sign-out, so the next account never sees this one's list.
 */
export function resetNotifications(): void {
  generation += 1;
  lastFetchAt = 0;
  fetchInFlight = false;
  rateLimitUntil = 0;
  update(INITIAL_STATE);
}

/**
 * Take an unread count that another reader of the API was given (the "View all" window keeps
 * a list of its own, and every answer of the list endpoint carries the count).
 */
export function publishUnreadCount(count: unknown): void {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return;
  }
  const next = Math.max(0, count);
  if (next !== state.unreadCount) {
    update({ unreadCount: next });
  }
}

/**
 * Fetch notifications from API
 */
async function fetchNotifications(params?: {
  skip?: number;
  limit?: number;
  unread_only?: boolean;
}): Promise<void> {
  if (!IS_TEST_ENV && !hasAccessToken()) {
    update({ notifications: [], unreadCount: 0 });
    return;
  }
  if (fetchInFlight) {
    return;
  }
  if (!IS_TEST_ENV) {
    const now = Date.now();
    if (now < rateLimitUntil) {
      return;
    }
    if (now - lastFetchAt < MIN_FETCH_INTERVAL_MS) {
      return;
    }
  }
  const askedIn = generation;
  fetchInFlight = true;
  update({ isLoading: true, error: null });

  try {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.unread_only) queryParams.append('unread_only', 'true');

    const token = getAccessToken();
    const response = await apiClient.get<NotificationListResponse>('/notifications/', {
      params: Object.fromEntries(queryParams.entries()),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (askedIn !== generation) {
      return;
    }

    // Extract data from APIResponse wrapper
    const data = extractAPIResponseData(response.data);
    const normalizedData =
      data && typeof data === 'object' && 'data' in data
        ? (data as { data: unknown }).data
        : data;

    if (normalizedData && typeof normalizedData === 'object') {
      const typedData = normalizedData as unknown as {
        items?: Notification[];
        notifications?: Notification[];
        unread_count?: number;
      };
      const items = typedData.items ?? typedData.notifications ?? [];
      update({ notifications: items, unreadCount: typedData.unread_count || 0 });
    }
  } catch (err) {
    if (askedIn !== generation) {
      return;
    }
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      update({ notifications: [], unreadCount: 0 });
      return;
    }
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
    update({ error: new Error(errorMessage) });
    console.error('Failed to fetch notifications:', err);
    if (status === 429) {
      rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }
  } finally {
    if (askedIn === generation) {
      lastFetchAt = Date.now();
      fetchInFlight = false;
      update({ isLoading: false });
    }
  }
}

/**
 * Refresh unread count from API
 */
async function refreshUnreadCount(): Promise<void> {
  if (!IS_TEST_ENV && !hasAccessToken()) {
    update({ unreadCount: 0 });
    return;
  }
  const askedIn = generation;
  try {
    const token = getAccessToken();
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (askedIn !== generation) {
      return;
    }
    const data = extractAPIResponseData(response.data);
    const normalizedData =
      data && typeof data === 'object' && 'data' in data
        ? (data as { data: unknown }).data
        : data;

    if (normalizedData && typeof normalizedData === 'object' && 'unread_count' in normalizedData) {
      update({ unreadCount: (normalizedData as unknown as { unread_count: number }).unread_count });
    }
  } catch (err) {
    if (askedIn !== generation) {
      return;
    }
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      update({ unreadCount: 0 });
      return;
    }
    console.error('Failed to refresh unread count:', err);
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId: number): Promise<void> {
  if (!IS_TEST_ENV && !hasAccessToken()) {
    return;
  }
  try {
    await apiClient.post(`/notifications/${notificationId}/read`);

    // The count goes down only for an item that was unread: the same item can be marked
    // twice (its button, then a click on the item itself).
    const target = state.notifications.find((n) => n.id === notificationId);
    const wasUnread = target ? !target.is_read : true;
    update({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }
          : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    });
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    throw err;
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(): Promise<void> {
  if (!IS_TEST_ENV && !hasAccessToken()) {
    return;
  }
  try {
    await apiClient.post('/notifications/read-all');

    const readAt = new Date().toISOString();
    update({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? readAt,
      })),
      unreadCount: 0,
    });
  } catch (err) {
    console.error('Failed to mark all as read:', err);
    throw err;
  }
}

/**
 * Delete notification (soft delete)
 */
async function deleteNotification(notificationId: number): Promise<void> {
  if (!IS_TEST_ENV && !hasAccessToken()) {
    return;
  }
  try {
    await apiClient.delete(`/notifications/${notificationId}`);

    const target = state.notifications.find((n) => n.id === notificationId);
    update({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount:
        target && !target.is_read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    });
  } catch (err) {
    console.error('Failed to delete notification:', err);
    throw err;
  }
}

/**
 * The actions, for a component that keeps a list of its own (the "View all" window, with its
 * pages): what it marks or deletes goes through here, so the shared list and count follow.
 */
export const notificationActions = {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  fetchNotifications,
  refreshUnreadCount,
};

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { watchUnreadCount = false } = options;
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Keep the unread count current, for the component that shows it (the bell). It is read
  // when the component appears, and again when the browser comes back online or the page
  // becomes visible again: the moments at which the removed socket reconnected and did the
  // same. Off by default, because every NotificationItem uses this hook for its actions and
  // none of them needs to ask for the count.
  useEffect(() => {
    if (!watchUnreadCount) {
      return undefined;
    }

    const refresh = () => {
      void refreshUnreadCount();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const timeout = setTimeout(refresh, 0);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [watchUnreadCount]);

  return {
    // State
    notifications: current.notifications,
    unreadCount: current.unreadCount,
    isLoading: current.isLoading,
    error: current.error,

    // Actions
    ...notificationActions,
  };
}
