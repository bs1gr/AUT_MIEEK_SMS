import {
  clearAttendanceSyncQueue,
  enqueueAttendanceSyncSnapshot,
  getAttendanceSyncQueue,
  getPendingAttendanceSyncCount,
  removeAttendanceSyncSnapshot,
} from './offlineAttendanceQueue';

describe('offlineAttendanceQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAttendanceSyncQueue();
  });

  it('enqueues and counts snapshots', () => {
    enqueueAttendanceSyncSnapshot({
      courseId: 12,
      date: '2026-03-05',
      attendanceRecords: { '1|1|2026-03-05': 'Present' },
      dailyPerformance: { '1-Class Participation': 8 },
    });

    expect(getPendingAttendanceSyncCount()).toBe(1);
    const queue = getAttendanceSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].courseId).toBe(12);
  });

  it('deduplicates by course and date', () => {
    enqueueAttendanceSyncSnapshot({
      courseId: 5,
      date: '2026-03-05',
      attendanceRecords: { '1|1|2026-03-05': 'Present' },
      dailyPerformance: {},
    });

    enqueueAttendanceSyncSnapshot({
      courseId: 5,
      date: '2026-03-05',
      attendanceRecords: { '1|1|2026-03-05': 'Absent' },
      dailyPerformance: {},
    });

    const queue = getAttendanceSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].attendanceRecords['1|1|2026-03-05']).toBe('Absent');
  });

  it('removes snapshots by id', () => {
    const first = enqueueAttendanceSyncSnapshot({
      courseId: 1,
      date: '2026-03-05',
      attendanceRecords: {},
      dailyPerformance: {},
    });
    enqueueAttendanceSyncSnapshot({
      courseId: 2,
      date: '2026-03-05',
      attendanceRecords: {},
      dailyPerformance: {},
    });

    removeAttendanceSyncSnapshot(first.id);
    expect(getPendingAttendanceSyncCount()).toBe(1);
    expect(getAttendanceSyncQueue()[0].courseId).toBe(2);
  });
});
