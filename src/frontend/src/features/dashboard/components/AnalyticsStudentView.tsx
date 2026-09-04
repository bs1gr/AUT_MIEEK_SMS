import {
  PerformanceChart,
  GradeDistributionChart,
  AttendanceChart,
  TrendChart,
  type PerformanceDataPoint,
  type GradeDistributionData,
  type AttendanceData,
  type TrendData,
} from './AnalyticsCharts';

export interface AnalyticsStudentViewProps {
  t: (key: string) => string;
  visibleCharts: Set<string>;
  performanceData: PerformanceDataPoint[];
  gradeDistributionData: GradeDistributionData[];
  effectiveSelectedCourse: number | null;
  attendanceData: AttendanceData[];
  trendData: TrendData[];
  effectiveSelectedStudent: number | null;
}

const AnalyticsStudentView = ({
  t,
  visibleCharts,
  performanceData,
  gradeDistributionData,
  effectiveSelectedCourse,
  attendanceData,
  trendData,
  effectiveSelectedStudent,
}: AnalyticsStudentViewProps) => {
  return (
    <div className="space-y-8">
      {(visibleCharts.has('performance') || visibleCharts.has('gradeDistribution')) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {visibleCharts.has('performance') && (
            <PerformanceChart
              data={performanceData}
              title={t('analytics.chartStudentPerformance')}
              height={350}
            />
          )}
          {visibleCharts.has('gradeDistribution') && effectiveSelectedCourse && (
            <GradeDistributionChart
              data={gradeDistributionData}
              title={t('analytics.chartGradeDistribution')}
              height={350}
            />
          )}
        </div>
      )}

      {(visibleCharts.has('attendance') || visibleCharts.has('trend')) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {visibleCharts.has('attendance') && (
            <AttendanceChart
              data={attendanceData}
              title={t('analytics.chartAttendanceRate')}
              height={350}
            />
          )}
          {visibleCharts.has('trend') && (
            <TrendChart
              data={trendData}
              title={t('analytics.chartPerformanceTrend')}
              height={350}
            />
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <h3 className="text-lg font-semibold text-slate-900">
          {t('analytics.quickReportTitle')}
        </h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {effectiveSelectedStudent ? (
            <>
              <p>
                <span className="font-medium text-slate-700">{t('analytics.quickReportAverageGrade')}</span>{' '}
                {performanceData.length > 0
                  ? (performanceData.reduce((sum, item) => sum + item.grade, 0) / performanceData.length).toFixed(2)
                  : '0.00'}
                %
              </p>
              <p>
                <span className="font-medium text-slate-700">
                  {t('analytics.quickReportAverageAttendance')}
                </span>{' '}
                {attendanceData.length > 0
                  ? (attendanceData.reduce((sum, item) => sum + item.rate, 0) / attendanceData.length).toFixed(2)
                  : '0.00'}
                %
              </p>
              <p>
                <span className="font-medium text-slate-700">{t('analytics.quickReportTotalGrades')}</span>{' '}
                {performanceData.length}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t('analytics.selectStudentFirst')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsStudentView;
