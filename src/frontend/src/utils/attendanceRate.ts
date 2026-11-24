/**
 * What a period's attendance status means, as on the server (absence_limit_service): Present and
 * Late are attended, Absent and Excused are absences (plan todo 77, the owner, 2026-11-23: one
 * meaning on every page). Until then the Students page counted Excused as attended and Late not,
 * and the Student Profile counted Present alone.
 */
const ATTENDED = new Set(['present', 'late']);

/** A status as the server compares it: no case, no surrounding spaces ("Late " is "late"). */
export const statusKey = (status: string | null | undefined): string => String(status ?? '').trim().toLowerCase();

export const isAttended = (status: string | null | undefined): boolean => ATTENDED.has(statusKey(status));

const ABSENCES = new Set(['absent', 'excused']);

/** Absent or Excused, whatever the case: an absence (plan todo 77), on the server's meaning too. */
export const isAbsence = (status: string | null | undefined): boolean => ABSENCES.has(statusKey(status));

/**
 * A day the student attended no period of: every period's status an absence, Absent and Excused
 * mixed or not; a period without a status is not one. Such a day takes no rating: Rate is closed and
 * the ratings saved for it are cleared (the owner, 2026-11-24, plan todo 78 point 2: "an Excused day
 * should close Rate the way Absent does"; until then only an all-Absent day did).
 */
export const isAbsenceDay = (statuses: ReadonlyArray<string | null | undefined>): boolean =>
  statuses.length > 0 && statuses.every(isAbsence);

// A Map, not an object: a stored word such as "constructor" must not find Object's own members.
const STATUS_FORMS: ReadonlyMap<string, string> = new Map([
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
  ['excused', 'Excused'],
]);

/**
 * A status as the pages and the API write it ("late " is "Late"); any other word as it was
 * stored. Until November 2026 the semester import stored a file's words as written, and the
 * Attendance page, which compares the word, showed a stored "late" as unrecorded (plan todo 78).
 */
export const statusForm = (status: string | null | undefined): string =>
  STATUS_FORMS.get(statusKey(status)) ?? String(status ?? '');

/** Attended periods over every period recorded, in percent; 0 with nothing recorded. */
export const attendedRate = (records: ReadonlyArray<{ status?: string | null }>): number =>
  records.length > 0 ? (records.filter((record) => isAttended(record.status)).length / records.length) * 100 : 0;

export interface StatusCounts {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

/** The periods of each status, whatever the case they were stored in; any other status counts in none. */
export const countStatuses = (records: ReadonlyArray<{ status?: string | null }>): StatusCounts => {
  const counts: StatusCounts = { present: 0, absent: 0, late: 0, excused: 0 };
  records.forEach((record) => {
    const key = statusKey(record.status);
    // Own keys only: `in` also finds "constructor", "toString" and the rest of Object's members.
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key as keyof StatusCounts] += 1;
  });
  return counts;
};
