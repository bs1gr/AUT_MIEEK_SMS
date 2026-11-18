import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminUsersAPI, auditAPI, type AuditLogEntry } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import type { UserAccount } from '@/types';

/**
 * Control Panel > Maintenance > Audit Log: who did what, and when.
 *
 * The server has kept an audit log for a long time and no page showed it: only the API
 * answered (GET /audit/logs), so an administrator who wanted to know who had made somebody an
 * administrator could not find out without a script. The owner, 18 November 2026: "Fix: the
 * audit log does not say who changed a role, and no page shows it."
 *
 * An entry is shown as a sentence where the page knows what was done (a role given, an
 * account created, a permission granted ...), and as the server's own words where it does not.
 */

const PAGE_SIZE = 25;

// The actions the server writes, in the order of the filter.
const ACTIONS = [
  'role_change',
  'permission_grant',
  'permission_revoke',
  'create',
  'update',
  'delete',
  'password_change',
  'bulk_import',
  'bulk_export',
  'backup_create',
  'backup_restore',
  'config_change',
  'login',
  'logout',
] as const;

// What an entry's details can say was done, for which the page has a sentence.
const OPERATIONS = new Set([
  'assign_role',
  'bulk_assign_role',
  'auto_assign_inherited',
  'revoke_role',
  'set_role',
  'create_account',
  'delete_account',
  'activate_account',
  'deactivate_account',
  'reset_password',
  'change_own_password',
  'grant_permission',
  'bulk_grant_permission',
  'revoke_permission',
  'grant_to_account',
  'revoke_from_account',
  'create_role',
  'rename_role',
  'update_role',
  'delete_role',
  'create_permission',
  'update_permission',
  'activate_permission',
  'deactivate_permission',
  'delete_permission',
]);

// Changes to a role or to what it holds: they are about the role, not about an account.
const ABOUT_A_ROLE = new Set([
  'grant_permission',
  'bulk_grant_permission',
  'revoke_permission',
  'create_role',
  'rename_role',
  'update_role',
  'delete_role',
]);

// Changes to a permission itself: the sentence names it, and there is no record to point at.
const ABOUT_A_PERMISSION = new Set([
  'create_permission',
  'update_permission',
  'activate_permission',
  'deactivate_permission',
  'delete_permission',
]);

// Details the sentence already says, or that say nothing to a reader.
const SAID = new Set(['operation', 'success', 'role', 'from', 'permission', 'email']);

type LoadError = 'refused' | 'failed' | null;

const asText = (value: unknown): string =>
  value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

const AuditLogPanel: React.FC = () => {
  const { t } = useLanguage();
  const { formatDateTime } = useDateTimeFormatter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [author, setAuthor] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoadError>(null);

  const text = useCallback((key: string, options?: Record<string, unknown>) => t(`controlPanel.auditLog.${key}`, options), [t]);

  // The accounts, for the "Made by" box. Without them the box offers "Anybody" alone.
  useEffect(() => {
    let cancelled = false;
    adminUsersAPI
      .list()
      .then((list) => { if (!cancelled) setAccounts(list); })
      .catch(() => { if (!cancelled) setAccounts([]); });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const answer = await auditAPI.list({
        page,
        page_size: PAGE_SIZE,
        action: action || undefined,
        user_id: author ? Number(author) : undefined,
        // The whole of both days, in the browser's own time.
        start_date: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
        end_date: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
      });
      setEntries(answer.logs);
      setTotal(answer.total);
      setHasNext(answer.has_next);
      setError(null);
    } catch (problem: unknown) {
      const status = (problem as { response?: { status?: number } })?.response?.status;
      setEntries([]);
      setTotal(0);
      setHasNext(false);
      setError(status === 401 || status === 403 ? 'refused' : 'failed');
    } finally {
      setLoading(false);
    }
  }, [page, action, author, fromDate, toDate]);

  useEffect(() => { void load(); }, [load]);

  // A changed filter starts at the first page again.
  const filter = <T,>(setter: (value: T) => void) => (value: T) => { setPage(1); setter(value); };

  const roleName = useCallback((role: unknown): string => {
    const key = `controlPanel.roles.${asText(role)}`;
    const label = t(key);
    return label && label !== key ? label : asText(role);
  }, [t]);

  const describe = useCallback((entry: AuditLogEntry): string => {
    const details = entry.details ?? {};
    const operation = asText(details.operation);
    if (OPERATIONS.has(operation)) {
      return text(`operations.${operation}`, {
        role: roleName(details.role),
        from: roleName(details.from),
        permission: asText(details.permission),
        email: asText(details.email),
      });
    }
    return text(`actions.${entry.action}`);
  }, [roleName, text]);

  const about = useCallback((entry: AuditLogEntry): string => {
    const details = entry.details ?? {};
    if (ABOUT_A_ROLE.has(asText(details.operation))) return `${text('role')} ${roleName(details.role)}`;
    if (ABOUT_A_PERMISSION.has(asText(details.operation))) return '—';
    const kind = text(`resources.${entry.resource}`);
    return entry.resource_id ? `${kind} ${entry.resource_id}` : kind;
  }, [roleName, text]);

  const rest = useCallback((entry: AuditLogEntry): Array<[string, string]> =>
    Object.entries(entry.details ?? {})
      .filter(([key, value]) => !SAID.has(key) && asText(value) !== '')
      .map(([key, value]) => [key, asText(value)]), []);

  const authors = useMemo(
    () => [...accounts].sort((a, b) => a.email.localeCompare(b.email)),
    [accounts]
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4" data-testid="audit-log-panel">
      <p className="text-sm text-gray-600 dark:text-gray-300">{text('description')}</p>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {text('filterAction')}
          <select
            data-testid="audit-filter-action"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={action}
            onChange={(event) => filter(setAction)(event.target.value)}
          >
            <option value="">{text('anyAction')}</option>
            {ACTIONS.map((name) => (
              <option key={name} value={name}>{text(`actions.${name}`)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {text('filterAuthor')}
          <select
            data-testid="audit-filter-author"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={author}
            onChange={(event) => filter(setAuthor)(event.target.value)}
          >
            <option value="">{text('anybody')}</option>
            {authors.map((account) => (
              <option key={account.id} value={String(account.id)}>{account.email}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {text('filterFrom')}
          <input
            type="date"
            data-testid="audit-filter-from"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={fromDate}
            onChange={(event) => filter(setFromDate)(event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {text('filterTo')}
          <input
            type="date"
            data-testid="audit-filter-to"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={toDate}
            onChange={(event) => filter(setToDate)(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {text('refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="audit-log-error"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{text(error === 'refused' ? 'refused' : 'loadFailed')}</span>
        </div>
      )}

      {!error && entries.length === 0 && !loading && (
        <p className="py-6 text-center text-sm text-gray-500" data-testid="audit-log-empty">{text('empty')}</p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2">{text('columnWhen')}</th>
                <th className="px-3 py-2">{text('columnWho')}</th>
                <th className="px-3 py-2">{text('columnWhat')}</th>
                <th className="px-3 py-2">{text('columnAbout')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((entry) => (
                <tr key={entry.id} data-testid={`audit-entry-${entry.id}`} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-100" data-testid={`audit-author-${entry.id}`}>
                    {entry.user_email || <span className="text-gray-500">{text('noAuthor')}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                    <div data-testid={`audit-what-${entry.id}`}>{describe(entry)}</div>
                    {rest(entry).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-600 dark:text-gray-300">
                        {rest(entry).map(([key, value]) => (
                          <code key={key} className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                            {key}: {value}
                          </code>
                        ))}
                      </div>
                    )}
                    {!entry.success && (
                      <div className="mt-1 text-xs font-medium text-rose-600">
                        {text('failed')}{entry.error_message ? `: ${entry.error_message}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200">{about(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span data-testid="audit-log-count">{text('pageOf', { page, pages, total })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> {text('previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNext || loading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              {text('next')} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
