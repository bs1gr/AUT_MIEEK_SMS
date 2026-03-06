import { useState, useEffect, useCallback, useRef } from 'react';
import { getQueuedStudentUpdateCount } from '@/features/students/utils/offlineStudentUpdateQueue';
import { getPendingAttendanceSyncCount } from '@/features/attendance/utils/offlineAttendanceQueue';
import { getQueuedGradeMutationCount } from '@/features/grading/utils/offlineGradesQueue';

export interface NetworkStatus {
  /** True when the browser reports an active network connection. */
  isOnline: boolean;
  /** Total number of queued mutations across students, attendance, and grades. */
  pendingSyncCount: number;
  /** Breakdown of pending counts per feature area. */
  pendingByFeature: {
    students: number;
    attendance: number;
    grades: number;
  };
  /** True when the user *was* offline and just came back online. */
  wasOffline: boolean;
  /** Force a recount of all pending queues. */
  refreshPendingCounts: () => void;
}

/**
 * Centralised hook for network status and offline-queue counts.
 *
 * Replaces scattered `navigator.onLine` checks across the codebase with a
 * single reactive source of truth.  Aggregates pending-sync counts from
 * all three localStorage-backed offline queues (students, attendance, grades).
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOnline = useRef(isOnline);

  const [pendingByFeature, setPendingByFeature] = useState({
    students: 0,
    attendance: 0,
    grades: 0,
  });

  const refreshPendingCounts = useCallback(() => {
    setPendingByFeature({
      students: getQueuedStudentUpdateCount(),
      attendance: getPendingAttendanceSyncCount(),
      grades: getQueuedGradeMutationCount(),
    });
  }, []);

  // Listen for online/offline browser events
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Track transition from offline → online to show "back online" banner
  useEffect(() => {
    if (prevOnline.current === false && isOnline === true) {
      setWasOffline(true);
      wasOfflineTimer.current = setTimeout(() => setWasOffline(false), 5000);
    }
    prevOnline.current = isOnline;

    return () => {
      if (wasOfflineTimer.current) clearTimeout(wasOfflineTimer.current);
    };
  }, [isOnline]);

  // Poll pending counts periodically (every 5s) and on network change
  useEffect(() => {
    refreshPendingCounts();
    const timer = setInterval(refreshPendingCounts, 5000);
    return () => clearInterval(timer);
  }, [isOnline, refreshPendingCounts]);

  const pendingSyncCount =
    pendingByFeature.students + pendingByFeature.attendance + pendingByFeature.grades;

  return {
    isOnline,
    pendingSyncCount,
    pendingByFeature,
    wasOffline,
    refreshPendingCounts,
  };
}
