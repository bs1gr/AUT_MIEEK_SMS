import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

export interface AttendanceAnalyticsData {
  overall: Record<string, number>;
  perPeriod: Record<number, Record<string, number>>;
  totalSlots: number;
  recordedSlots: number;
  pendingSlots: number;
}

export interface AttendanceAnalyticsSnapshotProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  coveragePercent: number;
  attendanceAnalytics: AttendanceAnalyticsData;
  statusOrder: readonly string[];
  statusBadgeClasses: Record<string, string>;
  translateStatusLabel: (status: string) => string;
  hasMultiplePeriods: boolean;
  showPeriodBreakdown: boolean;
  setShowPeriodBreakdown: (updater: (prev: boolean) => boolean) => void;
  activePeriods: number[];
  enrolledStudentsCount: number;
}

const AttendanceAnalyticsSnapshot = ({
  t,
  coveragePercent,
  attendanceAnalytics,
  statusOrder,
  statusBadgeClasses,
  translateStatusLabel,
  hasMultiplePeriods,
  showPeriodBreakdown,
  setShowPeriodBreakdown,
  activePeriods,
  enrolledStudentsCount,
}: AttendanceAnalyticsSnapshotProps) => {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 text-indigo-700 rounded-xl p-2"><BarChart3 size={20} /></div>
          <div>
            <h4 className="font-semibold text-gray-800">{t('attendanceInsights') || 'Attendance insights'}</h4>
            <p className="text-xs text-gray-500">{t('overallSummary') || 'Overall summary for this day'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">{t('coverageLabel') || 'Coverage'}: {coveragePercent}%</p>
          <p className="text-xs text-gray-500">{attendanceAnalytics.recordedSlots}/{attendanceAnalytics.totalSlots || 0} {t('recordsTracked') || 'records tracked'}</p>
          {attendanceAnalytics.pendingSlots > 0 && (
            <p className="text-xs text-amber-600">
              {t('pendingRecords', { count: attendanceAnalytics.pendingSlots }) || `${attendanceAnalytics.pendingSlots} pending`}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statusOrder.map((status) => (
          <div key={status} className={`rounded-xl border px-3 py-2 text-center ${statusBadgeClasses[status] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-indigo-700">{translateStatusLabel(status)}</p>
            <p className="text-xl font-bold">{attendanceAnalytics.overall[status] || 0}</p>
          </div>
        ))}
      </div>
      {hasMultiplePeriods && (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setShowPeriodBreakdown((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-white border rounded-lg px-3 py-2"
          >
            <span>{showPeriodBreakdown ? (t('hidePeriodBreakdown') || 'Hide per-period breakdown') : (t('showPeriodBreakdown') || 'Show per-period breakdown')}</span>
            {showPeriodBreakdown ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          </button>
          {showPeriodBreakdown && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('perPeriodBreakdown') || 'Per-period breakdown'}</p>
              {activePeriods.map((period) => (
                <div key={period} className="border rounded-2xl p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <span className="font-semibold text-gray-800">{t('periodLabel', { number: period }) || `Period ${period}`}</span>
                    <span className="text-xs text-gray-500">{t('studentsTracked', { count: enrolledStudentsCount || 0 }) || `${enrolledStudentsCount || 0} students`}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {statusOrder.map((status) => (
                      <div key={`${period}-${status}`} className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[11px] text-indigo-700">{translateStatusLabel(status)}</p>
                        <p className="text-lg font-semibold text-gray-900">{attendanceAnalytics.perPeriod[period]?.[status] || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceAnalyticsSnapshot;
