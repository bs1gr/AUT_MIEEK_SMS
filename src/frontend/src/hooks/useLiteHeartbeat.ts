import { useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/serverUrl';

/** How often an open page tells SMS Lite it is still there. Lite exits after 90 s without one. */
export const LITE_HEARTBEAT_INTERVAL_MS = 10_000;

// True once the server answered a beat: it is SMS Lite (others answer 404). The connection
// banner then says how to start SMS Lite again when it stops answering (plan todo 67).
let liteServer = false;
export const isLiteServer = (): boolean => liteServer;

const newPageId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Keeps an SMS Lite server alive while this page is open, logged in or not (owner's rule,
 * 2026-10-13: Lite exits 30 s after Logout, or once no SMS page is open).
 *
 * Runs on every page because a page cannot tell from its address whether the server is Lite:
 * phones and other PCs reach a Lite PC over the LAN. A server without the endpoint (Docker,
 * QNAP, the dev backend) answers 404 to the first beat, and the page stops there. Plain fetch,
 * not the API client, so a beat never touches the session or the offline/error handling.
 *
 * Plan todo 67 (the owner, 2026-11-22: "set 5 hours open"): a browser can slow down or freeze a
 * page in the background, and a frozen page sends nothing, so Lite stopped under a page that was
 * still open. Each beat now says which page it is and whether it is visible or in the
 * background; the page says so as it goes into the background (or is frozen) and when it is
 * closed. Lite counts a page in the background as open for up to 5 hours, and stops 30 s after
 * the last page is closed.
 */
export function useLiteHeartbeat(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return undefined;
    const base = `${getApiBaseUrl().replace(/\/$/, '')}/lite/heartbeat`;
    const page = newPageId();
    let stopped = false;

    const visibility = () => (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 'hidden' : 'visible');
    const urlFor = (state: string) => `${base}?page=${encodeURIComponent(page)}&state=${state}`;

    const beat = async (state: string = visibility(), keepalive = false) => {
      if (stopped) return;
      try {
        const response = await fetch(urlFor(state), { method: 'GET', cache: 'no-store', credentials: 'omit', keepalive });
        // Read the body: until it is read the browser keeps the request open, so the page never
        // goes network-idle (it broke every E2E wait for 'networkidle', 2026-10-13).
        await response.text().catch(() => undefined);
        if (response.status === 404) {
          stopped = true; // not an SMS Lite server
          window.clearInterval(timer);
        } else if (response.ok) {
          liteServer = true;
        }
      } catch {
        // Server not reachable right now: keep beating, it may be starting.
      }
    };

    const timer = window.setInterval(() => {
      if (!stopped) void beat();
    }, LITE_HEARTBEAT_INTERVAL_MS);
    void beat();

    // Into the background: say so before the browser slows the page down or freezes it; back
    // in front: beat at once. `freeze` comes when the browser freezes a page it had hidden.
    const onVisibility = () => { void beat(visibility(), visibility() === 'hidden'); };
    const onFreeze = () => { void beat('hidden', true); };
    // The tab or the browser is closed (a page kept for Back/Forward is not closed).
    const onPageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) void beat('closed', true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('freeze', onFreeze);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('freeze', onFreeze);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
