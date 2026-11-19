/**
 * A mark on the Attendance page is not lost.
 *
 * Four ways it was, each seen in a browser against a server whose answers were held back
 * (18 November 2026; the first was also why the E2E test "should mark student attendance"
 * needed a second try on CI that day):
 *
 * 1. A mark made after a day was chosen and before that day's records arrived was replaced
 *    by the records when they came, and never saved.
 * 2. A mark made while the autosave of an earlier mark was on its way was replaced by the
 *    refresh that follows a save, and never saved.
 * 3. An answer that had left the server before a save arrived after it and took the saved
 *    mark off the page.
 * 4. A mark followed, inside the two seconds before the autosave, by another day, another
 *    course or another page was dropped with the sheet.
 *
 * The hook is run here with real state around it, as the page runs it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { keepLocalChanges, removedAttendanceKeys, useAttendanceSaveSync } from '../useAttendanceSaveSync';

vi.mock('@/api/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/features/attendance/utils/offlineAttendanceQueue', () => ({
  enqueueAttendanceSyncSnapshot: vi.fn(),
  getAttendanceSyncQueue: vi.fn(() => []),
  getPendingAttendanceSyncCount: vi.fn(() => 0),
  removeAttendanceSyncSnapshot: vi.fn(),
}));
vi.mock('@/api/attendanceSheetAPI', () => ({ saveAttendanceSheet: vi.fn() }));

import apiClient from '@/api/api';
import { saveAttendanceSheet } from '@/api/attendanceSheetAPI';
import { enqueueAttendanceSyncSnapshot } from '@/features/attendance/utils/offlineAttendanceQueue';

const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as unknown as ReturnType<typeof vi.fn>;
const mockPut = apiClient.put as unknown as ReturnType<typeof vi.fn>;
const mockSaveSheet = saveAttendanceSheet as unknown as ReturnType<typeof vi.fn>;
const mockEnqueue = enqueueAttendanceSyncSnapshot as unknown as ReturnType<typeof vi.fn>;

const DAY = '2026-09-04';
const NEXT_DAY = '2026-09-07';
const key = (student: number, day = DAY) => `${student}|1|${day}`;
const row = (student: number, status = 'Present', day = DAY) => ({ id: 100 + student, student_id: student, period_number: 1, date: day, status });

type Answer = { resolve: (rows: unknown[]) => void; reject: (error: unknown) => void };

// The answers to "which records does this day hold?", handed out one by one so that a test
// decides when each arrives. Daily performance answers at once with nothing.
const sheetReads: Answer[] = [];
const holdSheetReads = () => {
  mockGet.mockImplementation((url: string) => {
    if (!url.startsWith('/attendance/date/')) return Promise.resolve({ data: [] });
    return new Promise((resolve, reject) => {
      sheetReads.push({ resolve: (rows) => resolve({ data: rows }), reject });
    });
  });
};

const setOnline = (value: boolean) => Object.defineProperty(navigator, 'onLine', { value, configurable: true });

/** The hook with the page's state around it. */
const usePage = () => {
  const [day, setDay] = useState(DAY);
  const [course, setCourse] = useState<number | ''>(1);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [attendanceRecordIds, setAttendanceRecordIds] = useState<Record<string, number>>({});
  const [dailyPerformance, setDailyPerformance] = useState<Record<string, number>>({});
  const [dailyPerformanceIds, setDailyPerformanceIds] = useState<Record<string, number>>({});
  const [pendingPerformanceDeleteKeys, setPendingPerformanceDeleteKeys] = useState<Set<string>>(new Set());
  const [persistedAttendanceRecords, setPersistedAttendanceRecords] = useState<Record<string, string>>({});
  const [persistedDailyPerformance, setPersistedDailyPerformance] = useState<Record<string, number>>({});
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const activeRequestsRef = useRef(new Set<string>());
  const selectedDate = useMemo(() => new Date(`${day}T00:00:00`), [day]);
  const getAttendanceKey = useCallback(
    (studentId: number, periodNumber = 1, dateStr = day) => `${studentId}|${periodNumber}|${dateStr}`,
    [day]
  );
  const showToast = useMemo(() => vi.fn(), []);
  const t = useCallback((name: string) => name, []);

  const sync = useAttendanceSaveSync({
    selectedCourse: course,
    selectedDate,
    selectedDateStr: day,
    attendanceRecords,
    attendanceRecordIds,
    dailyPerformance,
    dailyPerformanceIds,
    pendingPerformanceDeleteKeys,
    persistedAttendanceRecords,
    persistedDailyPerformance,
    pendingSyncCount,
    t,
    getAttendanceKey,
    showToast,
    activeRequestsRef,
    setAttendanceRecords,
    setAttendanceRecordIds,
    setDailyPerformance,
    setDailyPerformanceIds,
    setPendingPerformanceDeleteKeys,
    setPersistedAttendanceRecords,
    setPersistedDailyPerformance,
    setPendingSyncCount,
  });

  const mark = (student: number, status = 'Present') =>
    setAttendanceRecords((records) => ({ ...records, [getAttendanceKey(student)]: status }));

  // What the page's two Clear buttons do: one student's mark, or every mark of the day.
  const clear = (student: number) =>
    setAttendanceRecords((records) => {
      const next = { ...records };
      delete next[getAttendanceKey(student)];
      return next;
    });
  const clearAll = () => setAttendanceRecords({});

  return { sync, attendanceRecords, dailyPerformance, setDailyPerformance, mark, clear, clearAll, setDay, setCourse, showToast };
};

const flush = () => act(async () => { await Promise.resolve(); });

describe('keepLocalChanges', () => {
  it('is the server answer when the user changed nothing', () => {
    expect(keepLocalChanges({ a: 'Present' }, {}, {})).toEqual({ a: 'Present' });
    expect(keepLocalChanges({ a: 'Present' }, { a: 'Present' }, { a: 'Present' })).toEqual({ a: 'Present' });
  });

  it('keeps a value the user set since the page and the server last agreed', () => {
    expect(keepLocalChanges({}, { a: 'Present' }, {})).toEqual({ a: 'Present' });
    expect(keepLocalChanges({ a: 'Present' }, { a: 'Present', b: 'Late' }, { a: 'Present' })).toEqual({ a: 'Present', b: 'Late' });
  });

  it('keeps the value the user changed over the one the server holds', () => {
    expect(keepLocalChanges({ a: 'Present' }, { a: 'Absent' }, { a: 'Present' })).toEqual({ a: 'Absent' });
  });

  it('leaves out what the user removed', () => {
    expect(keepLocalChanges({ a: 8, b: 6 }, { b: 6 }, { a: 8, b: 6 })).toEqual({ b: 6 });
  });

  it('takes from the server what changed there and the user did not touch', () => {
    expect(keepLocalChanges({ a: 'Late', c: 'Excused' }, { a: 'Present', b: 'Absent' }, { a: 'Present' })).toEqual({
      a: 'Late',
      b: 'Absent',
      c: 'Excused',
    });
  });
});

describe('a mark on the Attendance page is kept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sheetReads.length = 0;
    holdSheetReads();
    mockSaveSheet.mockResolvedValue('saved');
    setOnline(true);
  });

  afterEach(() => {
    setOnline(true);
  });

  it('made before the records of the day have arrived: it stays, with the records, and is unsaved', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));

    act(() => result.current.mark(2));
    await act(async () => { sheetReads[0].resolve([row(1, 'Absent')]); });

    // It used to be { [key(1)]: 'Absent' } alone, and nothing was left to save.
    expect(result.current.attendanceRecords).toEqual({ [key(1)]: 'Absent', [key(2)]: 'Present' });
    expect(result.current.sync.hasChanges).toBe(true);
  });

  it('made while the save of an earlier mark is on its way: it stays, and is unsaved', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1));

    let saved: (outcome: string) => void = () => {};
    mockSaveSheet.mockImplementationOnce(() => new Promise((resolve) => { saved = resolve; }));
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await flush();
    expect(mockSaveSheet).toHaveBeenCalledTimes(1);
    expect(mockSaveSheet.mock.calls[0][0].attendance).toEqual([{ student_id: 1, period_number: 1, status: 'Present' }]);

    act(() => result.current.mark(2)); // the second mark, while the first is travelling
    await act(async () => { saved('saved'); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));
    await act(async () => { sheetReads[1].resolve([row(1)]); await saving; });

    // It used to be { [key(1)]: 'Present' }: the second mark was gone, and the page agreed
    // with the server, so it was never sent.
    expect(result.current.attendanceRecords).toEqual({ [key(1)]: 'Present', [key(2)]: 'Present' });
    expect(result.current.sync.hasChanges).toBe(true);
  });

  it('a rating given while a save is on its way stays too', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1));

    let saved: (outcome: string) => void = () => {};
    mockSaveSheet.mockImplementationOnce(() => new Promise((resolve) => { saved = resolve; }));
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await flush();
    act(() => result.current.setDailyPerformance({ '1-Homework': 7 }));
    await act(async () => { saved('saved'); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));
    await act(async () => { sheetReads[1].resolve([row(1)]); await saving; });

    expect(result.current.dailyPerformance).toEqual({ '1-Homework': 7 });
    expect(result.current.sync.hasChanges).toBe(true);
  });

  it('an answer that left the server before a save is not used: the day is asked for again', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1)); // the day's records are on their way

    act(() => result.current.mark(1));
    await act(async () => { await result.current.sync.performSave(); }); // saved meanwhile
    expect(mockSaveSheet).toHaveBeenCalledTimes(1);

    // The first answer says what the day held before the save: nothing.
    await act(async () => { sheetReads[0].resolve([]); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));
    await act(async () => { sheetReads[1].resolve([row(1)]); });

    // It used to be {}: the page showed the student unmarked while the server held "Present".
    expect(result.current.attendanceRecords).toEqual({ [key(1)]: 'Present' });
    expect(result.current.sync.hasChanges).toBe(false);
  });

  it('a refresh that fails leaves the marks on the page', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1));

    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));
    await act(async () => { sheetReads[1].reject({ response: { status: 500 } }); await saving; });

    // It used to be {}: every mark left the page, saved or not.
    expect(result.current.attendanceRecords).toEqual({ [key(1)]: 'Present' });
  });

  it.each([
    ['another day is chosen', (page: ReturnType<typeof usePage>) => page.setDay(NEXT_DAY)],
    ['another course is chosen', (page: ReturnType<typeof usePage>) => page.setCourse(2)],
  ])('unsaved when %s: the sheet that is left is sent', async (_name, leave) => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1, 'Late'));
    expect(mockSaveSheet).not.toHaveBeenCalled(); // the autosave waits two seconds

    await act(async () => { leave(result.current); });

    expect(mockSaveSheet).toHaveBeenCalledTimes(1);
    expect(mockSaveSheet).toHaveBeenCalledWith({
      course_id: 1,
      date: DAY,
      attendance: [{ student_id: 1, period_number: 1, status: 'Late' }],
      daily_performance: [],
      daily_performance_deletes: [],
    });
    // And the new sheet starts empty.
    expect(result.current.attendanceRecords).toEqual({});
  });

  it('unsaved when the page is left: the sheet is sent', async () => {
    const { result, unmount } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1));
    act(() => result.current.setDailyPerformance({ '1-Homework': 9 }));

    unmount();
    await flush();

    expect(mockSaveSheet).toHaveBeenCalledTimes(1);
    expect(mockSaveSheet.mock.calls[0][0]).toMatchObject({
      course_id: 1,
      date: DAY,
      attendance: [{ student_id: 1, period_number: 1, status: 'Present' }],
      daily_performance: [{ student_id: 1, category: 'Homework', score: 9, max_score: 10 }],
    });
  });

  it('nothing is sent when a sheet is left as the server holds it', async () => {
    const { result, unmount } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([row(1)]); });

    await act(async () => { result.current.setDay(NEXT_DAY); });
    unmount();
    await flush();

    expect(mockSaveSheet).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('without a connection the sheet that is left is queued', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });
    act(() => result.current.mark(1));

    setOnline(false);
    await act(async () => { result.current.setDay(NEXT_DAY); });

    expect(mockSaveSheet).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 1, date: DAY, attendanceRecords: { [key(1)]: 'Present' } })
    );
  });

  it('a sheet that could not be sent for lack of an answer is queued, and one the server refused is reported', async () => {
    const { result } = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([]); });

    act(() => result.current.mark(1));
    mockSaveSheet.mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded', request: {} });
    await act(async () => { result.current.setDay(NEXT_DAY); });
    await flush();
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ courseId: 1, date: DAY }));

    await waitFor(() => expect(sheetReads).toHaveLength(2));
    await act(async () => { sheetReads[1].resolve([]); });
    mockEnqueue.mockClear();
    act(() => result.current.mark(1));
    mockSaveSheet.mockRejectedValueOnce({ response: { status: 403 }, message: 'forbidden' });
    await act(async () => { result.current.setDay(DAY); });
    await flush();

    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(result.current.showToast).toHaveBeenCalledWith('saveFailed', 'error');
  });
});

/**
 * Clear takes a saved mark off for good.
 *
 * Until 19 November 2026 nothing was sent for a mark the page had taken off: the sheet that
 * went out simply did not hold it, the server kept its row, and the refresh after the save
 * put the mark back on the page two seconds after Clear. The marks the page took off are
 * sent as deletions now.
 */
describe('removedAttendanceKeys', () => {
  it('is what the server holds, as far as the page knows, and the page no longer shows', () => {
    expect(removedAttendanceKeys({ b: 'Late' }, { a: 'Present', b: 'Late' })).toEqual(['a']);
    expect(removedAttendanceKeys({}, { a: 'Present', b: 'Late' })).toEqual(['a', 'b']);
  });

  it('is nothing for a mark that was only changed, or never saved', () => {
    expect(removedAttendanceKeys({ a: 'Absent', c: 'Present' }, { a: 'Present' })).toEqual([]);
    expect(removedAttendanceKeys({}, {})).toEqual([]);
  });
});

describe('Clear on the Attendance page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sheetReads.length = 0;
    holdSheetReads();
    mockSaveSheet.mockResolvedValue('saved');
    setOnline(true);
  });

  afterEach(() => {
    setOnline(true);
  });

  /** A page whose day holds two saved marks. */
  const pageWithTwoSavedMarks = async () => {
    const page = renderHook(() => usePage());
    await waitFor(() => expect(sheetReads).toHaveLength(1));
    await act(async () => { sheetReads[0].resolve([row(1), row(2, 'Absent')]); });
    expect(page.result.current.attendanceRecords).toEqual({ [key(1)]: 'Present', [key(2)]: 'Absent' });
    expect(page.result.current.sync.hasChanges).toBe(false);
    return page;
  };

  it('one student cleared: the mark is sent as a deletion and stays off the page', async () => {
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.clear(1));
    expect(result.current.sync.hasChanges).toBe(true);
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));

    expect(mockSaveSheet).toHaveBeenCalledTimes(1);
    const sheet = mockSaveSheet.mock.calls[0][0];
    expect(sheet.attendance).toEqual([{ student_id: 2, period_number: 1, status: 'Absent' }]);
    // It used to be all that was sent, and the answer below held both rows again.
    expect(sheet.attendance_deletes).toEqual([{ student_id: 1, period_number: 1 }]);

    await act(async () => { sheetReads[1].resolve([row(2, 'Absent')]); await saving; });
    expect(result.current.attendanceRecords).toEqual({ [key(2)]: 'Absent' });
    expect(result.current.sync.hasChanges).toBe(false);
  });

  it('the whole day cleared: every saved mark is sent as a deletion', async () => {
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.clearAll());
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));

    const sheet = mockSaveSheet.mock.calls[0][0];
    expect(sheet.attendance).toEqual([]);
    expect(sheet.attendance_deletes).toEqual([
      { student_id: 1, period_number: 1 },
      { student_id: 2, period_number: 1 },
    ]);

    await act(async () => { sheetReads[1].resolve([]); await saving; });
    expect(result.current.attendanceRecords).toEqual({});
    expect(result.current.sync.hasChanges).toBe(false);
  });

  it('a mark that was never saved is cleared without a word to the server', async () => {
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.mark(3));
    act(() => result.current.clear(3));

    expect(result.current.sync.hasChanges).toBe(false);
    expect(mockSaveSheet).not.toHaveBeenCalled();
  });

  it('a sheet from which nothing was taken off has no list of deletions', async () => {
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.mark(3, 'Late'));
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));

    expect('attendance_deletes' in mockSaveSheet.mock.calls[0][0]).toBe(false);
    await act(async () => { sheetReads[1].resolve([row(1), row(2, 'Absent'), row(3, 'Late')]); await saving; });
  });

  it('without a connection the deletion waits in the queue with the sheet', async () => {
    const { result } = await pageWithTwoSavedMarks();
    setOnline(false);

    act(() => result.current.clear(1));
    await act(async () => { await result.current.sync.performSave(); });

    expect(mockSaveSheet).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue.mock.calls[0][0]).toMatchObject({
      courseId: 1,
      date: DAY,
      attendanceRecords: { [key(2)]: 'Absent' },
      attendanceDeletes: [key(1)],
    });
  });

  it('cleared and the day left inside the two seconds: the deletion goes with the sheet that is sent on the way out', async () => {
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.clear(2));
    act(() => result.current.setDay(NEXT_DAY));
    await flush();

    expect(mockSaveSheet).toHaveBeenCalledTimes(1);
    const sheet = mockSaveSheet.mock.calls[0][0];
    expect(sheet.date).toBe(DAY);
    expect(sheet.attendance_deletes).toEqual([{ student_id: 2, period_number: 1 }]);
  });

  it('a server without the sheet endpoint is asked to delete the record itself', async () => {
    mockSaveSheet.mockResolvedValue('unsupported');
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
    const { result } = await pageWithTwoSavedMarks();

    act(() => result.current.clear(1));
    let saving: Promise<void> = Promise.resolve();
    act(() => { saving = result.current.sync.performSave(); });
    await waitFor(() => expect(sheetReads).toHaveLength(2));

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('/attendance/101');
    await act(async () => { sheetReads[1].resolve([row(2, 'Absent')]); await saving; });
    expect(result.current.attendanceRecords).toEqual({ [key(2)]: 'Absent' });
  });
});
