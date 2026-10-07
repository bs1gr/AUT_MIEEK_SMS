import type { ReactElement, ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Pass mark for course final grades, in percent (10/20). */
export const PASS_MARK = 50;

const COLORS = {
  primary: '#4f46e5',
  muted: '#94a3b8',
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  excused: '#3b82f6',
  fail: '#ef4444',
};
const LINE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'];

const percent = (value: unknown) => (typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? ''));

interface ChartCardProps {
  title: string;
  testId: string;
  empty: boolean;
  t: Translate;
  height: number;
  children: ReactNode;
}

const ChartCard = ({ title, testId, empty, t, height, children }: ChartCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs" data-testid={testId}>
    <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
    {empty ? (
      <div className="flex items-center justify-center rounded-lg bg-slate-50 p-8">
        <p className="text-slate-500">{t('analytics.overview.noData')}</p>
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={height}>
        {children as ReactElement}
      </ResponsiveContainer>
    )}
  </div>
);

const PassLine = ({ t }: { t: Translate }) => (
  <ReferenceLine
    y={PASS_MARK}
    stroke={COLORS.fail}
    strokeDasharray="4 4"
    label={{ value: t('analytics.overview.passMark'), position: 'insideTopRight', fill: COLORS.fail, fontSize: 11 }}
  />
);

/** Final grade per course next to the class average (student view). */
export interface CourseComparisonPoint {
  course: string;
  finalGrade: number | null;
  classAverage: number | null;
}

export const CourseComparisonChart = ({ data, title, t, height = 320 }: {
  data: CourseComparisonPoint[];
  title: string;
  t: Translate;
  height?: number;
}) => (
  <ChartCard
    title={title}
    testId="chart-course-comparison"
    empty={!data.some((d) => d.finalGrade !== null || d.classAverage !== null)}
    t={t}
    height={height}
  >
    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="course" interval={0} tick={{ fontSize: 11 }} />
      <YAxis domain={[0, 100]} unit="%" />
      <Tooltip formatter={percent} />
      <Legend />
      <PassLine t={t} />
      <Bar dataKey="finalGrade" name={t('analytics.overview.finalGrade')} fill={COLORS.primary} />
      <Bar dataKey="classAverage" name={t('analytics.overview.classAverage')} fill={COLORS.muted} />
    </BarChart>
  </ChartCard>
);

/** Average final grade per course (class view); bars under the pass mark are red. */
export interface CourseAveragePoint {
  course: string;
  average: number | null;
  passing: number;
  failing: number;
}

export const CourseAveragesChart = ({ data, title, t, height = 320 }: {
  data: CourseAveragePoint[];
  title: string;
  t: Translate;
  height?: number;
}) => (
  <ChartCard title={title} testId="chart-course-averages" empty={!data.some((d) => d.average !== null)} t={t} height={height}>
    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="course" interval={0} tick={{ fontSize: 11 }} />
      <YAxis domain={[0, 100]} unit="%" />
      <Tooltip formatter={percent} />
      <PassLine t={t} />
      <Bar dataKey="average" name={t('analytics.overview.averageFinalGrade')}>
        {data.map((d) => (
          <Cell key={d.course} fill={d.average !== null && d.average < PASS_MARK ? COLORS.fail : COLORS.primary} />
        ))}
      </Bar>
    </BarChart>
  </ChartCard>
);

/** Every grade over time, one line per course (student view). */
export interface GradeTimelineSeries {
  course: string;
  points: { date: string; label: string; percentage: number }[];
}

export const GradeTimelineChart = ({ series, title, t, height = 320 }: {
  series: GradeTimelineSeries[];
  title: string;
  t: Translate;
  height?: number;
}) => {
  // One row per date, one column per course; a course without a grade that day stays empty.
  const rows = new Map<string, Record<string, string | number>>();
  series.forEach((s) =>
    s.points.forEach((p) => {
      const row = rows.get(p.date) ?? { date: p.date, label: p.label };
      row[s.course] = p.percentage;
      rows.set(p.date, row);
    })
  );
  const data = Array.from(rows.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return (
    <ChartCard title={title} testId="chart-grade-timeline" empty={data.length === 0} t={t} height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip formatter={percent} />
        <Legend />
        <PassLine t={t} />
        {series.map((s, i) => (
          <Line
            key={s.course}
            type="monotone"
            dataKey={s.course}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            dot
            connectNulls
          />
        ))}
      </LineChart>
    </ChartCard>
  );
};

/** Recorded periods per course by status. */
export interface AttendanceBreakdownPoint {
  course: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export const AttendanceBreakdownChart = ({ data, title, t, height = 320 }: {
  data: AttendanceBreakdownPoint[];
  title: string;
  t: Translate;
  height?: number;
}) => (
  <ChartCard
    title={title}
    testId="chart-attendance"
    empty={!data.some((d) => d.present + d.late + d.absent + d.excused > 0)}
    t={t}
    height={height}
  >
    <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" allowDecimals={false} />
      <YAxis type="category" dataKey="course" width={160} tick={{ fontSize: 11 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey="present" stackId="a" name={t('analytics.overview.present')} fill={COLORS.present} />
      <Bar dataKey="late" stackId="a" name={t('analytics.overview.late')} fill={COLORS.late} />
      <Bar dataKey="excused" stackId="a" name={t('analytics.overview.excused')} fill={COLORS.excused} />
      <Bar dataKey="absent" stackId="a" name={t('analytics.overview.absent')} fill={COLORS.absent} />
    </BarChart>
  </ChartCard>
);

/** How many final grades fall in each band (class view). */
export const GradeDistributionChart = ({ data, title, t, height = 320 }: {
  data: { band: string; count: number }[];
  title: string;
  t: Translate;
  height?: number;
}) => (
  <ChartCard title={title} testId="chart-grade-distribution" empty={!data.some((d) => d.count > 0)} t={t} height={height}>
    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="band" unit="%" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="count" name={t('analytics.overview.finalGrades')}>
        {data.map((d) => (
          <Cell key={d.band} fill={d.band === '0-49' ? COLORS.fail : COLORS.primary} />
        ))}
      </Bar>
    </BarChart>
  </ChartCard>
);

/** Attendance against average final grade, one dot per student (class view). */
export interface AttendanceGradePoint {
  name: string;
  attendance: number;
  grade: number;
}

export const AttendanceGradeScatter = ({ data, title, t, height = 320 }: {
  data: AttendanceGradePoint[];
  title: string;
  t: Translate;
  height?: number;
}) => (
  <ChartCard title={title} testId="chart-scatter" empty={data.length === 0} t={t} height={height}>
    <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" dataKey="attendance" name={t('analytics.overview.attendanceRate')} domain={[0, 100]} unit="%" />
      <YAxis type="number" dataKey="grade" name={t('analytics.overview.averageFinalGrade')} domain={[0, 100]} unit="%" />
      <ZAxis type="category" dataKey="name" name={t('analytics.studentLabel')} />
      <Tooltip formatter={(value) => (typeof value === 'number' ? percent(value) : String(value))} />
      <PassLine t={t} />
      <Scatter data={data} fill={COLORS.primary} />
    </ScatterChart>
  </ChartCard>
);
