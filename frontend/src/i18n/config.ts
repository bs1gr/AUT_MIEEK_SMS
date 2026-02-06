import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { translations, translationNamespaces } from '../translations';

const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  i18n.use(LanguageDetector);
}

i18n
  .use(initReactI18next)
  // Init i18next
  .init({
    resources: {
      en: {
        translation: translations.en,
        search: translationNamespaces.en.search,
        errors: translationNamespaces.en.errors,
        dashboard: translationNamespaces.en.dashboard,
        courses: translationNamespaces.en.courses,
        students: translationNamespaces.en.students,
        grades: translationNamespaces.en.grades,
        attendance: translationNamespaces.en.attendance,
        calendar: translationNamespaces.en.calendar,
        controlPanel: translationNamespaces.en.controlPanel,
        rbac: translationNamespaces.en.rbac,
        auth: translationNamespaces.en.auth,
        utils: translationNamespaces.en.utils,
        common: translationNamespaces.en.common,
        export: translationNamespaces.en.export,
        help: translationNamespaces.en.help,
        reports: translationNamespaces.en.reports,
        feedback: translationNamespaces.en.feedback,
        analytics: translationNamespaces.en.analytics,
        messages: translationNamespaces.en.messages,
        customReports: translationNamespaces.en.customReports,
        system: translationNamespaces.en.system
      },
      el: {
        translation: translations.el,
        search: translationNamespaces.el.search,
        errors: translationNamespaces.el.errors,
        dashboard: translationNamespaces.el.dashboard,
        courses: translationNamespaces.el.courses,
        students: translationNamespaces.el.students,
        grades: translationNamespaces.el.grades,
        attendance: translationNamespaces.el.attendance,
        calendar: translationNamespaces.el.calendar,
        controlPanel: translationNamespaces.el.controlPanel,
        rbac: translationNamespaces.el.rbac,
        auth: translationNamespaces.el.auth,
        utils: translationNamespaces.el.utils,
        common: translationNamespaces.el.common,
        export: translationNamespaces.el.export,
        help: translationNamespaces.el.help,
        reports: translationNamespaces.el.reports,
        feedback: translationNamespaces.el.feedback,
        analytics: translationNamespaces.el.analytics,
        messages: translationNamespaces.el.messages,
        customReports: translationNamespaces.el.customReports,
        system: translationNamespaces.el.system
      }
    },
    ns: ['translation', 'search', 'errors', 'dashboard', 'courses', 'students', 'grades', 'attendance', 'calendar', 'controlPanel', 'rbac', 'auth', 'utils', 'common', 'export', 'help', 'reports', 'feedback', 'analytics', 'messages', 'customReports', 'system'],
    defaultNS: 'translation',
    lng: isTestEnvironment ? 'en' : undefined,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: isTestEnvironment ? undefined : {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
