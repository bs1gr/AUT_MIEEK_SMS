import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppearanceThemeVariant =
  | 'default'
  | 'glassmorphism'
  | 'neumorphism'
  | 'gradient'
  | 'modern-dark'
  | 'light-professional';

type AppearanceThemeContextValue = {
  appearanceTheme: AppearanceThemeVariant;
  setAppearanceTheme: (theme: AppearanceThemeVariant) => void;
  availableThemes: readonly AppearanceThemeVariant[];
};

const STORAGE_KEYS = ['sms.appearance.theme', 'sms.operations.theme'] as const;
const DATA_ATTRIBUTE = 'data-appearance';
const SUPPORTED_THEMES: readonly AppearanceThemeVariant[] = [
  'default',
  'glassmorphism',
  'neumorphism',
  'gradient',
  'modern-dark',
  'light-professional',
];

const isAppearanceTheme = (value: unknown): value is AppearanceThemeVariant =>
  typeof value === 'string' && SUPPORTED_THEMES.includes(value as AppearanceThemeVariant);

const hydrateAttributes = (theme: AppearanceThemeVariant) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'default') {
    root?.removeAttribute(DATA_ATTRIBUTE);
    body?.removeAttribute(DATA_ATTRIBUTE);
    return;
  }
  root?.setAttribute(DATA_ATTRIBUTE, theme);
  body?.setAttribute(DATA_ATTRIBUTE, theme);
};

const AppearanceThemeContext = createContext<AppearanceThemeContextValue | undefined>(undefined);

export const AppearanceThemeProvider = ({ children }: { children: ReactNode }) => {
  const [appearanceTheme, setAppearanceThemeState] = useState<AppearanceThemeVariant>(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }
    const stored = STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    const resolved = isAppearanceTheme(stored) ? stored : 'default';
    hydrateAttributes(resolved);
    return resolved;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    STORAGE_KEYS.forEach((key) => window.localStorage.setItem(key, appearanceTheme));
    hydrateAttributes(appearanceTheme);
  }, [appearanceTheme]);

  const value = useMemo<AppearanceThemeContextValue>(
    () => ({ appearanceTheme, setAppearanceTheme: setAppearanceThemeState, availableThemes: SUPPORTED_THEMES }),
    [appearanceTheme]
  );

  return <AppearanceThemeContext.Provider value={value}>{children}</AppearanceThemeContext.Provider>;
};

export const useAppearanceTheme = (): AppearanceThemeContextValue => {
  const ctx = useContext(AppearanceThemeContext);
  if (!ctx) {
    throw new Error('useAppearanceTheme must be used within an AppearanceThemeProvider');
  }
  return ctx;
};

export const APPEARANCE_THEMES = SUPPORTED_THEMES;
