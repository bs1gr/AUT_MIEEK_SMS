import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // keep authService in sync
    authService.setAccessToken(accessToken);
  }, [accessToken]);

  // Auto-login on mount with default credentials if AUTH is enabled
  useEffect(() => {
    console.log('[Auth] useEffect mount - autoLoginAttempted:', autoLoginAttempted, 'user:', user);
    if (autoLoginAttempted) {
      console.log('[Auth] Already attempted, returning');
      return;
    }
    
    setAutoLoginAttempted(true);
    
    // If user exists but no token, preserve user and attempt silent token acquisition.
    // This allows localStorage restoration tests and offline scenarios to retain user context.
    if (user && !accessToken) {
      console.log('[Auth] User exists without token; preserving user and attempting silent token acquisition');
      // Fall through to auto-login attempt to obtain a fresh token; do NOT clear user.
    } else if (user && accessToken) {
      // User and token exist - finish init
      console.log('[Auth] User and token exist in state, setting isInitializing to false');
      setIsInitializing(false);
      return;
    }
    
    console.log('[Auth] Attempting auto-login');
    let timeoutId: number | undefined;
    let mounted = true;
    
    const attemptAutoLogin = async () => {
      try {
        console.log('[Auth] Starting auto-login attempt');
        // Timeout after 5 seconds - give it time to complete
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => {
          console.log('[Auth] Auto-login timeout triggered (5s)');
          controller.abort();
        }, 5000);
        
        console.log('[Auth] Posting to /auth/login');
        const resp = await apiClient.post('/auth/login', {
          email: 'admin@example.com',
          password: 'YourSecurePassword123!'
        }, { withCredentials: true, signal: controller.signal });
        
        if (!mounted) {
          console.log('[Auth] Component unmounted, discarding response');
          return;
        }
        
        console.log('[Auth] Login response received:', resp.status);
        const data = resp.data || {};
        
        if (data.access_token) {
          console.log('[Auth] Token received, setting state');
          setAccessTokenState(data.access_token);
          authService.setAccessToken(data.access_token);
          
          // Get user data - either from response or fetch separately
          let userPayload = data.user;
          if (!userPayload) {
            console.log('[Auth] No user in login response, fetching from /auth/me');
            try {
              const meResp = await apiClient.get('/auth/me', { withCredentials: true });
              userPayload = meResp.data;
              console.log('[Auth] User data fetched:', userPayload?.email);
            } catch (err) {
              console.warn('[Auth] Failed to fetch user profile:', err instanceof Error ? err.message : err);
              // Continue anyway - we have the token
            }
          }
          
          if (userPayload) {
            console.log('[Auth] Setting user state:', userPayload.email);
            setUser(userPayload);
            try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
          }
        } else {
          console.log('[Auth] No access_token in response');
        }
      } catch (err) {
        // Auto-login failed - auth disabled, timeout, or wrong credentials
        // This is expected behavior, just continue as guest
        if (!mounted) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.debug('[Auth] Auto-login unavailable, continuing as guest:', errMsg);
      } finally {
        if (mounted) {
          console.log('[Auth] Setting isInitializing to false');
          setIsInitializing(false);
        }
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      }
    };
    
    attemptAutoLogin();
    
    return () => {
      console.log('[Auth] Cleanup - mounted = false');
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
        const meResp = await apiClient.get('/auth/me', { withCredentials: true });
        userPayload = meResp.data;
      } catch (err) {
        console.warn('[Auth] Failed to fetch user profile after login:', err);
        throw err instanceof Error ? err : new Error('Unable to load profile');
      }
    }

    if (userPayload) {
      setUser(userPayload);
      try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userPayload)); } catch {}
    }
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

  const value: AuthContextValue = {
    user,
    accessToken,
    isInitializing,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
