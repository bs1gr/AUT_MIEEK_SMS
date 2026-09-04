import { useMemo } from 'react';
import type { FeedbackEntry, FeedbackImportItem } from './OperationsView';

export interface FeedbackSourceOption {
  value: 'all' | 'app' | 'github';
  label: string;
}

export interface OperationsFeedbackInboxProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  canManageFeedback: boolean;
  feedbackSource: 'all' | 'app' | 'github';
  setFeedbackSource: (value: 'all' | 'app' | 'github') => void;
  feedbackSourceOptions: FeedbackSourceOption[];
  onRefresh: () => void;
  includeArchived: boolean;
  setIncludeArchived: (value: boolean) => void;
  feedbackTotal: number;
  feedbackLoading: boolean;
  feedbackError: string | null;
  feedbackEntries: FeedbackEntry[];
  formatDateTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) => string;
  onArchive: (entry: FeedbackEntry) => void;
  onUnarchive: (entry: FeedbackEntry) => void;
  onRemove: (entry: FeedbackEntry) => void;
  feedbackImportJson: string;
  setFeedbackImportJson: (value: string) => void;
  feedbackImportError: string | null;
  setFeedbackImportError: (value: string | null) => void;
  feedbackImportSuccess: string | null;
  setFeedbackImportSuccess: (value: string | null) => void;
  feedbackImporting: boolean;
  onImport: () => void;
}

const OperationsFeedbackInbox = ({
  t,
  canManageFeedback,
  feedbackSource,
  setFeedbackSource,
  feedbackSourceOptions,
  onRefresh,
  includeArchived,
  setIncludeArchived,
  feedbackTotal,
  feedbackLoading,
  feedbackError,
  feedbackEntries,
  formatDateTime,
  onArchive,
  onUnarchive,
  onRemove,
  feedbackImportJson,
  setFeedbackImportJson,
  feedbackImportError,
  setFeedbackImportError,
  feedbackImportSuccess,
  setFeedbackImportSuccess,
  feedbackImporting,
  onImport,
}: OperationsFeedbackInboxProps) => {
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

  return (
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
            onClick={onRefresh}
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
                          onClick={() => onUnarchive(entry)}
                        >
                          {t('feedbackInbox.unarchive', { ns: 'notifications' })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          onClick={() => onArchive(entry)}
                        >
                          {t('feedbackInbox.archive', { ns: 'notifications' })}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={() => onRemove(entry)}
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
                  onClick={onImport}
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
  );
};

export default OperationsFeedbackInbox;
