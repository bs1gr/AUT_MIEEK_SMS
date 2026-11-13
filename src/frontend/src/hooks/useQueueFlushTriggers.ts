import { useEffect, useRef } from 'react';
import { getDatabaseUnavailable, subscribeDatabaseAvailability } from '@/utils/databaseAvailability';

/** How often a non-empty offline queue retries while the page is open. */
export const QUEUE_RETRY_MS = 30_000;

/**
 * Runs an offline queue's `flush`: once when the page opens, when the browser comes back
 * online, when the server's database is reachable again, and every QUEUE_RETRY_MS. The timer
 * matters when only the server's database is down (Docker without QNAP): the browser stays
 * online, so no 'online' event ever fires. `flush` must return quickly when its queue is empty.
 *
 * Two things a caller does not have to take care of:
 * - `flush` may be a new function on every render. Only the latest one is called, and a new
 *   one does not start a flush by itself. (It used to: the Attendance page passes a function
 *   that changes on each render, so every render re-sent the whole queued sheet.)
 * - a flush that is still running is never joined by a second one. Sending a queue twice at
 *   the same time doubles the load on a server that is already too slow to answer.
 */
export function useQueueFlushTriggers(flush: () => Promise<void> | void, onMount?: () => void): void {
  const flushRef = useRef(flush);
  const onMountRef = useRef(onMount);
  const running = useRef(false);

  useEffect(() => {
    flushRef.current = flush;
    onMountRef.current = onMount;
  }, [flush, onMount]);

  useEffect(() => {
    onMountRef.current?.();
    const run = () => {
      if (running.current) return;
      const done = () => {
        running.current = false;
      };
      running.current = true;
      try {
        const result = flushRef.current();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).then(done, done);
        } else {
          done();
        }
      } catch {
        done();
      }
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
  }, []);
}
