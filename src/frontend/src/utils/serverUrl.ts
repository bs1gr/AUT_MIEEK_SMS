const SERVER_URL_KEY = 'sms_server_url';

export function isCapacitorApp(): boolean {
  return typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined';
}

export function getStoredServerUrl(): string | null {
  try {
    return localStorage.getItem(SERVER_URL_KEY);
  } catch {
    return null;
  }
}

export function setServerUrl(url: string): void {
  try {
    const normalized = url.replace(/\/+$/, '');
    localStorage.setItem(SERVER_URL_KEY, normalized);
  } catch {
    // localStorage unavailable
  }
}

export function clearServerUrl(): void {
  try {
    localStorage.removeItem(SERVER_URL_KEY);
  } catch {
    // noop
  }
}

/** Returns the best available API base URL at runtime. */
export function getApiBaseUrl(): string {
  const stored = getStoredServerUrl();
  if (stored) return stored;
  const buildTime = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  return buildTime || '/api/v1';
}

/**
 * Returns true when the app needs the user to configure a server URL.
 * Only applies inside the Capacitor (Android) WebView when no URL has been
 * stored and there is no build-time VITE_API_URL baked in.
 */
export function needsServerSetup(): boolean {
  if (!isCapacitorApp()) return false;
  const stored = getStoredServerUrl();
  if (stored) return false;
  const buildTime = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  return !buildTime;
}
