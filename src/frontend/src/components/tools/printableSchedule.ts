/**
 * Pure schedule/time helpers behind the printable calendar in ExportCenter.
 *
 * These were previously defined inline at the bottom of ExportCenter.tsx
 * (a ~1380-line file with three components in it), which left real logic —
 * time normalization, end-time arithmetic with periods x duration, grouping
 * and sorting by weekday, and reading a teaching_schedule that can arrive as
 * either an array or a keyed object — with no way to test it directly.
 * Nothing here touches React.
 */

import type { Course as CourseType } from '@/types';

export type PrintableSession = {
  courseId: number | string;
  courseName: string;
  courseCode?: string;
  start: string;
  end: string;
  duration: number;
  periods: number;
  location?: string;
};

export type EditableCalendarSession = PrintableSession & {
  day: string;
  id: string;
};

export type CalendarLayoutOptions = {
  showHeader: boolean;
  showSummary: boolean;
  showGeneratedOn: boolean;
  showLegend: boolean;
  showFooter: boolean;
  showDayCardBackground: boolean;
  stylePreset: 'classic' | 'minimal' | 'bold';
};

export const WEEKDAY_CONFIG: Array<{ key: string; labelKey: string }> = [
  { key: 'Monday', labelKey: 'monday' },
  { key: 'Tuesday', labelKey: 'tuesday' },
  { key: 'Wednesday', labelKey: 'wednesday' },
  { key: 'Thursday', labelKey: 'thursday' },
  { key: 'Friday', labelKey: 'friday' },
];

// This exact object literal used to be repeated three times (ExportCenter's
// initial state, its re-open reset, and PrintableCalendarSheet's fallback).
export const DEFAULT_CALENDAR_LAYOUT: CalendarLayoutOptions = {
  showHeader: true,
  showSummary: true,
  showGeneratedOn: true,
  showLegend: true,
  showFooter: true,
  showDayCardBackground: true,
  stylePreset: 'classic',
};

const emptyWeek = (): Record<string, PrintableSession[]> =>
  WEEKDAY_CONFIG.reduce<Record<string, PrintableSession[]>>((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {} as Record<string, PrintableSession[]>);

const sortEachDayByStart = (schedule: Record<string, PrintableSession[]>) => {
  Object.keys(schedule).forEach((day) => {
    schedule[day].sort((a, b) => (a.start > b.start ? 1 : -1));
  });
};

export const extractScheduleEntries = (schedule: unknown): Array<{ day: string; data: unknown }> => {
  const entries: Array<{ day: string; data: unknown }> = [];
  if (!schedule) return entries;

  const pushEntry = (day?: string, data?: unknown) => {
    if (!day) return;
    entries.push({ day, data: data || {} });
  };

  if (Array.isArray(schedule)) {
    schedule.forEach((entry) => pushEntry(entry?.day, entry));
  } else if (schedule && typeof schedule === 'object') {
    Object.entries(schedule).forEach(([day, cfg]) => pushEntry(day, cfg));
  }

  return entries;
};

export const normalizeTimeString = (value?: string): string => {
  if (!value || typeof value !== 'string') {
    return '08:00';
  }
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? '0');
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '08:00';
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const calculateEndTime = (start: string, periods: number, duration: number): string => {
  const [hoursRaw, minutesRaw] = start.split(':');
  const startHour = Number(hoursRaw);
  const startMinute = Number(minutesRaw);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
    return start;
  }
  const startMinutes = startHour * 60 + startMinute;
  const totalMinutes = startMinutes + periods * duration;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export const buildPrintableSchedule = (courses: CourseType[]): Record<string, PrintableSession[]> => {
  const schedule = emptyWeek();

  (Array.isArray(courses) ? courses : []).forEach((course) => {
    // Ended courses (is_active === false) are off the calendar, so off the printout too
    if (course?.is_active === false) return;
    const entries = extractScheduleEntries(course?.teaching_schedule);
    entries.forEach(({ day, data }) => {
      if (!schedule[day]) return;
      const dataRec = data as Record<string, unknown> | undefined;
      const start = normalizeTimeString(dataRec?.start_time as string | undefined);
      const duration = Number(dataRec?.duration as number | string) || 45;
      const periods = Number(dataRec?.periods as number | string) || 1;
      schedule[day].push({
        courseId: course?.id ?? `${course?.course_code || course?.course_name}-${day}`,
        courseName: course?.course_name || (course as { name?: string })?.name || '',
        courseCode: course?.course_code || '',
        start,
        end: calculateEndTime(start, periods, duration),
        duration,
        periods,
        location: (dataRec?.location as string) || (course as unknown as { location?: string })?.location || (course as { room?: string })?.room || '',
      });
    });
  });

  sortEachDayByStart(schedule);

  return schedule;
};

export const groupScheduleByDay = (sessions: EditableCalendarSession[]): Record<string, PrintableSession[]> => {
  const schedule = emptyWeek();

  sessions.forEach((session) => {
    if (!schedule[session.day]) {
      schedule[session.day] = [];
    }
    schedule[session.day].push({
      courseId: session.courseId,
      courseName: session.courseName,
      courseCode: session.courseCode,
      start: session.start,
      end: session.end,
      duration: session.duration,
      periods: session.periods,
      location: session.location,
    });
  });

  sortEachDayByStart(schedule);

  return schedule;
};

/** Flattens a week's schedule into the editable draft rows the review modal uses. */
export const buildCalendarDraft = (courseList: CourseType[]): EditableCalendarSession[] => {
  const schedule = buildPrintableSchedule(courseList);
  const draft: EditableCalendarSession[] = [];
  Object.entries(schedule).forEach(([day, sessions]) => {
    sessions.forEach((session, index) => {
      draft.push({
        ...session,
        day,
        id: `${day}-${session.courseId}-${index}`,
      });
    });
  });
  return draft;
};
