import type { ThemeStyle } from './AppearanceThemeSelector';

export type ImportType = 'courses' | 'students';

export interface DevToolsImportCardProps {
  theme: ThemeStyle;
  t: (key: string, options?: Record<string, unknown>) => string;
  importType: ImportType;
  setImportType: (type: ImportType) => void;
  importFile: File | null;
  setImportFile: (file: File | null) => void;
  opLoading: string | null;
  onImport: () => void;
}

const DevToolsImportCard = ({
  theme,
  t,
  importType,
  setImportType,
  importFile,
  setImportFile,
  opLoading,
  onImport,
}: DevToolsImportCardProps) => {
  return (
    <div className={theme.card}>
      <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.uploadJsonToImport')}</h4>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <select
          value={importType}
          onChange={(event) => setImportType(event.target.value as ImportType)}
          className={`w-full md:w-48 ${theme.input}`}
          aria-label={t('utils.selectImportType')}
        >
          <option value="courses">{t('courses')}</option>
          <option value="students">{t('students')}</option>
        </select>
        <label className={`${theme.secondaryButton} flex flex-1 cursor-pointer items-center gap-2`}>
          <span>{t('chooseFile')}</span>
          <span className={`flex-1 truncate text-[11px] ${theme.mutedText}`}>
            {importFile ? `${importFile.name}` : t('noFilesSelected')}
          </span>
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            aria-label={t('utils.selectJsonFiles')}
          />
        </label>
        <button
          type="button"
          onClick={onImport}
          disabled={opLoading === 'upload'}
          className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {opLoading === 'upload' ? t('loading') : t('utils.importUpload')}
        </button>
      </div>
      <p className={`mt-2 text-xs ${theme.mutedText}`}>{t('utils.selectJsonFiles')}</p>
    </div>
  );
};

export default DevToolsImportCard;
