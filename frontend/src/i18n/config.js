import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { translations } from '../translations';

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
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
    fallbackLng: 'el', // Default to Greek
    debug: false,
    interpolation: {
      escapeValue: false // React already protects from XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
