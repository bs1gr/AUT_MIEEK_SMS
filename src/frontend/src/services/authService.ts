import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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

// Refresh tokens are stored as HttpOnly cookies by the backend.
// We do NOT persist refresh tokens in client storage.

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const url = API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}auth/refresh`
      : `${API_BASE_URL}/auth/refresh`;
    const resp = await axios.post(url, {}, { withCredentials: true });
    if (resp?.data?.access_token) {
      setAccessToken(resp.data.access_token);
      return resp.data.access_token;
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
