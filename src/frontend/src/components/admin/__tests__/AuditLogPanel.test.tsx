/**
 * Control Panel > Maintenance > Audit Log.
 *
 * The audit log had no page: only the API answered. The owner, 18 November 2026: "the audit
 * log does not say who changed a role, and no page shows it". The page shows who did what and
 * when, as a sentence where it knows what was done, and can be narrowed by what was done, by
 * who did it and by date.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogPanel from '../AuditLogPanel';
import { adminUsersAPI, auditAPI } from '@/api/api';
import controlPanelEn from '@/locales/en/controlPanel.js';
import controlPanelEl from '@/locales/el/controlPanel.js';

vi.mock('@/api/api', () => ({
  adminUsersAPI: { list: vi.fn() },
  auditAPI: { list: vi.fn() },
}));

// The key, and what the sentence is filled with, so that a test can read both. The names of
// the roles are real texts: the panel asks for them and puts them into its sentences.
const roles: Record<string, string> = {
  'controlPanel.roles.admin': 'Administrator',
  'controlPanel.roles.teacher': 'Teacher',
  'controlPanel.roles.none': 'No role',
};
const languageValue = {
  t: (key: string, options?: Record<string, unknown>) =>
    roles[key] ?? (options ? `${key} ${JSON.stringify(options)}` : key),
};
vi.mock('@/LanguageContext', () => ({ useLanguage: () => languageValue }));
const formatter = { formatDateTime: (value: unknown) => `at ${String(value)}` };
vi.mock('@/contexts/DateTimeSettingsContext', () => ({ useDateTimeFormatter: () => formatter }));

const entry = (id: number, fields: Record<string, unknown>) => ({
  id,
  action: 'role_change',
  resource: 'user',
  resource_id: '7',
  user_id: 1,
  user_email: 'head@example.com',
  details: {},
  success: true,
  error_message: null,
  timestamp: `2026-11-18T10:0${id}:00Z`,
  ...fields,
});
const page = (logs: unknown[], more: Record<string, unknown> = {}) => ({
  logs,
  total: logs.length,
  page: 1,
  page_size: 25,
  has_next: false,
  ...more,
});
const accounts = [
  { id: 2, email: 'second@example.com', role: 'admin', is_active: true },
  { id: 1, email: 'head@example.com', role: 'admin', is_active: true },
];
const lastQuery = () => vi.mocked(auditAPI.list).mock.calls.at(-1)![0]!;

describe('AuditLogPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUsersAPI.list).mockResolvedValue(accounts as never);
    vi.mocked(auditAPI.list).mockResolvedValue(page([]) as never);
  });

  it('shows who did what, when, and about which record', async () => {
    vi.mocked(auditAPI.list).mockResolvedValue(
      page([
        entry(1, { details: { operation: 'set_role', email: 'maria@example.com', from: 'teacher', role: 'admin' } }),
      ]) as never
    );

    render(<AuditLogPanel />);

    const row = await screen.findByTestId('audit-entry-1');
    expect(row).toHaveTextContent('at 2026-11-18T10:01:00Z');
    expect(screen.getByTestId('audit-author-1')).toHaveTextContent('head@example.com');
    const what = screen.getByTestId('audit-what-1');
    expect(what).toHaveTextContent('controlPanel.auditLog.operations.set_role');
    // The roles go into the sentence under their names, the address as it is.
    expect(what).toHaveTextContent('"role":"Administrator"');
    expect(what).toHaveTextContent('"from":"Teacher"');
    expect(what).toHaveTextContent('"email":"maria@example.com"');
    expect(row).toHaveTextContent('controlPanel.auditLog.resources.user 7');
  });

  it('falls back on the kind of action for an entry it has no sentence for, and shows its details', async () => {
    vi.mocked(auditAPI.list).mockResolvedValue(
      page([
        entry(2, {
          action: 'bulk_import',
          resource: 'student',
          resource_id: null,
          details: { job_id: 'abc', import_type: 'students', success: true },
        }),
      ]) as never
    );

    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-what-2')).toHaveTextContent('controlPanel.auditLog.actions.bulk_import');
    const row = screen.getByTestId('audit-entry-2');
    expect(row).toHaveTextContent('job_id: abc');
    expect(row).toHaveTextContent('import_type: students');
    expect(row).not.toHaveTextContent('success: true');
    expect(row).toHaveTextContent('controlPanel.auditLog.resources.student');
  });

  it('says of a change to what a role holds that it is about the role, not about an account', async () => {
    vi.mocked(auditAPI.list).mockResolvedValue(
      page([
        entry(4, {
          action: 'permission_grant',
          resource_id: null,
          details: { operation: 'grant_permission', role: 'teacher', permission: 'audit:view' },
        }),
        entry(5, { action: 'permission_grant', resource_id: '9', details: { operation: 'grant_to_account', permission: 'audit:view', email: 'maria@example.com' } }),
      ]) as never
    );

    render(<AuditLogPanel />);

    const role = await screen.findByTestId('audit-entry-4');
    expect(role).toHaveTextContent('controlPanel.auditLog.role Teacher');
    expect(role).not.toHaveTextContent('controlPanel.auditLog.resources.user');
    expect(screen.getByTestId('audit-what-4')).toHaveTextContent('"permission":"audit:view"');
    expect(screen.getByTestId('audit-entry-5')).toHaveTextContent('controlPanel.auditLog.resources.user 9');
  });

  it('says so when an entry names nobody, and when what was tried failed', async () => {
    vi.mocked(auditAPI.list).mockResolvedValue(
      page([entry(3, { user_id: null, user_email: null, success: false, error_message: 'no such role' })]) as never
    );

    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-author-3')).toHaveTextContent('controlPanel.auditLog.noAuthor');
    expect(screen.getByTestId('audit-entry-3')).toHaveTextContent('controlPanel.auditLog.failed: no such role');
  });

  it('asks the server for one kind of action, for one author and for a range of days', async () => {
    const user = userEvent.setup();
    render(<AuditLogPanel />);
    await waitFor(() => expect(auditAPI.list).toHaveBeenCalledTimes(1));
    expect(lastQuery()).toMatchObject({ page: 1, page_size: 25, action: undefined, user_id: undefined });

    await user.selectOptions(screen.getByTestId('audit-filter-action'), 'role_change');
    await waitFor(() => expect(lastQuery()).toMatchObject({ action: 'role_change', page: 1 }));

    // The accounts are offered by their addresses, in order.
    const authors = await screen.findAllByRole('option', { name: /@example\.com/ });
    expect(authors.map((option) => option.textContent)).toEqual(['head@example.com', 'second@example.com']);
    await user.selectOptions(screen.getByTestId('audit-filter-author'), '2');
    await waitFor(() => expect(lastQuery()).toMatchObject({ action: 'role_change', user_id: 2 }));

    await user.type(screen.getByTestId('audit-filter-from'), '2026-11-01');
    await user.type(screen.getByTestId('audit-filter-to'), '2026-11-18');
    await waitFor(() => {
      const query = lastQuery();
      expect(new Date(query.start_date!).getTime()).toBe(new Date('2026-11-01T00:00:00').getTime());
      expect(new Date(query.end_date!).getTime()).toBe(new Date('2026-11-18T23:59:59.999').getTime());
    });
  });

  it('turns the pages, and starts at the first again when a filter changes', async () => {
    vi.mocked(auditAPI.list).mockResolvedValue(page([entry(1, {})], { total: 60, has_next: true }) as never);
    const user = userEvent.setup();
    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-log-count')).toHaveTextContent('"page":1,"pages":3,"total":60');
    expect(screen.getByRole('button', { name: /previous/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next/ }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    await user.selectOptions(screen.getByTestId('audit-filter-action'), 'delete');
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 1, action: 'delete' }));
  });

  it('says that there are no entries', async () => {
    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-log-empty')).toHaveTextContent('controlPanel.auditLog.empty');
    expect(screen.queryByTestId('audit-log-count')).not.toBeInTheDocument();
  });

  it.each([
    [403, 'controlPanel.auditLog.refused'],
    [500, 'controlPanel.auditLog.loadFailed'],
  ])('tells a refusal (%i) from a failure', async (status, message) => {
    vi.mocked(auditAPI.list).mockRejectedValue({ response: { status } });

    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-log-error')).toHaveTextContent(message);
    expect(screen.queryByTestId('audit-log-empty')).not.toBeInTheDocument();
  });

  it('still works when the list of accounts is refused: the author box offers "Anybody" alone', async () => {
    vi.mocked(adminUsersAPI.list).mockRejectedValue({ response: { status: 403 } });
    vi.mocked(auditAPI.list).mockResolvedValue(page([entry(1, {})]) as never);

    render(<AuditLogPanel />);

    expect(await screen.findByTestId('audit-entry-1')).toBeInTheDocument();
    expect(screen.getByTestId('audit-filter-author').querySelectorAll('option')).toHaveLength(1);
  });

  it('has a name for every action and every kind of record the server writes, in both languages', () => {
    const actions = ['login', 'logout', 'password_change', 'create', 'update', 'delete', 'bulk_import', 'bulk_export', 'role_change', 'permission_grant', 'permission_revoke', 'backup_create', 'backup_restore', 'config_change'];
    const resources = ['user', 'student', 'course', 'grade', 'attendance', 'enrollment', 'performance', 'highlight', 'report', 'session', 'system'];
    for (const table of [controlPanelEn, controlPanelEl] as Array<{ auditLog: Record<string, Record<string, string>> }>) {
      expect(Object.keys(table.auditLog.actions).sort()).toEqual([...actions].sort());
      expect(Object.keys(table.auditLog.resources).sort()).toEqual([...resources].sort());
    }
    const en = (controlPanelEn as { auditLog: Record<string, Record<string, string>> }).auditLog;
    const el = (controlPanelEl as { auditLog: Record<string, Record<string, string>> }).auditLog;
    expect(Object.keys(el.operations)).toEqual(Object.keys(en.operations));
    // A sentence is filled with the same things in both languages.
    for (const key of Object.keys(en.operations)) {
      const fill = (sentence: string) => [...sentence.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
      expect(fill(el.operations[key])).toEqual(fill(en.operations[key]));
    }
  });
});
