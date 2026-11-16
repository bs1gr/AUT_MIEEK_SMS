import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Restoring a backup from the list. An encrypted backup used to be decrypted into the browser
// and uploaded again as "decrypted_backup.db"; the upload only takes SQLite files, so an
// encrypted PostgreSQL backup - every backup of a shared database - could not be restored
// from this page at all ("Uploaded file is not a valid SQLite database"), and the readable
// copy stayed in the backups folder. The server restores every kind in one request.

vi.mock('@/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'admin@example.com', role: 'admin' } }) }));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({ formatDateTime: (value: unknown) => String(value), formatTime: (value: unknown) => String(value) }),
}));
vi.mock('@/contexts/AppearanceThemeContext', () => ({
  useAppearanceTheme: () => ({ appearanceTheme: 'default', setAppearanceTheme: vi.fn() }),
}));
vi.mock('@/api/api', () => ({
  adminOpsAPI: {},
  importAPI: {},
  getHealthStatus: vi.fn().mockResolvedValue({ status: 'healthy' }),
  CONTROL_API_BASE: '/control/api',
}));
vi.mock('@/services/authService', () => ({ default: { getAccessToken: () => 'token' } }));
vi.mock('@/hooks/useStudentsQuery', () => ({ studentKeys: { all: ['students'] } }));
vi.mock('@/hooks/useCoursesQuery', () => ({ courseKeys: { all: ['courses'] } }));
vi.mock('@/stores', () => ({
  useStudentsStore: (selector: (state: { setStudents: () => void }) => unknown) => selector({ setStudents: vi.fn() }),
  useCoursesStore: (selector: (state: { setCourses: () => void }) => unknown) => selector({ setCourses: vi.fn() }),
}));
vi.mock('./DevToolsOperationsMonitor', () => ({ default: () => null }));
vi.mock('./DevToolsDatabaseTools', () => ({ default: () => null }));
vi.mock('./DevToolsClearCard', () => ({ default: () => null }));
vi.mock('./DevToolsImportCard', () => ({ default: () => null }));

import DevToolsPanel from './DevToolsPanel';

const BACKUPS = [
  { filename: 'auto_backup_20261116_142026.enc', path: '', size: 2048, created: '2026-11-16T14:20:26+02:00' },
  { filename: 'backup_20261116_150000.sql', path: '', size: 4096, created: '2026-11-16T15:00:00+02:00' },
];

type Call = { url: string; method: string };

describe('DevToolsPanel: restoring a backup from the list', () => {
  let calls: Call[];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? 'GET').toUpperCase();
        calls.push({ url, method });
        if (url.endsWith('/operations/database-backups')) {
          return new Response(JSON.stringify({ backups: BACKUPS, total: BACKUPS.length }), { status: 200 });
        }
        if (url.includes('/operations/database-restore')) {
          return new Response(JSON.stringify({ success: true, message: 'PostgreSQL backup restored: 12 rows across 3 tables.' }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ detail: { message: `unexpected request: ${method} ${url}` } }), { status: 400 });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderPanel = () => {
    const onToast = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DevToolsPanel variant="standalone" onToast={onToast} />
      </QueryClientProvider>,
    );
    return onToast;
  };

  const restoreButtonFor = async (filename: string) => {
    const name = await screen.findByText(filename);
    const row = name.closest('.rounded.border') as HTMLElement;
    return within(row).getByRole('button', { name: 'utils.restore' });
  };

  it('restores an encrypted backup with one request to the server', async () => {
    const onToast = renderPanel();

    await userEvent.click(await restoreButtonFor('auto_backup_20261116_142026.enc'));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
    const writes = calls.filter((call) => call.method === 'POST');
    expect(writes).toEqual([
      {
        method: 'POST',
        url: '/control/api/operations/database-restore?backup_filename=auto_backup_20261116_142026.enc',
      },
    ]);
    // Never through the browser: no decrypted copy is downloaded or uploaded.
    expect(calls.some((call) => /restore-encrypted-backup|database-upload/.test(call.url))).toBe(false);
    expect(onToast).toHaveBeenCalledWith({
      message: 'PostgreSQL backup restored: 12 rows across 3 tables.',
      type: 'success',
    });
  });

  it('offers Restore for a plain .sql backup, which is what "Unencrypted" makes on PostgreSQL', async () => {
    renderPanel();

    const button = await restoreButtonFor('backup_20261116_150000.sql');
    expect(button).toBeEnabled();

    await userEvent.click(button);

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        url: '/control/api/operations/database-restore?backup_filename=backup_20261116_150000.sql',
      }),
    );
  });

  it('shows the server\'s reason when a restore is refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/operations/database-backups')) {
          return new Response(JSON.stringify({ backups: BACKUPS, total: BACKUPS.length }), { status: 200 });
        }
        return new Response(
          JSON.stringify({ detail: { message: 'Backup was taken at Alembic revision a, but this database is at b.' } }),
          { status: 500 },
        );
      }),
    );
    const onToast = renderPanel();

    await userEvent.click(await restoreButtonFor('auto_backup_20261116_142026.enc'));

    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith({
        message: 'Backup was taken at Alembic revision a, but this database is at b.',
        type: 'error',
      }),
    );
  });
});
