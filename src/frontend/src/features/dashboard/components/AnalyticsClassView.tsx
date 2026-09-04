import {
  PerformanceChart,
  GradeDistributionChart,
  AttendanceChart,
  TrendChart,
  StatsPieChart,
  ScatterPlot,
  GradeHeatmap,
  StudentProgressionSankey,
  PerformanceTreemap,
  GradeDistributionBoxPlot,
  type PerformanceDataPoint,
  type GradeDistributionData,
  type AttendanceData,
  type TrendData,
  type PieChartData,
  type ScatterDataPoint,
  type HeatmapDataPoint,
  type SankeyDataPoint,
  type TreemapDataPoint,
  type BoxPlotDataPoint,
} from './AnalyticsCharts';

type Aggregate = { label: string; count: number; average: number };

export interface QuickReportStats {
  activeStudents: number;
  totalStudents: number;
  averageGrade: number;
  averageAttendance: number;
  totalGrades: number;
}

export interface AnalyticsClassViewProps {
  t: (key: string) => string;
  visibleCharts: Set<string>;
  selectedDivision: string;
  effectiveSelectedStudent: number | null;
  effectiveSelectedCourse: number | null;
  performanceData: PerformanceDataPoint[];
  divisionPerformanceData: PerformanceDataPoint[];
  gradeDistributionData: GradeDistributionData[];
  divisionGradeDistributionData: GradeDistributionData[];
  attendanceData: AttendanceData[];
  divisionAttendanceData: AttendanceData[];
  trendData: TrendData[];
  divisionTrendData: TrendData[];
  pieChartData: PieChartData[];
  divisionScatterData: ScatterDataPoint[];
  divisionHeatmapData: HeatmapDataPoint[];
  divisionSankeyData: SankeyDataPoint[];
  divisionTreemapData: TreemapDataPoint[];
  divisionBoxPlotData: BoxPlotDataPoint[];
  quickReportStats: QuickReportStats;
  filteredClassAggregates: Aggregate[];
  filteredCourseAggregates: Aggregate[];
  divisionAggregates: Aggregate[];
  normalizeDivisionLabel: (label?: string | null) => string;
}

const AnalyticsClassView = ({
  t,
  visibleCharts,
  selectedDivision,
  effectiveSelectedStudent,
  effectiveSelectedCourse,
  performanceData,
  divisionPerformanceData,
  gradeDistributionData,
  divisionGradeDistributionData,
  attendanceData,
  divisionAttendanceData,
  trendData,
  divisionTrendData,
  pieChartData,
  divisionScatterData,
  divisionHeatmapData,
  divisionSankeyData,
  divisionTreemapData,
  divisionBoxPlotData,
  quickReportStats,
  filteredClassAggregates,
  filteredCourseAggregates,
  divisionAggregates,
  normalizeDivisionLabel,
}: AnalyticsClassViewProps) => {
  return (
    <div className="space-y-8">
      {(visibleCharts.has('performance') || visibleCharts.has('gradeDistribution')) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {visibleCharts.has('performance') && (
            <PerformanceChart
              data={selectedDivision ? divisionPerformanceData : effectiveSelectedStudent ? performanceData : []}
              title={t('analytics.chartStudentPerformance')}
              height={350}
            />
          )}
          {visibleCharts.has('gradeDistribution') && (
            <GradeDistributionChart
              data={selectedDivision ? divisionGradeDistributionData : effectiveSelectedCourse ? gradeDistributionData : []}
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
              data={selectedDivision ? divisionAttendanceData : effectiveSelectedStudent ? attendanceData : []}
              title={t('analytics.chartAttendanceRate')}
              height={350}
            />
          )}
          {visibleCharts.has('trend') && (
            <TrendChart
              data={selectedDivision ? divisionTrendData : effectiveSelectedStudent ? trendData : []}
              title={t('analytics.chartPerformanceTrend')}
              height={350}
            />
          )}
        </div>
      )}

      {(visibleCharts.has('pieChart') || visibleCharts.has('scatter')) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {visibleCharts.has('pieChart') && (
            <StatsPieChart
              data={pieChartData}
              title={t('analytics.chartStudentStatus')}
              height={350}
            />
          )}
          {visibleCharts.has('scatter') && (
            <ScatterPlot
              data={selectedDivision ? divisionScatterData : []}
              title={t('analytics.chartAttendanceGradeCorrelation')}
              xAxisLabel={t('analytics.attendance')}
              yAxisLabel={t('analytics.grade')}
              height={350}
            />
          )}
        </div>
      )}

      {visibleCharts.has('heatmap') && (
        <div className="w-full">
          <GradeHeatmap
            data={selectedDivision ? divisionHeatmapData : []}
            title={t('analytics.chartGradeHeatmap')}
            height={300}
          />
        </div>
      )}

      {visibleCharts.has('sankey') && (
        <div className="w-full">
          <StudentProgressionSankey
            data={selectedDivision ? divisionSankeyData : []}
            title={t('analytics.chartStudentProgression')}
            height={350}
          />
        </div>
      )}

      {visibleCharts.has('treemap') && (
        <div className="w-full">
          <PerformanceTreemap
            data={selectedDivision ? divisionTreemapData : []}
            title={t('analytics.chartPerformanceHierarchy')}
            height={350}
          />
        </div>
      )}

      {visibleCharts.has('boxplot') && (
        <div className="w-full">
          <GradeDistributionBoxPlot
            data={selectedDivision ? divisionBoxPlotData : []}
            title={t('analytics.chartDistributionAnalysis')}
            height={400}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('analytics.quickReportTitle')}
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">{t('analytics.quickReportActiveStudents')}</span>{' '}
              {quickReportStats.activeStudents}/{quickReportStats.totalStudents}
            </p>
            <p>
              <span className="font-medium text-slate-700">{t('analytics.quickReportAverageGrade')}</span>{' '}
              {quickReportStats.averageGrade.toFixed(2)}%
            </p>
            <p>
              <span className="font-medium text-slate-700">
                {t('analytics.quickReportAverageAttendance')}
              </span>{' '}
              {quickReportStats.averageAttendance.toFixed(2)}%
            </p>
            <p>
              <span className="font-medium text-slate-700">{t('analytics.quickReportTotalGrades')}</span>{' '}
              {quickReportStats.totalGrades}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('analytics.classAverageSummaryTitle')}
          </h3>
          <div className="mt-4 space-y-3">
            {filteredClassAggregates.length === 0 ? (
              <p className="text-sm text-slate-500">{t('analytics.noClassData')}</p>
            ) : (
              filteredClassAggregates.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                  <div>
                    <div className="font-medium text-slate-700">{entry.label}</div>
                    <div className="text-xs text-slate-500">
                      {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">{entry.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('analytics.courseAverageSummaryTitle')}
          </h3>
          <div className="mt-4 space-y-3">
            {filteredCourseAggregates.length === 0 ? (
              <p className="text-sm text-slate-500">{t('analytics.noCourseData')}</p>
            ) : (
              filteredCourseAggregates.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                  <div>
                    <div className="font-medium text-slate-700">{entry.label}</div>
                    <div className="text-xs text-slate-500">
                      {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {entry.count} {t('analytics.enrolledLabel')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('analytics.divisionAverageSummaryTitle')}
          </h3>
          <div className="mt-4 space-y-3">
            {divisionAggregates.length === 0 ? (
              <p className="text-sm text-slate-500">{t('analytics.noDivisionData')}</p>
            ) : (
              divisionAggregates.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                  <div>
                    <div className="font-medium text-slate-700">
                      {normalizeDivisionLabel(entry.label)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">{entry.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsClassView;
