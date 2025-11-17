import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';
import type { ReactNode } from 'react';

// Don't mock i18next - use the real implementation since LanguageContext wraps it

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('initializes with language from i18n', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // i18n might default to 'el', 'en', or browser locale like 'en-US'
      expect(result.current.language).toBeTruthy();
    });

    it('provides translation function', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(typeof result.current.t).toBe('function');
      expect(typeof result.current.setLanguage).toBe('function');
    });
  });

  describe('setLanguage', () => {
    it('changes language to Greek', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.setLanguage('el');
      });

      // Language should now be 'el'
      expect(result.current.language).toBe('el');
    });

    it('changes language to English', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.setLanguage('en');
      });

      expect(result.current.language).toBe('en');
    });

    it('persists language to localStorage via i18next', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.setLanguage('el');
      });

      // i18next-browser-languagedetector persists to localStorage with key 'i18nextLng'
      const stored = localStorage.getItem('i18nextLng');
      expect(stored).toBe('el');
    });

    it('maintains language across multiple switches', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // English → Greek
      await act(async () => {
        await result.current.setLanguage('el');
      });
      expect(result.current.language).toBe('el');

      // Greek → English
      await act(async () => {
        await result.current.setLanguage('en');
      });
      expect(result.current.language).toBe('en');

      // English → Greek again
      await act(async () => {
        await result.current.setLanguage('el');
      });
      expect(result.current.language).toBe('el');
    });
  });

  describe('t function', () => {
    it('provides translation function from context', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(typeof result.current.t).toBe('function');
    });

    it('translation function returns key as fallback for missing keys', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      const translated = result.current.t('missing.nonexistent.key');

      // Should return the key itself when translation is not found
      expect(translated).toBe('missing.nonexistent.key');
    });

    it('translation function handles interpolation format', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Test that the function accepts interpolation options
      const translated = result.current.t('some.key', { value: 'test' });

      // Since key doesn't exist, should return the key
      expect(typeof translated).toBe('string');
    });
  });

  describe('useLanguage hook', () => {
    it('throws error when used outside LanguageProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within a LanguageProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('language persistence', () => {
    it('restores language from localStorage on mount', async () => {
      // Set language via i18next's storage key
      localStorage.setItem('i18nextLng', 'el');

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Should initialize with stored language
      expect(['el', 'el-GR']).toContain(result.current.language);
    });

    it('persists latest language to localStorage across switches', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.setLanguage('el');
      });
      expect(localStorage.getItem('i18nextLng')).toBe('el');

      await act(async () => {
        await result.current.setLanguage('en');
      });
      expect(localStorage.getItem('i18nextLng')).toBe('en');
    });
  });

  describe('state consistency', () => {
    it('context state reflects current i18n language', async () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result.current.setLanguage('el');
      });

      // Context language should match what we set
      expect(result.current.language).toBe('el');
    });

    it('new hook instances reflect updated language', async () => {
      localStorage.setItem('i18nextLng', 'el');

      const { result: result1 } = renderHook(() => useLanguage(), { wrapper });

      await act(async () => {
        await result1.current.setLanguage('en');
      });

      // New instance should see updated language
      const { result: result2 } = renderHook(() => useLanguage(), { wrapper });
      expect(result2.current.language).toBe('en');
    });
  });
});
