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
    <div className="space-y-10">
      {showPasswordChangedBanner && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">
            {t('system.passwordBannerTitle')}
          </p>
          <p className="text-sm text-emerald-800">{t('system.passwordBannerBody')}</p>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50 to-purple-50 p-6 shadow-md">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
              {t('system.heroTitle')}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {t('system.powerPageTitle') || 'MIEEK System Operations Center'}
            </h1>
            <p className="text-base text-slate-700 max-w-3xl">{t('system.heroSubtitle')}</p>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        <section id="system-health-card" className="rounded-3xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t('system.healthCardTitle')}</h2>
                <p className="text-sm text-slate-500">{t('system.healthCardDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSystemHealth((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

        <section id="system-control-panel-card" className="rounded-3xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('system.controlCardTitle')}</h2>
              <p className="text-sm text-slate-500">{t('system.controlCardDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowControlPanel((prev) => !prev)}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0"
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
