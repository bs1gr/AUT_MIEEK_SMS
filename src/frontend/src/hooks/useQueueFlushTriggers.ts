import { useEffect } from 'react';
import { getDatabaseUnavailable, subscribeDatabaseAvailability } from '@/utils/databaseAvailability';

/** How often a non-empty offline queue retries while the page is open. */
export const QUEUE_RETRY_MS = 30_000;

/**
 * Runs an offline queue's `flush`: now, when the browser comes back online, when the
 * server's database is reachable again, and every QUEUE_RETRY_MS. The timer matters when
 * only the server's database is down (Docker without QNAP): the browser stays online, so
 * no 'online' event ever fires. `flush` must return quickly when its queue is empty.
 */
export function useQueueFlushTriggers(flush: () => Promise<void> | void, onMount?: () => void): void {
  useEffect(() => {
    onMount?.();
    const run = () => {
      void flush();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', run);
    }
    const unsubscribe = subscribeDatabaseAvailability(() => {
      if (!getDatabaseUnavailable()) run();
    });
    const timer = setInterval(run, QUEUE_RETRY_MS);

    if (typeof navigator === 'undefined' || navigator.onLine) {
      run();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', run);
      }
      unsubscribe();
      clearInterval(timer);
    };
  }, [flush, onMount]);
}
