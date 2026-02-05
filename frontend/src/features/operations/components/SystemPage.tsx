import { useState, useEffect, useCallback } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';
import { useLocation } from 'react-router-dom';
import { Activity, Settings } from 'lucide-react';

/**
 * System administration page - consolidates system health monitoring,
 * server control, and administrative control panel functionality
 *
 * Previously known as PowerPage, renamed to SystemPage for clarity
 * and moved into operations feature module (v1.17.5+)
 */
export default function SystemPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const [showSystemHealth, setShowSystemHealth] = useState(true);

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
        if (params.get('passwordChanged') === '1') setShowPasswordChangedBanner(true);
      }, 0);
      return () => clearTimeout(id);
    } catch {
      // ignore
    }
  }, [location.search]);

  const scrollToSection = useCallback((targetId: string) => {
    if (typeof window === 'undefined') return;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenSystemHealth = useCallback(() => {
    setShowSystemHealth(true);
    scrollToSection('system-health-card');
  }, [scrollToSection]);

  const handleOpenControlPanel = useCallback(() => {
    setShowControlPanel(true);
    scrollToSection('system-control-panel-card');
  }, [scrollToSection]);

  return (
    <div className="space-y-8">
      {showPasswordChangedBanner && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">
            {t('system.passwordBannerTitle')}
          </p>
          <p className="text-sm text-emerald-800">{t('system.passwordBannerBody')}</p>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {t('system.heroTitle')}
            </p>
            <p className="text-base text-slate-700 max-w-3xl">{t('system.heroSubtitle')}</p>
          </div>
          <div className="space-y-2 lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t('system.quickActions')}
            </p>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <button
                type="button"
                onClick={handleOpenSystemHealth}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Activity className="h-4 w-4" />
                {t('system.openHealth')}
              </button>
              <button
                type="button"
                onClick={handleOpenControlPanel}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Settings className="h-4 w-4" />
                {t('system.openControlPanel')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <section id="system-health-card" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('system.healthCardTitle')}</h2>
                <p className="text-sm text-gray-500">{t('system.healthCardDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSystemHealth((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-expanded={showSystemHealth}
                aria-controls="system-health-content"
                title={t('system.collapseHint')}
              >
                {showSystemHealth ? t('hideSystemHealth') : t('showSystemHealth')}
              </button>
            </div>
          </div>
          {showSystemHealth && (
            <div id="system-health-content" className="px-6 py-5">
              <ServerControl />
            </div>
          )}
        </section>

        <section id="system-control-panel-card" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('system.controlCardTitle')}</h2>
              <p className="text-sm text-gray-500">{t('system.controlCardDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowControlPanel((prev) => !prev)}
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0"
              aria-expanded={showControlPanel}
              aria-controls="system-control-panel-content"
              title={t('system.collapseHint')}
            >
              {showControlPanel ? t('hideControlPanel') : t('showControlPanel')}
            </button>
          </div>
          {showControlPanel && (
            <div id="system-control-panel-content" className="px-6 py-5">
              <ControlPanel showTitle={false} variant="embedded" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
