import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: { post: vi.fn(), defaults: { baseURL: 'https://server.example/api/v1' } },
}));

import apiClient from './api';
import {
  ATTENDANCE_SHEET_TIMEOUT_MS,
  forgetServersWithoutSheet,
  saveAttendanceSheet,
  type AttendanceSheetPayload,
} from './attendanceSheetAPI';

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const defaults = apiClient.defaults as { baseURL?: string };

const sheet: AttendanceSheetPayload = {
  course_id: 6,
  date: '2026-11-13',
  attendance: [{ student_id: 1, period_number: 1, status: 'Present' }],
  daily_performance: [],
  daily_performance_deletes: [],
};

describe('saveAttendanceSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    forgetServersWithoutSheet();
    defaults.baseURL = 'https://server.example/api/v1';
  });

  it('posts the sheet once, with a timeout sized for a whole class', async () => {
    post.mockResolvedValue({ data: {} });
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('saved');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/attendance/sheet', sheet, { timeout: ATTENDANCE_SHEET_TIMEOUT_MS });
  });

  it.each([404, 405])('reports an older server (%i) as unsupported and does not ask it again', async (status) => {
    post.mockRejectedValue({ response: { status } });
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('unsupported');
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('unsupported');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('asks again after the app is pointed at another server', async () => {
    post.mockRejectedValueOnce({ response: { status: 405 } }).mockResolvedValue({ data: {} });
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('unsupported');
    defaults.baseURL = 'https://other.example/api/v1';
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('saved');
  });

  it('falls back for an account that lacks one of the two permissions, but keeps asking', async () => {
    post.mockRejectedValue({ response: { status: 403 } });
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('unsupported');
    await expect(saveAttendanceSheet(sheet)).resolves.toBe('unsupported');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a timeout', { code: 'ECONNABORTED', message: 'timeout', request: {} }],
    ['a server error', { response: { status: 500 } }],
    ['a rejected sheet', { response: { status: 422 } }],
  ])('passes %s on to the caller', async (_name, error) => {
    post.mockRejectedValue(error);
    await expect(saveAttendanceSheet(sheet)).rejects.toBe(error);
  });
});
