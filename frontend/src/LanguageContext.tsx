import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t: i18nT, i18n } = useTranslation();
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem('i18nextLng');
    return stored || i18n.language || 'el';
  });

  // Sync with i18next when language changes (including persisted value)
  useEffect(() => {
    const stored = localStorage.getItem('i18nextLng');
    const effectiveLang = stored || i18n.language || 'el';

    // Ensure i18n and state reflect persisted language
    if (effectiveLang && i18n.language !== effectiveLang) {
      i18n.changeLanguage(effectiveLang);
    }

    const id = setTimeout(() => setLanguageState(effectiveLang), 0);
    return () => clearTimeout(id);
  }, [i18n]);

  // Update i18next when language is changed via setLanguage
  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    if (language) {
      localStorage.setItem('i18nextLng', language);
    }
  }, [language]);

  const namespaceFallbacks = [
    'dashboard',
    'attendance',
    'search',
    'grades',
    'students',
    'courses',
    'calendar',
    'utils',
    'controlPanel',
    'rbac',
    'auth',
    'common',
    'export',
    'help',
    'reports',
    'feedback',
    'analytics',
    'notifications',
    'errors',
    'customReports',
    'messages',
    'system'
  ];

  const t = (key: string, options?: Record<string, unknown>): string => {
    const tryNamespace = (ns: string, k: string) => {
      const value = i18nT(k, { ...(options || {}), ns });
      return typeof value === 'string' && value !== k ? value : null;
    };

    // Support prefixed keys like "auth.loginTitle"
    if (key.includes('.')) {
      const [ns, ...rest] = key.split('.');
      const nsKey = rest.join('.');
      const namespaced = tryNamespace(ns, nsKey);
      if (namespaced) return namespaced;
    }

    // Try default namespace
    const direct = i18nT(key, options);
    if (typeof direct === 'string' && direct !== key) return direct;

    // Fallback across known namespaces
    for (const ns of namespaceFallbacks) {
      const namespaced = tryNamespace(ns, key);
      if (namespaced) return namespaced;
    }

    return key;
  };

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
