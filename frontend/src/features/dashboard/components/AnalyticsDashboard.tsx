import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/LanguageContext';
import { useDashboardData, useStudentAnalytics } from '@/api/hooks/useAnalytics';
import {
  PerformanceChart,
  GradeDistributionChart,
  AttendanceChart,
  TrendChart,
  StatsPieChart,
  type PerformanceDataPoint,
  type GradeDistributionData,
  type AttendanceData,
  type TrendData,
  type PieChartData,
} from './AnalyticsCharts';
import { Users, BookOpen, TrendingUp, Calendar } from 'lucide-react';

/**
 * Summary Card Component
 */
interface SummaryCardProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  unit?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, label, value, unit }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center rounded-lg bg-indigo-100 p-3">
        <Icon size={24} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {value}
          {unit && <span className="ml-1 text-sm text-gray-600">{unit}</span>}
        </p>
      </div>
    </div>
  </div>
);

/**
 * Analytics Dashboard Page
 */
export const AnalyticsDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'semester'>('semester');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  const { dashboard, isLoading, error, refetch } = useDashboardData();

  // Generate mock data for visualization (will be replaced with actual API data)
  const performanceData = useMemo<PerformanceDataPoint[]>(() => {
    return [
      { date: 'Jan 1', course: 'Math', grade: 85, trend: 85 },
      { date: 'Jan 8', course: 'Math', grade: 87, trend: 86 },
      { date: 'Jan 15', course: 'Math', grade: 90, trend: 87 },
      { date: 'Jan 22', course: 'Math', grade: 88, trend: 88 },
      { date: 'Jan 29', course: 'Math', grade: 92, trend: 89 },
    ];
  }, []);

  const gradeDistributionData = useMemo<GradeDistributionData[]>(() => {
    return [
      { grade: 'A', count: 45, percentage: 30 },
      { grade: 'B', count: 60, percentage: 40 },
      { grade: 'C', count: 30, percentage: 20 },
      { grade: 'D', count: 10, percentage: 7 },
      { grade: 'F', count: 5, percentage: 3 },
    ];
  }, []);

  const attendanceData = useMemo<AttendanceData[]>(() => {
    return [
      { course: 'Mathematics', rate: 95, present: 19, absent: 1 },
      { course: 'English', rate: 90, present: 18, absent: 2 },
      { course: 'Science', rate: 88, present: 17, absent: 3 },
      { course: 'History', rate: 92, present: 18, absent: 2 },
    ];
  }, []);

  const trendData = useMemo<TrendData[]>(() => {
    return [
      { week: 1, average: 80 },
      { week: 2, average: 82 },
      { week: 3, average: 84 },
      { week: 4, average: 86 },
      { week: 5, average: 88 },
      { week: 6, average: 87 },
      { week: 7, average: 89 },
      { week: 8, average: 91 },
    ];
  }, []);

  const pieChartData = useMemo<PieChartData[]>(() => {
    return [
      { name: language === 'el' ? 'Ενεργοί' : 'Active', value: 142 },
      { name: language === 'el' ? 'Αδρανείς' : 'Inactive', value: 8 },
    ];
  }, [language]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            {language === 'el' ? 'Σφάλμα κατά τη φόρτωση δεδομένων' : 'Error loading analytics data'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            {language === 'el' ? 'Προσπαθήστε ξανά' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'el' ? 'Analytics Dashboard' : 'Analytics Dashboard'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'el'
              ? 'Δείτε αναλυτικά δεδομένα σχετικά με τη σχολική απόδοση'
              : 'View detailed analytics about academic performance'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        {dashboard && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Users}
              label={language === 'el' ? 'Σύνολο μαθητών' : 'Total Students'}
              value={dashboard.total_students}
            />
            <SummaryCard
              icon={BookOpen}
              label={language === 'el' ? 'Σύνολο μαθημάτων' : 'Total Courses'}
              value={dashboard.total_courses}
            />
            <SummaryCard
              icon={TrendingUp}
              label={language === 'el' ? 'Μέσος όρος βαθμών' : 'Average Grade'}
              value={dashboard.average_grade.toFixed(2)}
              unit="%"
            />
            <SummaryCard
              icon={Calendar}
              label={language === 'el' ? 'Μέση παρουσία' : 'Average Attendance'}
              value={dashboard.average_attendance.toFixed(2)}
              unit="%"
            />
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {language === 'el' ? 'Περίοδος' : 'Time Period'}
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'semester')}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="week">{language === 'el' ? 'Εβδομάδα' : 'Week'}</option>
              <option value="month">{language === 'el' ? 'Μήνας' : 'Month'}</option>
              <option value="semester">{language === 'el' ? 'Εξάμηνο' : 'Semester'}</option>
            </select>
          </div>
        </div>

        {/* Charts Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 h-12 w-12" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Row 1: Performance & Distribution */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <PerformanceChart
                data={performanceData}
                title={language === 'el' ? 'Απόδοση μαθητή' : 'Student Performance'}
                height={350}
              />
              <GradeDistributionChart
                data={gradeDistributionData}
                title={language === 'el' ? 'Κατανομή βαθμών' : 'Grade Distribution'}
                height={350}
              />
            </div>

            {/* Row 2: Attendance & Trend */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <AttendanceChart
                data={attendanceData}
                title={language === 'el' ? 'Ποσοστό παρουσίας' : 'Attendance Rate'}
                height={350}
              />
              <TrendChart
                data={trendData}
                title={language === 'el' ? 'Τάση απόδοσης' : 'Performance Trend'}
                height={350}
              />
            </div>

            {/* Row 3: Overview */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <StatsPieChart
                data={pieChartData}
                title={language === 'el' ? 'Κατάσταση μαθητών' : 'Student Status'}
                height={350}
              />
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {language === 'el' ? 'Σύντομη ανάφορα' : 'Quick Report'}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">{language === 'el' ? 'Ενεργοί μαθητές:' : 'Active Students:'}</span>{' '}
                    142/150
                  </p>
                  <p>
                    <span className="font-medium">{language === 'el' ? 'Μέσος βαθμός:' : 'Average Grade:'}</span>{' '}
                    {dashboard?.average_grade.toFixed(2)}%
                  </p>
                  <p>
                    <span className="font-medium">
                      {language === 'el' ? 'Μέση παρουσία:' : 'Average Attendance:'}
                    </span>{' '}
                    {dashboard?.average_attendance.toFixed(2)}%
                  </p>
                  <p>
                    <span className="font-medium">{language === 'el' ? 'Συνολικοί βαθμοί:' : 'Total Grades:'}</span>{' '}
                    {dashboard?.total_grades}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            {language === 'el' ? 'Ανανέωση' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            {language === 'el' ? 'Πίσω' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
