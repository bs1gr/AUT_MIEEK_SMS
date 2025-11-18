import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import { AppearanceThemeProvider } from './contexts/AppearanceThemeContext';
import ErrorBoundary from './ErrorBoundary.tsx';
import { useLocation } from 'react-router-dom';
import LanguageSwitcher from './components/LanguageSwitcher';
import LogoutButton from './components/auth/LogoutButton';
import { Navigation, type NavigationTab, type NavigationView } from './components/layout';
import { useLanguage } from './LanguageContext';
import Toast from './components/ui/Toast';

import Footer from './components/Footer';
import { useAuth } from './contexts/AuthContext';

interface NavigationTabConfig {
  key: NavigationView;
  labelKey: string;
  path: string;
}

const NAV_TAB_CONFIG: NavigationTabConfig[] = [
  { key: 'dashboard', labelKey: 'dashboard', path: '/dashboard' },
  { key: 'attendance', labelKey: 'attendance', path: '/attendance' },
  { key: 'grading', labelKey: 'grades', path: '/grading' },
  { key: 'students', labelKey: 'students', path: '/students' },
  { key: 'courses', labelKey: 'courses', path: '/courses' },
  { key: 'calendar', labelKey: 'calendar', path: '/calendar' },
  { key: 'operations', labelKey: 'utilsTab', path: '/operations' },
  { key: 'power', labelKey: 'powerTab', path: '/power' },
];

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const navigationTabs = useMemo<NavigationTab[]>(
    () =>
      NAV_TAB_CONFIG.map(({ labelKey, ...tab }) => ({
        ...tab,
        label: t(labelKey),
      })),
    [t]
  );

  const isAuthenticated = Boolean(user);
  // Get active view from location
  const getActiveView = (): NavigationView => {
    const pathSegment = location.pathname.split('/')[1] || 'dashboard';
    const normalizedPath = pathSegment || 'dashboard';
    const match = NAV_TAB_CONFIG.find((tab) => tab.path.replace(/^\//, '') === normalizedPath);
    return match?.key ?? 'dashboard';
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-shell max-w-7xl mx-auto px-4 py-6 space-y-6 min-h-screen flex flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with Title and Language Toggle */}
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('systemTitle')}</h1>
          {!isAuthenticated && (
            <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
              {t('auth.loginDescription')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Top Navigation */}
      {isAuthenticated && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Navigation
            activeView={getActiveView()}
            tabs={navigationTabs}
          />
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <LogoutButton />
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="flex-1 w-full relative">{children}</div>

      <Footer />
    </div>
  );
}

interface AppProps {
  children: ReactNode;
}

const App = ({ children }: AppProps) => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ThemeProvider>
        <AppearanceThemeProvider>
          <ErrorBoundary>
            <AppLayout>{children}</AppLayout>
          </ErrorBoundary>
        </AppearanceThemeProvider>
      </ThemeProvider>
    </LanguageProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;
