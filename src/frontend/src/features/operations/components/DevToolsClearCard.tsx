import type { ThemeStyle } from './AppearanceThemeSelector';

export type ClearScope = 'all' | 'data_only';

export interface DevToolsClearCardProps {
  theme: ThemeStyle;
  t: (key: string, options?: Record<string, unknown>) => string;
  clearConfirm: boolean;
  setClearConfirm: (value: boolean) => void;
  clearScope: ClearScope;
  setClearScope: (scope: ClearScope) => void;
  opLoading: string | null;
  onClear: () => void;
}

const DevToolsClearCard = ({
  theme,
  t,
  clearConfirm,
  setClearConfirm,
  clearScope,
  setClearScope,
  opLoading,
  onClear,
}: DevToolsClearCardProps) => {
  return (
    <div className={theme.card}>
      <h4 className={`mb-2 text-sm font-semibold ${theme.text}`}>{t('utils.clear')}</h4>
      <p className={`mb-3 text-xs ${theme.mutedText}`}>{t('utils.deleteDataChooseScope')}</p>
      <label className={`mb-3 flex items-center gap-2 text-sm ${theme.text}`}>
        <input
          type="checkbox"
          checked={clearConfirm}
          onChange={(event) => setClearConfirm(event.target.checked)}
        />
        {t('confirm')}
      </label>
      <select
        value={clearScope}
        onChange={(event) => setClearScope(event.target.value as ClearScope)}
        className={`mb-3 w-full ${theme.input}`}
        aria-label={t('utils.selectClearScope')}
      >
        <option value="all">{t('utils.allCoursesStudentsRecords')}</option>
        <option value="data_only">{t('utils.dataOnlyKeepCoursesStudents')}</option>
      </select>
      <button
        type="button"
        onClick={onClear}
        disabled={!clearConfirm || opLoading === 'clear'}
        className={`${theme.button} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {opLoading === 'clear' ? t('loading') : t('utils.clearDb')}
      </button>
    </div>
  );
};

export default DevToolsClearCard;
