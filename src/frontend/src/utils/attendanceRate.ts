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
    if (key in counts) counts[key as keyof StatusCounts] += 1;
  });
  return counts;
};
