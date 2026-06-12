import React, { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'relaxing' | 'fancy' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark' | 'relaxing' | 'fancy';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    const initialTheme =
      stored === 'light' ||
      stored === 'dark' ||
      stored === 'relaxing' ||
      stored === 'fancy' ||
      stored === 'system'
        ? stored
        : 'light';
    return initialTheme;
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark' | 'relaxing' | 'fancy'>(() => {
    // Initialize effectiveTheme based on stored theme to avoid flash
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    if (stored === 'relaxing') return 'relaxing';
    if (stored === 'fancy') return 'fancy';
    if (stored === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  useLayoutEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark ? 'dark' : 'light';
      }
      return theme;
    };

    const resolved = resolveTheme();

    // Do not update effectiveTheme synchronously here (avoid setState inside effect)

    // Apply theme to document with robust null checks and Edge compatibility
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const body = typeof document !== 'undefined' ? document.body : null;
    if (!root || !body) {
      return undefined;
    }

    // Remove all theme classes first, with guards (Edge compatible)
    if (root.classList) root.classList.remove('dark', 'relaxing', 'fancy');
    if (body.classList) body.classList.remove('dark', 'relaxing', 'fancy');

    if (resolved === 'dark') {
      if (root.classList) root.classList.add('dark');
      if (body.classList) body.classList.add('dark');
      void root.offsetHeight; // force repaint if needed
    } else if (resolved === 'relaxing') {
      if (root.classList) root.classList.add('relaxing');
      if (body.classList) body.classList.add('relaxing');
      void root.offsetHeight;
    } else if (resolved === 'fancy') {
      if (root.classList) root.classList.add('fancy');
      if (body.classList) body.classList.add('fancy');
      void root.offsetHeight;
    } else {
      // Light theme - ensure all theme classes are removed
      if (root.classList && (root.classList.contains('dark') || root.classList.contains('relaxing') || root.classList.contains('fancy'))) {
        root.className = root.className.replace(/\b(dark|relaxing|fancy)\b/g, '').trim();
      }
      if (body.classList && (body.classList.contains('dark') || body.classList.contains('relaxing') || body.classList.contains('fancy'))) {
        body.className = body.className.replace(/\b(dark|relaxing|fancy)\b/g, '').trim();
      }
      void root.offsetHeight;
    }

    // Log actual state after applying
    setTimeout(() => {
      if (!root || !body) return;
    }, 0);

    // Listen for system theme changes when 'system' is selected
    if (theme === 'system') {
      type MaybeMediaQuery = MediaQueryList & {
        addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
        removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
        addListener?: (listener: (e: MediaQueryListEvent) => void) => void;
        removeListener?: (listener: (e: MediaQueryListEvent) => void) => void;
      };

      const mediaQuery: MaybeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        const newResolved = ('matches' in e ? e.matches : mediaQuery.matches) ? 'dark' : 'light';
        setEffectiveTheme(newResolved);
        if (root.classList) root.classList.remove('dark', 'relaxing', 'fancy');
        if (body.classList) body.classList.remove('dark', 'relaxing', 'fancy');
        if (newResolved === 'dark') {
          root.classList.add('dark');
          body.classList.add('dark');
          void root.offsetHeight;
        } else {
          void root.offsetHeight;
        }
      };
      // Modern browsers including Edge support addEventListener
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }

      // Fallback older browsers that use addListener/removeListener
      if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }

      return undefined;
    }

    return undefined;
  }, [theme]);

  // NOTE: setTheme is implemented below as setThemeImmediate which updates
  // effectiveTheme synchronously. The older setTheme helper was removed.

  // Update effectiveTheme immediately when theme is changed via setTheme to keep
  // behavior deterministic and tests synchronous.
  const setThemeImmediate = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme:', error);
    }

    // Resolve effective immediately for deterministic tests and UI updates
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
    } else {
      setEffectiveTheme(newTheme as 'light' | 'dark' | 'relaxing' | 'fancy');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeImmediate, effectiveTheme }}>
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
