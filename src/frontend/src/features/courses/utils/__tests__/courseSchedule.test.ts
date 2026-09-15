/**
 * Tests for the pure course schedule / evaluation-rule helpers extracted from
 * CoursesView.tsx. The schedule normalization used to be written out twice in
 * that component (loadCourseData and checkScheduleConflicts) and the
 * time-overlap comparison that decides whether two courses clash for a student
 * had no coverage at all — see the 2026-09 workspace audit.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAY_SCHEDULE,
  calculateEndTime,
  calculateTotalHours,
  findScheduleOverlaps,
  getTotalWeight,
  isTotalWeightValid,
  normalizeTeachingSchedule,
  scheduleToList,
  timeToMinutes,
  type DaySchedule,
} from '../courseSchedule';

const day = (overrides: Partial<DaySchedule> = {}): DaySchedule => ({
  ...DEFAULT_DAY_SCHEDULE,
  ...overrides,
});

describe('normalizeTeachingSchedule', () => {
  it('returns an empty record for nullish input', () => {
    expect(normalizeTeachingSchedule(null)).toEqual({});
    expect(normalizeTeachingSchedule(undefined)).toEqual({});
  });

  it('converts the backend array form into a day-keyed record', () => {
    const result = normalizeTeachingSchedule([
      { day: 'Monday', periods: 2, start_time: '09:00', duration: 45 },
    ]);

    expect(result).toEqual({ Monday: { periods: 2, start_time: '09:00', duration: 45 } });
  });

  it('fills per-field defaults for missing values in the array form', () => {
    const result = normalizeTeachingSchedule([{ day: 'Tuesday' }]);

    expect(result.Tuesday).toEqual(DEFAULT_DAY_SCHEDULE);
  });

  it('skips array entries with no day', () => {
    expect(normalizeTeachingSchedule([{ periods: 1, start_time: '09:00', duration: 45 }])).toEqual({});
  });

  it('passes an already-keyed record straight through', () => {
    const record = { Wednesday: day({ start_time: '11:00' }) };
    expect(normalizeTeachingSchedule(record)).toEqual(record);
  });

  it('round-trips with scheduleToList', () => {
    const record = { Monday: day({ periods: 2, start_time: '09:00' }) };
    expect(normalizeTeachingSchedule(scheduleToList(record))).toEqual(record);
  });
});

describe('scheduleToList', () => {
  it('converts the keyed record into the list the update endpoint expects', () => {
    expect(scheduleToList({ Friday: day({ periods: 3, start_time: '14:00', duration: 50 }) })).toEqual([
      { day: 'Friday', periods: 3, start_time: '14:00', duration: 50 },
    ]);
  });

  it('coerces missing numbers to 0 and a missing start to 08:00', () => {
    const result = scheduleToList({
      Monday: { periods: undefined, start_time: '', duration: undefined } as unknown as DaySchedule,
    });

    expect(result).toEqual([{ day: 'Monday', periods: 0, start_time: '08:00', duration: 0 }]);
  });

  it('handles an empty/nullish schedule', () => {
    expect(scheduleToList({})).toEqual([]);
    expect(scheduleToList(null as unknown as Record<string, DaySchedule>)).toEqual([]);
  });
});

describe('calculateTotalHours', () => {
  it('sums periods x duration across days, as hours to one decimal', () => {
    const hours = calculateTotalHours({
      Monday: day({ periods: 2, duration: 45 }),   // 1.5h
      Wednesday: day({ periods: 1, duration: 90 }), // 1.5h
    });

    expect(hours).toBe('3.0');
  });

  it('returns 0.0 for an empty schedule', () => {
    expect(calculateTotalHours({})).toBe('0.0');
  });

  it('ignores days missing periods or duration', () => {
    expect(calculateTotalHours({ Monday: { periods: 0, duration: 45, start_time: '09:00' } })).toBe('0.0');
    expect(calculateTotalHours({ Monday: { periods: 2, duration: 0, start_time: '09:00' } })).toBe('0.0');
  });

  it('is the value the >= 0.5 save guard is checked against', () => {
    // One 25-minute period is below the backend's hours_per_week minimum
    expect(parseFloat(calculateTotalHours({ Monday: day({ periods: 1, duration: 25 }) }))).toBeLessThan(0.5);
    expect(parseFloat(calculateTotalHours({ Monday: day({ periods: 1, duration: 45 }) }))).toBeGreaterThanOrEqual(0.5);
  });
});

describe('timeToMinutes', () => {
  it('converts a HH:MM string to minutes past midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('calculateEndTime', () => {
  it('adds the duration to the start time', () => {
    expect(calculateEndTime('17:00', 45)).toBe('17:45');
    expect(calculateEndTime('09:30', 90)).toBe('11:00');
  });

  it('zero-pads the result', () => {
    expect(calculateEndTime('08:00', 5)).toBe('08:05');
  });

  it('wraps past midnight', () => {
    expect(calculateEndTime('23:30', 45)).toBe('00:15');
  });
});

describe('findScheduleOverlaps', () => {
  it('finds no overlap when the courses run on different days', () => {
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00', duration: 45, periods: 1 }) },
      { Tuesday: day({ start_time: '17:00', duration: 45, periods: 1 }) }
    );

    expect(overlaps).toEqual([]);
  });

  it('finds no overlap when the same day does not intersect in time', () => {
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00', duration: 45, periods: 1 }) }, // 17:00-17:45
      { Monday: day({ start_time: '18:00', duration: 45, periods: 1 }) }  // 18:00-18:45
    );

    expect(overlaps).toEqual([]);
  });

  it('treats back-to-back sessions as non-overlapping', () => {
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00', duration: 45, periods: 1 }) }, // ends 17:45
      { Monday: day({ start_time: '17:45', duration: 45, periods: 1 }) }  // starts 17:45
    );

    expect(overlaps).toEqual([]);
  });

  it('reports a partial overlap with both start times', () => {
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00', duration: 45, periods: 2 }) }, // 17:00-18:30
      { Monday: day({ start_time: '18:00', duration: 45, periods: 1 }) }  // 18:00-18:45
    );

    expect(overlaps).toEqual([{ day: 'Monday', time: '17:00', conflictTime: '18:00' }]);
  });

  it('counts the multi-period span, not just the first period', () => {
    // Without multiplying by periods these would look non-overlapping
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00', duration: 45, periods: 3 }) }, // 17:00-19:15
      { Monday: day({ start_time: '19:00', duration: 45, periods: 1 }) }  // 19:00-19:45
    );

    expect(overlaps).toHaveLength(1);
  });

  it('reports one entry per clashing day', () => {
    const overlaps = findScheduleOverlaps(
      { Monday: day({ start_time: '17:00' }), Thursday: day({ start_time: '17:00' }) },
      { Monday: day({ start_time: '17:15' }), Thursday: day({ start_time: '17:15' }) }
    );

    expect(overlaps.map((o) => o.day)).toEqual(['Monday', 'Thursday']);
  });

  it('is symmetric — an overlap is found regardless of argument order', () => {
    const a = { Monday: day({ start_time: '17:00', duration: 45, periods: 2 }) };
    const b = { Monday: day({ start_time: '18:00', duration: 45, periods: 1 }) };

    expect(findScheduleOverlaps(a, b)).toHaveLength(1);
    expect(findScheduleOverlaps(b, a)).toHaveLength(1);
  });

  it('tolerates empty/nullish schedules on either side', () => {
    expect(findScheduleOverlaps({}, { Monday: day() })).toEqual([]);
    expect(findScheduleOverlaps({ Monday: day() }, {})).toEqual([]);
    expect(findScheduleOverlaps(null as never, null as never)).toEqual([]);
  });
});

describe('getTotalWeight / isTotalWeightValid', () => {
  it('sums numeric and string weights', () => {
    expect(getTotalWeight([{ category: 'a', weight: 40 }, { category: 'b', weight: '60' }])).toBe(100);
  });

  it('treats unparseable weights as zero', () => {
    expect(getTotalWeight([{ category: 'a', weight: '' }, { category: 'b', weight: 'abc' }])).toBe(0);
  });

  it('handles an empty or nullish rule list', () => {
    expect(getTotalWeight([])).toBe(0);
    expect(getTotalWeight(null as never)).toBe(0);
  });

  it('accepts a total of 100 within a hundredth', () => {
    expect(isTotalWeightValid([{ category: 'a', weight: 100 }])).toBe(true);
    expect(isTotalWeightValid([{ category: 'a', weight: 33.33 }, { category: 'b', weight: 33.33 }, { category: 'c', weight: 33.34 }])).toBe(true);
  });

  it('rejects totals that miss 100', () => {
    expect(isTotalWeightValid([{ category: 'a', weight: 99 }])).toBe(false);
    expect(isTotalWeightValid([{ category: 'a', weight: 101 }])).toBe(false);
    expect(isTotalWeightValid([])).toBe(false);
  });
});
