import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Sankey,
  Treemap,
} from 'recharts';
import { useLanguage } from '@/LanguageContext';

/**
 * Student Performance Chart - Shows grade trends over time
 */
export interface PerformanceDataPoint {
  date: string;
  course: string;
  grade: number;
  trend?: number; // moving average
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  title?: string;
  height?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : String(value))}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="grade"
            stroke="#6366f1"
            name={language === 'el' ? 'Βαθμός' : 'Grade'}
            connectNulls
          />
          {data.some((d) => d.trend !== undefined) && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#8b5cf6"
              name={language === 'el' ? 'Τάση' : 'Trend'}
              strokeDasharray="5 5"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Grade Distribution Chart - Shows grade buckets as bar chart
 */
export interface GradeDistributionData {
  grade: string; // A, B, C, D, F
  count: number;
  percentage: number;
}

interface GradeDistributionChartProps {
  data: GradeDistributionData[];
  title?: string;
  height?: number;
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
  data,
  title,
  height = 350,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="grade" />
          <YAxis />
          <Tooltip
            formatter={(value) => (typeof value === 'number' ? value : Number(value))}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#6366f1"
            name={language === 'el' ? 'Αριθμός μαθητών' : 'Number of Students'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Attendance Rate Chart - Shows attendance percentage by course
 */
export interface AttendanceData {
  course: string;
  rate: number; // 0-100
  present: number;
  absent: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  title?: string;
  height?: number;
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  data,
  title,
  height = 350,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="course" angle={-45} textAnchor="end" height={80} />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : Number(value).toFixed(1)}%`}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar
            dataKey="rate"
            fill="#10b981"
            name={language === 'el' ? 'Ποσοστό παρουσίας' : 'Attendance Rate'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Trend Line Chart - Shows student performance trend (improving/declining)
 */
export interface TrendData {
  week: number;
  average: number;
  trend?: string; // "improving" | "declining" | "stable"
}

interface TrendChartProps {
  data: TrendData[];
  title?: string;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  height = 350,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  const getStrokeColor = () => {
    if (data.length < 2) return '#6366f1';
    const firstAvg = data[0].average;
    const lastAvg = data[data.length - 1].average;
    if (lastAvg > firstAvg) return '#10b981'; // improving - green
    if (lastAvg < firstAvg) return '#ef4444'; // declining - red
    return '#f59e0b'; // stable - yellow
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getStrokeColor()} stopOpacity={0.8} />
              <stop offset="95%" stopColor={getStrokeColor()} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : String(value))}
            labelStyle={{ color: '#000' }}
          />
          <Area
            type="monotone"
            dataKey="average"
            stroke={getStrokeColor()}
            fill="url(#colorAverage)"
            name={language === 'el' ? 'Μέσος όρος' : 'Average'}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Pie Chart for overall statistics
 */
export interface PieChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface StatsPieChartProps {
  data: PieChartData[];
  title?: string;
  height?: number;
}

const COLORS_PIE = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const StatsPieChart: React.FC<StatsPieChartProps> = ({
  data,
  title,
  height = 350,
}) => {
  const { language } = useLanguage();

  const totalValue = Array.isArray(data)
    ? data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
    : 0;

  if (!data || data.length === 0 || totalValue <= 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => {
              const safePercent = typeof percent === 'number' && Number.isFinite(percent) ? percent : 0;
              const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
              return `${name}: ${safeValue} (${(safePercent * 100).toFixed(0)}%)`;
            }}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => (typeof value === 'number' ? value : Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Scatter Chart - Shows correlation between two variables (e.g., attendance vs grade)
 */
export interface ScatterDataPoint {
  x: number;
  y: number;
  name?: string;
}

interface ScatterChartProps {
  data: ScatterDataPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
}

export const ScatterPlot: React.FC<ScatterChartProps> = ({
  data,
  title,
  xAxisLabel = 'X Axis',
  yAxisLabel = 'Y Axis',
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" name={xAxisLabel} unit="" />
          <YAxis dataKey="y" name={yAxisLabel} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : String(value))}
          />
          <Legend />
          <Scatter
            name={title || 'Data Points'}
            data={data}
            fill="#6366f1"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Heatmap - Shows grade distribution intensity by week/month
 */
export interface HeatmapDataPoint {
  week: string | number;
  course: string;
  averageGrade: number;
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
  title?: string;
  height?: number;
}

export const GradeHeatmap: React.FC<HeatmapProps> = ({
  data,
  title,
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  const uniqueCourses = Array.from(new Set(data.map((d) => d.course))).sort();
  const uniqueWeeks = Array.from(new Set(data.map((d) => d.week))).sort((a, b) => {
    const aNum = typeof a === 'number' ? a : parseInt(String(a), 10);
    const bNum = typeof b === 'number' ? b : parseInt(String(b), 10);
    return aNum - bNum;
  });

  const maxGrade = Math.max(...data.map((d) => d.averageGrade), 100);
  const getColor = (value: number): string => {
    const normalized = Math.min(value / maxGrade, 1);
    if (normalized < 0.3) return '#fee5e5';
    if (normalized < 0.5) return '#ffb3b3';
    if (normalized < 0.7) return '#ff8080';
    if (normalized < 0.85) return '#ff6666';
    return '#ff3333';
  };

  const dataMap = new Map<string, Map<string | number, number>>();
  uniqueCourses.forEach((course) => {
    dataMap.set(course, new Map());
  });

  data.forEach((point) => {
    const courseMap = dataMap.get(point.course);
    if (courseMap) {
      courseMap.set(point.week, point.averageGrade);
    }
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
                {language === 'el' ? 'Μάθημα' : 'Course'}
              </th>
              {uniqueWeeks.map((week) => (
                <th
                  key={week}
                  className="border border-gray-200 bg-gray-50 px-3 py-2 text-center font-semibold text-gray-700"
                >
                  {language === 'el' ? `Εβδ. ${week}` : `W${week}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueCourses.map((course) => (
              <tr key={course}>
                <td className="border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-900">
                  {course}
                </td>
                {uniqueWeeks.map((week) => {
                  const courseMap = dataMap.get(course);
                  const value = courseMap?.get(week) ?? 0;
                  const color = getColor(value);
                  return (
                    <td
                      key={`${course}-${week}`}
                      className="border border-gray-200 px-3 py-2 text-center"
                      style={{ backgroundColor: color }}
                      title={`${course} - ${language === 'el' ? `Εβδομάδα ${week}` : `Week ${week}`}: ${value.toFixed(1)}%`}
                    >
                      <span className="font-semibold text-gray-900">{value > 0 ? value.toFixed(0) : '-'}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Sankey Diagram - Shows student flow through outcomes (Pass/Fail/Incomplete)
 */
export interface SankeyDataPoint {
  source: string;
  target: string;
  value: number;
}

interface StudentSankeyProps {
  data: SankeyDataPoint[];
  title?: string;
  height?: number;
}

export const StudentProgressionSankey: React.FC<StudentSankeyProps> = ({
  data,
  title,
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  const nodes = new Map<string, number>();
  let nodeIndex = 0;

  data.forEach((link) => {
    if (!nodes.has(link.source)) {
      nodes.set(link.source, nodeIndex++);
    }
    if (!nodes.has(link.target)) {
      nodes.set(link.target, nodeIndex++);
    }
  });

  const nodeArray = Array.from(nodes.entries()).sort((a, b) => a[1] - b[1]).map(([name]) => ({ name }));

  const links = data.map((d) => ({
    source: nodes.get(d.source) ?? 0,
    target: nodes.get(d.target) ?? 0,
    value: d.value,
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <Sankey data={{ nodes: nodeArray, links }} node={{ fill: '#8884d8' }} link={{ stroke: '#d1d5db' }} nodePadding={50}>
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            formatter={(value) => {
              return typeof value === 'number' ? `${value} ${language === 'el' ? 'φοιτητές' : 'students'}` : String(value);
            }}
          />
        </Sankey>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>{language === 'el' ? 'Επιτυχία' : 'Pass'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>{language === 'el' ? 'Αποτυχία' : 'Fail'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span>{language === 'el' ? 'Ημιτελής' : 'Incomplete'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Treemap - Shows hierarchical performance data (Division > Class > Metric)
 */
export interface TreemapDataPoint {
  name: string;
  value?: number;
  fill?: string;
  children?: TreemapDataPoint[];
}

interface PerformanceTreemapProps {
  data: TreemapDataPoint[];
  title?: string;
  height?: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

/**
 * Box Plot - Shows distribution analysis (quartiles, median, outliers)
 */
export interface BoxPlotDataPoint {
  name: string;
  q1: number;
  q2: number;
  q3: number;
  min: number;
  max: number;
  mean: number;
}

interface GradeDistributionBoxPlotProps {
  data: BoxPlotDataPoint[];
  title?: string;
  height?: number;
}

export const GradeDistributionBoxPlot: React.FC<GradeDistributionBoxPlotProps> = ({
  data,
  title,
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  const minValue = Math.min(...data.map((d) => d.min));
  const maxValue = Math.max(...data.map((d) => d.max));
  const range = maxValue - minValue;
  const padding = range * 0.05;

  const yMin = Math.max(0, minValue - padding);
  const yMax = Math.min(100, maxValue + padding);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <svg width="100%" height={height} viewBox={`0 0 ${Math.max(data.length * 80 + 100, 600)} ${height}`}>
        <defs>
          <style>{`
            .box-plot-line { stroke: #6366f1; stroke-width: 2; }
            .box-plot-box { fill: #c7d2fe; stroke: #6366f1; stroke-width: 2; }
            .box-plot-median { stroke: #dc2626; stroke-width: 3; }
            .box-plot-mean { stroke: #059669; stroke-width: 1.5; stroke-dasharray: 3,3; }
            .box-plot-label { font-size: 12px; text-anchor: middle; }
            .box-plot-tick-label { font-size: 10px; text-anchor: middle; }
          `}</style>
        </defs>

        {/* Y-axis */}
        <line x1="40" y1="20" x2="40" y2={height - 40} className="box-plot-line" />

        {/* X-axis */}
        <line x1="40" y1={height - 40} x2={Math.max(data.length * 80 + 50, 600)} y2={height - 40} className="box-plot-line" />

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - 40 - ((value - yMin) / (yMax - yMin)) * (height - 60);
          return (
            <g key={`y-${value}`}>
              <line x1="35" y1={y} x2="40" y2={y} className="box-plot-line" />
              <text x="30" y={y + 4} className="box-plot-tick-label" textAnchor="end">
                {value}
              </text>
            </g>
          );
        })}

        {/* Box plots */}
        {data.map((item, index) => {
          const x = 80 + index * 80;
          const boxWidth = 40;

          const yScale = (val: number) => height - 40 - ((val - yMin) / (yMax - yMin)) * (height - 60);

          const minY = yScale(item.min);
          const q1Y = yScale(item.q1);
          const q2Y = yScale(item.q2);
          const q3Y = yScale(item.q3);
          const maxY = yScale(item.max);
          const meanY = yScale(item.mean);

          return (
            <g key={`box-${index}`}>
              {/* Whiskers */}
              <line x1={x} y1={minY} x2={x} y2={maxY} className="box-plot-line" strokeOpacity="0.5" />
              <line x1={x - 5} y1={minY} x2={x + 5} y2={minY} className="box-plot-line" />
              <line x1={x - 5} y1={maxY} x2={x + 5} y2={maxY} className="box-plot-line" />

              {/* Box */}
              <rect
                x={x - boxWidth / 2}
                y={Math.min(q1Y, q3Y)}
                width={boxWidth}
                height={Math.abs(q3Y - q1Y)}
                className="box-plot-box"
              />

              {/* Median line */}
              <line
                x1={x - boxWidth / 2}
                y1={q2Y}
                x2={x + boxWidth / 2}
                y2={q2Y}
                className="box-plot-median"
              />

              {/* Mean line */}
              <line
                x1={x - boxWidth / 2}
                y1={meanY}
                x2={x + boxWidth / 2}
                y2={meanY}
                className="box-plot-mean"
              />

              {/* Label */}
              <text x={x} y={height - 20} className="box-plot-label">
                {item.name.substring(0, 10)}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${Math.max(data.length * 80 + 50, 600) - 180}, 30)`}>
          <rect x="0" y="0" width="180" height="80" fill="white" stroke="#d1d5db" strokeWidth="1" />
          <line x1="10" y1="15" x2="30" y2="15" className="box-plot-median" />
          <text x="40" y="20" className="box-plot-tick-label" textAnchor="start">
            {language === 'el' ? 'Διάμεσος' : 'Median'}
          </text>
          <line x1="10" y1="35" x2="30" y2="35" className="box-plot-mean" />
          <text x="40" y="40" className="box-plot-tick-label" textAnchor="start">
            {language === 'el' ? 'Μέσος' : 'Mean'}
          </text>
          <rect x="10" y="50" width="20" height="20" className="box-plot-box" />
          <text x="40" y="65" className="box-plot-tick-label" textAnchor="start">
            {language === 'el' ? 'Q1-Q3' : 'Quartiles'}
          </text>
        </g>
      </svg>
    </div>
  );
};

export const PerformanceTreemap: React.FC<PerformanceTreemapProps> = ({
  data,
  title,
  height = 400,
}) => {
  const { language } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
          <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
        </div>
      </div>
    );
  }

  const enrichWithColors = (node: TreemapDataPoint, colorIndex: number = 0): TreemapDataPoint => {
    return {
      ...node,
      fill: COLORS[colorIndex % COLORS.length],
      children: node.children?.map((child, idx) => enrichWithColors(child, colorIndex + idx)),
    };
  };

  const dataWithColors = data.map((node, idx) => enrichWithColors(node, idx));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={dataWithColors}
          dataKey="value"
          stroke="#fff"
          fill="#8884d8"
          isAnimationActive={true}
        >
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            formatter={(value) => {
              return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value);
            }}
          />
        </Treemap>
      </ResponsiveContainer>
      <p className="mt-3 text-xs text-slate-500">
        {language === 'el'
          ? 'Το μέγεθος εκπροσωπεί την απόδοση. Τα χρώματα διαφοροποιούν τις κατηγορίες.'
          : 'Box size represents performance. Colors differentiate categories.'}
      </p>
    </div>
  );
};
