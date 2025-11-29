import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  let matchMediaMock: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    document.documentElement.className = '';
    document.body.className = '';

    // Mock matchMedia
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn(() => matchMediaMock as unknown as MediaQueryList);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
  });

  describe('initialization', () => {
    it('initializes with light theme as default', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
      expect(result.current.effectiveTheme).toBe('light');
    });

    it('restores theme from localStorage on mount', async () => {
      localStorage.setItem('theme', 'dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Wait for effect to apply
      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
      });
    });

    it('validates theme from localStorage', () => {
      localStorage.setItem('theme', 'invalid-theme');

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should fall back to 'light' for invalid themes
      expect(result.current.theme).toBe('light');
    });

    it('handles corrupted localStorage data', () => {
      localStorage.setItem('theme', '{"invalid": json}');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });

    it('applies initial theme classes to DOM', async () => {
      localStorage.setItem('theme', 'dark');

      renderHook(() => useTheme(), { wrapper });

      // Wait for setTimeout in useEffect to complete
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('setTheme', () => {
    it('changes theme to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.effectiveTheme).toBe('dark');
      });
    });

    it('changes theme to relaxing', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('relaxing');
      });

      expect(result.current.theme).toBe('relaxing');
      expect(result.current.effectiveTheme).toBe('relaxing');
    });

    it('changes theme to fancy', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('fancy');
      });

      expect(result.current.theme).toBe('fancy');
      expect(result.current.effectiveTheme).toBe('fancy');
    });

    it('changes theme to system', () => {
      matchMediaMock.matches = true; // System prefers dark

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('dark');
    });

    it('persists theme to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('applies theme classes to DOM', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(true);
      }, { timeout: 100 });
    });

    it('removes previous theme classes when switching', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });
      await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));

      act(() => {
        result.current.setTheme('light');
      });
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        // Light theme doesn't add a class, just removes others
      }, { timeout: 100 });
    });

    it('updates state even if localStorage fails', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');

      setItemSpy.mockRestore();
    });
  });

  describe('effectiveTheme resolution', () => {
    it('resolves system theme to light when system prefers light', () => {
      matchMediaMock.matches = false; // System prefers light

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('light');
    });

    it('resolves system theme to dark when system prefers dark', () => {
      matchMediaMock.matches = true; // System prefers dark

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.effectiveTheme).toBe('dark');
    });

    it('effectiveTheme equals theme for non-system themes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      const themes: Array<'light' | 'dark' | 'relaxing' | 'fancy'> = ['light', 'dark', 'relaxing', 'fancy'];

      themes.forEach((theme) => {
        act(() => {
          result.current.setTheme(theme);
        });
        expect(result.current.effectiveTheme).toBe(theme);
      });
    });
  });

  describe('system theme listener', () => {
    it('registers mediaQuery listener when theme is system', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(matchMediaMock.addEventListener).toHaveBeenCalled();
    });

    it('updates effectiveTheme when system preference changes', async () => {
      matchMediaMock.matches = false; // Start with light

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.effectiveTheme).toBe('light');

      // Simulate system theme change to dark
      matchMediaMock.matches = true;
      const changeListener = matchMediaMock.addEventListener.mock.calls[0]?.[1] as (e: MediaQueryListEvent | MediaQueryList) => void;

      act(() => {
        // Call with a mock event object that has matches property
        changeListener?.({ matches: true } as MediaQueryList);
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('dark');
      });
    });

    it('removes listener when theme changes from system', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      const addedListener = matchMediaMock.addEventListener.mock.calls[0]?.[1];

      act(() => {
        result.current.setTheme('light');
      });

      expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', addedListener);
    });

    it('removes listener on unmount', () => {
      const { result, unmount } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      const addedListener = matchMediaMock.addEventListener.mock.calls[0]?.[1];

      unmount();

      expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', addedListener);
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('theme switching flow', () => {
    it('maintains theme across multiple switches', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.setTheme('relaxing');
      });
      expect(result.current.theme).toBe('relaxing');

      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
    });

    it('persists latest theme to localStorage across switches', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });
      expect(localStorage.getItem('theme')).toBe('dark');

      act(() => {
        result.current.setTheme('fancy');
      });
      expect(localStorage.getItem('theme')).toBe('fancy');
    });

    it('updates DOM classes across theme switches', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });
      await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));

      act(() => {
        result.current.setTheme('relaxing');
      });
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.classList.contains('relaxing')).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('DOM manipulation', () => {
    it('applies theme to documentElement', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      }, { timeout: 100 });
    });

    it('applies theme to body', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(document.body.classList.contains('dark')).toBe(true);
      }, { timeout: 100 });
    });

    it('applies all supported theme classes correctly', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      const themes: Array<'light' | 'dark' | 'relaxing' | 'fancy'> = ['dark', 'relaxing', 'fancy'];

      for (const theme of themes) {
        act(() => {
          result.current.setTheme(theme);
        });

        await waitFor(() => {
          expect(document.documentElement.classList.contains(theme)).toBe(true);
          expect(document.body.classList.contains(theme)).toBe(true);
        }, { timeout: 100 });
      }
    });

    it('cleans up previous theme classes when switching', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });
      await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));

      act(() => {
        result.current.setTheme('relaxing');
      });
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.classList.contains('relaxing')).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('localStorage edge cases', () => {
    it('handles empty string in localStorage', () => {
      localStorage.setItem('theme', '');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });

    it('handles whitespace-only string in localStorage', () => {
      localStorage.setItem('theme', '   ');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });

    it('handles invalid theme value in localStorage', () => {
      localStorage.setItem('theme', 'invalid-theme-value');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('state consistency', () => {
    it('context state matches localStorage after update', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe(localStorage.getItem('theme'));
      });
    });

    it('effectiveTheme reflects current theme setting', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('fancy');
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('fancy');
      }, { timeout: 100 });
    });

    it('new hook instances reflect updated theme', async () => {
      localStorage.setItem('theme', 'dark');

      const { result: result1 } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => expect(result1.current.theme).toBe('dark'));

      act(() => {
        result1.current.setTheme('relaxing');
      });

      await waitFor(() => expect(localStorage.getItem('theme')).toBe('relaxing'));

      // New instance should see updated theme from localStorage
      const { result: result2 } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(result2.current.theme).toBe('relaxing'));
    });
  });

  describe('system theme edge cases', () => {
    it('applies correct theme when system preference is set initially', async () => {
      matchMediaMock.matches = true; // System prefers dark
      localStorage.setItem('theme', 'system');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.effectiveTheme).toBe('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      }, { timeout: 100 });
    });
  });
});
