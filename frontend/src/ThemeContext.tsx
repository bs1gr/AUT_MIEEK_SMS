import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'relaxing' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark' | 'relaxing';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    const initialTheme = (stored === 'light' || stored === 'dark' || stored === 'relaxing' || stored === 'system') ? stored : 'light';
    console.log('[ThemeProvider] Initializing with theme:', initialTheme, 'from localStorage:', stored);
    return initialTheme;
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark' | 'relaxing'>(() => {
    // Initialize effectiveTheme based on stored theme to avoid flash
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    if (stored === 'relaxing') return 'relaxing';
    if (stored === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark ? 'dark' : 'light';
      }
      return theme;
    };

    const resolved = resolveTheme();
    setEffectiveTheme(resolved);
    
    console.log('[ThemeProvider] Applying theme:', theme, '| Resolved to:', resolved);

    // Apply theme to document with Edge browser compatibility
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes first
    root.classList.remove('dark', 'relaxing');
    body.classList.remove('dark', 'relaxing');
    
    if (resolved === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      void root.offsetHeight;
    } else if (resolved === 'relaxing') {
      root.classList.add('relaxing');
      body.classList.add('relaxing');
      void root.offsetHeight;
    } else {
      // Light theme - ensure all theme classes are removed
      if (root.classList.contains('dark') || root.classList.contains('relaxing')) {
        console.warn('[ThemeProvider] Failed to remove theme classes, forcing...');
        root.className = root.className.replace(/\b(dark|relaxing)\b/g, '').trim();
      }
      if (body.classList.contains('dark') || body.classList.contains('relaxing')) {
        console.warn('[ThemeProvider] Failed to remove theme classes from body, forcing...');
        body.className = body.className.replace(/\b(dark|relaxing)\b/g, '').trim();
      }
      void root.offsetHeight;
    }
    
    // Log actual state after applying
    setTimeout(() => {
      console.log('[ThemeProvider] After apply - html classes:', root.className, '| body classes:', body.className, '| has dark:', root.classList.contains('dark'), '| has relaxing:', root.classList.contains('relaxing'));
    }, 0);

    // Listen for system theme changes when 'system' is selected
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        const newResolved = ('matches' in e ? e.matches : mediaQuery.matches) ? 'dark' : 'light';
        console.log('[ThemeProvider] System theme changed to:', newResolved);
        setEffectiveTheme(newResolved);
        root.classList.remove('dark', 'relaxing');
        body.classList.remove('dark', 'relaxing');
        if (newResolved === 'dark') {
          root.classList.add('dark');
          body.classList.add('dark');
          void root.offsetHeight;
        } else {
          void root.offsetHeight;
        }
      };

      // Modern browsers including Edge support addEventListener
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
      console.log('[ThemeProvider] Theme set to:', newTheme);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
