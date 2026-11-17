/**
 * `t()` of the language context, against the application's own translations.
 *
 * The other tests run on the test setup's i18n instance, which holds seven namespaces. The
 * texts this file is about live in namespaces it does not have (`utils`, `calendar`, ...), so
 * the application's instance is given to the provider here.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import appI18n from './i18n/config';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { translationNamespaces } from './translations';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={appI18n}>
    <LanguageProvider>{children}</LanguageProvider>
  </I18nextProvider>
);

// Every text of a namespace that is, letter for letter, its own key: `created: 'created'`.
const textsEqualToTheirKey = (language: 'en' | 'el'): string[] => {
  const found: string[] = [];
  const walk = (namespace: string, node: unknown, path: string[]) => {
    if (typeof node === 'string') {
      if (path.length > 0 && node === path.join('.')) {
        found.push(`${namespace}.${node}`);
      }
      return;
    }
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      Object.entries(node).forEach(([name, child]) => walk(namespace, child, [...path, name]));
    }
  };
  Object.entries(translationNamespaces[language]).forEach(([namespace, tree]) =>
    walk(namespace, tree, [])
  );
  return found;
};

describe('LanguageContext t(): a text that reads the same as its key', () => {
  beforeAll(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await appI18n.changeLanguage('en');
  });

  it('returns the text, not the key with its namespace', () => {
    // English "created" is the text of the key `created`. It counted as a missing key, and
    // the backup list showed `utils.created:`.
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t('utils.created')).toBe('created');
    expect(result.current.t('utils.updated')).toBe('updated');
    expect(result.current.t('utils.warnings')).toBe('warnings');
    expect(result.current.t('utils.errors')).toBe('errors');
  });

  it('still returns the whole key for a key that does not exist', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t('utils.noSuchKeyHere')).toBe('utils.noSuchKeyHere');
    expect(result.current.t('noSuchNamespace.created')).toBe('noSuchNamespace.created');
    expect(result.current.t('noSuchKeyAnywhere')).toBe('noSuchKeyAnywhere');
  });

  it('still translates an ordinary key, with and without its namespace', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t('utils.importSuccess')).toBe(
      (translationNamespaces.en.utils as Record<string, string>).importSuccess
    );
    expect(result.current.t('importSuccess')).toBe(
      (translationNamespaces.en.utils as Record<string, string>).importSuccess
    );
  });

  it('holds for every such text of every namespace, in English', () => {
    // The four in `utils` were the known ones; the scan finds the others and the next one.
    const { result } = renderHook(() => useLanguage(), { wrapper });
    const sameAsKey = textsEqualToTheirKey('en');

    expect(sameAsKey).toContain('utils.created');
    const shownAsKey = sameAsKey.filter((key) => result.current.t(key) === key);
    expect(shownAsKey).toEqual([]);
  });

  it('holds for every such text of every namespace, in Greek', async () => {
    await appI18n.changeLanguage('el');
    localStorage.setItem('i18nextLng', 'el');
    try {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      const shownAsKey = textsEqualToTheirKey('el').filter((key) => result.current.t(key) === key);
      expect(shownAsKey).toEqual([]);
    } finally {
      localStorage.setItem('i18nextLng', 'en');
      await appI18n.changeLanguage('en');
    }
  });
});
