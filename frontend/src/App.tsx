import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import { AppearanceThemeProvider } from './contexts/AppearanceThemeContext';
import ErrorBoundary from './ErrorBoundary.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from './components/LanguageSwitcher';
import LogoutButton from './components/auth/LogoutButton';
import { Navigation, type NavigationTab, type NavigationView } from './components/layout';
import { useLanguage } from './LanguageContext';
import Toast from './components/ui/Toast';
import NotificationBell from './components/NotificationBell';

import Footer from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import ChangePasswordPromptModal from './components/modals/ChangePasswordPromptModal';
import BackendStatusBanner from './components/common/BackendStatusBanner';
import UserFeedbackModal from './components/UserFeedbackModal';

interface NavigationTabConfig {
  key: NavigationView;
  labelKey: string;
  path: string;
}

const NAV_TAB_CONFIG: NavigationTabConfig[] = [
  { key: 'dashboard', labelKey: 'dashboard', path: '/dashboard' },
  { key: 'analytics', labelKey: 'analytics', path: '/analytics' },
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
  const navigate = useNavigate();
  const { user, isInitializing, accessToken } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Show password change prompt if user has password_change_required=true
  useEffect(() => {
    if (user && typeof user === 'object' && 'password_change_required' in user && user.password_change_required) {
      // Avoid synchronous setState inside effect to prevent cascading renders in tests/runtime.
      // Schedule change in a microtask so effect finishes before commit.
      const id = setTimeout(() => setShowPasswordPrompt(true), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [user]);

  const handleOpenPasswordForm = () => {
    // Navigate to the power/control panel page and open the embedded control panel
    // Add a query flag so PowerPage can auto-expand the control panel UI
    navigate('/power?showControl=1');
    setShowPasswordPrompt(false);
  };

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

  // Show loading state while initializing auth
  if (isInitializing) {
    return (
      <div className="app-shell max-w-7xl mx-auto px-4 py-6 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const handleSubmitFeedback = async (feedback: string) => {
    try {
      const response = await fetch('/api/v1/feedback/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setToast({ message: t('feedback.success'), type: 'success' });
    } catch (error) {
      console.error('Feedback error:', error);
      setToast({ message: t('feedback.error'), type: 'error' });
    }
  };

  return (
    <div className="app-shell max-w-7xl mx-auto px-4 py-6 space-y-6 min-h-screen flex flex-col relative z-10">
      {/* Backend Status Banner - appears at top when backend is unavailable */}
      <BackendStatusBanner />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Password Change Prompt Modal */}
      <ChangePasswordPromptModal
        isOpen={showPasswordPrompt}
        onOpenPasswordForm={handleOpenPasswordForm}
      />

      {/* Header with Title and Language Toggle */}
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1 pointer-events-none z-0">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 pointer-events-none z-0">{t('systemTitle')}</h1>
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
            <NotificationBell authToken={accessToken || undefined} />
            <LogoutButton />
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="flex-1 w-full relative">{children}</div>

      {/* Feedback Button fixed at bottom right */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          className="px-4 py-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 text-sm"
          onClick={() => setShowFeedback(true)}
          type="button"
        >
          {t('feedback.title')}
        </button>
      </div>
      <UserFeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={handleSubmitFeedback}
      />
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
