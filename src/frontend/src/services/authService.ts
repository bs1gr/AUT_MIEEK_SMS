import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Access token is kept in memory only — never written to localStorage.
// Refresh tokens live in an HttpOnly cookie managed by the backend.
// On page reload, AuthContext calls refreshAccessToken() to silently
// re-issue the access token using the HttpOnly cookie.
//
// E2E / headless test environments can pre-seed the token by writing
// localStorage['_sms_e2e_token'] before the module loads (e.g. via
// Playwright's page.addInitScript). The key is consumed once and deleted,
// so it has no effect on normal production usage.
let _token: string | null = (() => {
  try {
    const injected = typeof localStorage !== 'undefined' && localStorage.getItem('_sms_e2e_token');
    if (injected && typeof injected === 'string') {
      localStorage.removeItem('_sms_e2e_token');
      return injected;
    }
  } catch { /* ignore */ }
  return null;
})();

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

// Refresh tokens are stored as HttpOnly cookies by the backend.
// We do NOT persist refresh tokens in client storage.

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const url = API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}auth/refresh`
      : `${API_BASE_URL}/auth/refresh`;
    const resp = await axios.post(url, {}, { withCredentials: true });
    // Handle both direct format {access_token} and standardized APIResponse {data: {access_token}}
    const token = resp?.data?.access_token || resp?.data?.data?.access_token;
    if (token) {
      setAccessToken(token);
      return token;
    }
    return null;
  } catch {
    clearAccessToken();
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
