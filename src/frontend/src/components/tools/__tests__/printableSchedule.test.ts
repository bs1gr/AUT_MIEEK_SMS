/**
 * Tests for the pure schedule/time helpers behind ExportCenter's printable
 * calendar. These had no coverage while they lived inline at the bottom of
 * ExportCenter.tsx — see the 2026-09 workspace audit.
 */

import { describe, it, expect } from 'vitest';
import type { Course as CourseType } from '@/types';
import {
  DEFAULT_CALENDAR_LAYOUT,
  WEEKDAY_CONFIG,
  buildCalendarDraft,
  buildPrintableSchedule,
  calculateEndTime,
  extractScheduleEntries,
  groupScheduleByDay,
  normalizeTimeString,
  type EditableCalendarSession,
} from '../printableSchedule';

const course = (overrides: Partial<CourseType> & Record<string, unknown> = {}): CourseType => ({
  id: 1,
  course_name: 'Math 101',
  course_code: 'MATH101',
  ...overrides,
} as CourseType);

describe('normalizeTimeString', () => {
  it('zero-pads hours and minutes', () => {
    expect(normalizeTimeString('9:5')).toBe('09:05');
    expect(normalizeTimeString('08:00')).toBe('08:00');
  });

  it('defaults to 08:00 for missing, empty, or non-string input', () => {
    expect(normalizeTimeString(undefined)).toBe('08:00');
    expect(normalizeTimeString('')).toBe('08:00');
    expect(normalizeTimeString(42 as unknown as string)).toBe('08:00');
  });

  it('defaults to 08:00 when either component is not a number', () => {
    expect(normalizeTimeString('ab:cd')).toBe('08:00');
    expect(normalizeTimeString('10:xx')).toBe('08:00');
  });

  it('treats a bare hour as being on the hour', () => {
    expect(normalizeTimeString('7')).toBe('07:00');
  });
});

describe('calculateEndTime', () => {
  it('adds periods x duration to the start time', () => {
    expect(calculateEndTime('08:00', 2, 45)).toBe('09:30');
    expect(calculateEndTime('09:15', 1, 45)).toBe('10:00');
  });

  it('wraps past midnight rather than returning a 24+ hour', () => {
    expect(calculateEndTime('23:30', 2, 45)).toBe('01:00');
  });

  it('returns the start unchanged when it cannot be parsed', () => {
    expect(calculateEndTime('not-a-time', 2, 45)).toBe('not-a-time');
  });

  it('returns the start time when there are zero periods', () => {
    expect(calculateEndTime('10:00', 0, 45)).toBe('10:00');
  });
});

describe('extractScheduleEntries', () => {
  it('returns nothing for empty/nullish schedules', () => {
    expect(extractScheduleEntries(null)).toEqual([]);
    expect(extractScheduleEntries(undefined)).toEqual([]);
    expect(extractScheduleEntries(0)).toEqual([]);
  });

  it('reads an array-shaped schedule, using each entry as its own data', () => {
    const entries = extractScheduleEntries([{ day: 'Monday', start_time: '09:00' }]);
    expect(entries).toEqual([{ day: 'Monday', data: { day: 'Monday', start_time: '09:00' } }]);
  });

  it('reads an object-keyed schedule', () => {
    const entries = extractScheduleEntries({ Tuesday: { start_time: '11:00' } });
    expect(entries).toEqual([{ day: 'Tuesday', data: { start_time: '11:00' } }]);
  });

  it('skips array entries with no day', () => {
    expect(extractScheduleEntries([{ start_time: '09:00' }])).toEqual([]);
  });
});

describe('buildPrintableSchedule', () => {
  it('returns an empty slot for every configured weekday', () => {
    const schedule = buildPrintableSchedule([]);
    expect(Object.keys(schedule)).toEqual(WEEKDAY_CONFIG.map((d) => d.key));
    expect(Object.values(schedule).every((sessions) => sessions.length === 0)).toBe(true);
  });

  it('tolerates a non-array courses argument', () => {
    const schedule = buildPrintableSchedule(null as unknown as CourseType[]);
    expect(Object.values(schedule).every((sessions) => sessions.length === 0)).toBe(true);
  });

  it('leaves ended (is_active=false) courses off the printout', () => {
    const schedule = buildPrintableSchedule([
      course({ id: 1, course_code: 'ENDED', is_active: false, teaching_schedule: { Monday: { start_time: '08:00' } } } as never),
      course({ id: 2, course_code: 'LIVE', teaching_schedule: { Monday: { start_time: '09:00' } } } as never),
    ]);
    expect(schedule.Monday.map((s) => s.courseCode)).toEqual(['LIVE']);
  });

  it('places a session on its weekday with a computed end time', () => {
    const schedule = buildPrintableSchedule([
      course({ teaching_schedule: { Monday: { start_time: '09:00', duration: 45, periods: 2, location: 'Room A' } } } as never),
    ]);

    expect(schedule.Monday).toHaveLength(1);
    expect(schedule.Monday[0]).toMatchObject({
      courseId: 1,
      courseCode: 'MATH101',
      courseName: 'Math 101',
      start: '09:00',
      end: '10:30',
      duration: 45,
      periods: 2,
      location: 'Room A',
    });
  });

  it('defaults duration to 45 and periods to 1 when absent or unparseable', () => {
    const schedule = buildPrintableSchedule([
      course({ teaching_schedule: { Monday: { start_time: '08:00' } } } as never),
    ]);

    expect(schedule.Monday[0]).toMatchObject({ duration: 45, periods: 1, end: '08:45' });
  });

  it('ignores days that are not part of the weekday config (e.g. weekends)', () => {
    const schedule = buildPrintableSchedule([
      course({ teaching_schedule: { Saturday: { start_time: '09:00' } } } as never),
    ]);

    expect(Object.values(schedule).every((sessions) => sessions.length === 0)).toBe(true);
    expect(schedule.Saturday).toBeUndefined();
  });

  it('sorts sessions within a day by start time', () => {
    const schedule = buildPrintableSchedule([
      course({ id: 1, course_code: 'LATE', teaching_schedule: { Monday: { start_time: '14:00' } } } as never),
      course({ id: 2, course_code: 'EARLY', teaching_schedule: { Monday: { start_time: '08:00' } } } as never),
    ]);

    expect(schedule.Monday.map((s) => s.courseCode)).toEqual(['EARLY', 'LATE']);
  });

  it('falls back to a synthetic courseId when the course has no id', () => {
    const schedule = buildPrintableSchedule([
      { course_code: 'NOID', course_name: 'No Id', teaching_schedule: { Monday: { start_time: '08:00' } } } as unknown as CourseType,
    ]);

    expect(schedule.Monday[0].courseId).toBe('NOID-Monday');
  });
});

describe('groupScheduleByDay', () => {
  const session = (overrides: Partial<EditableCalendarSession> = {}): EditableCalendarSession => ({
    id: 'Monday-1-0',
    day: 'Monday',
    courseId: 1,
    courseName: 'Math 101',
    courseCode: 'MATH101',
    start: '09:00',
    end: '09:45',
    duration: 45,
    periods: 1,
    ...overrides,
  });

  it('groups edited draft rows back onto their weekday, sorted by start', () => {
    const grouped = groupScheduleByDay([
      session({ id: 'a', start: '14:00', end: '14:45', courseCode: 'LATE' }),
      session({ id: 'b', start: '08:00', end: '08:45', courseCode: 'EARLY' }),
    ]);

    expect(grouped.Monday.map((s) => s.courseCode)).toEqual(['EARLY', 'LATE']);
  });

  it('keeps a day that is not in the weekday config rather than dropping the session', () => {
    const grouped = groupScheduleByDay([session({ day: 'Saturday' })]);
    expect(grouped.Saturday).toHaveLength(1);
  });

  it('strips the draft-only fields (day/id) from the printable rows', () => {
    const grouped = groupScheduleByDay([session()]);
    expect(grouped.Monday[0]).not.toHaveProperty('id');
    expect(grouped.Monday[0]).not.toHaveProperty('day');
  });
});

describe('buildCalendarDraft', () => {
  it('flattens the week into draft rows carrying day and a stable id', () => {
    const draft = buildCalendarDraft([
      course({ teaching_schedule: { Monday: { start_time: '09:00' }, Wednesday: { start_time: '11:00' } } } as never),
    ]);

    expect(draft).toHaveLength(2);
    expect(draft.map((row) => row.day)).toEqual(['Monday', 'Wednesday']);
    expect(draft[0].id).toBe('Monday-1-0');
  });

  it('returns an empty draft when no course has a schedule', () => {
    expect(buildCalendarDraft([course()])).toEqual([]);
  });
});

describe('DEFAULT_CALENDAR_LAYOUT', () => {
  it('turns every optional calendar section on and uses the classic preset', () => {
    expect(DEFAULT_CALENDAR_LAYOUT).toEqual({
      showHeader: true,
      showSummary: true,
      showGeneratedOn: true,
      showLegend: true,
      showFooter: true,
      showDayCardBackground: true,
      stylePreset: 'classic',
    });
  });
});
