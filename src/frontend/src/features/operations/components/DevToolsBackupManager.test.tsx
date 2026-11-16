import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

import DevToolsBackupManager, { type DevToolsBackupManagerProps } from './DevToolsBackupManager';
import { themeStyles } from './AppearanceThemeSelector';
import type { AutomaticBackupStatus } from './DevToolsPanel';
import utilsEn from '@/locales/en/utils';
import utilsEl from '@/locales/el/utils';

// The page used to say nothing about automatic backups, the help said they happened daily, and
// nothing made them. The panel now shows what the server reports about its own.

const flat = (bundle: unknown): Record<string, string> => {
  const root = bundle as { utils?: Record<string, string> } & Record<string, string>;
  return root.utils ?? root;
};

/** Translates like the app does for the keys this panel uses: looks the key up, fills {{x}}. */
const translator = (bundle: unknown) => (key: string, options?: Record<string, unknown>) => {
  const text = flat(bundle)[key.replace(/^utils\./, '')];
  if (typeof text !== 'string') return key;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));
};

const automatic = (over: Partial<AutomaticBackupStatus> = {}): AutomaticBackupStatus => ({
  enabled: true,
  interval_hours: 24,
  keep: 30,
  count: 1,
  last_backup: '2026-11-16T14:20:26+02:00',
  last_backup_filename: 'auto_backup_20261116_142026.enc',
  last_error: null,
  ...over,
});

const renderManager = (over: Partial<DevToolsBackupManagerProps> = {}, bundle: unknown = utilsEn) =>
  render(
    <DevToolsBackupManager
      theme={themeStyles.default}
      t={translator(bundle)}
      backups={[]}
      backupsLoading={false}
      opLoading={null}
      selectedBackups={new Set()}
      backupFilenames={[]}
      allBackupsSelected={false}
      selectAllBackupsRef={createRef<HTMLInputElement>()}
      formatDateTime={(value) => `formatted(${String(value)})`}
      getBackupTypeLabel={() => 'Encrypted'}
      isRestorableBackupType={() => true}
      onLoadBackups={vi.fn()}
      onDownloadAllZip={vi.fn()}
      onDownloadSelectedZip={vi.fn()}
      onDeleteSelectedBackups={vi.fn()}
      onToggleSelectAllBackups={vi.fn()}
      onToggleSelected={vi.fn()}
      onRestoreFromServer={vi.fn()}
      onDownloadBackup={vi.fn()}
      {...over}
    />,
  );

describe('DevToolsBackupManager: the automatic backup', () => {
  it('says how often the server backs itself up and when it last did', () => {
    renderManager({ automaticBackup: automatic() });

    const status = screen.getByTestId('automatic-backup-status');
    expect(status).toHaveTextContent('every 24 hours');
    expect(status).toHaveTextContent('keeps the newest 30');
    expect(status).toHaveTextContent('Last automatic backup: formatted(2026-11-16T14:20:26+02:00)');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when there is none yet', () => {
    renderManager({ automaticBackup: automatic({ count: 0, last_backup: null, last_backup_filename: null }) });

    expect(screen.getByTestId('automatic-backup-status')).toHaveTextContent('No automatic backup yet');
  });

  it('warns when the automatic backup is switched off', () => {
    renderManager({ automaticBackup: automatic({ enabled: false }) });

    expect(screen.getByRole('alert')).toHaveTextContent('switched off');
    expect(screen.getByTestId('automatic-backup-status')).not.toHaveTextContent('every 24 hours');
  });

  it('shows why the last automatic backup failed', () => {
    renderManager({ automaticBackup: automatic({ last_error: 'connection refused' }) });

    expect(screen.getByRole('alert')).toHaveTextContent('The last automatic backup failed: connection refused');
  });

  it('shows nothing about it for a server that does not report it', () => {
    renderManager({ automaticBackup: null });

    expect(screen.queryByTestId('automatic-backup-status')).toBeNull();
  });

  it('marks the automatic backups in the list, and only those', () => {
    renderManager({
      automaticBackup: automatic(),
      backups: [
        { filename: 'auto_backup_20261116_142026.enc', path: '', size: 2048, created: '2026-11-16T14:20:26+02:00' },
        { filename: 'backup_20261106_152510.enc', path: '', size: 2048, created: '2026-11-06T15:25:10+02:00' },
      ],
      backupFilenames: ['auto_backup_20261116_142026.enc', 'backup_20261106_152510.enc'],
    });

    expect(screen.getAllByText('Automatic')).toHaveLength(1);
    // The row's label is a word, not its key: "utils.created:" was shown here in English.
    expect(screen.getAllByText(/^Created: formatted\(/)).toHaveLength(2);
  });

  it('uses no text whose English wording equals its own key', () => {
    // The app's t() takes a translation that equals the key's last part for "no translation"
    // and shows the full key instead. That is how "utils.created" got on the page.
    const keys = ['backupCreated', 'backupAutomaticLabel', 'autoBackupTitle', 'manageBackups', 'restore', 'download'];
    for (const key of keys) {
      expect(flat(utilsEn)[key], key).toBeTypeOf('string');
      expect(flat(utilsEn)[key], key).not.toBe(key);
    }
  });

  it('has every text in Greek as well', () => {
    renderManager({ automaticBackup: automatic({ last_error: 'σφάλμα' }) }, utilsEl);

    const status = screen.getByTestId('automatic-backup-status');
    expect(status).toHaveTextContent('Αυτόματο αντίγραφο ασφαλείας');
    expect(status).toHaveTextContent('κάθε 24 ώρες');
    expect(status).toHaveTextContent('Το τελευταίο αυτόματο αντίγραφο απέτυχε: σφάλμα');
    // No key shows through untranslated.
    expect(status.textContent).not.toMatch(/utils\.|autoBackup/);
  });
});
