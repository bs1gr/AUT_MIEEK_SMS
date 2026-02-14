import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_ZONE,
  formatDateWithSettings,
  formatDateTimeWithSettings,
  formatMonthYearWithSettings,
  formatTimeWithSettings,
  formatWeekdayWithSettings,
  getStoredDateTimeSettings,
  type DateFormatOption,
  type DateTimeSettings,
} from '@/utils/dateTime';

interface DateTimeSettingsContextValue extends DateTimeSettings {
  setTimeZone: (value: string) => void;
  setDateFormat: (value: DateFormatOption) => void;
}

const DateTimeSettingsContext = createContext<DateTimeSettingsContextValue | undefined>(undefined);

interface DateTimeSettingsProviderProps {
  children: React.ReactNode;
}

export const DateTimeSettingsProvider: React.FC<DateTimeSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<DateTimeSettings>(() => getStoredDateTimeSettings());

  const setTimeZone = (value: string) => {
    const next = value || DEFAULT_TIME_ZONE;
    try {
      localStorage.setItem('sms_timezone', next);
    } catch {
      // ignore storage failures (private mode, blocked access)
    }
    setSettings((prev) => ({ ...prev, timeZone: next }));
  };

  const setDateFormat = (value: DateFormatOption) => {
    const next = value || DEFAULT_DATE_FORMAT;
    try {
      localStorage.setItem('sms_date_format', next);
    } catch {
      // ignore storage failures (private mode, blocked access)
    }
    setSettings((prev) => ({ ...prev, dateFormat: next }));
  };

  const contextValue = useMemo(() => ({
    ...settings,
    setTimeZone,
    setDateFormat,
  }), [settings]);

  return (
    <DateTimeSettingsContext.Provider value={contextValue}>
      {children}
    </DateTimeSettingsContext.Provider>
  );
};

export const useDateTimeSettings = () => {
  const context = useContext(DateTimeSettingsContext);
  if (!context) {
    throw new Error('useDateTimeSettings must be used within a DateTimeSettingsProvider');
  }
  return context;
};

export const useDateTimeFormatter = () => {
  const settings = useDateTimeSettings();

  return useMemo(
    () => ({
      formatDate: (value: Date | string | number | null | undefined) => formatDateWithSettings(value, settings),
      formatDateTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) =>
        formatDateTimeWithSettings(value, settings, options),
      formatTime: (value: Date | string | number | null | undefined, options?: { includeSeconds?: boolean }) =>
        formatTimeWithSettings(value, settings, options),
      formatMonthYear: (value: Date | string | number | null | undefined) => formatMonthYearWithSettings(value, settings),
      formatWeekday: (value: Date | string | number | null | undefined, localeOverride?: string) =>
        formatWeekdayWithSettings(value, settings, localeOverride),
    }),
    [settings]
  );
};
