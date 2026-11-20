import axios from 'axios';
import { getApiBaseUrl } from '@/utils/serverUrl';
import {
  forgetNativeRefreshToken,
  getNativeRefreshToken,
  nativeSessionHeaders,
  rememberNativeRefreshToken,
  usesNativeSession,
} from '@/services/nativeSession';

// Access token is kept in memory only — never written to localStorage.
// Refresh tokens live in an HttpOnly cookie managed by the backend.
// On page reload, AuthContext calls refreshAccessToken() to silently
// re-issue the access token using the HttpOnly cookie.
let _token: string | null = null;

export const getAccessToken = (): string | null => _token;

export const setAccessToken = (token: string | null) => {
  _token = token;
};

export const clearAccessToken = () => {
  _token = null;
};

/** Remove legacy localStorage keys left by older app versions. */
export const clearLegacyTokens = () => {
  try { localStorage.removeItem('sms_access_token'); } catch { /* ignore */ }
  try { localStorage.removeItem('access_token'); } catch { /* ignore */ }
};

// In a browser the refresh token is an HttpOnly cookie that this code never sees. Only the
// Android app keeps it itself (services/nativeSession.ts), because its WebView cannot keep the
// cookie for the server's address.

export const refreshAccessToken = async (): Promise<string | null> => {
  const native = usesNativeSession();
  const stored = native ? getNativeRefreshToken() : null;
  if (native && !stored) {
    clearAccessToken();
    return null;
  }
  try {
    // The server the app was pointed at (Android), else the build's API base. A bare '/api/v1'
    // inside the app meant the app's own files (https://localhost), so no renewal ever reached
    // the server (seen in the cloud server's log, 2026-11-19).
    const base = getApiBaseUrl();
    const url = base.endsWith('/') ? `${base}auth/refresh` : `${base}/auth/refresh`;
    const resp = await axios.post(url, native ? { refresh_token: stored } : {}, {
      withCredentials: true,
      headers: nativeSessionHeaders(),
    });
    // Handle both direct format {access_token} and standardized APIResponse {data: {access_token}}
    const token = resp?.data?.access_token || resp?.data?.data?.access_token;
    if (token) {
      rememberNativeRefreshToken(resp?.data);
      setAccessToken(token);
      return token;
    }
    return null;
  } catch (err) {
    clearAccessToken();
    // A refused token is spent (revoked, expired or rotated); a server out of reach is not.
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (native && (status === 401 || status === 403)) {
      forgetNativeRefreshToken();
    }
    return null;
  }
};

export default {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  clearLegacyTokens,
  refreshAccessToken,
};
