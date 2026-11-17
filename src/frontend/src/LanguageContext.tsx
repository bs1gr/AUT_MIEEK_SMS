import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// The detector reports the device locale as-is ('en-US', 'el-GR'), but the app only ships
// 'en' and 'el' and the switcher compares against those, so reduce it to a supported code.
// Any other locale renders through fallbackLng 'en', so report it as 'en'.
export const toSupportedLanguage = (lang: string | null | undefined): string => {
  if (!lang) return 'el';
  return lang.toLowerCase().startsWith('el') ? 'el' : 'en';
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t: i18nT, i18n } = useTranslation();
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem('i18nextLng');
    return toSupportedLanguage(stored || i18n.language);
  });

  // Sync with i18next when language changes (including persisted value)
  useEffect(() => {
    const stored = localStorage.getItem('i18nextLng');
    const effectiveLang = toSupportedLanguage(stored || i18n.language);

    // Ensure i18n and state reflect persisted language
    if (effectiveLang && i18n.language !== effectiveLang) {
      i18n.changeLanguage(effectiveLang);
    }

    const id = setTimeout(() => setLanguageState(effectiveLang), 0);
    return () => clearTimeout(id);
  }, [i18n]);

  // Update i18next when language is changed via setLanguage
  const setLanguage = useCallback((lang: string) => {
    const supported = toSupportedLanguage(lang);
    i18n.changeLanguage(supported);
    localStorage.setItem('i18nextLng', supported);
    setLanguageState(supported);
  }, [i18n]);

  useEffect(() => {
    if (language) {
      localStorage.setItem('i18nextLng', language);
    }
  }, [language]);

  const namespaceFallbacks = useMemo(
    () => [
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
    ],
    []
  );

  const t = useCallback((key: string, options?: Record<string, unknown>): string => {
    // i18next answers a missing key with the key itself, so an answer that differs from the
    // key is a translation. An answer equal to it is either a missing key or a translation
    // that reads the same as its key ("created", in English), and i18next is asked which.
    // Until November 2026 both counted as missing, and `utils.created` was shown as written.
    const lookup = (k: string, lookupOptions?: Record<string, unknown>): string | null => {
      const value = i18nT(k, lookupOptions);
      if (typeof value !== 'string') return null;
      if (value !== k) return value;
      return i18n.exists(k, lookupOptions) ? value : null;
    };
    const tryNamespace = (ns: string, k: string) => lookup(k, { ...(options || {}), ns });

    // Support prefixed keys like "auth.loginTitle"
    if (key.includes('.')) {
      const [ns, ...rest] = key.split('.');
      const nsKey = rest.join('.');
      const namespaced = tryNamespace(ns, nsKey);
      if (namespaced) return namespaced;
    }

    // Try default namespace
    const direct = lookup(key, options);
    if (direct !== null) return direct;

    // Fallback across known namespaces
    for (const ns of namespaceFallbacks) {
      const namespaced = tryNamespace(ns, key);
      if (namespaced) return namespaced;
    }

    return key;
  }, [i18nT, i18n, namespaceFallbacks]);

  const contextValue = useMemo(
    () => ({ t, language, setLanguage }),
    [t, language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
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
