import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, FileText } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import apiClient from '@/api/api';
import ExportCenter from '@/components/tools/ExportCenter';
import HelpDocumentation from '@/components/tools/HelpDocumentation';
import ImportPreviewPanel from '@/components/tools/ImportPreviewPanel';
import JobProgressMonitor from '@/components/tools/JobProgressMonitor';
import AppearanceThemeSelector from '@/features/operations/components/AppearanceThemeSelector';
import Toast from '@/components/ui/Toast';
import { type ToastState } from '@/features/operations/components/DevToolsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useDateTimeFormatter, useDateTimeSettings } from '@/contexts/DateTimeSettingsContext';
import { DATE_FORMAT_OPTIONS, TIME_ZONE_OPTIONS, type DateFormatOption } from '@/utils/dateTime';
import {
  OPERATIONS_TAB_KEYS,
  type LegacyOperationsTabKey,
  type OperationsLocationState,
  type OperationsTabKey,
} from '@/features/operations/types';

type OperationsViewProps = {
  students?: unknown[];
};

type FeedbackEntry = {
  id: number;
  source: 'app' | 'github' | string;
  kind?: string | null;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  author?: string | null;
  created_at?: string | null;
  received_at: string;
  repository?: string | null;
  metadata?: Record<string, unknown> | null;
  archived?: boolean;
};

type FeedbackImportItem = {
  kind: string;
  title: string;
  body?: string | null;
  url?: string | null;
  author?: string | null;
  created_at?: string | null;
  repository?: string | null;
  source_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: unknown;
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
  const studentIdParam = searchParams.get('studentId');
  const courseIdParam = searchParams.get('courseId');
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
  const { user } = useAuth();
  const [broadcastType, setBroadcastType] = useState('system');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'role' | 'users'>('all');
  const [broadcastRole, setBroadcastRole] = useState('teacher');
  const [broadcastUserIds, setBroadcastUserIds] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<'all' | 'app' | 'github'>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [feedbackImportJson, setFeedbackImportJson] = useState('');
  const [feedbackImporting, setFeedbackImporting] = useState(false);
  const [feedbackImportError, setFeedbackImportError] = useState<string | null>(null);
  const [feedbackImportSuccess, setFeedbackImportSuccess] = useState<string | null>(null);
  const { timeZone, dateFormat, setTimeZone, setDateFormat } = useDateTimeSettings();
  const { formatDateTime } = useDateTimeFormatter();

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
    { key: 'notifications', label: t('admin.tabLabel', { ns: 'notifications' }) || 'Notifications' },
    { key: 'help', label: t('helpTitle', { ns: 'help' }) || 'Help' },
  ];

  const isAdmin = user?.role === 'admin';

  const notificationTypeOptions = useMemo(
    () => [
      { value: 'system', label: t('types.system', { ns: 'notifications' }) },
      { value: 'announcement', label: t('types.announcement', { ns: 'notifications' }) },
      { value: 'course', label: t('types.course', { ns: 'notifications' }) },
      { value: 'grade', label: t('types.grade', { ns: 'notifications' }) },
      { value: 'attendance', label: t('types.attendance', { ns: 'notifications' }) },
      { value: 'enrollment', label: t('types.enrollment', { ns: 'notifications' }) },
      { value: 'general', label: t('types.general', { ns: 'notifications' }) },
    ],
    [t]
  );

  const canManageFeedback = user?.role === 'admin' || user?.role === 'teacher';

  const feedbackSourceOptions = useMemo(
    () => [
      { value: 'all', label: t('feedbackInbox.sourceAll', { ns: 'notifications' }) },
      { value: 'app', label: t('feedbackInbox.sourceApp', { ns: 'notifications' }) },
      { value: 'github', label: t('feedbackInbox.sourceGithub', { ns: 'notifications' }) },
    ],
    [t]
  );

  const unwrapResponse = <T,>(response: ApiResponse<T> | T): T => {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as ApiResponse<T>).data as T;
    }
    return response as T;
  };

  const parseFeedbackItems = (raw: unknown): FeedbackImportItem[] => {
    const payload = raw as { items?: unknown } | unknown[];
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

    return list
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const data = item as Record<string, unknown>;
        const kind = (data.kind || data.type) as string | undefined;
        const title = (data.title || data.subject || data.name) as string | undefined;
        if (!kind || !title) return null;

        const createdAt = (data.created_at || data.createdAt || data.created) as string | undefined;
        const url = (data.url || data.html_url || data.htmlUrl) as string | undefined;
        const author = (data.author || data.user || data.username) as string | undefined;
        const repository = (data.repository || data.repo) as string | undefined;
        const sourceId = (data.source_id || data.id || data.node_id || data.number) as string | number | undefined;
        const body = (data.body || data.text || data.content) as string | undefined;

        return {
          kind,
          title,
          body,
          url,
          author,
          created_at: createdAt,
          repository,
          source_id: sourceId !== undefined ? String(sourceId) : undefined,
          metadata: data.metadata as Record<string, unknown> | undefined,
        } as FeedbackImportItem;
      })
      .filter((item): item is FeedbackImportItem => Boolean(item));
  };

  const feedbackTemplates = useMemo(
    () => ({
      issues: [
        {
          kind: 'issue',
          title: 'Installer language selector defaults to Greek',
          body: 'Reproduce: run installer → welcome screen shows Greek regardless of selection.',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/issues/123',
          author: 'reporter',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
      issueComments: [
        {
          kind: 'issue_comment',
          title: 'Issue Comment #123',
          body: 'Confirmed on Windows 11. Happens when installer is run with /LANG=el.',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/issues/123#issuecomment-1',
          author: 'contributor',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
      prs: [
        {
          kind: 'pr',
          title: 'fix(installer): enforce language dialog selection',
          body: 'Adds ShowLanguageDialog=yes and improves locale detection.',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/pull/456',
          author: 'maintainer',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
      reviewComments: [
        {
          kind: 'review_comment',
          title: 'PR Review Comment #456',
          body: 'Looks good—can we add a guard for missing registry values?',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/pull/456#discussion_r1',
          author: 'reviewer',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
      discussions: [
        {
          kind: 'discussion',
          title: 'Feedback: export center navigation',
          body: 'The new Reports hub is great—can we add a shortcut to attendance exports?',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/discussions/789',
          author: 'user',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
      discussionComments: [
        {
          kind: 'discussion_comment',
          title: 'Discussion Comment #789',
          body: 'Agree—maybe add this under performance breakdown exports.',
          url: 'https://github.com/bs1gr/AUT_MIEEK_SMS/discussions/789#discussioncomment-1',
          author: 'helper',
          created_at: new Date().toISOString(),
          repository: 'bs1gr/AUT_MIEEK_SMS',
        },
      ],
    }),
    []
  );

  const applyFeedbackTemplate = (items: FeedbackImportItem[]) => {
    setFeedbackImportJson(JSON.stringify(items, null, 2));
    setFeedbackImportError(null);
    setFeedbackImportSuccess(null);
  };

  const handleSendNotification = async () => {
    if (!broadcastTitle.trim()) {
      setToast({ message: t('admin.validationTitle', { ns: 'notifications' }), type: 'error' });
      return;
    }
    if (!broadcastMessage.trim()) {
      setToast({ message: t('admin.validationMessage', { ns: 'notifications' }), type: 'error' });
      return;
    }

    let userIds: number[] | undefined;
    let roleFilter: string | undefined;

    if (broadcastTarget === 'role') {
      roleFilter = broadcastRole;
    } else if (broadcastTarget === 'users') {
      const parsed = broadcastUserIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

      if (!parsed.length) {
        setToast({ message: t('admin.validationUsers', { ns: 'notifications' }), type: 'error' });
        return;
      }
      userIds = parsed;
    }

    setBroadcastSending(true);
    try {
      await apiClient.post('/notifications/broadcast', {
        notification_type: broadcastType,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        user_ids: userIds,
        role_filter: roleFilter,
      });

      setToast({ message: t('admin.success', { ns: 'notifications' }), type: 'success' });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastUserIds('');
    } catch (error) {
      console.error('Failed to broadcast notification:', error);
      setToast({ message: t('admin.error', { ns: 'notifications' }), type: 'error' });
    } finally {
      setBroadcastSending(false);
    }
  };

  const fetchFeedbackEntries = useCallback(
    async (sourceOverride?: 'all' | 'app' | 'github') => {
      if (!canManageFeedback) return;
      setFeedbackLoading(true);
      setFeedbackError(null);

      const selectedSource = sourceOverride ?? feedbackSource;
      const params: Record<string, string | number | boolean> = { skip: 0, limit: 50 };
      if (selectedSource !== 'all') {
        params.source = selectedSource;
      }
      if (includeArchived) {
        params.include_archived = true;
      }

      try {
        const response = await apiClient.get<ApiResponse<PaginatedData<FeedbackEntry>>>('/feedback/entries', {
          params,
        });
        const data = unwrapResponse<PaginatedData<FeedbackEntry>>(response.data);
        setFeedbackEntries(data.items || []);
        setFeedbackTotal(data.total || 0);
      } catch (error) {
        console.error('Failed to load feedback entries:', error);
        setFeedbackError(t('feedbackInbox.error', { ns: 'notifications' }));
      } finally {
        setFeedbackLoading(false);
      }
    },
    [canManageFeedback, feedbackSource, includeArchived, t]
  );

  useEffect(() => {
    if (effectiveTab !== 'notifications') return;
    void fetchFeedbackEntries();
  }, [effectiveTab, fetchFeedbackEntries, feedbackSource, includeArchived]);

  const handleImportFeedback = async () => {
    if (!canManageFeedback) return;
    setFeedbackImportError(null);
    setFeedbackImportSuccess(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(feedbackImportJson || '');
    } catch (error) {
      console.error('Invalid JSON for feedback import:', error);
      setFeedbackImportError(t('feedbackInbox.importInvalidJson', { ns: 'notifications' }));
      return;
    }

    const items = parseFeedbackItems(parsed);
    if (!items.length) {
      setFeedbackImportError(t('feedbackInbox.importEmpty', { ns: 'notifications' }));
      return;
    }

    setFeedbackImporting(true);
    try {
      await apiClient.post('/feedback/github/import', { items });
      setFeedbackImportSuccess(
        t('feedbackInbox.importSuccess', { ns: 'notifications', count: items.length })
      );
      setFeedbackImportJson('');
      await fetchFeedbackEntries();
    } catch (error) {
      console.error('Failed to import GitHub feedback:', error);
      setFeedbackImportError(t('feedbackInbox.importError', { ns: 'notifications' }));
    } finally {
      setFeedbackImporting(false);
    }
  };

  const handleArchiveEntry = async (entry: FeedbackEntry) => {
    if (!canManageFeedback) return;
    try {
      await apiClient.patch(`/feedback/entries/${entry.id}/archive`);
      setToast({ message: t('feedbackInbox.archiveSuccess', { ns: 'notifications' }), type: 'success' });
      await fetchFeedbackEntries();
    } catch (error) {
      console.error('Failed to archive feedback entry:', error);
      setToast({ message: t('feedbackInbox.archiveError', { ns: 'notifications' }), type: 'error' });
    }
  };

  const handleUnarchiveEntry = async (entry: FeedbackEntry) => {
    if (!canManageFeedback) return;
    try {
      await apiClient.patch(`/feedback/entries/${entry.id}/unarchive`);
      setToast({ message: t('feedbackInbox.unarchiveSuccess', { ns: 'notifications' }), type: 'success' });
      await fetchFeedbackEntries();
    } catch (error) {
      console.error('Failed to unarchive feedback entry:', error);
      setToast({ message: t('feedbackInbox.unarchiveError', { ns: 'notifications' }), type: 'error' });
    }
  };

  const handleRemoveEntry = async (entry: FeedbackEntry) => {
    if (!canManageFeedback) return;
    const confirmed = window.confirm(t('feedbackInbox.removeConfirm', { ns: 'notifications' }));
    if (!confirmed) return;

    try {
      await apiClient.delete(`/feedback/entries/${entry.id}`);
      setToast({ message: t('feedbackInbox.removeSuccess', { ns: 'notifications' }), type: 'success' });
      await fetchFeedbackEntries();
    } catch (error) {
      console.error('Failed to remove feedback entry:', error);
      setToast({ message: t('feedbackInbox.removeError', { ns: 'notifications' }), type: 'error' });
    }
  };

  const reportIcons = {
    list: t('icons.list', { ns: 'customReports', defaultValue: '📋' }),
    create: t('icons.create', { ns: 'customReports', defaultValue: '✏️' }),
    templates: t('icons.templates', { ns: 'customReports', defaultValue: '📚' }),
    students: t('icons.students', { ns: 'customReports', defaultValue: '👥' }),
    courses: t('icons.courses', { ns: 'customReports', defaultValue: '📚' }),
    grades: t('icons.grades', { ns: 'customReports', defaultValue: '⭐' }),
    attendance: t('icons.attendance', { ns: 'customReports', defaultValue: '✅' }),
    enrollments: t('icons.enrollments', { ns: 'customReports', defaultValue: '📊' }),
    formatPdf: t('icons.formatPdf', { ns: 'customReports', defaultValue: '📄' }),
    formatExcel: t('icons.formatExcel', { ns: 'customReports', defaultValue: '📊' }),
    formatCsv: t('icons.formatCsv', { ns: 'customReports', defaultValue: '📋' }),
    analytics: t('icons.analytics', { ns: 'customReports', defaultValue: '📊' }),
  };

  const formatFeedbackTimestamp = (value?: string | null) => {
    if (!value) return t('feedbackInbox.unknownDate', { ns: 'notifications' });
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t('feedbackInbox.unknownDate', { ns: 'notifications' });
    }
    return formatDateTime(parsed);
  };

  const getFeedbackTitle = (entry: FeedbackEntry) =>
    entry.title?.trim() || t('feedbackInbox.defaultTitle', { ns: 'notifications' });

  const getFeedbackBody = (entry: FeedbackEntry) =>
    entry.body?.trim() || t('feedbackInbox.noDetails', { ns: 'notifications' });

  const getFeedbackKindLabel = (kind?: string | null) => {
    if (!kind) return null;
    return t(`feedbackInbox.kind.${kind}`, { ns: 'notifications', defaultValue: kind });
  };

  const buildTemplateLink = (params: { report_type?: string; format?: string; query?: string; tab?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.tab) queryParams.set('tab', params.tab);
    if (params.report_type) queryParams.set('report_type', params.report_type);
    if (params.format) queryParams.set('format', params.format);
    if (params.query) queryParams.set('query', params.query);
    if (studentIdParam && Number.isFinite(Number(studentIdParam))) {
      queryParams.set('studentId', studentIdParam);
    }
    if (courseIdParam && Number.isFinite(Number(courseIdParam))) {
      queryParams.set('courseId', courseIdParam);
    }
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.list}</div>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.create}</div>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.templates}</div>
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
                    <div className="text-lg font-bold text-indigo-600">{reportIcons.students}</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_students', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'course' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">{reportIcons.courses}</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_courses', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'grade' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">{reportIcons.grades}</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_grades', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'attendance' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">{reportIcons.attendance}</div>
                    <p className="text-xs font-medium text-slate-700">{t('entity_attendance', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'student', query: 'enrollment' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
                  >
                    <div className="text-lg font-bold text-indigo-600">{reportIcons.enrollments}</div>
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
                    <p className="text-lg font-bold text-indigo-600">{reportIcons.formatPdf}</p>
                    <p className="text-xs font-medium text-slate-700">{t('format_pdf', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ format: 'excel' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-lg font-bold text-indigo-600">{reportIcons.formatExcel}</p>
                    <p className="text-xs font-medium text-slate-700">{t('format_excel', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ format: 'csv' })}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-lg font-bold text-indigo-600">{reportIcons.formatCsv}</p>
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
                  <p className="text-2xl">{reportIcons.analytics}</p>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{t('analyticsTemplates', { ns: 'customReports' })}</p>
                    <p className="text-xs text-slate-600">{t('viewAnalyticsTemplates', { ns: 'customReports' })}</p>
                  </div>
                  <span className="ml-auto text-orange-600 font-semibold">→</span>
                </Link>
              </div>

              {/* Performance Breakdown Exports */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {t('performanceBreakdownExports', { ns: 'customReports' })}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to={buildTemplateLink({ report_type: 'grade', query: 'Performance Breakdown', tab: 'analytics' })}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                        {reportIcons.grades}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t('performanceBreakdownGrades', { ns: 'customReports' })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">{t('performanceBreakdownGradesDesc', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'attendance', query: 'Performance Audit', tab: 'analytics' })}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                        {reportIcons.attendance}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t('performanceBreakdownAttendance', { ns: 'customReports' })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">{t('performanceBreakdownAttendanceDesc', { ns: 'customReports' })}</p>
                  </Link>
                  <Link
                    to={buildTemplateLink({ report_type: 'daily_performance', query: 'Daily Performance', tab: 'analytics' })}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                        {reportIcons.analytics}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t('performanceBreakdownDailyPerformance', { ns: 'customReports' })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">{t('performanceBreakdownDailyPerformanceDesc', { ns: 'customReports' })}</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        {effectiveTab === 'help' && <HelpDocumentation />}
        {effectiveTab === 'notifications' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t('admin.title', { ns: 'notifications' })}
                </h2>
                <p className="text-sm text-slate-600">{t('admin.description', { ns: 'notifications' })}</p>
              </div>

              {!isAdmin ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {t('admin.notAuthorized', { ns: 'notifications' })}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t('admin.typeLabel', { ns: 'notifications' })}</span>
                      <select
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        value={broadcastType}
                        onChange={(event) => setBroadcastType(event.target.value)}
                      >
                        {notificationTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t('admin.targetLabel', { ns: 'notifications' })}</span>
                      <select
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        value={broadcastTarget}
                        onChange={(event) => setBroadcastTarget(event.target.value as 'all' | 'role' | 'users')}
                      >
                        <option value="all">{t('admin.targetAll', { ns: 'notifications' })}</option>
                        <option value="role">{t('admin.targetRole', { ns: 'notifications' })}</option>
                        <option value="users">{t('admin.targetUsers', { ns: 'notifications' })}</option>
                      </select>
                    </label>
                  </div>

                  {broadcastTarget === 'role' && (
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t('admin.roleLabel', { ns: 'notifications' })}</span>
                      <select
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        value={broadcastRole}
                        onChange={(event) => setBroadcastRole(event.target.value)}
                      >
                        <option value="admin">{t('roles.admin', { ns: 'notifications' })}</option>
                        <option value="teacher">{t('roles.teacher', { ns: 'notifications' })}</option>
                        <option value="student">{t('roles.student', { ns: 'notifications' })}</option>
                        <option value="viewer">{t('roles.viewer', { ns: 'notifications' })}</option>
                      </select>
                    </label>
                  )}

                  {broadcastTarget === 'users' && (
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>{t('admin.userIdsLabel', { ns: 'notifications' })}</span>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder={t('admin.userIdsPlaceholder', { ns: 'notifications' })}
                        value={broadcastUserIds}
                        onChange={(event) => setBroadcastUserIds(event.target.value)}
                      />
                      <p className="text-xs text-slate-500">{t('admin.userIdsHelp', { ns: 'notifications' })}</p>
                    </label>
                  )}

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>{t('admin.titleLabel', { ns: 'notifications' })}</span>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      value={broadcastTitle}
                      onChange={(event) => setBroadcastTitle(event.target.value)}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>{t('admin.messageLabel', { ns: 'notifications' })}</span>
                    <textarea
                      className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      value={broadcastMessage}
                      onChange={(event) => setBroadcastMessage(event.target.value)}
                    />
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={handleSendNotification}
                      disabled={broadcastSending}
                    >
                      {broadcastSending
                        ? t('admin.sending', { ns: 'notifications' })
                        : t('admin.sendButton', { ns: 'notifications' })}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t('feedbackInbox.title', { ns: 'notifications' })}
                  </h2>
                  <p className="text-sm text-slate-600">{t('feedbackInbox.description', { ns: 'notifications' })}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="text-sm text-slate-600">
                    {t('feedbackInbox.sourceLabel', { ns: 'notifications' })}
                  </label>
                  <select
                    className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={feedbackSource}
                    onChange={(event) => setFeedbackSource(event.target.value as 'all' | 'app' | 'github')}
                  >
                    {feedbackSourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => fetchFeedbackEntries()}
                  >
                    {t('feedbackInbox.refresh', { ns: 'notifications' })}
                  </button>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={includeArchived}
                      onChange={(event) => setIncludeArchived(event.target.checked)}
                    />
                    {t('feedbackInbox.includeArchived', { ns: 'notifications' })}
                  </label>
                </div>
              </div>

              {!canManageFeedback ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {t('feedbackInbox.notAuthorized', { ns: 'notifications' })}
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">
                        {t('feedbackInbox.total', { ns: 'notifications', count: feedbackTotal })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {t('feedbackInbox.sourceAll', { ns: 'notifications' })}
                        </span>
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {t('feedbackInbox.sourceApp', { ns: 'notifications' })}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {t('feedbackInbox.sourceGithub', { ns: 'notifications' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {feedbackLoading && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      {t('feedbackInbox.loading', { ns: 'notifications' })}
                    </div>
                  )}

                  {feedbackError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {feedbackError}
                    </div>
                  )}

                  {!feedbackLoading && !feedbackError && feedbackEntries.length === 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      {t('feedbackInbox.empty', { ns: 'notifications' })}
                    </div>
                  )}

                  <div className="space-y-3">
                    {feedbackEntries.map((entry) => {
                      const title = getFeedbackTitle(entry);
                      const body = getFeedbackBody(entry);
                      const sourceLabel =
                        entry.source === 'github'
                          ? t('feedbackInbox.sourceGithub', { ns: 'notifications' })
                          : t('feedbackInbox.sourceApp', { ns: 'notifications' });
                      const kindLabel = getFeedbackKindLabel(entry.kind);
                      const isArchived = Boolean(entry.archived);
                      const dateValue = entry.created_at || entry.received_at;

                      return (
                        <div key={entry.id} className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {sourceLabel}
                                </span>
                                {kindLabel && (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    {kindLabel}
                                  </span>
                                )}
                                {isArchived && (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    {t('feedbackInbox.archivedBadge', { ns: 'notifications' })}
                                  </span>
                                )}
                                {entry.repository && (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    {entry.repository}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatFeedbackTimestamp(dateValue)}
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{body}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {entry.author && (
                              <span>
                                {t('feedbackInbox.authorLabel', { ns: 'notifications' })}:{' '}
                                <span className="font-semibold text-slate-700">{entry.author}</span>
                              </span>
                            )}
                            {entry.url && (
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-indigo-600 hover:text-indigo-700"
                              >
                                {t('feedbackInbox.openSource', { ns: 'notifications' })}
                              </a>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              {isArchived ? (
                                <button
                                  type="button"
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => handleUnarchiveEntry(entry)}
                                >
                                  {t('feedbackInbox.unarchive', { ns: 'notifications' })}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => handleArchiveEntry(entry)}
                                >
                                  {t('feedbackInbox.archive', { ns: 'notifications' })}
                                </button>
                              )}
                              <button
                                type="button"
                                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                onClick={() => handleRemoveEntry(entry)}
                              >
                                {t('feedbackInbox.remove', { ns: 'notifications' })}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {t('feedbackInbox.importTitle', { ns: 'notifications' })}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {t('feedbackInbox.importDescription', { ns: 'notifications' })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('feedbackInbox.importFormat', { ns: 'notifications' })}
                      </p>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          {t('feedbackInbox.templateLabel', { ns: 'notifications' })}
                        </span>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.issues)}
                        >
                          {t('feedbackInbox.templates.issues', { ns: 'notifications' })}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.issueComments)}
                        >
                          {t('feedbackInbox.templates.issueComments', { ns: 'notifications' })}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.prs)}
                        >
                          {t('feedbackInbox.templates.prs', { ns: 'notifications' })}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.reviewComments)}
                        >
                          {t('feedbackInbox.templates.reviewComments', { ns: 'notifications' })}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.discussions)}
                        >
                          {t('feedbackInbox.templates.discussions', { ns: 'notifications' })}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => applyFeedbackTemplate(feedbackTemplates.discussionComments)}
                        >
                          {t('feedbackInbox.templates.discussionComments', { ns: 'notifications' })}
                        </button>
                      </div>
                      <textarea
                        className="min-h-[140px] w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder={t('feedbackInbox.importPlaceholder', { ns: 'notifications' })}
                        value={feedbackImportJson}
                        onChange={(event) => setFeedbackImportJson(event.target.value)}
                      />

                      {feedbackImportError && (
                        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          {feedbackImportError}
                        </div>
                      )}
                      {feedbackImportSuccess && (
                        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          {feedbackImportSuccess}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                          onClick={handleImportFeedback}
                          disabled={feedbackImporting || !feedbackImportJson.trim()}
                        >
                          {feedbackImporting
                            ? t('feedbackInbox.importing', { ns: 'notifications' })
                            : t('feedbackInbox.importButton', { ns: 'notifications' })}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {effectiveTab === 'settings' && (
          <div className="space-y-6">
            <AppearanceThemeSelector />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('dateTimeSettingsTitle', { ns: 'controlPanel' }) || 'Date & Time Settings'}
                </h3>
                <p className="text-sm text-slate-600">
                  {t('dateTimeSettingsSubtitle', { ns: 'controlPanel' }) || 'Force the date format and timezone used across the application.'}
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>{t('dateTimeTimezoneLabel', { ns: 'controlPanel' }) || 'Timezone'}</span>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={timeZone}
                    onChange={(event) => setTimeZone(event.target.value)}
                  >
                    {TIME_ZONE_OPTIONS.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>{t('dateTimeFormatLabel', { ns: 'controlPanel' }) || 'Date format'}</span>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={dateFormat}
                    onChange={(event) => setDateFormat(event.target.value as DateFormatOption)}
                  >
                    {DATE_FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value === 'gr-ddmmyyyy' && (t('dateFormatGreekLong', { ns: 'controlPanel' }) || 'Greek (DD/MM/YYYY)')}
                        {option.value === 'gr-ddmmyy' && (t('dateFormatGreekShort', { ns: 'controlPanel' }) || 'Greek (DD/MM/YY)')}
                        {option.value === 'en-us' && (t('dateFormatEnUs', { ns: 'controlPanel' }) || 'EN/US (MM/DD/YYYY)')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">
                  {t('dateTimePreviewLabel', { ns: 'controlPanel' }) || 'Preview'}:
                </span>{' '}
                {formatDateTime(new Date())}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default OperationsView;
