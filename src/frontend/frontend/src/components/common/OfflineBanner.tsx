import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * OfflineBanner – shows an amber banner while offline and a brief green
 * banner when the connection is restored.  Displays aggregated counts of
 * queued mutations so the user knows what will sync when they reconnect.
 */
const OfflineBanner = () => {
  const { t } = useTranslation('offline');
  const { isOnline, pendingSyncCount, pendingByFeature, wasOffline } = useNetworkStatus();

  // Nothing to show when fully online with no pending changes and no recent reconnect
  if (isOnline && !wasOffline && pendingSyncCount === 0) return null;

  const showOffline = !isOnline;
  const showReconnected = isOnline && wasOffline;
  const showPendingOnly = isOnline && !wasOffline && pendingSyncCount > 0;

  return (
    <div
      className={`rounded-lg px-4 py-3 shadow-sm transition-colors duration-300 ${
        showOffline
          ? 'bg-amber-50 border border-amber-300 text-amber-900'
          : showReconnected
            ? 'bg-green-50 border border-green-300 text-green-900'
            : 'bg-blue-50 border border-blue-300 text-blue-900'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="mt-0.5 flex-shrink-0">
          {showOffline && (
            <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
            </svg>
          )}
          {showReconnected && (
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
          )}
          {showPendingOnly && (
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </span>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {showOffline && t('offlineTitle')}
            {showReconnected && t('backOnlineTitle')}
            {showPendingOnly && t('pendingChanges', { count: pendingSyncCount })}
          </p>

          {showOffline && (
            <p className="text-sm mt-0.5 opacity-80">{t('offlineMessage')}</p>
          )}
          {showReconnected && (
            <p className="text-sm mt-0.5 opacity-80">{t('backOnlineMessage')}</p>
          )}

          {/* Per-feature breakdown when there are pending items */}
          {pendingSyncCount > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs opacity-75">
              {pendingByFeature.students > 0 && (
                <span>{t('pendingStudents', { count: pendingByFeature.students })}</span>
              )}
              {pendingByFeature.attendance > 0 && (
                <span>{t('pendingAttendance', { count: pendingByFeature.attendance })}</span>
              )}
              {pendingByFeature.grades > 0 && (
                <span>{t('pendingGrades', { count: pendingByFeature.grades })}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
