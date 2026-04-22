export interface AttendanceSyncSnapshot {
  id: string;
  courseId: number;
  date: string;
  attendanceRecords: Record<string, string>;
  dailyPerformance: Record<string, number>;
  dailyPerformanceDeletes?: string[];
  enqueuedAt: string;
}

type EnqueueAttendanceSyncSnapshotInput = Omit<AttendanceSyncSnapshot, 'id' | 'enqueuedAt'>;

const STORAGE_KEY = 'sms_attendance_offline_queue_v1';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseQueue = (raw: string | null): AttendanceSyncSnapshot[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AttendanceSyncSnapshot => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as AttendanceSyncSnapshot).id === 'string' &&
        typeof (item as AttendanceSyncSnapshot).courseId === 'number' &&
        typeof (item as AttendanceSyncSnapshot).date === 'string' &&
        ((item as AttendanceSyncSnapshot).dailyPerformanceDeletes === undefined ||
          Array.isArray((item as AttendanceSyncSnapshot).dailyPerformanceDeletes))
      );
    });
  } catch {
    return [];
  }
};

const writeQueue = (queue: AttendanceSyncSnapshot[]) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore localStorage write failures; app continues online-only.
  }
};

export const getAttendanceSyncQueue = (): AttendanceSyncSnapshot[] => {
  if (!hasStorage()) return [];
  try {
    return parseQueue(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
};

export const getPendingAttendanceSyncCount = (): number => getAttendanceSyncQueue().length;

export const enqueueAttendanceSyncSnapshot = (
  input: EnqueueAttendanceSyncSnapshotInput
): AttendanceSyncSnapshot => {
  const queue = getAttendanceSyncQueue();
  const snapshot: AttendanceSyncSnapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    courseId: input.courseId,
    date: input.date,
    attendanceRecords: input.attendanceRecords,
    dailyPerformance: input.dailyPerformance,
    dailyPerformanceDeletes: input.dailyPerformanceDeletes || [],
    enqueuedAt: new Date().toISOString(),
  };

  const duplicateIndex = queue.findIndex((item) => item.courseId === snapshot.courseId && item.date === snapshot.date);
  if (duplicateIndex >= 0) {
    queue[duplicateIndex] = snapshot;
  } else {
    queue.push(snapshot);
  }

  writeQueue(queue);
  return snapshot;
};

export const removeAttendanceSyncSnapshot = (snapshotId: string): void => {
  const queue = getAttendanceSyncQueue();
  const next = queue.filter((item) => item.id !== snapshotId);
  writeQueue(next);
};

export const clearAttendanceSyncQueue = (): void => {
  writeQueue([]);
};
