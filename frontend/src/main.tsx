import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n/config'; // Initialize i18n before rendering
// import './pwa-register'; // DISABLED for development - causes MIME type errors
import { AuthProvider } from '@/contexts/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';
import RequireAdmin from '@/components/auth/RequireAdmin';

// Import route components and preload utility
import { Suspense } from 'react';
import Spinner from './components/ui/Spinner';
import {
  AuthPage,
  DashboardPage,
  StudentsPage,
  StudentProfilePage,
  CoursesPage,
  AttendancePage,
  GradingPage,
  CalendarPage,
  OperationsPage,
  PowerPage,
  AdminPermissionsPage,
  ImportExportPage,
  AnalyticsPage,
  SearchPage,
  ReportBuilderPage,
  ReportListPage,
  ReportTemplateBrowserPage,
  preloadCriticalRoutes,
} from './routes';

// Initialize global error handlers without forcing the module into the main chunk
void import('./utils/errorReporting')
  .then(({ initializeErrorReporting }) => initializeErrorReporting())
  .catch((error) => {
    console.error('[error-reporting] Failed to initialize error reporting', error);
  });

// Preload critical routes after initial render
setTimeout(preloadCriticalRoutes, 100);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <AuthProvider>
      <App>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:id" element={<StudentProfilePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/grading" element={<GradingPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/power" element={<PowerPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              {/* Reports: Custom report builder and management */}
              <Route path="/reports" element={<ReportListPage />} />
              <Route path="/reports/builder" element={<ReportBuilderPage />} />
              <Route path="/reports/builder/:id" element={<ReportBuilderPage />} />
              <Route path="/reports/templates" element={<ReportTemplateBrowserPage />} />
              {/* Admin: Permissions management */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
                <Route path="/admin/import-export" element={<ImportExportPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </App>
    </AuthProvider>
  </BrowserRouter>
);
