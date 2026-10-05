/**
 * When a write goes to the offline queue instead of failing, and whether the server's
 * database is currently unreachable.
 *
 * Two situations keep changes on this device until they can be sent:
 * - the browser is offline, or a request got no response at all;
 * - the server is up but answers 503 DATABASE_UNAVAILABLE because it cannot reach its
 *   database (e.g. Docker while the QNAP NAS is unreachable). The browser stays "online"
 *   then, so the queues also retry on a timer and when the database comes back.
 */
import { useSyncExternalStore } from 'react';

export const DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE';

type ErrorLike = {
  code?: string;
  message?: string;
  request?: unknown;
  response?: { status?: number; data?: unknown };
};

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const response = (error as ErrorLike).response;
  if (response?.status !== 503) return false;
  const data = response.data as { error?: { code?: string } } | undefined;
  return data?.error?.code === DATABASE_UNAVAILABLE;
}

export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (typeof error !== 'object' || error === null) return false;
  if (isDatabaseUnavailableError(error)) return true;

  const maybeError = error as ErrorLike;
  const message = String(maybeError.message || '');
  return (
    maybeError.code === 'ERR_NETWORK' ||
    maybeError.response?.status === 0 ||
    (!maybeError.response && Boolean(maybeError.request)) ||
    /Network Error|Failed to fetch|offline/i.test(message)
  );
}

// Set by the API client: true on a 503 DATABASE_UNAVAILABLE, false on the next successful data request.
let databaseUnavailable = false;
const listeners = new Set<() => void>();

export function setDatabaseUnavailable(value: boolean): void {
  if (value === databaseUnavailable) return;
  databaseUnavailable = value;
  listeners.forEach((listener) => listener());
}

export function getDatabaseUnavailable(): boolean {
  return databaseUnavailable;
}

export function subscribeDatabaseAvailability(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDatabaseUnavailable(): boolean {
  return useSyncExternalStore(subscribeDatabaseAvailability, getDatabaseUnavailable, getDatabaseUnavailable);
}
