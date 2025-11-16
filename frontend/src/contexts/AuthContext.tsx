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

  useEffect(() => {
    // keep authService in sync
    authService.setAccessToken(accessToken);
  }, [accessToken]);

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
