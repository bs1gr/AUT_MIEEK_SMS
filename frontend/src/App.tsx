import React, { ReactNode, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Power } from 'lucide-react';
import { ThemeProvider } from './ThemeContext';
import { AppearanceThemeProvider } from './contexts/AppearanceThemeContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import Navigation, { type NavigationTab } from './components/layout/Navigation';
import { useAuth } from './contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

// Create a QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface AppProps {
  children: ReactNode;
}

// Inner component that uses language context
const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationTabs = useMemo<NavigationTab[]>(
    () => [
      { key: 'dashboard', label: t('dashboard'), path: '/dashboard' },
      { key: 'search', label: t('searchTab'), path: '/search' },
      { key: 'attendance', label: t('attendance'), path: '/attendance' },
      { key: 'grading', label: t('grades'), path: '/grading' },
      { key: 'students', label: t('students'), path: '/students' },
      { key: 'courses', label: t('courses'), path: '/courses' },
      { key: 'calendar', label: t('calendar'), path: '/calendar' },
      { key: 'operations', label: t('utilsTab'), path: '/operations' },
      { key: 'system', label: t('powerTab'), path: '/power' },
    ],
    [t]
  );

  const getActiveView = () => {
    const pathSegment = location.pathname.split('/')[1] || 'dashboard';
    return (pathSegment as any) || 'dashboard';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('[App] Logout failed', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* Header with Title and Language Toggle */}
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('systemTitle')}</h1>
        <LanguageSwitcher />
      </div>

      {/* Navigation + Logout - only show when authenticated */}
      {user && (
        <div className="flex items-center justify-between gap-4">
          <Navigation activeView={getActiveView()} tabs={navigationTabs} />
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label={t('logout')}
            data-testid="logout-button"
            title={t('logout')}
          >
            <Power className="h-5 w-5" />
          </button>
        </div>
      )}

      {children}
    </div>
  );
};

const App: React.FC<AppProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppearanceThemeProvider>
            <LanguageProvider>
              <AppLayout>{children}</AppLayout>
            </LanguageProvider>
          </AppearanceThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
