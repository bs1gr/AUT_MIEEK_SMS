import { useMemo, useState, useCallback } from 'react';
import { Palette, Check } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { useAppearanceTheme, type AppearanceThemeVariant } from '@/contexts/AppearanceThemeContext';

type ThemeCopy = {
  nameKey: string;
  descriptionKey: string;
  fallbackName: string;
  fallbackDescription: string;
};

const THEME_COPY: Record<AppearanceThemeVariant, ThemeCopy> = {
  default: {
    nameKey: 'controlPanel.themeOptions.default.name',
    descriptionKey: 'controlPanel.themeOptions.default.description',
    fallbackName: 'Default',
    fallbackDescription: 'Balanced light/dark theme',
  },
  glassmorphism: {
    nameKey: 'controlPanel.themeOptions.glassmorphism.name',
    descriptionKey: 'controlPanel.themeOptions.glassmorphism.description',
    fallbackName: 'Glassmorphism',
    fallbackDescription: 'Frosted glass with blur effects',
  },
  neumorphism: {
    nameKey: 'controlPanel.themeOptions.neumorphism.name',
    descriptionKey: 'controlPanel.themeOptions.neumorphism.description',
    fallbackName: 'Neumorphism',
    fallbackDescription: 'Soft 3D depth with shadows',
  },
  gradient: {
    nameKey: 'controlPanel.themeOptions.gradient.name',
    descriptionKey: 'controlPanel.themeOptions.gradient.description',
    fallbackName: 'Gradient',
    fallbackDescription: 'Vibrant gradients with glass accents',
  },
  'modern-dark': {
    nameKey: 'controlPanel.themeOptions.modernDark.name',
    descriptionKey: 'controlPanel.themeOptions.modernDark.description',
    fallbackName: 'Modern Dark',
    fallbackDescription: 'High-contrast night mode',
  },
  'light-professional': {
    nameKey: 'controlPanel.themeOptions.lightProfessional.name',
    descriptionKey: 'controlPanel.themeOptions.lightProfessional.description',
    fallbackName: 'Light Professional',
    fallbackDescription: 'Clean minimal light mode',
  },
  mieek: {
    nameKey: 'controlPanel.themeOptions.mieek.name',
    descriptionKey: 'controlPanel.themeOptions.mieek.description',
    fallbackName: 'ΜΙΕΕΚ',
    fallbackDescription: 'Professional admin interface with green accent',
  },
  'mieek-dark': {
    nameKey: 'controlPanel.themeOptions.mieekDark.name',
    descriptionKey: 'controlPanel.themeOptions.mieekDark.description',
    fallbackName: 'ΜΙΕΕΚ Dark',
    fallbackDescription: 'Dark professional interface with vivid white text',
  },
};

interface ThemeSelectorProps {
  currentTheme: AppearanceThemeVariant;
  onThemeChange: (theme: AppearanceThemeVariant) => void;
}

export const themeStyles: Record<AppearanceThemeVariant, {
  container: string;
  card: string;
  subtleCard: string;
  input: string;
  button: string;
  secondaryButton: string;
  text: string;
  mutedText: string;
}> = {
  default: {
    container: 'rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl shadow-indigo-50/80 text-slate-900',
    card: 'rounded-xl border border-slate-100 bg-white/95 p-4 shadow-md shadow-indigo-100/70 backdrop-blur-sm',
    subtleCard: 'rounded-xl border border-slate-100 bg-slate-50/80 p-3 shadow-sm text-slate-800',
    input: 'rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
    button: 'rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/80 transition-colors',
    secondaryButton: 'rounded-lg border border-slate-300 bg-white/90 hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm',
    text: 'text-slate-900',
    mutedText: 'text-slate-500',
  },
  glassmorphism: {
    container: 'rounded-3xl border border-white/30 bg-white/10 dark:bg-white/5 backdrop-blur-2xl shadow-[0_25px_60px_-30px_rgba(91,33,182,0.45)] text-slate-900 dark:text-white',
    card: 'rounded-2xl border border-white/40 bg-white/35 dark:bg-white/10 backdrop-blur-xl p-4 shadow-2xl shadow-purple-500/30',
    subtleCard: 'rounded-2xl border border-white/20 bg-white/25 dark:bg-white/10 backdrop-blur-lg p-3 text-slate-900 dark:text-slate-100',
    input: 'rounded-2xl border border-white/50 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-200',
    button: 'rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-purple-500/40 transition-all',
    secondaryButton: 'rounded-2xl border border-white/40 bg-white/30 hover:bg-white/50 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg backdrop-blur-md',
    text: 'text-slate-900 dark:text-white',
    mutedText: 'text-slate-600 dark:text-slate-300',
  },
  neumorphism: {
    container: 'rounded-[32px] bg-[#f5f7fb] text-slate-900 shadow-[20px_20px_60px_#d1d5e0,-20px_-20px_60px_#ffffff]',
    card: 'rounded-[24px] bg-[#f5f7fb] p-4 shadow-[inset_10px_10px_20px_#d1d5e0,inset_-10px_-10px_20px_#ffffff]',
    subtleCard: 'rounded-2xl bg-[#f5f7fb] p-3 shadow-[8px_8px_15px_#d1d5e0,-8px_-8px_15px_#ffffff]',
    input: 'rounded-2xl bg-[#f5f7fb] px-3 py-2 text-sm text-slate-800 shadow-[inset_6px_6px_12px_#d1d5e0,inset_-6px_-6px_12px_#ffffff] focus:shadow-[inset_8px_8px_16px_#d1d5e0,inset_-8px_-8px_16px_#ffffff]',
    button: 'rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200',
    secondaryButton: 'rounded-2xl bg-[#f5f7fb] px-4 py-2 text-sm font-medium text-slate-700 shadow-[8px_8px_16px_#d1d5e0,-8px_-8px_16px_#ffffff]',
    text: 'text-slate-900',
    mutedText: 'text-slate-500',
  },
  gradient: {
    container: 'rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 p-[1px] shadow-2xl shadow-pink-500/30 text-slate-900',
    card: 'rounded-2xl bg-white/95 p-4 shadow-xl shadow-pink-200/60 text-slate-900',
    subtleCard: 'rounded-2xl bg-white/85 border border-white/60 p-3 text-slate-800',
    input: 'rounded-xl border border-transparent bg-white/90 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-fuchsia-300',
    button: 'rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-400/50',
    secondaryButton: 'rounded-xl border border-white/80 bg-white/80 hover:bg-white text-sm font-medium text-slate-800 px-4 py-2 shadow-md',
    text: 'text-slate-900',
    mutedText: 'text-purple-700',
  },
  'modern-dark': {
    container: 'rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-[0_35px_60px_-30px_rgba(0,0,0,0.85)] text-slate-100',
    card: 'rounded-xl border border-slate-800 bg-slate-900/85 p-4 shadow-xl shadow-cyan-500/10',
    subtleCard: 'rounded-xl border border-slate-800/60 bg-slate-900/60 p-3 backdrop-blur-sm',
    input: 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40',
    button: 'rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-400/30',
    secondaryButton: 'rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 shadow-md',
    text: 'text-slate-100',
    mutedText: 'text-slate-400',
  },
  'light-professional': {
    container: 'rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/70 text-slate-900',
    card: 'rounded-xl border border-sky-50 bg-sky-50/70 p-4 text-slate-900',
    subtleCard: 'rounded-xl border border-slate-100 bg-slate-50/80 p-3',
    input: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-200',
    button: 'rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/80',
    secondaryButton: 'rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm',
    text: 'text-slate-900',
    mutedText: 'text-slate-500',
  },
  mieek: {
    container: 'rounded-2xl border border-gray-200 bg-white shadow-xl shadow-green-100/70 text-slate-900',
    card: 'rounded-xl border border-gray-100 bg-white/95 p-4 shadow-md shadow-green-100/60',
    subtleCard: 'rounded-xl border border-gray-100 bg-gray-50/80 p-3',
    input: 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200',
    button: 'rounded-lg bg-green-500 hover:bg-green-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-green-200/80 transition-all',
    secondaryButton: 'rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm',
    text: 'text-slate-900',
    mutedText: 'text-slate-600',
  },
  'mieek-dark': {
    container: 'rounded-2xl border border-gray-800 bg-black shadow-2xl shadow-green-500/20 text-white',
    card: 'rounded-xl border border-gray-800 bg-gray-900/95 p-4 shadow-xl shadow-green-500/10',
    subtleCard: 'rounded-xl border border-gray-800 bg-gray-900/80 p-3',
    input: 'rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/30',
    button: 'rounded-lg bg-green-500 hover:bg-green-400 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-green-500/30 transition-all',
    secondaryButton: 'rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-md',
    text: 'text-white',
    mutedText: 'text-gray-400',
  },
};

export const AppearanceThemeSelectorWidget = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const themeButtonLabel = t('themeButton') || 'Theme';
  const appearanceTitle = t('controlPanel.appearanceThemes', {
    defaultValue: 'Appearance Themes',
  });
  const appearanceDescription = t('appearanceThemesDesc') || 'Choose from modern UI themes inspired by 2025 design trends.';

  const withFallback = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const themeOptions = useMemo(
    () =>
      (Object.entries(THEME_COPY) as Array<[AppearanceThemeVariant, ThemeCopy]>).map(([id, meta]) => ({
        id,
        name: withFallback(meta.nameKey, meta.fallbackName),
        description: withFallback(meta.descriptionKey, meta.fallbackDescription),
      })),
    [withFallback]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={themeStyles[currentTheme].secondaryButton + ' flex items-center gap-2'}
        aria-label={themeButtonLabel}
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">{themeButtonLabel}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {appearanceTitle}
              </h3>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {appearanceDescription}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {themeOptions.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full rounded-lg p-3 text-left transition-colors
                    ${currentTheme === theme.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {theme.name}
                        </span>
                        {currentTheme === theme.id && (
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        {theme.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Standalone Appearance Theme Selector Component
 * Manages its own theme state with localStorage persistence
 * For use in Utils/Settings/Appearance section
 */
const AppearanceThemeSelector = () => {
  const { t } = useLanguage();
  const { appearanceTheme: selectedTheme, setAppearanceTheme } = useAppearanceTheme();

  const theme = themeStyles[selectedTheme];
  const previewTitle = t('appearancePreview') || 'Live preview';
  const previewDesc =
    t('appearancePreviewDesc') ||
    'See how analytics cards, buttons, and inputs adapt to the selected appearance theme.';
  const previewMetricsLabel = t('appearancePreviewMetrics') || 'Sample analytics metrics';
  const translateThemeName = () => {
    const meta = THEME_COPY[selectedTheme];
    const value = t(meta.nameKey);
    if (!value || value === meta.nameKey) {
      return meta.fallbackName;
    }
    return value;
  };

  const friendlyThemeName = translateThemeName();

  const sampleMetrics = [
    { label: t('present') || 'Present', value: '92%' },
    { label: t('absent') || 'Absent', value: '5%' },
    { label: t('late') || 'Late', value: '2%' },
    { label: t('excused') || 'Excused', value: '1%' },
  ];

  const handleThemeChange = (themeVariant: AppearanceThemeVariant) => {
    setAppearanceTheme(themeVariant);
  };

  return (
    <section className={`${theme.container} p-6 space-y-4`}>
      <div className="space-y-1">
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme.text}`}>
          <Palette size={20} className="text-indigo-600" />
          {t('controlPanel.appearanceThemes', { defaultValue: 'Appearance Themes' })}
        </h3>
        <p className={`text-sm ${theme.mutedText}`}>
          {t('appearanceThemesDesc') ||
            'Choose from modern UI themes inspired by 2025 design trends.'}
        </p>
      </div>

      <div>
        <AppearanceThemeSelectorWidget currentTheme={selectedTheme} onThemeChange={handleThemeChange} />
      </div>

      <div className={`${theme.card} space-y-4`}>
        <div>
          <p className={`text-sm font-semibold ${theme.text}`}>{previewTitle}</p>
          <p className={`text-xs ${theme.mutedText}`}>{previewDesc}</p>
        </div>
        <div>
          <p className={`text-[11px] uppercase tracking-wide font-semibold ${theme.mutedText}`}>
            {previewMetricsLabel}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            {sampleMetrics.map((metric) => (
              <div key={metric.label} className={`${theme.subtleCard} text-center`}>
                <p className={`text-[11px] font-semibold uppercase ${theme.mutedText}`}>{metric.label}</p>
                <p className={`text-xl font-bold ${theme.text}`}>{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className={`${theme.button} inline-flex items-center gap-2 text-xs`}>
            <span className="font-semibold">{t('opsShort')}</span>
            <span>{t('quickActions')}</span>
          </div>
          <div className={`${theme.secondaryButton} inline-flex items-center gap-2 text-xs`}>
            <span>{t('utils.operationsMonitor')}</span>
          </div>
          <div className={`${theme.input} text-xs`}>{t('studentsCount', { count: 128 })}</div>
        </div>
      </div>

      <div className={`${theme.subtleCard} text-xs space-y-1`}>
        <p className={theme.text}>
          <strong>{t('currentTheme') || 'Current Theme'}:</strong> {friendlyThemeName}
        </p>
        <p className={theme.mutedText}>
          {t('themeAppliesTo') ||
            'This theme applies to Control Panel Operations and other components that support appearance customization.'}
        </p>
      </div>
    </section>
  );
};

// Default export for standalone use
export default AppearanceThemeSelector;
