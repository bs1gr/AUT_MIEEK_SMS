import { useState, useEffect, useCallback, useRef } from 'react';
import { getQueuedStudentUpdateCount } from '@/features/students/utils/offlineStudentUpdateQueue';
import { getPendingAttendanceSyncCount } from '@/features/attendance/utils/offlineAttendanceQueue';
import { getQueuedGradeMutationCount } from '@/features/grading/utils/offlineGradesQueue';
import { isCapacitorApp } from '@/utils/serverUrl';

export interface NetworkStatus {
  /** True when the browser / device reports an active network connection. */
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
 * On Android (Capacitor) uses the native Network plugin for reliable
 * connectivity detection.  On web falls back to browser online/offline events.
 *
 * Fires a `sms-reconnected` CustomEvent on window when transitioning from
 * offline → online so feature components can drain their offline queues.
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

  // Network event listeners — native (Capacitor) or browser fallback
  useEffect(() => {
    if (isCapacitorApp()) {
      // Use Android ConnectivityManager via @capacitor/network for reliable detection
      let removeListener: (() => void) | null = null;

      void import('@capacitor/network').then(({ Network }) => {
        // Hydrate initial state
        void Network.getStatus().then((status) => {
          setIsOnline(status.connected);
        });

        // Subscribe to changes
        void Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
        }).then((handle) => {
          removeListener = () => { void handle.remove(); };
        });
      });

      return () => { removeListener?.(); };
    }

    // Web: standard browser events
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Track offline → online transition; fire sms-reconnected event
  useEffect(() => {
    if (prevOnline.current === false && isOnline === true) {
      const timeoutId = setTimeout(() => {
        setWasOffline(true);
        window.dispatchEvent(new CustomEvent('sms-reconnected'));
        wasOfflineTimer.current = setTimeout(() => setWasOffline(false), 5000);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    prevOnline.current = isOnline;

    return () => {
      if (wasOfflineTimer.current) clearTimeout(wasOfflineTimer.current);
    };
  }, [isOnline]);

  // Poll pending counts (every 5 s) and on every network state change
  useEffect(() => {
    const timeoutId = setTimeout(refreshPendingCounts, 0);
    const timer = setInterval(refreshPendingCounts, 5000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(timer);
    };
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
