import { useState, useEffect } from 'react';
import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';
import { useLocation } from 'react-router-dom';

const LINKEDIN_URL = 'https://www.linkedin.com/in/vasilis-samaras/';

// Injected at build time by vite.config.ts, same source the footer uses.
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

// Matches the year in the repository LICENSE file rather than the current year,
// so the notice does not silently drift away from the licence it refers to.
const COPYRIGHT_YEAR = 2025;

/**
 * Open-source projects this system is built on. Names are proper nouns and stay
 * untranslated; only the group labels go through i18n. Kept in sync by hand with
 * src/frontend/package.json and src/backend/requirements.txt.
 */
const CREDIT_STACK: ReadonlyArray<{ labelKey: string; items: readonly string[] }> = [
  {
    labelKey: 'system.creditsStackFrontend',
    items: [
      'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router', 'TanStack Query',
      'i18next', 'Recharts', 'Framer Motion', 'Zustand', 'React Hook Form', 'Zod', 'Axios',
    ],
  },
  {
    labelKey: 'system.creditsStackBackend',
    items: [
      'FastAPI', 'Starlette', 'Uvicorn', 'SQLAlchemy', 'Alembic', 'Pydantic',
      'PostgreSQL', 'psycopg', 'openpyxl', 'ReportLab',
    ],
  },
  {
    labelKey: 'system.creditsStackTooling',
    items: [
      'Capacitor', 'Docker', 'PyInstaller', 'Inno Setup', 'Vitest', 'Playwright', 'pytest',
    ],
  },
];

/**
 * System administration page - consolidates system health monitoring,
 * server control, administrative control panel, and credits.
 *
 * Previously known as PowerPage, renamed to SystemPage for clarity
 * and moved into operations feature module (v1.17.5+)
 */
export default function SystemPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const [showSystemHealth, setShowSystemHealth] = useState(false);

  // Auto-open control panel when URL contains ?showControl=1
  const [showControlPanel, setShowControlPanel] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('showControl') === '1';
    } catch {
      return false;
    }
  });

  const [showCredits, setShowCredits] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('showCredits') === '1';
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
        if (params.get('showCredits') === '1') setShowCredits(true);
        if (params.get('passwordChanged') === '1') setShowPasswordChangedBanner(true);
      }, 0);
      return () => clearTimeout(id);
    } catch {
      // ignore
    }
  }, [location.search]);

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

        <section id="system-credits-card" className="rounded-3xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('system.creditsCardTitle')}</h2>
              <p className="text-sm text-slate-500">{t('system.creditsCardDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCredits((prev) => !prev)}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0"
              aria-expanded={showCredits}
              aria-controls="system-credits-content"
              title={t('system.collapseHint')}
            >
              {showCredits ? t('system.hideCredits') : t('system.showCredits')}
            </button>
          </div>

          {showCredits && (
            <div id="system-credits-content" className="px-6 py-6">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                <img
                  src="/AUT_Logo_realistic_Credits.jpg"
                  alt={t('system.creditsLogoAlt')}
                  loading="lazy"
                  className="w-full max-w-sm self-center rounded-2xl border border-slate-200 shadow-sm lg:self-start"
                />

                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{t('system.creditsAppName')}</h3>
                    <p className="text-sm text-slate-600">{t('system.creditsAppSubtitle')}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t('system.creditsVersionLabel')}: <span className="font-mono">{APP_VERSION}</span>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                      {t('system.creditsAuthorHeading')}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-slate-900">{t('system.creditsAuthorName')}</p>
                    <p className="text-sm text-slate-600">{t('system.creditsAuthorRole')}</p>
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 px-4 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {/* Inline mark so the panel needs no network request to render */}
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
                      </svg>
                      {t('system.creditsLinkedIn')}
                      <span className="sr-only"> ({t('system.creditsOpensNewWindow')})</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                      {t('system.creditsInstitutionHeading')}
                    </h4>
                    <p className="mt-1 text-sm text-slate-700">{t('system.creditsInstitutionName')}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                      {t('system.creditsLicenceHeading')}
                    </h4>
                    <p className="mt-1 text-sm text-slate-700">{t('system.creditsLicenceBody')}</p>
                    <p className="text-sm text-slate-500">{t('system.creditsCopyright', { year: COPYRIGHT_YEAR })}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  {t('system.creditsStackHeading')}
                </h4>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {CREDIT_STACK.map((group) => (
                    <div key={group.labelKey}>
                      <dt className="text-sm font-medium text-slate-900">{t(group.labelKey)}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-slate-600">{group.items.join(' · ')}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-sm text-slate-500">{t('system.creditsThanks')}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
