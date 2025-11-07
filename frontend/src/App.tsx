import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LanguageProvider } from './LanguageContext';
import { ThemeProvider } from './ThemeContext';
import ErrorBoundary from './ErrorBoundary.tsx';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import LanguageSwitcher from './components/LanguageSwitcher';
import { Navigation } from './components/layout';
import { useLanguage } from './LanguageContext';
import Toast from './components/ui/Toast';
import { useState } from 'react';
import { useCourses, useStudents } from './hooks';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch initial data for the entire app
  useCourses();
  useStudents();

  // Get active view from location
  const getActiveView = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path as any;
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with Title and Language Toggle */}
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('systemTitle')}</h1>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Top Navigation */}
      <Navigation
        activeView={getActiveView()}
        tabs={[
          { key: 'dashboard', label: t('dashboard'), path: '/dashboard' },
          { key: 'attendance', label: t('attendance'), path: '/attendance' },
          { key: 'grading', label: t('grades'), path: '/grading' },
          { key: 'students', label: t('students'), path: '/students' },
          { key: 'courses', label: t('courses'), path: '/courses' },
          { key: 'calendar', label: t('calendar'), path: '/calendar' },
          { key: 'operations', label: t('utilsTab'), path: '/operations' },
          { key: 'power', label: t('powerTab') || 'Power', path: '/power' },
        ]}
      />

      {/* Page Content */}
      {children}
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
        <ErrorBoundary>
          <AppLayout>{children}</AppLayout>
        </ErrorBoundary>
      </ThemeProvider>
    </LanguageProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;
