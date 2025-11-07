import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n/config'; // Initialize i18n before rendering
import { initializeErrorReporting } from './utils/errorReporting';

// Lazy load page components
import { lazy, Suspense } from 'react';
import Spinner from './components/ui/Spinner';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const GradingPage = lazy(() => import('./pages/GradingPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const OperationsPage = lazy(() => import('./pages/OperationsPage'));
const PowerPage = lazy(() => import('./pages/PowerPage'));

// Initialize global error handlers
initializeErrorReporting();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <App>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentProfilePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/grading" element={<GradingPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/power" element={<PowerPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </App>
  </BrowserRouter>
);
