import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import authService from '@/services/authService';
import apiClient from '@/api/api';

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
    // keep authService in sync
    authService.setAccessToken(accessToken);
  }, [accessToken]);

  // Optional auto-login on mount (disabled by default). Intentionally run once on mount.
  useEffect(() => {
    if (autoLoginAttemptedRef.current) {
      return;
    }
    autoLoginAttemptedRef.current = true;

    // If user exists but no token, preserve user. Token restoration is handled by manual login.
    if (initialUserRef.current && !initialAccessTokenRef.current) {
      setIsInitializing(false);
      return;
    } else if (initialUserRef.current && initialAccessTokenRef.current) {
      // User and token exist - finish init
      setIsInitializing(false);
      return;
    }

    // Auto-login is opt-in via VITE_ENABLE_AUTO_LOGIN; skip by default in production.
    if (!AUTO_LOGIN_ENABLED) {
      setIsInitializing(false);
      return;
    }

    // Require explicit credentials for auto-login; otherwise skip to avoid 400s.
    if (!DEFAULT_LOGIN_EMAIL || !DEFAULT_LOGIN_PASSWORD) {
      setIsInitializing(false);
      return;
    }
    let timeoutId: number | undefined;
    let mounted = true;

    const attemptAutoLogin = async () => {
      try {
        // Timeout after 10 seconds - give it time to complete (increased from 5s for slow first startup)
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, 10000);
        const resp = await apiClient.post('/auth/login', {
          email: DEFAULT_LOGIN_EMAIL,
          password: DEFAULT_LOGIN_PASSWORD,
        }, { withCredentials: true, signal: controller.signal });

        if (!mounted) {
          return;
        }

        const data = resp.data || {};

        if (data.access_token) {
          setAccessTokenState(data.access_token);
          authService.setAccessToken(data.access_token);

          // Get user data - either from response or fetch separately
          let userPayload = data.user;
          if (!userPayload) {
            try {
              const meResp = await fetchMeWithRetry();
              userPayload = meResp;
            } catch (err) {
              // Continue anyway - we have the token
            }
          }

          if (userPayload) {
            setUser(userPayload);
            try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
          }
        }
      } catch (err) {
        // Auto-login failed - auth disabled, timeout, or wrong credentials
        // This is expected behavior, just continue as guest
        if (!mounted) return;
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      }
    };

    attemptAutoLogin();

    return () => {
      console.warn('[Auth] Cleanup - mounted = false');
      mounted = false;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []); // Empty dependency - run only once on mount

  const login = async (email: string, password: string) => {
    const url = '/auth/login';
    const resp = await apiClient.post(url, { email, password }, { withCredentials: true });
    const data = resp.data || {};

    if (!data.access_token) {
      throw new Error((data && (data.detail || data.message)) || 'Login failed');
    }

    setAccessTokenState(data.access_token);
    authService.setAccessToken(data.access_token);

    let userPayload = data.user;
    if (!userPayload) {
      try {
        userPayload = await fetchMeWithRetry();
      } catch (err) {
        console.warn('[Auth] Failed to fetch user profile after login (after retries):', err);
        throw err instanceof Error ? err : new Error('Unable to load profile');
      }
    }

    if (userPayload) {
      setUser(userPayload);
      try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
    }
  };

  // Helper: fetch /auth/me with retry logic to tolerate backend cold-start or brief bootstrap races
  const fetchMeWithRetry = async (attempts = 5, initialDelayMs = 800): Promise<unknown> => {
    let lastErr: unknown = null;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const resp = await apiClient.get('/auth/me', { withCredentials: true });
        if (resp && resp.data) return resp.data;
        // If no data, treat as transient and retry
        lastErr = new Error('Empty /auth/me response');
      } catch (err) {
        lastErr = err;
      }
      // exponential backoff
      const delay = initialDelayMs * Math.pow(1.6, i);
      await new Promise<void>((res) => setTimeout(res, Math.round(delay)));
    }
    throw lastErr ?? new Error('Failed to fetch /auth/me');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {}, { withCredentials: true });
    } catch {
      // ignore errors
    }
    authService.clearAccessToken();
    setAccessTokenState(null);
    setUser(null);
    try { localStorage.removeItem(LOCAL_USER_KEY); } catch {}
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
