import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import authService from '@/services/authService';
import apiClient, { controlApiClient } from '@/api/api';
import { getItem, setItem, removeItem } from '@/utils/appStorage';

// Clean up legacy localStorage token keys from older versions.
authService.clearLegacyTokens?.();

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
      const raw = getItem(LOCAL_USER_KEY);
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
    try {
      const defaults = apiClient.defaults as unknown as { headers?: { common?: Record<string, string> } };
      if (!defaults.headers) {
        defaults.headers = { common: {} };
      }
      if (!defaults.headers.common) {
        defaults.headers.common = {};
      }
      if (accessToken) {
        defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        delete defaults.headers.common.Authorization;
      }
    } catch {
      // ignore
    }
    // Also update controlApiClient defaults to keep auth headers in sync
    try {
      const controlDefaults = controlApiClient.defaults as unknown as { headers?: { common?: Record<string, string> } };
      if (!controlDefaults.headers) {
        controlDefaults.headers = { common: {} };
      }
      if (!controlDefaults.headers.common) {
        controlDefaults.headers.common = {};
      }
      if (accessToken) {
        controlDefaults.headers.common.Authorization = `Bearer ${accessToken}`;
      } else {
        delete controlDefaults.headers.common.Authorization;
      }
    } catch {
      // ignore
    }
  }, [accessToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleAuthExpired = () => {
      authService.clearAccessToken();
      setAccessTokenState(null);
      setUser(null);
      try { removeItem(LOCAL_USER_KEY); } catch {}
    };
    window.addEventListener('sms-auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('sms-auth-expired', handleAuthExpired);
    };
  }, []);

  // E2E test hook: dispatching 'sms-e2e-login' injects auth state into the
  // running React app without a page reload (avoids the TDZ bug in the
  // production bundle that fires when sms_user_v1 is set before JS executes).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleE2ELogin = (e: Event) => {
      const { user: u, token: t } = (e as CustomEvent<{ user: User; token: string }>).detail;
      try { setItem(LOCAL_USER_KEY, JSON.stringify(u)); } catch {}
      authService.setAccessToken(t);
      setUser(u);
      setAccessTokenState(t);
      setIsInitializing(false);
    };
    window.addEventListener('sms-e2e-login', handleE2ELogin);
    return () => window.removeEventListener('sms-e2e-login', handleE2ELogin);
  }, []);

  // Optional auto-login on mount (disabled by default). Intentionally run once on mount.
  useEffect(() => {
    if (autoLoginAttemptedRef.current) {
      return;
    }
    autoLoginAttemptedRef.current = true;

    // If user is in localStorage but no in-memory token, attempt a silent
    // refresh via the HttpOnly cookie. On success the user stays logged in;
    // on failure (expired/revoked cookie) we clear the stale user profile.
    if (initialUserRef.current && !initialAccessTokenRef.current) {
      authService.refreshAccessToken().then((token) => {
        if (!token) {
          setUser(null);
          try { removeItem(LOCAL_USER_KEY); } catch {}
        } else {
          setAccessTokenState(token);
        }
      }).catch(() => {
        setUser(null);
        try { removeItem(LOCAL_USER_KEY); } catch {}
      }).finally(() => {
        setIsInitializing(false);
      });
      return;
    } else if (initialUserRef.current && initialAccessTokenRef.current) {
      // In-memory token already set (e.g. same-tab navigation) — finish init.
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
            } catch {
              // Continue anyway - we have the token
            }
          }

          if (userPayload) {
            setUser(userPayload);
            try { setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
          }
        }
      } catch {
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
      mounted = false;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []); // Empty dependency - run only once on mount

  const _isLiteMode = () =>
    typeof window !== 'undefined' &&
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '8000';

  const login = async (email: string, password: string) => {
    const url = '/auth/login';
    const resp = await apiClient.post(url, { email, password }, { withCredentials: true });
    const data = resp.data || {};

    if (!data.access_token) {
      throw new Error((data && (data.detail || data.message)) || 'Login failed');
    }

    setAccessTokenState(data.access_token);
    authService.setAccessToken(data.access_token);

    // Cancel any pending Lite auto-shutdown (new login resets the timer)
    if (_isLiteMode()) {
      fetch('/api/v1/lite/cancel-shutdown', { method: 'POST' }).catch(() => {});
    }

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
      try { setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
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
    try { removeItem(LOCAL_USER_KEY); } catch {}
    // In Lite mode: schedule process termination after 30-second grace period.
    // Use fetch (not apiClient) — token is already cleared so apiClient interceptors
    // would silently drop the request before it sends.
    if (_isLiteMode()) {
      fetch('/api/v1/lite/schedule-shutdown', { method: 'POST' }).catch(() => {});
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
      setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
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

export { AuthContext };
