/**
 * Local (offline) mode management.
 *
 * When local mode is enabled:
 *  - sms_local_mode = 'true' in appStorage
 *  - sms_server_url = '/api/v1'  (relative → intercepted by service worker)
 *  - sw-local-api.js service worker is registered
 *
 * The service worker intercepts all fetch calls to /api/v1/* on the same
 * origin and serves them from IndexedDB — no network required.
 */

import { setItem, removeItem, getItem } from './appStorage';
import { setServerUrl, setServerType, clearServerUrl } from './serverUrl';

const LOCAL_MODE_KEY = 'sms_local_mode';
const SW_PATH = '/sw-local-api.js';

export function isLocalModeEnabled(): boolean {
  return getItem(LOCAL_MODE_KEY) === 'true';
}

/** Register the local API service worker. */
async function registerLocalSW(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    // Wait for the SW to be active (handles the skipWaiting + claim lifecycle).
    // A 10-second timeout guards against the SW getting stuck in 'installing'
    // (e.g. install event that never resolves, or stale-file fetch hang).
    await Promise.race([
      new Promise<void>((resolve) => {
        if (reg.active) { resolve(); return; }
        const sw = reg.installing ?? reg.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', function handler() {
          if (this.state === 'activated') { sw.removeEventListener('statechange', handler); resolve(); }
        });
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('[localMode] SW activation timed out')), 10_000),
      ),
    ]);
    return true;
  } catch (err) {
    console.error('[localMode] SW registration failed:', err);
    return false;
  }
}

/** Unregister only the local API service worker (leaves Workbox/PWA SW alone). */
async function unregisterLocalSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const swUrl =
        reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
      if (swUrl.includes('sw-local-api')) await reg.unregister();
    }
  } catch {
    // ignore
  }
}

/**
 * Enable local (offline) mode.
 * Returns true if the service worker was registered successfully.
 */
export async function enableLocalMode(): Promise<boolean> {
  const ok = await registerLocalSW();
  if (ok) {
    setItem(LOCAL_MODE_KEY, 'true');
    setServerUrl('/api/v1');
    setServerType('offline');
  }
  return ok;
}

/** Disable local mode and remove the service worker. */
export async function disableLocalMode(): Promise<void> {
  removeItem(LOCAL_MODE_KEY);
  clearServerUrl();
  await unregisterLocalSW();
}

/**
 * If the app starts with local mode already stored, re-register the SW.
 * Call from main.tsx after initStorage() and before React renders.
 *
 * If registration fails (SW file missing, bridge broken, timeout), local mode
 * is cleared so ServerGuard redirects the user to /server-setup rather than
 * leaving them with /api/v1 requests that nothing intercepts.
 */
export async function restoreLocalModeIfNeeded(): Promise<void> {
  if (isLocalModeEnabled()) {
    const ok = await registerLocalSW();
    if (!ok) {
      removeItem(LOCAL_MODE_KEY);
      clearServerUrl();
    }
  }
}
