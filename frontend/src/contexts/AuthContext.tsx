import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import authService from '@/services/authService';
import apiClient, { fetchMeWithRetry } from '@/api/api';

// Helper to fetch user with credentials (for test compatibility)
async function fetchMeWithCredentials() {
  const resp = await apiClient.get('/api/v1/auth/me', { withCredentials: true });
  return resp.data;
}

// Environment-driven flags (resolved at build time via Vite)
const env = (import.meta as { env?: Record<string, string | undefined> }).env || {};
const AUTO_LOGIN_ENABLED = (() => {
  const val = env.VITE_ENABLE_AUTO_LOGIN?.toLowerCase?.();
  return val === '1' || val === 'true' || val === 'yes';
})();
const DEFAULT_LOGIN_EMAIL = env.VITE_AUTO_LOGIN_EMAIL || '';
const DEFAULT_LOGIN_PASSWORD = env.VITE_AUTO_LOGIN_PASSWORD || '';

type User = {
  id: number;
  email: string;
  role?: string;
  [k: string]: unknown;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  updateUser: (updatedUser: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_USER_KEY = 'sms_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessTokenState] = useState<string | null>(authService.getAccessToken());
  // track whether we've attempted auto-login at mount time (ref to avoid effect deps)
  const autoLoginAttemptedRef = useRef(false);
  const initialUserRef = useRef(user);
  const initialAccessTokenRef = useRef(accessToken);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    authService.setAccessToken(accessToken);
  }, [accessToken]);

  // Always ensure isInitializing is set to false, even if auto-login is disabled or misconfigured
  useEffect(() => {
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    // If user exists but no token, preserve user. Token restoration is handled by manual login.
    if (initialUserRef.current && !initialAccessTokenRef.current) {
      setIsInitializing(false);
      return;
    } else if (initialUserRef.current && initialAccessTokenRef.current) {
      setIsInitializing(false);
      return;
    }

    // If auto-login is not enabled, skip and set initializing to false
    if (!AUTO_LOGIN_ENABLED) {
      setIsInitializing(false);
      return;
    }

    // If credentials are missing, skip and set initializing to false
    if (!DEFAULT_LOGIN_EMAIL || !DEFAULT_LOGIN_PASSWORD) {
      setIsInitializing(false);
      return;
    }

    // Otherwise, attempt auto-login as before
    let timeoutId: number | undefined;
    let mounted = true;
    const attemptAutoLogin = async () => {
      try {
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, 10000);
        const resp = await apiClient.post('/api/v1/auth/login', {
          email: DEFAULT_LOGIN_EMAIL,
          password: DEFAULT_LOGIN_PASSWORD,
        }, { withCredentials: true, signal: controller.signal });
        if (!mounted) return;
        const data = resp.data || {};
        if (data.access_token) {
          setAccessTokenState(data.access_token);
          authService.setAccessToken(data.access_token);
          let userPayload = data.user;
          if (!userPayload) {
            try {
              const meResp = await fetchMeWithRetry();
              userPayload = meResp;
            } catch {}
          }
          if (userPayload) {
            setUser(userPayload);
            try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
          }
        }
      } catch {
        // ignore errors, continue as guest
      } finally {
        if (mounted) setIsInitializing(false);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      }
    };
    attemptAutoLogin();
    return () => {
      mounted = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const url = '/api/v1/auth/login';
    console.info('[Auth] Attempting login', { url, email });
    const resp = await apiClient.post(url, { email, password }, { withCredentials: true });
    console.info('[Auth] Login response', resp);
    const data = resp.data || {};

    if (!data.access_token) {
      throw new Error((data && (data.detail || data.message)) || 'Login failed');
    }

    setAccessTokenState(data.access_token);
    authService.setAccessToken(data.access_token);

    let userPayload = data.user;
    if (!userPayload) {
      try {
        // For test compatibility, call /auth/me with credentials
        userPayload = await fetchMeWithCredentials();
      } catch {}
    }
    if (userPayload) {
      setUser(userPayload);
      try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
    }
  };

  const refresh = async (): Promise<boolean> => {
    const token = await authService.refreshAccessToken();
    if (token) {
      setAccessTokenState(token);
      return true;
    }
    await logout();
    return false;
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
    } catch {}
  };


  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', {}, { withCredentials: true });
    } catch {}
    setUser(null);
    setAccessTokenState(null);
    authService.clearAccessToken();
    try { localStorage.removeItem(LOCAL_USER_KEY); } catch {}
  };

  const value: AuthContextValue = {
    user,
    accessToken,
    isInitializing,
    login,
    logout,
    refresh,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
