import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { controlApiClient } from '@/api/api';
import DatabasePanel from '../DatabasePanel';

// Since 2026-11-20 the Database panel's backups are the application's encrypted backups: the
// list marks them, and the Backup button asks for one without the old gzip option.
vi.mock('@/api/api', () => ({ controlApiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../../../utils/downloadFile', () => ({ downloadBlob: vi.fn() }));

const api = controlApiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const PRIMARY = {
  name: 'primary', label: 'Primary PostgreSQL', host: 'db', port: 5432, dbname: 'sms', is_primary: true,
  status: 'healthy', version: '14.18', started_at: null, size_bytes: 1, size_human: '1 B', error: null,
};
const BACKUP = {
  filename: 'backup_20261120_100000.enc', size_bytes: 2048, size_human: '2.0 KB',
  created_at: '2026-11-20T10:00:00+00:00', instance: 'primary', method: 'psycopg_copy',
  compressed: false, encrypted: true,
};

describe('DatabasePanel and encrypted backups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url: string) => {
      if (url === '/database/instances') return Promise.resolve({ data: [PRIMARY] });
      if (url === '/database/backups') return Promise.resolve({ data: [BACKUP] });
      return Promise.resolve({ data: {} });
    });
  });

  it('marks each backup as encrypted', async () => {
    render(<DatabasePanel controlApi="/control/api" />);
    const label = await screen.findByTestId('backup-encrypted');
    expect(label).toHaveTextContent('db.encrypted');
    expect(label).toHaveAttribute('title', 'db.encryptedHint');
  });

  it('asks for a backup without the old gzip option', async () => {
    api.post.mockResolvedValue({ data: { success: true, filename: 'backup_x.enc', encrypted: true } });
    const user = userEvent.setup();
    render(<DatabasePanel controlApi="/control/api" />);
    await screen.findByTestId('backup-encrypted');

    await user.click(screen.getByRole('button', { name: 'db.backup' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/database/instances/primary/backup'));
  });
});
