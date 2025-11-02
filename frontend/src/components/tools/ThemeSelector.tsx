import React from 'react';
import { useTheme } from '../../ThemeContext';
import { useLanguage } from '../../LanguageContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage() as { t: (key: string) => string };

  const themeOptions = [
    { value: 'light', label: t('themeLight'), icon: Sun },
    { value: 'dark', label: t('themeDark'), icon: Moon },
    { value: 'system', label: t('themeSystem'), icon: Monitor }
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Sun size={20} className="text-indigo-600" />
        {t('themeAppearance')}
      </h3>
      <p className="text-sm text-gray-600 mb-4">{t('themeDescription')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              theme === value
                ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            <Icon size={20} className={theme === value ? 'text-indigo-600' : 'text-gray-400'} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>{t('themeSystemInfo')}</strong> {t('themeSystemDescription')}
        </p>
      </div>
    </div>
  );
};

export default ThemeSelector;
