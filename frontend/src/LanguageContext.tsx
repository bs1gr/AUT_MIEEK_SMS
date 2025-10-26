import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('el'); // Changed to 'el' (Greek) as default
  
  const t = (key) => {
    // Support nested keys like 'utils.title'
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return the key itself if not found
      }
    }

    return value || key;
  };
  
  return (
    <LanguageContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg shadow px-3 py-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded transition-colors ${
          language === 'en'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        En
      </button>
      <button
        onClick={() => setLanguage('el')}
        className={`px-3 py-1 rounded transition-colors ${
          language === 'el'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Ελ
      </button>
    </div>
  );
};