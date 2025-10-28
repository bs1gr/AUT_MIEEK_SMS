import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

/**
 * LanguageSwitcher Component
 * 
 * A compact language toggle component that allows users to switch between
 * English (EN) and Greek (EL) languages. The selected language is persisted
 * in localStorage and applied across the entire application.
 * 
 * Features:
 * - Visual indicator of current language
 * - Smooth transitions
 * - Accessible button with aria labels
 * - Automatic persistence via i18next
 */
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  // Get current language (default to 'en' if not set)
  const currentLanguage = i18n.language || 'en';
  
  // Toggle between English and Greek
  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'el' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
      aria-label={`Switch to ${currentLanguage === 'en' ? 'Greek' : 'English'}`}
      title={`Current language: ${currentLanguage === 'en' ? 'English' : 'Ελληνικά'}`}
    >
      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
        {currentLanguage === 'en' ? 'EN' : 'ΕΛ'}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {currentLanguage === 'en' ? '→ ΕΛ' : '→ EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
