import type { ChangeEvent } from 'react';
import type { ThemeStyle } from './AppearanceThemeSelector';
import type { HealthStatus } from './DevToolsPanel';

export type BackupMode = 'encrypted' | 'unencrypted';

export interface DevToolsDatabaseToolsProps {
  theme: ThemeStyle;
  t: (key: string, options?: Record<string, unknown>) => string;
  legacyDatabaseToolsVisible: boolean;
  health: HealthStatus | null;
  backupMode: BackupMode;
  setBackupMode: (mode: BackupMode) => void;
  opLoading: string | null;
  onBackup: () => void;
  restoreFile: File | null;
  setRestoreFile: (file: File | null) => void;
  onRestore: () => void;
}

const DevToolsDatabaseTools = ({
  theme,
  t,
  legacyDatabaseToolsVisible,
  health,
  backupMode,
  setBackupMode,
  opLoading,
  onBackup,
  restoreFile,
  setRestoreFile,
  onRestore,
}: DevToolsDatabaseToolsProps) => {
  const rawDatabaseLabel = typeof health?.database === 'string'
    ? health.database
    : typeof health?.db === 'string'
      ? health.db
      : '';
  const normalizedDatabaseLabel = rawDatabaseLabel.trim().toLowerCase();
  const isDatabaseKnown = rawDatabaseLabel.trim().length > 0;
  const isSqliteDatabase = normalizedDatabaseLabel.includes('sqlite');
  const isPostgresqlDatabase = normalizedDatabaseLabel.includes('postgres');
  const canBackup = !isDatabaseKnown || isSqliteDatabase || isPostgresqlDatabase;

  if (!legacyDatabaseToolsVisible) {
    return (
      <div className={`${theme.card} md:col-span-2`}>
        <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>
          {t('db.title') || 'Database Management'}
        </h4>
        <p className={`text-xs ${theme.mutedText}`}>
          {t('utils.databaseToolsMoved') || 'Backup, restore, and backup files are managed from the Database tab to avoid duplicate database references.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={theme.card}>
        <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.backupDatabase')}</h4>
        <p className={`mb-4 text-xs ${theme.mutedText}`}>{t('utils.backupDesc')}</p>
        <div className="mb-4 space-y-2">
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${theme.mutedText}`}>
            {t('utils.backupModeLabel') || 'Backup format'}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={`flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs ${theme.text}`}>
              <input
                type="radio"
                name="backup-mode"
                checked={backupMode === 'encrypted'}
                onChange={() => setBackupMode('encrypted')}
              />
              <span>{t('utils.backupModeEncrypted') || 'Encrypted (.enc)'}</span>
            </label>
            <label className={`flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs ${theme.text}`}>
              <input
                type="radio"
                name="backup-mode"
                checked={backupMode === 'unencrypted'}
                onChange={() => setBackupMode('unencrypted')}
              />
              <span>{t('utils.backupModeUnencrypted') || 'Unencrypted (.db/.sql)'}</span>
            </label>
          </div>
          <p className={`text-xs ${theme.mutedText}`}>
            {backupMode === 'encrypted'
              ? (t('utils.backupModeEncryptedHint') || 'Recommended for secure offsite storage.')
              : (t('utils.backupModeUnencryptedHint') || 'Creates a plain backup for direct inspection or migration.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackup}
          disabled={opLoading === 'backup' || !canBackup}
          className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
          aria-disabled={opLoading === 'backup' || !canBackup}
        >
          {opLoading === 'backup' ? t('loading') : t('utils.backupDatabase')}
        </button>
        {!canBackup && (
          <p className={`mt-2 text-xs ${theme.mutedText}`}>
            {t('utils.backupSqliteOnly')}
          </p>
        )}
      </div>

      <div className={theme.card}>
        <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.resetDatabase')}</h4>
        <p className={`mb-3 text-xs ${theme.mutedText}`}>{t('utils.uploadPreviouslySavedBackup')}</p>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <label className={`${theme.secondaryButton} flex flex-1 cursor-pointer items-center gap-2`}>
            <span>{t('chooseFile')}</span>
            <span className={`flex-1 truncate text-[11px] ${theme.mutedText}`}>
              {restoreFile ? restoreFile.name : t('noFileChosen')}
            </span>
            <input
              type="file"
              accept=".db"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRestoreFile(event.target.files?.[0] ?? null)}
              aria-label={t('utils.selectBackupFile')}
            />
          </label>
          <button
            type="button"
            onClick={onRestore}
            disabled={!restoreFile || opLoading === 'restore'}
            className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {opLoading === 'restore' ? t('loading') : t('utils.restoreDb')}
          </button>
        </div>
        {!isSqliteDatabase && isDatabaseKnown && (
          <p className={`mt-2 text-xs ${theme.mutedText}`}>
            {t('utils.restoreAutoMigrateHint')}
          </p>
        )}
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('utils.appMayNeedRefresh')}</p>
      </div>
    </>
  );
};

export default DevToolsDatabaseTools;
