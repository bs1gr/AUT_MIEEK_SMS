import { isAbsenceDay } from '@/utils/attendanceRate';
import type { AttendanceAggregatedStatus } from '../components/AttendanceStudentList';

/**
 * A student's day on the Attendance page, from the statuses of the periods recorded: the one status
 * when every period has it, whether they differ, and whether every period is an absence (Absent or
 * Excused, mixed or not: no rating that day, plan todo 78 point 2).
 */
export const aggregateDayStatuses = (statuses: ReadonlyArray<string>): AttendanceAggregatedStatus => {
  if (!statuses.length) {
    return { status: undefined, isMixed: false, hasAny: false, isAbsence: false };
  }
  const first = statuses[0];
  const isUniform = statuses.every((status) => status === first);
  return {
    status: isUniform ? first : undefined,
    isMixed: !isUniform,
    hasAny: true,
    isAbsence: isAbsenceDay(statuses),
  };
};
