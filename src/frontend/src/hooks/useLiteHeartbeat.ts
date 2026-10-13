import { useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/serverUrl';

/** How often an open page tells SMS Lite it is still there. Lite exits after 90 s without one. */
export const LITE_HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Keeps an SMS Lite server alive while this page is open, logged in or not (owner's rule,
 * 2026-10-13: Lite exits 30 s after Logout, or once no SMS page is open).
 *
 * Runs on every page because a page cannot tell from its address whether the server is Lite:
 * phones and other PCs reach a Lite PC over the LAN. A server without the endpoint (Docker,
 * QNAP, the dev backend) answers 404 to the first beat, and the page stops there. Plain fetch,
 * not the API client, so a beat never touches the session or the offline/error handling.
 */
export function useLiteHeartbeat(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return undefined;
    const url = `${getApiBaseUrl().replace(/\/$/, '')}/lite/heartbeat`;
    let stopped = false;

    const beat = async () => {
      try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'omit' });
        if (response.status === 404) {
          stopped = true; // not an SMS Lite server
          window.clearInterval(timer);
        }
      } catch {
        // Server not reachable right now: keep beating, it may be starting.
      }
    };

    const timer = window.setInterval(() => {
      if (!stopped) void beat();
    }, LITE_HEARTBEAT_INTERVAL_MS);
    void beat();

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);
}
