import { lazy } from 'react';

/**
 * Route-based code splitting configuration
 *
 * Each route is lazy-loaded independently to optimize initial bundle size.
 * Critical routes (dashboard, students) can be preloaded on idle for faster navigation.
 */

// Authentication (loaded immediately)
export const AuthPage = lazy(() => import('./pages/AuthPage'));

// High-priority routes (preload on idle)
export const DashboardPage = lazy(() =>
  import(/* webpackChunkName: "dashboard" */ './pages/DashboardPage')
);

export const StudentsPage = lazy(() =>
  import(/* webpackChunkName: "students" */ './pages/StudentsPage')
);

// Standard routes (load on demand)
export const StudentProfilePage = lazy(() =>
  import(/* webpackChunkName: "student-profile" */ './pages/StudentProfilePage')
);

export const CoursesPage = lazy(() =>
  import(/* webpackChunkName: "courses" */ './pages/CoursesPage')
);

export const AttendancePage = lazy(() =>
  import(/* webpackChunkName: "attendance" */ './pages/AttendancePage')
);

export const GradingPage = lazy(() =>
  import(/* webpackChunkName: "grading" */ './pages/GradingPage')
);

export const CalendarPage = lazy(() =>
  import(/* webpackChunkName: "calendar" */ './pages/CalendarPage')
);

export const SearchPage = lazy(() =>
  import(/* webpackChunkName: "search" */ './pages/SearchPage')
);

// Low-priority routes (load only when needed)
export const OperationsPage = lazy(() =>
  import(/* webpackChunkName: "operations" */ './pages/OperationsPage')
);

// System/Power page moved to operations feature module (v1.17.5+)
export const PowerPage = lazy(() =>
  import(/* webpackChunkName: "system" */ './features/operations').then(m => ({ default: m.SystemPage }))
);

// Admin/RBAC page moved to admin feature module (v1.17.5+)
export const AdminPermissionsPage = lazy(() =>
  import(/* webpackChunkName: "admin-permissions" */ './features/admin').then(m => ({ default: m.PermissionsPage }))
);

/**
 * Preload critical routes on browser idle
 * Called after initial app load to improve subsequent navigation
 */
export function preloadCriticalRoutes() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload dashboard and students (most commonly accessed)
      import('./pages/DashboardPage');
      import('./pages/StudentsPage');
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      import('./pages/DashboardPage');
      import('./pages/StudentsPage');
    }, 1000);
  }
}

export default {
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
  SearchPage,
  preloadCriticalRoutes,
};
