import React, { useMemo } from 'react';
import type { Course as CourseType } from '@/types';
import {
  DEFAULT_CALENDAR_LAYOUT,
  WEEKDAY_CONFIG,
  buildPrintableSchedule,
  groupScheduleByDay,
  type CalendarLayoutOptions,
  type EditableCalendarSession,
} from './printableSchedule';

interface PrintableCalendarSheetProps {
  courses?: CourseType[];
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
  scheduleOverride?: EditableCalendarSession[];
  layoutOptions?: CalendarLayoutOptions;
}

const PrintableCalendarSheet = ({ courses = [], t, language, scheduleOverride, layoutOptions }: PrintableCalendarSheetProps) => {
  const layout = layoutOptions || DEFAULT_CALENDAR_LAYOUT;
  const rootStyle: React.CSSProperties = {
    backgroundColor: layout.stylePreset === 'minimal' ? '#ffffff' : undefined,
    border: layout.stylePreset === 'bold' ? '2px solid #0f172a' : undefined,
    padding: layout.stylePreset === 'minimal' ? '0.5rem' : undefined,
  };
  const scheduleByDay = useMemo(() => {
    if (scheduleOverride && scheduleOverride.length > 0) {
      return groupScheduleByDay(scheduleOverride);
    }
    return buildPrintableSchedule(courses);
  }, [courses, scheduleOverride]);
  const totalSessions = useMemo(
    () => Object.values(scheduleByDay).reduce((sum, sessions) => sum + sessions.length, 0),
    [scheduleByDay]
  );
  const scheduledCourseCount = useMemo(() => {
    const ids = new Set<string | number>();
    Object.values(scheduleByDay).forEach((sessions) => {
      sessions.forEach((session) => ids.add(session.courseId));
    });
    return ids.size;
  }, [scheduleByDay]);
  const generatedOn = useMemo(
    () => new Intl.DateTimeFormat(language || 'en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
    [language]
  );

  return (
    <div className={`print-calendar-sheet print-calendar-sheet--${layout.stylePreset}`} style={rootStyle}>
      {layout.showHeader && (
        <header className="print-calendar-sheet__header">
          <div>
            <p className="print-calendar-sheet__title">{t('printCalendarSheetTitle')}</p>
            <p className="print-calendar-sheet__subtitle">{t('printCalendarSheetSubtitle')}</p>
          </div>
          <div className="print-calendar-sheet__meta">
            {layout.showSummary && (
              <div className="print-calendar-sheet__meta-block">
                <span className="print-calendar-sheet__meta-label">{t('printCalendarSummary')}</span>
                <p className="print-calendar-sheet__meta-value">{t('printCalendarCoursesCount', { count: scheduledCourseCount })}</p>
                <p className="print-calendar-sheet__meta-sub">{t('printCalendarSessionsCount', { count: totalSessions })}</p>
              </div>
            )}
            {layout.showGeneratedOn && (
              <div className="print-calendar-sheet__meta-block">
                <span className="print-calendar-sheet__meta-label">
                  {t('printCalendarGeneratedOn', { date: generatedOn })}
                </span>
              </div>
            )}
          </div>
        </header>
      )}

      {layout.showLegend && (
        <section className="print-calendar-sheet__legend">
          <h3>{t('printCalendarLegend')}</h3>
          <div className="print-calendar-sheet__legend-items">
            <span>
              {t('printCalendarLegendDurationLabel')}: {t('printCalendarLegendDurationHint')}
            </span>
            <span>
              {t('printCalendarLegendPeriodsLabel')}: {t('printCalendarLegendPeriodsHint')}
            </span>
            <span>{t('printCalendarLegendNote')}</span>
          </div>
        </section>
      )}

      <section className="print-calendar-sheet__grid">
        {WEEKDAY_CONFIG.map((dayConfig) => {
          const sessions = scheduleByDay[dayConfig.key] || [];
          const dayStyle: React.CSSProperties = layout.showDayCardBackground
            ? {}
            : {
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
              };
          return (
            <div key={dayConfig.key} className="print-calendar-sheet__day" style={dayStyle}>
              <div className="print-calendar-sheet__day-header">
                <span>{t(dayConfig.labelKey)}</span>
                <span>
                  {sessions.length} {sessions.length === 1 ? t('class') : t('classes')}
                </span>
              </div>
              {sessions.length === 0 ? (
                <p className="print-calendar-sheet__empty">{t('printCalendarNoClassesDay')}</p>
              ) : (
                <ul className="print-calendar-sheet__sessions">
                  {sessions.map((session, idx) => (
                    <li key={`${session.courseId}-${dayConfig.key}-${idx}`} className="print-calendar-sheet__session">
                      <div className="print-calendar-sheet__session-title">
                        <span>
                          {session.courseCode ? `${session.courseCode} · ${session.courseName}` : session.courseName}
                        </span>
                        <span>
                          {session.start} – {session.end}
                        </span>
                      </div>
                      <div className="print-calendar-sheet__session-meta">
                        <span>
                          {t('printCalendarLegendDurationLabel')}: {session.duration * session.periods} {t('minutes')}
                        </span>
                        <span>
                          {t('printCalendarLegendPeriodsLabel')}: {session.periods}
                        </span>
                        {session.location && <span>{session.location}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {layout.showFooter && (
        <footer className="print-calendar-sheet__footer">{t('printCalendarFooterNote')}</footer>
      )}
    </div>
  );
};

export default PrintableCalendarSheet;
