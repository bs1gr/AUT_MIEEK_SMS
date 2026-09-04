import AppearanceThemeSelector from '@/features/operations/components/AppearanceThemeSelector';
import { DATE_FORMAT_OPTIONS, TIME_ZONE_OPTIONS, type DateFormatOption } from '@/utils/dateTime';

export interface OperationsSettingsTabProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  timeZone: string;
  setTimeZone: (zone: string) => void;
  dateFormat: DateFormatOption;
  setDateFormat: (format: DateFormatOption) => void;
  formatDateTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) => string;
}

const OperationsSettingsTab = ({
  t,
  timeZone,
  setTimeZone,
  dateFormat,
  setDateFormat,
  formatDateTime,
}: OperationsSettingsTabProps) => {
  return (
    <div className="space-y-6">
      <AppearanceThemeSelector />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('dateTimeSettingsTitle', { ns: 'controlPanel' }) || 'Date & Time Settings'}
          </h3>
          <p className="text-sm text-slate-600">
            {t('dateTimeSettingsSubtitle', { ns: 'controlPanel' }) || 'Force the date format and timezone used across the application.'}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t('dateTimeTimezoneLabel', { ns: 'controlPanel' }) || 'Timezone'}</span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
            >
              {TIME_ZONE_OPTIONS.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t('dateTimeFormatLabel', { ns: 'controlPanel' }) || 'Date format'}</span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={dateFormat}
              onChange={(event) => setDateFormat(event.target.value as DateFormatOption)}
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === 'gr-ddmmyyyy' && (t('dateFormatGreekLong', { ns: 'controlPanel' }) || 'Greek (DD/MM/YYYY)')}
                  {option.value === 'gr-ddmmyy' && (t('dateFormatGreekShort', { ns: 'controlPanel' }) || 'Greek (DD/MM/YY)')}
                  {option.value === 'en-us' && (t('dateFormatEnUs', { ns: 'controlPanel' }) || 'EN/US (MM/DD/YYYY)')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">
            {t('dateTimePreviewLabel', { ns: 'controlPanel' }) || 'Preview'}:
          </span>{' '}
          {formatDateTime(new Date())}
        </div>
      </div>
    </div>
  );
};

export default OperationsSettingsTab;
