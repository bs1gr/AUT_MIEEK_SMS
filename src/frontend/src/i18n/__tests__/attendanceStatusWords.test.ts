/**
 * The attendance statuses have one set of Greek words (plan todo 78, point 3): the Attendance
 * page's. Until November 2026 Analytics called an Excused period «Δικαιολογημένη» and the server's
 * files «Παρόν», «Καθυστέρηση», «Δικαιολογημένη» (backend test_attendance_status_words.py).
 */
import { describe, expect, it } from 'vitest';
import elAttendance from '../../locales/el/attendance';
import elAnalytics from '../../locales/el/analytics';
import elReports from '../../locales/el/reports';

const STATUSES = ['present', 'absent', 'late', 'excused'] as const;
const words = (table: Record<string, unknown>) => STATUSES.map((status) => table[status]);

describe('the Greek words for the attendance statuses', () => {
  it('are the Attendance page words', () => {
    expect(words(elAttendance)).toEqual(['Παρών', 'Απών', 'Αργοπορία', 'Δικαιολογημένος']);
  });

  it('are the same in Analytics and in the reports', () => {
    expect(words(elAnalytics.overview)).toEqual(words(elAttendance));
    expect(words(elReports)).toEqual(words(elAttendance));
  });
});
