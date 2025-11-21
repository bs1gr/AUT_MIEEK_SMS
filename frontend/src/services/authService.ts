import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const ACCESS_TOKEN_KEY = 'sms_access_token';

// Initialize from localStorage if available
let accessToken: string | null = null;
try {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
} catch (e) {
  console.warn('[AuthService] Could not read from localStorage:', e);
}

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch (e) {
    console.warn('[AuthService] Could not write to localStorage:', e);
  }
};

export const clearAccessToken = () => {
  accessToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (e) {
    console.warn('[AuthService] Could not clear from localStorage:', e);
  }
};

// Refresh token storage: handled exclusively via HttpOnly cookies by the backend.

// Refresh tokens are stored as HttpOnly cookies by the backend for security.
// We do NOT persist refresh tokens in localStorage. The backend will read the
// cookie when /auth/refresh is called with credentials.

/**
 * Attempt to refresh the access token.
 * This will call the backend refresh endpoint. The backend may accept a cookie (HttpOnly)
 * or a refresh_token in the request body. If a refresh token exists in localStorage we send it
 * as a fallback.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    // Do not send refresh_token in the body. The backend will read the HttpOnly
    // cookie set at login. withCredentials must be true to include cookies.
    const url = (API_BASE_URL.endsWith('/')) ? `${API_BASE_URL}auth/refresh` : `${API_BASE_URL}/auth/refresh`;
    const resp = await axios.post(url, {}, { withCredentials: true });
    if (resp?.data?.access_token) {
      setAccessToken(resp.data.access_token);
      // backend may rotate refresh tokens and set a new HttpOnly cookie; no
      // client-side storage is required.
      return resp.data.access_token;
    }
    return null;
  } catch {
    // refresh failed
    clearAccessToken();
    return null;
  }
};

export default {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
};
