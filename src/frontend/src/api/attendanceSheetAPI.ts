/**
 * One request that saves a whole attendance sheet: every student's status for every period of
 * one course and date, plus that day's performance scores (backend: POST /attendance/sheet).
 *
 * The Attendance page used to send one request per student and period. On a server whose
 * database is far away that took longer than the request timeout, so a working connection
 * looked like "offline" and the sheet sat in the offline queue.
 *
 * A server older than v1.18.69 does not have the endpoint (the phone app can be newer than the
 * server it talks to). `saveAttendanceSheet` then answers 'unsupported' and the caller sends
 * the records one by one, as before.
 *
 * Only the default `apiClient` is imported from './api': tests that mock '@/api/api' with just
 * a default export must keep working.
 */
import apiClient from './api';

export interface AttendanceSheetPayload {
  course_id: number;
  /** YYYY-MM-DD */
  date: string;
  attendance: Array<{ student_id: number; period_number: number; status: string }>;
  daily_performance: Array<{ student_id: number; category: string; score: number; max_score: number }>;
  daily_performance_deletes: Array<{ student_id: number; category: string }>;
}

export type AttendanceSheetOutcome = 'saved' | 'unsupported';

/** A whole class is one request, but the server still has real work to do for it. */
export const ATTENDANCE_SHEET_TIMEOUT_MS = 30_000;

// Servers (by base URL) that answered "no such endpoint", so they are not asked again on every
// save. Forgotten when the page reloads, which is also when a server update is picked up.
const serversWithoutSheet = new Set<string>();

const serverKey = (): string => String(apiClient.defaults?.baseURL ?? '');

const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

export async function saveAttendanceSheet(payload: AttendanceSheetPayload): Promise<AttendanceSheetOutcome> {
  const server = serverKey();
  if (serversWithoutSheet.has(server)) return 'unsupported';

  try {
    await apiClient.post('/attendance/sheet', payload, { timeout: ATTENDANCE_SHEET_TIMEOUT_MS });
    return 'saved';
  } catch (error) {
    const status = httpStatus(error);
    // 404/405: the server has no such endpoint (older release).
    if (status === 404 || status === 405) {
      serversWithoutSheet.add(server);
      return 'unsupported';
    }
    // 403: this account may edit attendance but not performance scores (or the other way
    // round). The per-record requests still save the part it is allowed to save.
    if (status === 403) return 'unsupported';
    throw error;
  }
}

/** For tests. */
export function forgetServersWithoutSheet(): void {
  serversWithoutSheet.clear();
}
