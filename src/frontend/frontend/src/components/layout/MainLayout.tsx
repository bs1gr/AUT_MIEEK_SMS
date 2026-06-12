import React from 'react';
import { Outlet } from 'react-router-dom';
import PwaReloadPrompt from '../common/PwaReloadPrompt';
import PwaInstallPrompt from '../common/PwaInstallPrompt';
import '../../mobile.css';

/**
 * Main layout wrapper for the application.
 * Includes the PWA reload prompt to handle updates and offline readiness globally.
 * Includes the PWA install prompt for installable devices.
 * Use this component to wrap your main routes.
 */
const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <Outlet />
      </main>
      <PwaReloadPrompt />
      <PwaInstallPrompt />
    </div>
  );
};

export default MainLayout;
