import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  t: (key: string) => string;
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t: i18nT, i18n } = useTranslation();
  const [language, setLanguageState] = useState(i18n.language || 'el');
  
  // Sync with i18next when language changes
  useEffect(() => {
    setLanguageState(i18n.language);
  }, [i18n.language]);
  
  // Update i18next when language is changed via setLanguage
  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  };
  
  // Create a wrapper for t() that handles nested keys for backward compatibility
  const t = (key: string): string => {
    // Try i18next first (it handles nested keys automatically)
    const translation = i18nT(key);
    
    // If translation is the same as key, it wasn't found
    if (translation === key) {
      // Return the key itself as fallback
      return key;
    }
    
    return translation;
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