import type { RefObject } from 'react';
import type { ThemeStyle } from './AppearanceThemeSelector';
import type { BackupItem } from './DevToolsPanel';

export interface DevToolsBackupManagerProps {
  theme: ThemeStyle;
  t: (key: string, options?: Record<string, unknown>) => string;
  backups: BackupItem[] | null;
  backupsLoading: boolean;
  opLoading: string | null;
  selectedBackups: Set<string>;
  backupFilenames: string[];
  allBackupsSelected: boolean;
  selectAllBackupsRef: RefObject<HTMLInputElement | null>;
  formatDateTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) => string;
  getBackupTypeLabel: (filename: string) => string;
  isRestorableBackupType: (filename: string) => boolean;
  onLoadBackups: () => void;
  onDownloadAllZip: () => void;
  onDownloadSelectedZip: () => void;
  onDeleteSelectedBackups: () => void;
  onToggleSelectAllBackups: (checked: boolean) => void;
  onToggleSelected: (filename: string, checked: boolean) => void;
  onRestoreFromServer: (filename: string) => void;
  onDownloadBackup: (filename: string) => void;
}

const DevToolsBackupManager = ({
  theme,
  t,
  backups,
  backupsLoading,
  opLoading,
  selectedBackups,
  backupFilenames,
  allBackupsSelected,
  selectAllBackupsRef,
  formatDateTime,
  getBackupTypeLabel,
  isRestorableBackupType,
  onLoadBackups,
  onDownloadAllZip,
  onDownloadSelectedZip,
  onDeleteSelectedBackups,
  onToggleSelectAllBackups,
  onToggleSelected,
  onRestoreFromServer,
  onDownloadBackup,
}: DevToolsBackupManagerProps) => {
  return (
    <div className={`${theme.card} md:col-span-2`}>
      <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.manageBackups') || 'Manage Backups'}</h4>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onLoadBackups} className={theme.secondaryButton}>
          {backupsLoading ? (t('loading') as string) : (t('utils.viewBackups') || 'View Backups')}
        </button>
        <button type="button" onClick={onDownloadAllZip} className={theme.secondaryButton}>
          {t('utils.downloadAllAsZip') || 'Download All as ZIP'}
        </button>
        <button type="button" onClick={onDownloadSelectedZip} className={theme.secondaryButton}>
          {t('utils.downloadSelectedAsZip') || 'Download Selected as ZIP'}
        </button>
        <button
          type="button"
          onClick={onDeleteSelectedBackups}
          className={`${theme.secondaryButton} text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-700 dark:hover:bg-rose-900/20`}
        >
          {t('utils.deleteSelected') || 'Delete Selected'}
        </button>
      </div>
      <div className={`mb-3 text-xs ${theme.mutedText}`}>
        {t('utils.backupZipIncludesEncrypted')}
      </div>

      {Array.isArray(backups) ? (
        backups.length === 0 ? (
          <div className={`text-xs ${theme.mutedText}`}>{t('utils.noBackupsFound') || 'No backups found'}</div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`text-xs ${theme.mutedText}`}>{t('utils.availableBackups') || 'Available Backups'}:</div>
              <label className={`flex items-center gap-2 text-xs ${theme.text}`}>
                <input
                  ref={selectAllBackupsRef}
                  type="checkbox"
                  checked={allBackupsSelected}
                  disabled={backupFilenames.length === 0}
                  onChange={(event) => onToggleSelectAllBackups(event.target.checked)}
                  aria-label={t('utils.selectAllBackups') || 'Select all backups'}
                />
                <span>{t('utils.selectAllBackups') || 'Select all'}</span>
              </label>
            </div>
            {backups.map((b) => (
                <div key={b.filename} className="flex items-center justify-between gap-3 rounded border border-slate-200 p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBackups.has(b.filename)}
                    onChange={(e) => onToggleSelected(b.filename, e.target.checked)}
                    aria-label={b.filename}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`text-sm ${theme.text}`}>{b.filename}</div>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {getBackupTypeLabel(b.filename)}
                      </span>
                    </div>
                    <div className={`text-xs ${theme.mutedText}`}>
                      {t('utils.created')}: {formatDateTime(b.created)} • {(b.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRestoreFromServer(b.filename)}
                    disabled={opLoading === `restore-${b.filename}` || !isRestorableBackupType(b.filename)}
                    className={`${theme.button} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      isRestorableBackupType(b.filename)
                        ? (t('utils.restoreBackup') || 'Restore this backup')
                        : (t('utils.restoreUnsupportedType') || 'Restore not supported for this backup type')
                    }
                  >
                    {opLoading === `restore-${b.filename}` ? (t('utils.restoring') || 'Restoring...') : (t('utils.restore') || 'Restore')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadBackup(b.filename)}
                    className={theme.secondaryButton}
                  >
                    {t('utils.download') || 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className={`text-xs ${theme.mutedText}`}>{t('utils.clickViewBackups') || 'Click "View Backups" to load list'}</div>
      )}
    </div>
  );
};

export default DevToolsBackupManager;
