import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import authService from '@/services/authService';
import apiClient from '@/api/api';

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

  // Auto-login on mount with default credentials if AUTH is enabled
  // Intentionally run once on mount to attempt auto-login; dependencies are intentionally omitted
  useEffect(() => {
    console.warn('[Auth] useEffect mount - autoLoginAttempted:', autoLoginAttemptedRef.current, 'user:', initialUserRef.current);
    if (autoLoginAttemptedRef.current) {
      console.warn('[Auth] Already attempted, returning');
      return;
    }
    autoLoginAttemptedRef.current = true;
    
    // If user exists but no token, preserve user and attempt silent token acquisition.
    // This allows localStorage restoration tests and offline scenarios to retain user context.
    if (initialUserRef.current && !initialAccessTokenRef.current) {
      console.warn('[Auth] User exists without token; preserving user and attempting silent token acquisition');
      // Fall through to auto-login attempt to obtain a fresh token; do NOT clear user.
    } else if (initialUserRef.current && initialAccessTokenRef.current) {
      // User and token exist - finish init
      console.warn('[Auth] User and token exist in state, setting isInitializing to false');
      setIsInitializing(false);
      return;
    }
    
    console.warn('[Auth] Attempting auto-login');
    let timeoutId: number | undefined;
    let mounted = true;
    
    const attemptAutoLogin = async () => {
      try {
        console.warn('[Auth] Starting auto-login attempt');
        // Timeout after 10 seconds - give it time to complete (increased from 5s for slow first startup)
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => {
          console.warn('[Auth] Auto-login timeout triggered (10s)');
          controller.abort();
        }, 10000);
        
        console.warn('[Auth] Posting to /auth/login');
        const resp = await apiClient.post('/auth/login', {
          email: 'admin@example.com',
          password: 'YourSecurePassword123!'
        }, { withCredentials: true, signal: controller.signal });
        
        if (!mounted) {
          console.warn('[Auth] Component unmounted, discarding response');
          return;
        }
        
        console.warn('[Auth] Login response received:', resp.status);
        const data = resp.data || {};
        
        if (data.access_token) {
          console.warn('[Auth] Token received, setting state');
          setAccessTokenState(data.access_token);
          authService.setAccessToken(data.access_token);
          
          // Get user data - either from response or fetch separately
          let userPayload = data.user;
          if (!userPayload) {
            console.warn('[Auth] No user in login response, fetching from /auth/me (with retry)');
            try {
              const meResp = await fetchMeWithRetry();
              userPayload = meResp;
              console.warn('[Auth] User data fetched:', userPayload?.email);
            } catch (err) {
              console.warn('[Auth] Failed to fetch user profile (after retries):', err instanceof Error ? err.message : err);
              // Continue anyway - we have the token
            }
          }
          
          if (userPayload) {
            console.warn('[Auth] Setting user state:', userPayload.email);
            setUser(userPayload);
            try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
          }
        } else {
          console.warn('[Auth] No access_token in response');
        }
      } catch (err) {
        // Auto-login failed - auth disabled, timeout, or wrong credentials
        // This is expected behavior, just continue as guest
        // Log details for debugging but don't error out
        if (!mounted) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTimeout = errMsg.includes('AbortError') || errMsg.includes('timeout');
        const isNetworkError = errMsg.includes('Network') || errMsg.includes('fetch');
        
        if (isTimeout) {
          console.warn('[Auth] Auto-login timeout - backend may be slow to start', errMsg);
        } else if (isNetworkError) {
          console.warn('[Auth] Auto-login network error - backend may not be ready yet', errMsg);
        } else {
          console.warn('[Auth] Auto-login unavailable (auth may be disabled or credentials incorrect), continuing as guest:', errMsg);
        }
      } finally {
        if (mounted) {
          console.warn('[Auth] Setting isInitializing to false');
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
