import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';

import { useLanguage } from '@/LanguageContext';
import ExportCenter from '@/components/tools/ExportCenter';
import HelpDocumentation from '@/components/tools/HelpDocumentation';
import ImportPreviewPanel from '@/components/tools/ImportPreviewPanel';
import JobProgressMonitor from '@/components/tools/JobProgressMonitor';
import AppearanceThemeSelector from '@/features/operations/components/AppearanceThemeSelector';
import Toast from '@/components/ui/Toast';
import { type ToastState } from '@/features/operations/components/DevToolsPanel';
import {
  OPERATIONS_TAB_KEYS,
  type LegacyOperationsTabKey,
  type OperationsLocationState,
  type OperationsTabKey,
} from '@/features/operations/types';

type OperationsViewProps = {
  students?: unknown[];
};

const isValidTab = (value: unknown): value is OperationsTabKey =>
  OPERATIONS_TAB_KEYS.includes(value as OperationsTabKey);

const normalizeTab = (tab?: LegacyOperationsTabKey): OperationsTabKey | null => {
  if (!tab) return null;
  return isValidTab(tab) ? tab : null;
};

const DEFAULT_TAB: OperationsTabKey = 'exports';

const OperationsView = (_props: OperationsViewProps) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<OperationsTabKey>(() => {
    const state = (location.state ?? {}) as OperationsLocationState;
    return normalizeTab(state.tab) ?? DEFAULT_TAB;
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [jobIdInput, setJobIdInput] = useState('');
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);

  // handleToast previously forwarded to children; not needed here

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Derive a forced tab from navigation state without setting state inside an effect
  const forcedTab: OperationsTabKey | null = useMemo(() => {
    const state = (location.state ?? {}) as OperationsLocationState;
    const desired = normalizeTab(state.tab);
    if (desired) return desired;
    if (state.scrollTo) return 'exports';
    return null;
  }, [location.state]);

  const effectiveTab = forcedTab ?? activeTab;

  const tabItems: Array<{ key: OperationsTabKey; label: string }> = [
    { key: 'exports', label: t('exportTabLabel') || 'Export' },
    { key: 'imports', label: t('importsTabLabel') || 'Imports' },
    { key: 'settings', label: t('settingsTabLabel') || 'Settings' },
    { key: 'reports', label: t('customReports:reports') || 'Reports' },
    { key: 'help', label: t('helpTitle') || 'Help' },
  ];

  const headerTitle = t('utils.utilitiesTitle');
  const headerSubtitle = t('utils.utilitiesSubtitle');

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{headerTitle}</h1>
            <p className="text-sm text-slate-600">{headerSubtitle}</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <ShieldCheck size={16} aria-hidden="true" />
            {t('utils.utilitiesBadge')}
          </span>
        </div>
      </header>

      <div role="tablist" aria-label={headerTitle} className="flex flex-wrap gap-2">
        {tabItems.map(({ key, label }) => {
          const isActive = key === effectiveTab;
          const accessibilityProps = isActive
            ? ({ 'aria-selected': 'true', tabIndex: 0 } as const)
            : ({ 'aria-selected': 'false', tabIndex: -1 } as const);

          return (
            <button
              key={key}
              id={`operations-tab-${key}`}
              type="button"
              role="tab"
              aria-controls={`operations-panel-${key}`}
              onClick={() => setActiveTab(key)}
              {...accessibilityProps}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`operations-panel-${effectiveTab}`}
        aria-labelledby={`operations-tab-${effectiveTab}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
      >
        {effectiveTab === 'exports' && <ExportCenter variant="embedded" />}
        {effectiveTab === 'imports' && (
          <div className="space-y-6">
            <ImportPreviewPanel
              onJobCreated={(jobId) => {
                setTrackedJobId(jobId);
                setJobIdInput(jobId);
              }}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{t('jobMonitorTitle')}</div>
                  <p className="text-sm text-slate-600">{t('jobMonitorHelper')}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="text-sm text-slate-700" htmlFor="job-id-input">
                    {t('jobMonitorInputLabel')}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="job-id-input"
                      type="text"
                      value={jobIdInput}
                      onChange={(e) => setJobIdInput(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-64"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={() => setTrackedJobId(jobIdInput.trim() || null)}
                    >
                      {t('jobMonitorStart')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <JobProgressMonitor jobId={trackedJobId} />
              </div>
            </div>
          </div>
        )}
        {effectiveTab === 'reports' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
              <div className="mb-6 flex items-center gap-3">
                <FileText className="h-6 w-6 text-indigo-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t('customReports:customReports')}</h2>
                  <p className="text-sm text-slate-600">{t('customReports:helpDragFields')}</p>
                </div>
              </div>

              {/* Reports Menu Grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* View All Reports */}
                <Link
                  to="/operations/reports"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">📋</div>
                    <h3 className="font-semibold text-slate-900">{t('customReports:viewAll')}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('customReports:myReports')}</p>
                </Link>

                {/* Create New Report */}
                <Link
                  to="/operations/reports/builder"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">✏️</div>
                    <h3 className="font-semibold text-slate-900">{t('customReports:createNew')}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('customReports:reportBuilder')}</p>
                </Link>

                {/* Browse Templates */}
                <Link
                  to="/operations/reports/templates"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">📚</div>
                    <h3 className="font-semibold text-slate-900">{t('customReports:templates')}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('customReports:standardTemplates')}</p>
                </Link>
              </div>

              {/* Report Types Submenu */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('customReports:entityType')}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-center hover:bg-slate-50">
                    <div className="text-lg font-bold text-indigo-600">👥</div>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:entity_students')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-center hover:bg-slate-50">
                    <div className="text-lg font-bold text-indigo-600">📚</div>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:entity_courses')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-center hover:bg-slate-50">
                    <div className="text-lg font-bold text-indigo-600">⭐</div>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:entity_grades')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-center hover:bg-slate-50">
                    <div className="text-lg font-bold text-indigo-600">✅</div>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:entity_attendance')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-center hover:bg-slate-50">
                    <div className="text-lg font-bold text-indigo-600">📊</div>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:entity_enrollments')}</p>
                  </div>
                </div>
              </div>

              {/* Output Formats Submenu */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('customReports:outputFormat')}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
                    <p className="text-lg font-bold text-indigo-600">📄</p>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:format_pdf')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
                    <p className="text-lg font-bold text-indigo-600">📊</p>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:format_excel')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
                    <p className="text-lg font-bold text-indigo-600">📋</p>
                    <p className="text-xs font-medium text-slate-700">{t('customReports:format_csv')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {effectiveTab === 'help' && <HelpDocumentation />}
        {effectiveTab === 'settings' && (
          <div className="space-y-6">
            <AppearanceThemeSelector />
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsView;
