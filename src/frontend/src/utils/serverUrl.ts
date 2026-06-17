const SERVER_URL_KEY = 'sms_server_url';
const SERVER_TYPE_KEY = 'sms_server_type';

export type ServerType = 'qnap' | 'local' | 'cloud' | 'custom';

export function getServerType(): ServerType | null {
  try {
    return (localStorage.getItem(SERVER_TYPE_KEY) as ServerType) || null;
  } catch {
    return null;
  }
}

export function setServerType(type: ServerType): void {
  try {
    localStorage.setItem(SERVER_TYPE_KEY, type);
  } catch {
    // noop
  }
}

export function clearServerType(): void {
  try {
    localStorage.removeItem(SERVER_TYPE_KEY);
  } catch {
    // noop
  }
}

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
    localStorage.removeItem(SERVER_TYPE_KEY);
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
