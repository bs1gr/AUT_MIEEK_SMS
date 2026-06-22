import { getItem, setItem, removeItem } from './appStorage';

const SERVER_URL_KEY = 'sms_server_url';
const SERVER_TYPE_KEY = 'sms_server_type';
const LOCAL_MODE_KEY = 'sms_local_mode';

export type ServerType = 'qnap' | 'local' | 'cloud' | 'custom' | 'offline';

export function getServerType(): ServerType | null {
  try {
    return (getItem(SERVER_TYPE_KEY) as ServerType) || null;
  } catch {
    return null;
  }
}

export function setServerType(type: ServerType): void {
  try {
    setItem(SERVER_TYPE_KEY, type);
  } catch {
    // noop
  }
}

export function clearServerType(): void {
  try {
    removeItem(SERVER_TYPE_KEY);
  } catch {
    // noop
  }
}

export function isCapacitorApp(): boolean {
  return typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined';
}

export function isLocalMode(): boolean {
  return getItem(LOCAL_MODE_KEY) === 'true';
}

export function getStoredServerUrl(): string | null {
  try {
    return getItem(SERVER_URL_KEY);
  } catch {
    return null;
  }
}

export function setServerUrl(url: string): void {
  try {
    const normalized = url.replace(/\/+$/, '');
    setItem(SERVER_URL_KEY, normalized);
  } catch {
    // localStorage unavailable
  }
}

export function clearServerUrl(): void {
  try {
    removeItem(SERVER_URL_KEY);
    removeItem(SERVER_TYPE_KEY);
    removeItem(LOCAL_MODE_KEY);
  } catch {
    // noop
  }
}

/** Returns the best available API base URL at runtime. */
export function getApiBaseUrl(): string {
  // Local (offline) mode: use relative path — intercepted by service worker
  if (isLocalMode()) return '/api/v1';
  const stored = getStoredServerUrl();
  if (stored) return stored;
  const buildTime = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  return buildTime || '/api/v1';
}

/**
 * Returns true when the app needs the user to configure a server URL.
 * Applies inside the Capacitor WebView only, when no URL has been stored,
 * no build-time VITE_API_URL is baked in, and local mode is not active.
 */
export function needsServerSetup(): boolean {
  if (!isCapacitorApp()) return false;
  if (isLocalMode()) return false;
  const stored = getStoredServerUrl();
  if (stored) return false;
  const buildTime = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  return !buildTime;
}
