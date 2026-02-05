import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<OperationsTabKey>(() => {
    // Check query parameter first (e.g., /operations?tab=reports)
    const tabParam = searchParams.get('tab');
    if (tabParam && isValidTab(tabParam)) {
      return tabParam;
    }
    // Fall back to navigation state
    const state = (location.state ?? {}) as OperationsLocationState;
    return normalizeTab(state.tab) ?? DEFAULT_TAB;
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [jobIdInput, setJobIdInput] = useState('');
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);

  // Toast auto-close effect
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
    { key: 'exports', label: t('exportTabLabel', { ns: 'export' }) || 'Export' },
    { key: 'imports', label: t('importsTabLabel', { ns: 'export' }) || 'Imports' },
    { key: 'settings', label: t('settingsTabLabel', { ns: 'export' }) || 'Settings' },
    { key: 'reports', label: t('reports', { ns: 'customReports' }) || 'Reports' },
    { key: 'help', label: t('helpTitle', { ns: 'help' }) || 'Help' },
  ];

  const buildTemplateLink = (params: { report_type?: string; format?: string; query?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.report_type) queryParams.set('report_type', params.report_type);
    if (params.format) queryParams.set('format', params.format);
    if (params.query) queryParams.set('query', params.query);
    const queryString = queryParams.toString();
    return `/operations/reports/templates${queryString ? `?${queryString}` : ''}`;
  };

  const headerTitle = t('utilitiesTitle', { ns: 'utils' });
  const headerSubtitle = t('utilitiesSubtitle', { ns: 'utils' });

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
            {t('utilitiesBadge', { ns: 'utils' })}
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
                  <div className="text-lg font-semibold text-slate-900">{t('jobMonitorTitle', { ns: 'export' })}</div>
                  <p className="text-sm text-slate-600">{t('jobMonitorHelper', { ns: 'export' })}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="text-sm text-slate-700" htmlFor="job-id-input">
                    {t('jobMonitorInputLabel', { ns: 'export' })}
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
                      {t('jobMonitorStart', { ns: 'export' })}
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
                  <h2 className="text-lg font-semibold text-slate-900">{t('customReports', { ns: 'customReports' })}</h2>
                  <p className="text-sm text-slate-600">{t('helpDragFields', { ns: 'customReports' })}</p>
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
                    <h3 className="font-semibold text-slate-900">{t('viewAll', { ns: 'customReports' })}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('myReports', { ns: 'customReports' })}</p>
                </Link>

                {/* Create New Report */}
                <Link
                  to="/operations/reports/builder"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">✏️</div>
                    <h3 className="font-semibold text-slate-900">{t('createNew', { ns: 'customReports' })}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('reportBuilder', { ns: 'customReports' })}</p>
                </Link>

                {/* Browse Templates */}
                <Link
                  to="/operations/reports/templates"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">📚</div>
                    <h3 className="font-semibold text-slate-900">{t('templates', { ns: 'customReports' })}</h3>
                  </div>
                  <p className="text-xs text-slate-600">{t('standardTemplates', { ns: 'customReports' })}</p>
                </Link>
              </div>

              {/* Report Types Submenu */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('entityType', { ns: 'customReports' })}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Link
                    to={buildTemplateLink({ report_type: 'student' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">👥</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_students', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'course' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">📚</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_courses', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'grade' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">⭐</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_grades', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'attendance' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">✅</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_attendance', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'student', query: 'enrollment' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">📊</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_enrollments', { ns: 'customReports' })}</p>
                  </Link>
                </div>
              </div>

              {/* Output Formats Submenu */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('outputFormat', { ns: 'customReports' })}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link
                    to={buildTemplateLink({ format: 'pdf' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-lg font-bold text-indigo-600">📄</p>
                    <p className="text-xs font-medium text-slate-700">{t('format_pdf', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ format: 'excel' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-lg font-bold text-indigo-600">📊</p>
                    <p className="text-xs font-medium text-slate-700">{t('format_excel', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ format: 'csv' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-lg font-bold text-indigo-600">📋</p>
                    <p className="text-xs font-medium text-slate-700">{t('format_csv', { ns: 'customReports' })}</p>
                  </Link>
                </div>
              </div>

              {/* Analytics Templates */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('analyticsTemplates', { ns: 'customReports' })}</h3>
                <Link
                  to={`/operations/reports/templates?tab=analytics`}
                  className="inline-flex items-center gap-3 rounded-lg border-2 border-orange-200 bg-white px-6 py-4 transition hover:border-orange-400 hover:bg-orange-50"
                >
                  <p className="text-2xl">📊</p>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{t('analyticsTemplates', { ns: 'customReports' })}</p>
                    <p className="text-xs text-slate-600">{t('viewAnalyticsTemplates', { ns: 'customReports' })}</p>
                  </div>
                  <span className="ml-auto text-orange-600 font-semibold">→</span>
                </Link>
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
