import axios from 'axios';
import { getItem, setItem, removeItem } from '@/utils/appStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const ACCESS_TOKEN_KEY = 'sms_access_token';
const LEGACY_ACCESS_TOKEN_KEY = 'access_token';

export const getAccessToken = (): string | null =>
  getItem(ACCESS_TOKEN_KEY) ?? getItem(LEGACY_ACCESS_TOKEN_KEY);

export const setAccessToken = (token: string | null) => {
  if (token) {
    setItem(ACCESS_TOKEN_KEY, token);
    setItem(LEGACY_ACCESS_TOKEN_KEY, token);
  } else {
    removeItem(ACCESS_TOKEN_KEY);
    removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }
};

export const clearAccessToken = () => setAccessToken(null);

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
  refreshAccessToken,
};
