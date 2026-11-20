/**
 * The Android app's own session renewal.
 *
 * The app is served from https://localhost and talks to the server at another address, so its
 * WebView neither keeps nor sends the server's SameSite=Lax refresh cookie: until 2026-11 every
 * restart of the app, and every expiry of the 30-minute access token, led back to the sign-in
 * page. The app now asks the server for the refresh token in the body (header below; the server
 * answers it only to the app's own origin) and keeps it in the app's private storage, which is
 * Capacitor Preferences (Android SharedPreferences; the app's backups are switched off).
 *
 * Browsers and SMS Lite are untouched: there the HttpOnly cookie stays the only copy.
 */
import { getItem, removeItem, setItem } from '@/utils/appStorage';
import { isCapacitorApp, isLocalMode } from '@/utils/serverUrl';

export const NATIVE_SESSION_HEADER = 'X-SMS-Native-Session';
export const NATIVE_REFRESH_KEY = 'sms_native_refresh_v1';

/** True inside the Android app when it talks to a server (not the offline local mode). */
export function usesNativeSession(): boolean {
  try {
    return isCapacitorApp() && !isLocalMode();
  } catch {
    return false;
  }
}

/** Headers that ask the server for the refresh token in the body (app only). */
export function nativeSessionHeaders(): Record<string, string> {
  return usesNativeSession() ? { [NATIVE_SESSION_HEADER]: '1' } : {};
}

export function getNativeRefreshToken(): string | null {
  if (!usesNativeSession()) return null;
  try {
    return getItem(NATIVE_REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Keeps the refresh token from a login or refresh answer, when the server sent one. */
export function rememberNativeRefreshToken(body: unknown): void {
  if (!usesNativeSession()) return;
  const data = body as { refresh_token?: unknown; data?: { refresh_token?: unknown } } | null;
  const token = data?.refresh_token ?? data?.data?.refresh_token;
  if (typeof token === 'string' && token) {
    try {
      setItem(NATIVE_REFRESH_KEY, token);
    } catch {
      // storage unavailable: the session then lasts as long as the access token
    }
  }
}

export function forgetNativeRefreshToken(): void {
  try {
    removeItem(NATIVE_REFRESH_KEY);
  } catch {
    // ignore
  }
}
