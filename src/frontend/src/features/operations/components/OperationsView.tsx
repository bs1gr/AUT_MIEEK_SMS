import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import apiClient from '@/api/api';
import ExportCenter from '@/components/tools/ExportCenter';
import HelpDocumentation from '@/components/tools/HelpDocumentation';
import Toast from '@/components/ui/Toast';
import { type ToastState } from '@/features/operations/components/DevToolsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useDateTimeFormatter, useDateTimeSettings } from '@/contexts/DateTimeSettingsContext';
import {
  OPERATIONS_TAB_KEYS,
  type LegacyOperationsTabKey,
  type OperationsLocationState,
  type OperationsTabKey,
} from '@/features/operations/types';
import OperationsImportsTab from './OperationsImportsTab';
import OperationsReportsTab from './OperationsReportsTab';
import OperationsSettingsTab from './OperationsSettingsTab';
import OperationsBroadcastPanel from './OperationsBroadcastPanel';
import OperationsFeedbackInbox, { type FeedbackSourceOption } from './OperationsFeedbackInbox';

type OperationsViewProps = {
  students?: unknown[];
};

export type FeedbackEntry = {
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

export type FeedbackImportItem = {
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

  const feedbackSourceOptions: FeedbackSourceOption[] = useMemo(
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
          <OperationsImportsTab
            t={t}
            jobIdInput={jobIdInput}
            setJobIdInput={setJobIdInput}
            trackedJobId={trackedJobId}
            setTrackedJobId={setTrackedJobId}
          />
        )}
        {effectiveTab === 'reports' && (
          <OperationsReportsTab t={t} studentIdParam={studentIdParam} courseIdParam={courseIdParam} />
        )}
        {effectiveTab === 'help' && <HelpDocumentation />}
        {effectiveTab === 'notifications' && (
          <div className="space-y-6">
            <OperationsBroadcastPanel
              t={t}
              isAdmin={isAdmin}
              broadcastType={broadcastType}
              setBroadcastType={setBroadcastType}
              notificationTypeOptions={notificationTypeOptions}
              broadcastTarget={broadcastTarget}
              setBroadcastTarget={setBroadcastTarget}
              broadcastRole={broadcastRole}
              setBroadcastRole={setBroadcastRole}
              broadcastUserIds={broadcastUserIds}
              setBroadcastUserIds={setBroadcastUserIds}
              broadcastTitle={broadcastTitle}
              setBroadcastTitle={setBroadcastTitle}
              broadcastMessage={broadcastMessage}
              setBroadcastMessage={setBroadcastMessage}
              broadcastSending={broadcastSending}
              onSend={() => void handleSendNotification()}
            />

            <OperationsFeedbackInbox
              t={t}
              canManageFeedback={canManageFeedback}
              feedbackSource={feedbackSource}
              setFeedbackSource={setFeedbackSource}
              feedbackSourceOptions={feedbackSourceOptions}
              onRefresh={() => void fetchFeedbackEntries()}
              includeArchived={includeArchived}
              setIncludeArchived={setIncludeArchived}
              feedbackTotal={feedbackTotal}
              feedbackLoading={feedbackLoading}
              feedbackError={feedbackError}
              feedbackEntries={feedbackEntries}
              formatDateTime={formatDateTime}
              onArchive={(entry) => void handleArchiveEntry(entry)}
              onUnarchive={(entry) => void handleUnarchiveEntry(entry)}
              onRemove={(entry) => void handleRemoveEntry(entry)}
              feedbackImportJson={feedbackImportJson}
              setFeedbackImportJson={setFeedbackImportJson}
              feedbackImportError={feedbackImportError}
              setFeedbackImportError={setFeedbackImportError}
              feedbackImportSuccess={feedbackImportSuccess}
              setFeedbackImportSuccess={setFeedbackImportSuccess}
              feedbackImporting={feedbackImporting}
              onImport={() => void handleImportFeedback()}
            />
          </div>
        )}
        {effectiveTab === 'settings' && (
          <OperationsSettingsTab
            t={t}
            timeZone={timeZone}
            setTimeZone={setTimeZone}
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            formatDateTime={formatDateTime}
          />
        )}
      </section>
    </div>
  );
};

export default OperationsView;
