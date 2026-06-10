/**
 * i18n Test Wrapper
 * Provides a properly initialized i18n instance for tests with actual translations
 */
import { ReactElement, ReactNode } from 'react';
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
import dashboardEn from '../locales/en/dashboard.js';
import dashboardEl from '../locales/el/dashboard.js';

const asNamespace = (value: unknown) =>
  (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

const enSearch = asNamespace(searchEn);
const elSearch = asNamespace(searchEl);
const enCommon = asNamespace(commonEn);
const elCommon = asNamespace(commonEl);
const enStudents = asNamespace(studentsEn);
const elStudents = asNamespace(studentsEl);
const enCourses = asNamespace(coursesEn);
const elCourses = asNamespace(coursesEl);
const enGrades = asNamespace(gradesEn);
const elGrades = asNamespace(gradesEl);
const enRbac = asNamespace(rbacEn);
const elRbac = asNamespace(rbacEl);
const enDashboard = asNamespace(dashboardEn);
const elDashboard = asNamespace(dashboardEl);

// Create a test-specific i18n instance
const testI18n = i18n.createInstance();

testI18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    resources: {
        en: {
          translation: {
            ...enStudents,
            ...enCourses,
            ...enGrades,
            ...enCommon,
            ...enDashboard,
          },
          common: enCommon,
          search: enSearch,
          rbac: enRbac,
          dashboard: enDashboard,
        },
        el: {
          translation: {
            ...elStudents,
            ...elCourses,
            ...elGrades,
            ...elCommon,
            ...elDashboard,
          },
          common: elCommon,
          search: elSearch,
          rbac: elRbac,
          dashboard: elDashboard,
        }
    },
    interpolation: {
      escapeValue: false
    }
  });

// Import LanguageProvider which wraps i18next
import { LanguageProvider } from '../LanguageContext';

/**
 * Wrapper component that provides i18n context to test components
 * Uses I18nextProvider + LanguageProvider to support both react-i18next and custom LanguageContext
 */
const I18nWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <I18nextProvider i18n={testI18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
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
