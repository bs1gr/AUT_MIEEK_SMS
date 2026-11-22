/**
 * Plan todo 72: periods and days that hold attendance although the schedule no longer has them.
 */
import { describe, expect, it } from 'vitest';
import { periodsOutsideSchedule, recordedPeriodsOn, sheetPeriods } from '../outsideSchedule';

describe('attendance outside the schedule', () => {
  const records = {
    '1|1|2026-10-05': 'Present',
    '1|3|2026-10-05': 'Absent', // the day had 3 periods; the schedule now gives it 2
    '2|3|2026-10-05': 'Excused',
    '2|2|2026-10-05': '', // a mark taken away
    '1|4|2026-10-06': 'Absent', // another date
  };

  it('finds the periods that hold a record on the date', () => {
    expect(recordedPeriodsOn(records, '2026-10-05')).toEqual([1, 3]);
    expect(recordedPeriodsOn(records, '2026-10-06')).toEqual([4]);
    expect(recordedPeriodsOn(records, '2026-10-07')).toEqual([]);
  });

  it('shows the scheduled periods and every recorded one', () => {
    expect(sheetPeriods(2, [1, 3])).toEqual([1, 2, 3]);
    expect(sheetPeriods(2, [])).toEqual([1, 2]);
    expect(sheetPeriods(0, [])).toEqual([1]); // a day with nothing still shows one period
  });

  it('names the periods the schedule does not give the date', () => {
    expect(periodsOutsideSchedule([1, 2, 3], 2, true)).toEqual([3]);
    expect(periodsOutsideSchedule([1, 2], 2, true)).toEqual([]);
    // A weekday the course no longer has: every period is outside.
    expect(periodsOutsideSchedule([1, 2], 1, false)).toEqual([1, 2]);
  });
});
