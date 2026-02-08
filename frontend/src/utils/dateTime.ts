export type DateFormatOption = 'gr-ddmmyyyy' | 'gr-ddmmyy' | 'en-us';

export interface DateTimeSettings {
  timeZone: string;
  dateFormat: DateFormatOption;
}

export const DEFAULT_TIME_ZONE = 'Europe/Athens';
export const DEFAULT_DATE_FORMAT: DateFormatOption = 'gr-ddmmyyyy';

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormatOption }> = [
  { value: 'gr-ddmmyyyy' },
  { value: 'gr-ddmmyy' },
  { value: 'en-us' },
];

export const TIME_ZONE_OPTIONS: string[] = [
  'Europe/Athens',
  'Europe/Nicosia',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
];

export const getStoredDateTimeSettings = (): DateTimeSettings => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { timeZone: DEFAULT_TIME_ZONE, dateFormat: DEFAULT_DATE_FORMAT };
    }
    const storedTimeZone = localStorage.getItem('sms_timezone') || DEFAULT_TIME_ZONE;
    const storedFormat = (localStorage.getItem('sms_date_format') as DateFormatOption | null) || DEFAULT_DATE_FORMAT;
    const dateFormat = DATE_FORMAT_OPTIONS.some((option) => option.value === storedFormat)
      ? storedFormat
      : DEFAULT_DATE_FORMAT;
    return {
      timeZone: storedTimeZone,
      dateFormat,
    };
  } catch {
    return { timeZone: DEFAULT_TIME_ZONE, dateFormat: DEFAULT_DATE_FORMAT };
  }
};

const resolveLocale = (format: DateFormatOption): string => {
  return format === 'en-us' ? 'en-US' : 'en-GB';
};

const resolveDateOptions = (format: DateFormatOption): Intl.DateTimeFormatOptions => {
  switch (format) {
    case 'gr-ddmmyy':
      return { day: '2-digit', month: '2-digit', year: '2-digit' };
    case 'en-us':
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
    case 'gr-ddmmyyyy':
    default:
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
  }
};

const resolveYearOption = (format: DateFormatOption): 'numeric' | '2-digit' => {
  return format === 'gr-ddmmyy' ? '2-digit' : 'numeric';
};

const parseDateValue = (value: Date | string | number | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
    const normalized = hasTz ? trimmed : `${trimmed}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateWithSettings = (value: Date | string | number | null | undefined, settings: DateTimeSettings): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const locale = resolveLocale(settings.dateFormat);
  const options = resolveDateOptions(settings.dateFormat);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: settings.timeZone }).format(date);
};

export const formatDateTimeWithSettings = (
  value: Date | string | number | null | undefined,
  settings: DateTimeSettings,
  options?: { includeSeconds?: boolean }
): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const locale = resolveLocale(settings.dateFormat);
  const dateOptions = resolveDateOptions(settings.dateFormat);
  const hour12 = settings.dateFormat === 'en-us';
  return new Intl.DateTimeFormat(locale, {
    ...dateOptions,
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' } : {}),
    hour12,
    timeZone: settings.timeZone,
  }).format(date);
};

export const formatTimeWithSettings = (
  value: Date | string | number | null | undefined,
  settings: DateTimeSettings,
  options?: { includeSeconds?: boolean }
): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const locale = resolveLocale(settings.dateFormat);
  const hour12 = settings.dateFormat === 'en-us';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' } : {}),
    hour12,
    timeZone: settings.timeZone,
  }).format(date);
};

export const formatMonthYearWithSettings = (value: Date | string | number | null | undefined, settings: DateTimeSettings): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const locale = resolveLocale(settings.dateFormat);
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    year: resolveYearOption(settings.dateFormat),
    timeZone: settings.timeZone,
  }).format(date);
};

export const formatWeekdayWithSettings = (
  value: Date | string | number | null | undefined,
  settings: DateTimeSettings,
  localeOverride?: string
): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const locale = localeOverride || resolveLocale(settings.dateFormat);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: settings.timeZone }).format(date);
};
