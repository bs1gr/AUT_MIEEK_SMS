/**
 * Attendance recorded where a course's schedule no longer has a lesson (plan todo 72).
 *
 * The Attendance sheet showed only the periods today's schedule gives a date, so when a day
 * lost a period, the absences already recorded in it vanished from the sheet while still
 * counting in the absence limits; and a past date on a weekday the course no longer has was
 * greyed out in the calendar, although its records were there. The sheet now shows every
 * period that holds a record on the date, those outside the schedule marked as such, and the
 * calendar lets a date with records be opened.
 */

/** The periods that hold a record on `date`. Keys are `student|period|date`, as in the sheet. */
export const recordedPeriodsOn = (records: Record<string, string>, date: string): number[] => {
  const periods = new Set<number>();
  Object.entries(records).forEach(([key, status]) => {
    if (!status) return;
    const [, period, day] = key.split('|');
    const number = Number(period);
    if (day === date && Number.isInteger(number) && number > 0) periods.add(number);
  });
  return [...periods].sort((a, b) => a - b);
};

/** The periods the sheet shows: those the schedule gives the date, and any that hold a record. */
export const sheetPeriods = (scheduled: number, recorded: number[]): number[] => {
  const periods = new Set<number>();
  for (let period = 1; period <= Math.max(1, scheduled); period += 1) periods.add(period);
  recorded.forEach((period) => periods.add(period));
  return [...periods].sort((a, b) => a - b);
};

/**
 * Those of `periods` that the schedule does not give the date: past its number of periods, or
 * all of them on a day the schedule no longer has.
 */
export const periodsOutsideSchedule = (periods: number[], scheduled: number, dayInSchedule: boolean): number[] =>
  periods.filter((period) => !dayInSchedule || period > scheduled);
