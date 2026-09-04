/**
 * Tests for useAttendanceSaveSync — the extracted offline-sync/autosave logic
 * from AttendanceView.tsx (performSave, syncSnapshotToServer,
 * queueAttendanceSnapshot, flushQueuedSnapshots, refreshAttendancePrefill).
 *
 * No prior test exercised any of this logic — see UNIFIED_WORK_PLAN.md.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAttendanceSaveSync } from '../useAttendanceSaveSync';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/features/attendance/utils/offlineAttendanceQueue', () => ({
  enqueueAttendanceSyncSnapshot: vi.fn(),
  getAttendanceSyncQueue: vi.fn(() => []),
  getPendingAttendanceSyncCount: vi.fn(() => 0),
  removeAttendanceSyncSnapshot: vi.fn(),
}));

import apiClient from '@/api/api';
import {
  enqueueAttendanceSyncSnapshot,
  getAttendanceSyncQueue,
  removeAttendanceSyncSnapshot,
} from '@/features/attendance/utils/offlineAttendanceQueue';

const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockPut = apiClient.put as unknown as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.delete as unknown as ReturnType<typeof vi.fn>;
const mockEnqueue = enqueueAttendanceSyncSnapshot as unknown as ReturnType<typeof vi.fn>;
const mockGetQueue = getAttendanceSyncQueue as unknown as ReturnType<typeof vi.fn>;
const mockRemoveSnapshot = removeAttendanceSyncSnapshot as unknown as ReturnType<typeof vi.fn>;

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
};

const buildParams = (overrides: Record<string, unknown> = {}) => {
  const state = {
    attendanceRecords: {} as Record<string, string>,
    attendanceRecordIds: {} as Record<string, number>,
    dailyPerformance: {} as Record<string, number>,
    dailyPerformanceIds: {} as Record<string, number>,
    pendingPerformanceDeleteKeys: new Set<string>(),
    persistedAttendanceRecords: {} as Record<string, string>,
    persistedDailyPerformance: {} as Record<string, number>,
    pendingSyncCount: 0,
  };

  return {
    selectedCourse: 1,
    selectedDate: new Date('2026-09-04T00:00:00'),
    selectedDateStr: '2026-09-04',
    attendanceRecords: state.attendanceRecords,
    attendanceRecordIds: state.attendanceRecordIds,
    dailyPerformance: state.dailyPerformance,
    dailyPerformanceIds: state.dailyPerformanceIds,
    pendingPerformanceDeleteKeys: state.pendingPerformanceDeleteKeys,
    persistedAttendanceRecords: state.persistedAttendanceRecords,
    persistedDailyPerformance: state.persistedDailyPerformance,
    pendingSyncCount: state.pendingSyncCount,
    t: (key: string) => key,
    getAttendanceKey: (studentId: number, periodNumber = 1, dateStr = '2026-09-04') =>
      `${studentId}|${periodNumber}|${dateStr}`,
    showToast: vi.fn(),
    activeRequestsRef: { current: new Set<string>() },
    setAttendanceRecords: vi.fn(),
    setAttendanceRecordIds: vi.fn(),
    setDailyPerformance: vi.fn(),
    setDailyPerformanceIds: vi.fn(),
    setPendingPerformanceDeleteKeys: vi.fn(),
    setPersistedAttendanceRecords: vi.fn(),
    setPersistedDailyPerformance: vi.fn(),
    setPendingSyncCount: vi.fn(),
    ...overrides,
  };
};

describe('useAttendanceSaveSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
    mockGetQueue.mockReturnValue([]);
    setOnline(true);
  });

  afterEach(() => {
    setOnline(true);
  });

  describe('performSave', () => {
    it('PUTs an existing attendance record by id and POSTs a new one', async () => {
      mockPut.mockResolvedValue({});
      mockPost.mockResolvedValue({ data: {} });

      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present', '2|1|2026-09-04': 'Absent' },
        attendanceRecordIds: { '1|1|2026-09-04': 55 },
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await result.current.performSave();
      });

      expect(mockPut).toHaveBeenCalledWith('/attendance/55', { status: 'Present' });
      expect(mockPost).toHaveBeenCalledWith('/attendance/', expect.objectContaining({
        student_id: 2,
        status: 'Absent',
      }));
    });

    it('falls back to POST when a PUT 404s (stale record id)', async () => {
      mockPut.mockRejectedValue({ response: { status: 404 } });
      mockPost.mockResolvedValue({ data: {} });

      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present' },
        attendanceRecordIds: { '1|1|2026-09-04': 999 },
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await result.current.performSave();
      });

      expect(mockPut).toHaveBeenCalledWith('/attendance/999', { status: 'Present' });
      expect(mockPost).toHaveBeenCalledWith('/attendance/', expect.objectContaining({ student_id: 1 }));
    });

    it('DELETEs daily-performance records queued for removal', async () => {
      mockDelete.mockResolvedValue({});

      const params = buildParams({
        dailyPerformanceIds: { '1-Homework': 77 },
        pendingPerformanceDeleteKeys: new Set(['1-Homework']),
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await result.current.performSave();
      });

      expect(mockDelete).toHaveBeenCalledWith('/daily-performance/77');
      expect(params.setPendingPerformanceDeleteKeys).toHaveBeenCalledWith(new Set());
    });

    it('queues instead of hitting the network when offline', async () => {
      setOnline(false);
      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present' },
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      // Mounting with a course+date selected always triggers the course/date-change
      // refetch effect (regardless of online status, matching the pre-extraction
      // behavior) — let that settle before asserting on the offline save path.
      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      mockGet.mockClear();

      await act(async () => {
        await expect(result.current.performSave()).resolves.not.toThrow();
      });

      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ courseId: 1, date: '2026-09-04' }));
      expect(mockGet).not.toHaveBeenCalled();
      expect(params.showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('falls back to queueing on a network error instead of throwing', async () => {
      mockPut.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present' },
        attendanceRecordIds: { '1|1|2026-09-04': 55 },
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await expect(result.current.performSave()).resolves.not.toThrow();
      });

      expect(mockEnqueue).toHaveBeenCalled();
      expect(params.showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('surfaces an error toast and re-throws on a genuine API error', async () => {
      mockPut.mockRejectedValue({ response: { status: 500 }, message: 'Internal Server Error' });
      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present' },
        attendanceRecordIds: { '1|1|2026-09-04': 55 },
      });

      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await expect(result.current.performSave()).rejects.toBeTruthy();
      });

      expect(params.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('queueAttendanceSnapshot', () => {
    it('returns false when no course is selected', () => {
      const params = buildParams({ selectedCourse: '' });
      const { result } = renderHook(() => useAttendanceSaveSync(params));
      expect(result.current.queueAttendanceSnapshot('2026-09-04')).toBe(false);
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('enqueues a snapshot and marks state persisted when a course is selected', () => {
      const params = buildParams({
        attendanceRecords: { '1|1|2026-09-04': 'Present' },
      });
      const { result } = renderHook(() => useAttendanceSaveSync(params));
      expect(result.current.queueAttendanceSnapshot('2026-09-04')).toBe(true);
      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ courseId: 1, date: '2026-09-04' }));
      expect(params.setPersistedAttendanceRecords).toHaveBeenCalledWith({ '1|1|2026-09-04': 'Present' });
    });
  });

  describe('flushQueuedSnapshots', () => {
    it('is a no-op when offline', async () => {
      setOnline(false);
      const params = buildParams();
      const { result } = renderHook(() => useAttendanceSaveSync(params));
      // The course/date-change refetch effect fires on mount regardless of online
      // status (matching pre-extraction behavior) — let it settle first.
      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      mockGetQueue.mockClear();
      mockGet.mockClear();

      await act(async () => {
        await result.current.flushQueuedSnapshots();
      });
      expect(mockGetQueue).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('drains the queue, removing each synced snapshot', async () => {
      const snapshots = [
        { id: 'a', courseId: 1, date: '2026-09-01', attendanceRecords: {}, dailyPerformance: {}, dailyPerformanceDeletes: [], enqueuedAt: '' },
        { id: 'b', courseId: 1, date: '2026-09-02', attendanceRecords: {}, dailyPerformance: {}, dailyPerformanceDeletes: [], enqueuedAt: '' },
      ];
      mockGetQueue.mockReturnValue(snapshots);
      mockGet.mockResolvedValue({ data: [] });

      const params = buildParams();
      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await result.current.flushQueuedSnapshots();
      });

      expect(mockRemoveSnapshot).toHaveBeenCalledWith('a');
      expect(mockRemoveSnapshot).toHaveBeenCalledWith('b');
      expect(params.showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('stops at the first failure without removing it or later entries', async () => {
      const snapshots = [
        { id: 'a', courseId: 1, date: '2026-09-01', attendanceRecords: { '1|1|2026-09-01': 'Present' }, dailyPerformance: {}, dailyPerformanceDeletes: [], enqueuedAt: '' },
        { id: 'b', courseId: 1, date: '2026-09-02', attendanceRecords: {}, dailyPerformance: {}, dailyPerformanceDeletes: [], enqueuedAt: '' },
      ];
      mockGetQueue.mockReturnValue(snapshots);
      mockGet.mockRejectedValue({ response: { status: 500 }, message: 'boom' });

      const params = buildParams();
      const { result } = renderHook(() => useAttendanceSaveSync(params));
      await act(async () => {
        await result.current.flushQueuedSnapshots();
      });

      expect(mockRemoveSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('refreshAttendancePrefill', () => {
    it('de-dupes concurrent calls for the same course/date', async () => {
      let resolveFirstGet: (value: unknown) => void = () => {};
      mockGet.mockImplementationOnce(() => new Promise((resolve) => { resolveFirstGet = resolve; }));
      mockGet.mockResolvedValue({ data: [] });

      const params = buildParams();
      const { result } = renderHook(() => useAttendanceSaveSync(params));

      const first = act(async () => { await result.current.refreshAttendancePrefill(); });
      // Second call while the first is still in-flight (blocked on the first GET) should skip
      // entirely — no second GET issued for the same course/date requestKey.
      await act(async () => {
        await result.current.refreshAttendancePrefill();
      });
      expect(mockGet).toHaveBeenCalledTimes(1);

      resolveFirstGet({ data: [] });
      await first;
      await waitFor(() => expect(params.setAttendanceRecords).toHaveBeenCalled());
    });
  });
});
