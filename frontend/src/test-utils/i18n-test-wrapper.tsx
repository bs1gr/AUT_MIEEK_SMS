/**
 * i18n Test Wrapper
 * Provides a properly initialized i18n instance for tests with actual translations
 */
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import namespaced translations directly (avoid the corrupted translations.ts spreading)
import searchEn from '../locales/en/search.js';
import searchEl from '../locales/el/search.js';
import commonEn from '../locales/en/common.js';
import commonEl from '../locales/el/common.js';
import studentsEn from '../locales/en/students.js';
import studentsEl from '../locales/el/students.js';
import coursesEn from '../locales/en/courses.js';
import coursesEl from '../locales/el/courses.js';
import gradesEn from '../locales/en/grades.js';
import gradesEl from '../locales/el/grades.js';
import rbacEn from '../locales/en/rbac.js';
import rbacEl from '../locales/el/rbac.js';

// Create a test-specific i18n instance
const testI18n = i18n.createInstance();

testI18n
  .use(initReactI18next)
  .init({
    language: 'en',
    fallbackLng: 'en',
    debug: false,
    resources: {
        en: {
          translation: {
            ...studentsEn,
            ...coursesEn,
            ...gradesEn,
            ...commonEn,
          },
          common: commonEn,
          search: searchEn,
          rbac: rbacEn,
        },
        el: {
          translation: {
            ...studentsEl,
            ...coursesEl,
            ...gradesEl,
            ...commonEl,
          },
          common: commonEl,
          search: searchEl,
          rbac: rbacEl,
        }
    },
    interpolation: {
      escapeValue: false
    }
  });

/**
 * Wrapper component that provides i18n context to test components
 */
const I18nWrapper = ({ children }: { children: React.ReactNode }) => {
  return <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>;
};

/**
 * Custom render function that automatically wraps components with i18n provider
 * Use this instead of @testing-library/react's render in all tests that use i18n
 */
export const renderWithI18n = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: I18nWrapper, ...options });
};

export default testI18n;
