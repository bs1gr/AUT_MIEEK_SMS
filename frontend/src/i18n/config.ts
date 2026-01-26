import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { translations } from '../translations';

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
        translation: translations.en
      },
      el: {
        translation: translations.el
      }
    },
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
