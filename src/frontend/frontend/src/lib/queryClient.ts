import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/**
 * Configures the QueryClient with offline persistence.
 * Uses localStorage to persist query cache between sessions.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (time until inactive query data is removed from cache)
      staleTime: 1000 * 60 * 5, // 5 minutes (time until query data is considered stale)
      retry: 1,
      networkMode: 'offlineFirst', // Enable offline support
    },
  },
});

// Create a persister using localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

// Initialize persistence
export const initQueryClient = () => {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: 'v1.0.0', // Increment this to bust the cache on updates
  });
  return queryClient;
};

export default queryClient;
