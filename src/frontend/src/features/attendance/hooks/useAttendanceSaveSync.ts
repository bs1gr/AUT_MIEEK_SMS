import { useCallback, useEffect, useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { formatLocalDate } from '@/utils/date';
import { eventBus, EVENTS } from '@/utils/events';
import apiClient from '@/api/api';
import { useAutosave } from '@/hooks/useAutosave';
import {
  AttendanceSyncSnapshot,
  enqueueAttendanceSyncSnapshot,
  getAttendanceSyncQueue,
  getPendingAttendanceSyncCount,
  removeAttendanceSyncSnapshot,
} from '@/features/attendance/utils/offlineAttendanceQueue';

export type RawAttendanceRecord = { student_id: number; period_number?: number; date?: string; status: string };
export type RawDailyPerformanceRecord = { student_id: number; category: string; score: number };

const shallowEqualStringMap = (a: Record<string, string>, b: Record<string, string>) => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const shallowEqualNumberMap = (a: Record<string, number>, b: Record<string, number>) => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

// Narrow unknown thrown values to objects with optional response.status
const isResponseLike = (e: unknown): e is { response?: { status?: number } } => (
  typeof e === 'object' && e !== null && 'response' in e
);

// Attendance keys are always built by AttendanceView's getAttendanceKey() as
// `${studentId}|${periodNumber}|${dateStr}` — every setAttendanceRecords call
// site uses it, so re-parsing and rebuilding the key here is a no-op in
// production. Kept as an explicit normalization step (rather than assuming
// the raw key is already canonical) because it's the one place both the
// live-save and offline-sync paths share, and the shape isn't obvious from
// the key alone.
const parseAttendanceKey = (key: string, fallbackDate: string) => {
  const tokens = key.includes('|') ? key.split('|') : key.split('-');
  const [studentIdStr, periodNumberStr, storedDate] = tokens;
  const studentId = parseInt(studentIdStr, 10);
  const periodNumber = periodNumberStr ? parseInt(periodNumberStr, 10) : 1;
  return {
    studentId,
    periodNumber: Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1,
    payloadDate: storedDate || fallbackDate,
  };
};

const parseDailyPerformanceKey = (key: string) => {
  const separatorIdx = key.indexOf('-');
  if (separatorIdx <= 0) {
    return { studentId: NaN, category: '' };
  }
  const studentId = parseInt(key.slice(0, separatorIdx), 10);
  const category = key.slice(separatorIdx + 1);
  return { studentId, category };
};

const isValidRecordId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0;

export interface SyncAttendanceAndPerformanceOptions {
  courseId: number;
  fallbackDate: string;
  attendanceRecords: Record<string, string>;
  attendanceIdMap: Record<string, number>;
  dailyPerformance: Record<string, number>;
  performanceIdMap: Record<string, number>;
  performanceDeleteKeys: string[];
  onPerformanceIdAssigned?: (key: string, id: number) => void;
}

// Shared by performSave (live-state autosave) and syncSnapshotToServer
// (offline-queue flush): builds a PUT-with-404-fallback-to-POST request per
// attendance/daily-performance record, plus a DELETE-with-404-tolerance per
// pending deletion, executed in chunks of 30 with a 200ms pause between
// chunks. Both callers resolve their own id maps first (from React state or
// from a server GET) — this function only needs the resolved maps.
export async function syncAttendanceAndPerformanceRequests(
  options: SyncAttendanceAndPerformanceOptions
): Promise<void> {
  const {
    courseId,
    fallbackDate,
    attendanceRecords,
    attendanceIdMap,
    dailyPerformance,
    performanceIdMap,
    performanceDeleteKeys,
    onPerformanceIdAssigned,
  } = options;

  const attendancePromises = Object.entries(attendanceRecords).map(([key, status]) => {
    const parsed = parseAttendanceKey(key, fallbackDate);
    if (!parsed.studentId) return Promise.resolve(null);

    const normalizedKey = `${parsed.studentId}|${parsed.periodNumber}|${parsed.payloadDate}`;
    const recordId = attendanceIdMap[normalizedKey];

    if (isValidRecordId(recordId)) {
      return apiClient.put(`/attendance/${recordId}`, { status }).catch((error) => {
        if (isResponseLike(error) && error.response?.status === 404) {
          return apiClient.post(`/attendance/`, {
            student_id: parsed.studentId,
            course_id: courseId,
            date: parsed.payloadDate,
            status,
            period_number: parsed.periodNumber,
            notes: '',
          });
        }
        throw error;
      });
    }

    return apiClient.post(`/attendance/`, {
      student_id: parsed.studentId,
      course_id: courseId,
      date: parsed.payloadDate,
      status,
      period_number: parsed.periodNumber,
      notes: '',
    });
  });

  const performancePromises = Object.entries(dailyPerformance).map(([key, score]) => {
    const { studentId, category } = parseDailyPerformanceKey(key);
    if (!studentId || !category) return Promise.resolve(null);

    const recordId = performanceIdMap[key];
    if (isValidRecordId(recordId)) {
      return apiClient.put(`/daily-performance/${recordId}`, { score, max_score: 10.0 }).catch((error) => {
        if (isResponseLike(error) && error.response?.status === 404) {
          return apiClient.post(`/daily-performance/`, {
            student_id: studentId,
            course_id: courseId,
            date: fallbackDate,
            category,
            score,
            max_score: 10.0,
            notes: '',
          }).then((res) => {
            if (res?.data?.id) onPerformanceIdAssigned?.(key, res.data.id);
            return res;
          });
        }
        throw error;
      });
    }

    return apiClient.post(`/daily-performance/`, {
      student_id: studentId,
      course_id: courseId,
      date: fallbackDate,
      category,
      score,
      max_score: 10.0,
      notes: '',
    }).then((res) => {
      if (res?.data?.id) onPerformanceIdAssigned?.(key, res.data.id);
      return res;
    });
  });

  const performanceDeletePromises = performanceDeleteKeys.map((key) => {
    const recordId = performanceIdMap[key];
    if (!isValidRecordId(recordId)) return Promise.resolve(null);
    return apiClient.delete(`/daily-performance/${recordId}`).catch((error) => {
      if (isResponseLike(error) && error.response?.status === 404) {
        return Promise.resolve(null);
      }
      throw error;
    });
  });

  const allPromises = [...attendancePromises, ...performancePromises, ...performanceDeletePromises];
  const CHUNK_SIZE = 30;
  for (let i = 0; i < allPromises.length; i += CHUNK_SIZE) {
    await Promise.all(allPromises.slice(i, i + CHUNK_SIZE));
    if (i + CHUNK_SIZE < allPromises.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

interface UseAttendanceSaveSyncParams {
  selectedCourse: number | '';
  selectedDate: Date | null;
  selectedDateStr: string;
  attendanceRecords: Record<string, string>;
  attendanceRecordIds: Record<string, number>;
  dailyPerformance: Record<string, number>;
  dailyPerformanceIds: Record<string, number>;
  pendingPerformanceDeleteKeys: Set<string>;
  persistedAttendanceRecords: Record<string, string>;
  persistedDailyPerformance: Record<string, number>;
  pendingSyncCount: number;
  t: (key: string, options?: Record<string, unknown>) => string;
  getAttendanceKey: (studentId: number, periodNumber?: number, dateStr?: string) => string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  activeRequestsRef: RefObject<Set<string>>;
  setAttendanceRecords: Dispatch<SetStateAction<Record<string, string>>>;
  setAttendanceRecordIds: Dispatch<SetStateAction<Record<string, number>>>;
  setDailyPerformance: Dispatch<SetStateAction<Record<string, number>>>;
  setDailyPerformanceIds: Dispatch<SetStateAction<Record<string, number>>>;
  setPendingPerformanceDeleteKeys: Dispatch<SetStateAction<Set<string>>>;
  setPersistedAttendanceRecords: Dispatch<SetStateAction<Record<string, string>>>;
  setPersistedDailyPerformance: Dispatch<SetStateAction<Record<string, number>>>;
  setPendingSyncCount: Dispatch<SetStateAction<number>>;
}

export function useAttendanceSaveSync(params: UseAttendanceSaveSyncParams) {
  const {
    selectedCourse,
    selectedDate,
    selectedDateStr,
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
  } = params;

  const [, setLoading] = useState(false);

  const updatePendingSyncCount = useCallback(() => {
    setPendingSyncCount(getPendingAttendanceSyncCount());
  }, [setPendingSyncCount]);

  const isOfflineNetworkError = useCallback((error: unknown) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    if (typeof error !== 'object' || error === null) return false;

    const maybeError = error as {
      code?: string;
      message?: string;
      response?: { status?: number };
      request?: unknown;
    };

    const message = String(maybeError.message || '');
    return (
      maybeError.code === 'ERR_NETWORK' ||
      maybeError.response?.status === 0 ||
      (!maybeError.response && Boolean(maybeError.request)) ||
      /Network Error|Failed to fetch|offline/i.test(message)
    );
  }, []);

  const queueAttendanceSnapshot = useCallback((snapshotDate: string) => {
    const courseId = typeof selectedCourse === 'number' ? selectedCourse : Number(selectedCourse);
    if (!courseId || !snapshotDate) return false;

    enqueueAttendanceSyncSnapshot({
      courseId,
      date: snapshotDate,
      attendanceRecords: { ...attendanceRecords },
      dailyPerformance: { ...dailyPerformance },
      dailyPerformanceDeletes: Array.from(pendingPerformanceDeleteKeys),
    });

    setPersistedAttendanceRecords({ ...attendanceRecords });
    setPersistedDailyPerformance({ ...dailyPerformance });
    updatePendingSyncCount();
    return true;
  }, [selectedCourse, attendanceRecords, dailyPerformance, pendingPerformanceDeleteKeys, setPersistedAttendanceRecords, setPersistedDailyPerformance, updatePendingSyncCount]);

  const syncSnapshotToServer = useCallback(async (snapshot: AttendanceSyncSnapshot) => {
    const attendanceIdMap: Record<string, number> = {};
    const performanceIdMap: Record<string, number> = {};

    const attendanceResponse = await apiClient.get(`/attendance/date/${snapshot.date}/course/${snapshot.courseId}`);
    const attendanceData = Array.isArray(attendanceResponse)
      ? attendanceResponse
      : attendanceResponse.data
        ? (Array.isArray(attendanceResponse.data) ? attendanceResponse.data : [])
        : [];

    (attendanceData as (RawAttendanceRecord & { id?: number })[]).forEach((record) => {
      if (!record?.student_id) return;
      const periodNumber = Number(record.period_number ?? 1);
      const safePeriod = Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1;
      const recordDate = formatLocalDate(record.date || snapshot.date);
      const key = `${record.student_id}|${safePeriod}|${recordDate}`;
      if (record.id) attendanceIdMap[key] = record.id;
    });

    try {
      const performanceResponse = await apiClient.get(`/daily-performance/date/${snapshot.date}/course/${snapshot.courseId}`);
      const performanceData = Array.isArray(performanceResponse)
        ? performanceResponse
        : performanceResponse.data
          ? (Array.isArray(performanceResponse.data) ? performanceResponse.data : [])
          : [];

      (performanceData as (RawDailyPerformanceRecord & { id?: number })[]).forEach((record) => {
        const key = `${record.student_id}-${record.category}`;
        if (record.id) performanceIdMap[key] = record.id;
      });
    } catch (error) {
      if (!(isResponseLike(error) && error.response?.status === 404)) {
        throw error;
      }
    }

    await syncAttendanceAndPerformanceRequests({
      courseId: snapshot.courseId,
      fallbackDate: snapshot.date,
      attendanceRecords: snapshot.attendanceRecords,
      attendanceIdMap,
      dailyPerformance: snapshot.dailyPerformance,
      performanceIdMap,
      performanceDeleteKeys: snapshot.dailyPerformanceDeletes || [],
    });
  }, []);

  const refreshAttendancePrefill = useCallback(async () => {
    if (!selectedCourse || !selectedDateStr) return;
    const dateStr = selectedDateStr;

    // Request deduplication key
    const requestKey = `attendance-${selectedCourse}-${dateStr}`;

    // Prevent duplicate concurrent requests
    if (activeRequestsRef.current.has(requestKey)) {
      console.warn('[AttendanceView] Skipping duplicate request:', requestKey);
      return;
    }

    activeRequestsRef.current.add(requestKey);

    try {
      const attRes = await apiClient.get(`/attendance/date/${dateStr}/course/${selectedCourse}`);
      const attData = Array.isArray(attRes) ? attRes : (attRes.data ? (Array.isArray(attRes.data) ? attRes.data : []) : []);
      const next: Record<string, string> = {};
      const ids: Record<string, number> = {};
      if (Array.isArray(attData)) {
        (attData as (RawAttendanceRecord & { id?: number })[]).forEach((a) => {
          if (!a?.student_id) return;
          const periodNumber = Number(a.period_number ?? 1);
          const safePeriod = Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1;
          const recordDate = formatLocalDate(a.date || dateStr);
          const key = getAttendanceKey(a.student_id, safePeriod, recordDate);
          next[key] = a.status;
          if (a.id) {
            ids[key] = a.id;
          }
        });
      }
      setAttendanceRecords(next);
      setAttendanceRecordIds(ids);
      setPersistedAttendanceRecords(next);

      let dpData: (RawDailyPerformanceRecord & { id?: number })[] = [];
      try {
        const dpRes = await apiClient.get(`/daily-performance/date/${dateStr}/course/${selectedCourse}`);
        dpData = Array.isArray(dpRes) ? dpRes : (dpRes.data ? (Array.isArray(dpRes.data) ? dpRes.data : []) : []);
      } catch (error) {
        // If 404, treat as no data
        if (isResponseLike(error) && error.response?.status === 404) {
          dpData = [];
        } else {
          console.error('[AttendanceView] Error fetching daily performance:', error);
        }
      }
      const dp: Record<string, number> = {};
      const dpIds: Record<string, number> = {};
      if (Array.isArray(dpData)) {
        (dpData as (RawDailyPerformanceRecord & { id?: number })[]).forEach((r) => {
          const key = `${r.student_id}-${r.category}`;
          dp[key] = r.score;
          if (r.id) {
            dpIds[key] = r.id;
          }
        });
      }
      setDailyPerformance(dp);
      setDailyPerformanceIds(dpIds);
      setPendingPerformanceDeleteKeys(new Set());
      setPersistedDailyPerformance(dp);
    } catch (error) {
      console.error('[AttendanceView] Error fetching attendance:', error);
      setAttendanceRecords({});
      setAttendanceRecordIds({});
      setDailyPerformance({});
      setDailyPerformanceIds({});
      setPendingPerformanceDeleteKeys(new Set());
      setPersistedAttendanceRecords({});
      setPersistedDailyPerformance({});
    } finally {
      activeRequestsRef.current.delete(requestKey);
    }
  }, [selectedCourse, selectedDateStr, getAttendanceKey, activeRequestsRef, setAttendanceRecords, setAttendanceRecordIds, setDailyPerformance, setDailyPerformanceIds, setPendingPerformanceDeleteKeys, setPersistedAttendanceRecords, setPersistedDailyPerformance]);

  // Always fetch attendance and performance from backend on date/course change
  useEffect(() => {
    // Only fetch if both course and date are selected
    if (selectedCourse && selectedDate) {
      // Clear state before fetch to avoid stale data
      setAttendanceRecords({});
      setAttendanceRecordIds({});
      setDailyPerformance({});
      setDailyPerformanceIds({});
      setPendingPerformanceDeleteKeys(new Set());
      setPersistedAttendanceRecords({});
      setPersistedDailyPerformance({});
      // Fetch new data
      refreshAttendancePrefill();
    }
  }, [selectedCourse, selectedDate, refreshAttendancePrefill, setAttendanceRecords, setAttendanceRecordIds, setDailyPerformance, setDailyPerformanceIds, setPendingPerformanceDeleteKeys, setPersistedAttendanceRecords, setPersistedDailyPerformance]);

  const flushQueuedSnapshots = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = getAttendanceSyncQueue();
    if (!queue.length) {
      updatePendingSyncCount();
      return;
    }

    let syncedCount = 0;
    for (const snapshot of queue) {
      try {
        await syncSnapshotToServer(snapshot);
        removeAttendanceSyncSnapshot(snapshot.id);
        syncedCount += 1;
      } catch (error) {
        if (isOfflineNetworkError(error)) {
          break;
        }
        console.error('[Attendance] Failed to sync queued snapshot:', error);
        break;
      }
    }

    updatePendingSyncCount();
    if (syncedCount > 0) {
      showToast(t('syncedQueued', { count: syncedCount }) || `${syncedCount} queued change set(s) synced.`, 'success');
      if (selectedCourse && selectedDate) {
        await refreshAttendancePrefill();
      }
    }
  }, [isOfflineNetworkError, refreshAttendancePrefill, selectedCourse, selectedDate, syncSnapshotToServer, t, updatePendingSyncCount, showToast]);

  useEffect(() => {
    updatePendingSyncCount();

    const handleOnline = () => {
      void flushQueuedSnapshots();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      void flushQueuedSnapshots();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [flushQueuedSnapshots, updatePendingSyncCount]);

  const performSave = useCallback(async () => {
    if (!selectedCourse) { showToast(t('selectCourse') || 'Select course', 'error'); return; }
    setLoading(true);
    try {
      const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (queueAttendanceSnapshot(dateStr)) {
          showToast(t('offlineQueued') || 'Offline: changes queued and will sync when connection returns.', 'success');
          return;
        }
      }

      const courseId = typeof selectedCourse === 'number' ? selectedCourse : Number(selectedCourse);
      await syncAttendanceAndPerformanceRequests({
        courseId,
        fallbackDate: dateStr,
        attendanceRecords,
        attendanceIdMap: attendanceRecordIds,
        dailyPerformance,
        performanceIdMap: dailyPerformanceIds,
        performanceDeleteKeys: Array.from(pendingPerformanceDeleteKeys),
        onPerformanceIdAssigned: (key, id) => setDailyPerformanceIds(prev => ({ ...prev, [key]: id })),
      });

      // Emit events to notify other components that attendance/performance changed
      // Extract unique student IDs from the records
      const affectedStudentIds = new Set<number>();
      Object.keys(attendanceRecords).forEach(key => {
        const tokens = key.includes('|') ? key.split('|') : key.split('-');
        const studentId = parseInt(tokens[0], 10);
        if (studentId) affectedStudentIds.add(studentId);
      });
      Object.keys(dailyPerformance).forEach(key => {
        const { studentId } = parseDailyPerformanceKey(key);
        if (studentId) affectedStudentIds.add(studentId);
      });
      Array.from(pendingPerformanceDeleteKeys).forEach((key) => {
        const { studentId } = parseDailyPerformanceKey(key);
        if (studentId) affectedStudentIds.add(studentId);
      });

      affectedStudentIds.forEach(studentId => {
        eventBus.emit(EVENTS.ATTENDANCE_BULK_ADDED, { studentId, courseId: selectedCourse });
        eventBus.emit(EVENTS.DAILY_PERFORMANCE_ADDED, { studentId, courseId: selectedCourse });
      });

      // Mark current state as persisted before attempting a refresh; this prevents the
      // autosave banner from sticking if a post-save refresh fails intermittently.
      if (pendingPerformanceDeleteKeys.size > 0) {
        setDailyPerformanceIds((prev) => {
          const next = { ...prev };
          pendingPerformanceDeleteKeys.forEach((key) => {
            delete next[key];
          });
          return next;
        });
        setPendingPerformanceDeleteKeys(new Set());
      }
      setPersistedAttendanceRecords(attendanceRecords);
      setPersistedDailyPerformance(dailyPerformance);

      await refreshAttendancePrefill();
      // After refreshAttendancePrefill, state is synced with backend.
      // Keep the fetched values so dirty detection sees a clean state.
      showToast(t('savedSuccessfully') || 'Saved successfully', 'success');
    } catch (e) {
      if (isOfflineNetworkError(e)) {
        const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
        if (queueAttendanceSnapshot(dateStr)) {
          showToast(t('offlineQueued') || 'Offline: changes queued and will sync when connection returns.', 'success');
          return;
        }
      }
      console.error('[Attendance] Save error:', e);
      showToast(t('saveFailed') || 'Save failed', 'error');
      throw e; // Re-throw for autosave error handling
    } finally { setLoading(false); }
  }, [selectedCourse, selectedDate, attendanceRecords, attendanceRecordIds, dailyPerformance, dailyPerformanceIds, pendingPerformanceDeleteKeys, t, refreshAttendancePrefill, isOfflineNetworkError, queueAttendanceSnapshot, showToast, setDailyPerformanceIds, setPendingPerformanceDeleteKeys, setPersistedAttendanceRecords, setPersistedDailyPerformance]);

  // Autosave when attendance or performance changes
  // Only show pending if there are unsaved changes (local state differs from last fetched DB state)
  const hasDirtyAttendance = useMemo(
    () => !shallowEqualStringMap(attendanceRecords, persistedAttendanceRecords),
    [attendanceRecords, persistedAttendanceRecords]
  );
  const hasDirtyPerformance = useMemo(
    () => !shallowEqualNumberMap(dailyPerformance, persistedDailyPerformance),
    [dailyPerformance, persistedDailyPerformance]
  );

  const hasChanges = Boolean(selectedCourse && selectedDate && (hasDirtyAttendance || hasDirtyPerformance));
  const { isSaving: isAutosaving, isPending: autosavePending } = useAutosave(
    performSave,
    [attendanceRecords, dailyPerformance],
    {
      delay: 2000,
      enabled: hasChanges,
      skipInitial: true,
    }
  );

  return {
    performSave,
    refreshAttendancePrefill,
    flushQueuedSnapshots,
    queueAttendanceSnapshot,
    isAutosaving,
    autosavePending,
    hasChanges,
    pendingSyncCount,
  };
}

export default useAttendanceSaveSync;
