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
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
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
            formatter={(value: number) => value.toFixed(1)}
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
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
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
            formatter={(value: number) => value}
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
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
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
            formatter={(value: number) => `${value.toFixed(1)}%`}
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
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
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
            formatter={(value: number) => value.toFixed(1)}
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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-gray-500">{language === 'el' ? 'Δεν υπάρχουν δεδομένα' : 'No data available'}</p>
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
            label={({ name, value, percent }) =>
              `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
