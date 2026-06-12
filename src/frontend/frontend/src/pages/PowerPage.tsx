import { useState, useEffect } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
// import { RBACPanel } from '@/components/admin/RBACPanel';
import { useLanguage } from '@/LanguageContext';
// Monitoring features (Grafana/Prometheus/Raw Metrics) have been removed as per v1.8.3 decision.

import { useLocation } from 'react-router-dom';

/**
 * @deprecated This file is deprecated as of v1.17.5
 * PowerPage has been moved to features/operations/components/SystemPage.tsx
 * This file is kept for backward compatibility with legacy routes
 * Import from: @/features/operations/SystemPage instead
 */
export default function PowerPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  // const [showRBACPanel, setShowRBACPanel] = useState(false);
  // Auto-open control panel when URL contains ?showControl=1
  const [showControlPanel, setShowControlPanel] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('showControl') === '1';
    } catch {
      return false;
    }
  });
  const [showPasswordChangedBanner, setShowPasswordChangedBanner] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('passwordChanged') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // If route changes and query param exists, respect it
    try {
      const params = new URLSearchParams(location.search);
      const id = setTimeout(() => {
        if (params.get('showControl') === '1') setShowControlPanel(true);
        if (params.get('showSystemHealth') === '1') setShowSystemHealth(true);
        if (params.get('passwordChanged') === '1') setShowPasswordChangedBanner(true);
      }, 0);
      return () => clearTimeout(id);
    } catch {
      // ignore
    }
  }, [location.search]);

  return (
    <div className="space-y-6">
      {showPasswordChangedBanner && (
        <div className="rounded-md bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-sm font-medium text-emerald-800">{t('passwordChangedConfirmation') || 'Password changed successfully'}</p>
        </div>
      )}
      {showSystemHealth && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-indigo-800 drop-shadow-sm">{t('systemHealth')}</h2>
          </div>
          <div className="p-6">
            <ServerControl />
          </div>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold text-indigo-800 drop-shadow-sm">{t('title')}</h2>
          <button
            type="button"
            onClick={() => setShowControlPanel((prev) => !prev)}
            className="text-sm font-medium text-indigo-700 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white rounded-lg px-3 py-1.5"
          >
            {showControlPanel ? t('hideControlPanel') : t('showControlPanel')}
          </button>
        </div>
        {showControlPanel && (
          <ControlPanel showTitle={false} variant="embedded" />
        )}
      </div>

      {/* RBACPanel moved to ControlPanel Maintenance tab, admin-only */}
    </div>
  );

}
