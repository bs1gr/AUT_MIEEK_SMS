import React from 'react';
import { useLanguage } from '../../LanguageContext';
import { Languages } from 'lucide-react';

/**
 * Distinctive Language Toggle Button
 * Provides a clear, accessible way to switch between English and Greek
 */
const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'el' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg"
      title={language === 'en' ? 'Switch to Greek / Αλλαγή σε Ελληνικά' : 'Switch to English / Αλλαγή σε Αγγλικά'}
      aria-label={`Current language: ${language === 'en' ? 'English' : 'Greek'}. Click to switch.`}
    >
      <Languages size={18} className="text-white" />
      <span className="font-semibold text-sm">
        {language === 'en' ? 'EN' : 'ΕΛ'}
      </span>
      <span className="text-xs opacity-90">
        {language === 'en' ? '→ ΕΛ' : '→ EN'}
      </span>
    </button>
  );
};

export default LanguageToggle;
