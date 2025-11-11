import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { storeRefreshToken } from '@/services/authService';
import apiClient from '@/api/api';

type User = {
  id: number;
  email: string;
  role?: string;
  [k: string]: any;
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
    if (data.access_token) {
      setAccessTokenState(data.access_token);
      authService.setAccessToken(data.access_token);
    }
    if (data.refresh_token) {
      storeRefreshToken(data.refresh_token);
    }
    if (data.user) {
      setUser(data.user);
      try { localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user)); } catch {}
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {}, { withCredentials: true });
    } catch (e) {
      // ignore errors
    }
    authService.clearAccessToken();
    storeRefreshToken(null);
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
