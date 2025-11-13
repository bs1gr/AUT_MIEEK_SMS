import { useState } from 'react';
import { Palette, Check } from 'lucide-react';

export type ThemeVariant = 
  | 'default'
  | 'glassmorphism'
  | 'neumorphism'
  | 'gradient'
  | 'modern-dark'
  | 'light-professional';

interface ThemeSelectorProps {
  currentTheme: ThemeVariant;
  onThemeChange: (theme: ThemeVariant) => void;
}

export const themeStyles = {
  default: {
    container: 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm',
    card: 'rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4',
    subtleCard: 'rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-3',
    input: 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-indigo-500',
    button: 'rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors',
    secondaryButton: 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm transition-colors',
    text: 'text-gray-900 dark:text-gray-100',
    mutedText: 'text-gray-600 dark:text-gray-400',
  },
  glassmorphism: {
    container: 'rounded-2xl border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl shadow-2xl',
    card: 'rounded-xl border border-white/20 bg-white/20 dark:bg-white/5 backdrop-blur-lg p-4 shadow-lg',
    subtleCard: 'rounded-xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-md p-3',
    input: 'rounded-xl border border-white/30 dark:border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-md px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-400',
    button: 'rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition-all',
    secondaryButton: 'rounded-xl border border-white/30 bg-white/20 dark:bg-white/10 backdrop-blur-md hover:bg-white/30 dark:hover:bg-white/20 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-md transition-all',
    text: 'text-gray-900 dark:text-white',
    mutedText: 'text-gray-700 dark:text-gray-300',
  },
  neumorphism: {
    container: 'rounded-3xl bg-gray-100 dark:bg-gray-900 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0a0a0a,-8px_-8px_16px_#1a1a1a]',
    card: 'rounded-2xl bg-gray-100 dark:bg-gray-900 p-4 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0a0a0a,inset_-4px_-4px_8px_#1a1a1a]',
    subtleCard: 'rounded-2xl bg-gray-100 dark:bg-gray-900 p-3 shadow-[2px_2px_4px_#bebebe,-2px_-2px_4px_#ffffff] dark:shadow-[2px_2px_4px_#0a0a0a,-2px_-2px_4px_#1a1a1a]',
    input: 'rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] dark:shadow-[inset_2px_2px_4px_#0a0a0a,inset_-2px_-2px_4px_#1a1a1a] focus:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] dark:focus:shadow-[inset_4px_4px_8px_#0a0a0a,inset_-4px_-4px_8px_#1a1a1a]',
    button: 'rounded-xl bg-gray-100 dark:bg-gray-900 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#0a0a0a,-4px_-4px_8px_#1a1a1a] hover:shadow-[2px_2px_4px_#bebebe,-2px_-2px_4px_#ffffff] dark:hover:shadow-[2px_2px_4px_#0a0a0a,-2px_-2px_4px_#1a1a1a] active:shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] dark:active:shadow-[inset_2px_2px_4px_#0a0a0a,inset_-2px_-2px_4px_#1a1a1a] transition-all',
    secondaryButton: 'rounded-xl bg-gray-100 dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#0a0a0a,-4px_-4px_8px_#1a1a1a] hover:shadow-[2px_2px_4px_#bebebe,-2px_-2px_4px_#ffffff] dark:hover:shadow-[2px_2px_4px_#0a0a0a,-2px_-2px_4px_#1a1a1a] transition-all',
    text: 'text-gray-900 dark:text-gray-100',
    mutedText: 'text-gray-600 dark:text-gray-400',
  },
  gradient: {
    container: 'rounded-2xl border border-transparent bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 shadow-xl',
    card: 'rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4 shadow-lg',
    subtleCard: 'rounded-xl border border-white/30 dark:border-white/5 bg-gradient-to-br from-white/40 to-white/20 dark:from-white/5 dark:to-transparent backdrop-blur-sm p-3',
    input: 'rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-indigo-500',
    button: 'rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/50 dark:shadow-indigo-900/50 transition-all',
    secondaryButton: 'rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm transition-colors',
    text: 'text-gray-900 dark:text-gray-100',
    mutedText: 'text-gray-600 dark:text-gray-400',
  },
  'modern-dark': {
    container: 'rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl',
    card: 'rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-4 shadow-xl',
    subtleCard: 'rounded-lg border border-gray-700/50 bg-gray-800/50 p-3 backdrop-blur-sm',
    input: 'rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500',
    button: 'rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-900/50 transition-all',
    secondaryButton: 'rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 shadow-md transition-colors',
    text: 'text-gray-100',
    mutedText: 'text-gray-400',
  },
  'light-professional': {
    container: 'rounded-lg border border-gray-200 bg-white shadow-sm',
    card: 'rounded-lg border border-gray-200 bg-gray-50 p-4',
    subtleCard: 'rounded-lg bg-gray-100/50 p-3',
    input: 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500',
    button: 'rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors',
    secondaryButton: 'rounded-md border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors',
    text: 'text-gray-900',
    mutedText: 'text-gray-600',
  },
};

export const ThemeSelector = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'default' as const, name: 'Default', description: 'Balanced light/dark theme' },
    { id: 'glassmorphism' as const, name: 'Glassmorphism', description: 'Frosted glass with blur effects' },
    { id: 'neumorphism' as const, name: 'Neumorphism', description: 'Soft 3D depth with shadows' },
    { id: 'gradient' as const, name: 'Gradient', description: 'Vibrant gradients with glass accents' },
    { id: 'modern-dark' as const, name: 'Modern Dark', description: 'Enhanced dark with high contrast' },
    { id: 'light-professional' as const, name: 'Light Professional', description: 'Clean minimal light mode' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={themeStyles[currentTheme].secondaryButton + ' flex items-center gap-2'}
        aria-label="Select theme"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">Theme</span>
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
                Appearance Theme
              </h3>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                Choose your preferred visual style
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {themes.map((theme) => (
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
