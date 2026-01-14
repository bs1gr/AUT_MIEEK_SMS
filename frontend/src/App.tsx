import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Lazy load admin pages for better performance and code splitting.
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const ImportExportPage = lazy(() => import('./pages/admin/ImportExportPage'));

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Routes within the main application layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>
              }
            />
            <Route
              path="/admin/import-export"
              element={
                <ProtectedRoute roles={['admin']} permissions={['imports:view', 'exports:view']}><ImportExportPage /></ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
