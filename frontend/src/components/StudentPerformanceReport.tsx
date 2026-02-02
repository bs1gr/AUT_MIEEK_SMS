import { useState } from 'react';
import { useLanguage } from '../LanguageContext';
// @ts-expect-error - JavaScript API file
import { reportsAPI } from '../api/api';

// TypeScript interfaces for report data
interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  attendance_rate: number;
  unexcused_absences: number;
}

interface GradeSummary {
  total_assignments: number;
  average_grade: number;
  average_percentage: number;
  highest_grade: number;
  lowest_grade: number;
  grade_trend: string;
}

interface PerformanceCategory {
  category: string;
  score: number;
  max_score: number;
  notes?: string;
}

interface CourseDetail {
  course_code: string;
  course_title: string;
  attendance?: AttendanceSummary;
  grades?: GradeSummary;
  performance_categories?: PerformanceCategory[];
}

interface Highlight {
  date: string;
  category: string;
  description: string;
}

interface ReportData {
  student_name: string;
  student_email: string;
  report_period: string;
  start_date: string;
  end_date: string;
  overall_attendance?: AttendanceSummary;
  overall_grades?: GradeSummary;
  courses?: CourseDetail[];
  highlights?: Highlight[];
  recommendations?: string[];
}

interface ReportConfig {
  period: string;
  startDate: string | null;
  endDate: string | null;
  courseIds: number[];
  includeAttendance: boolean;
  includeGrades: boolean;
  includePerformance: boolean;
  includeHighlights: boolean;
  format: string;
}

interface StudentPerformanceReportProps {
  studentId: number;
  onClose?: () => void;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    const detail = response?.data?.detail;
    if (detail) {
      return detail;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

/**
 * StudentPerformanceReport Component
 *
 * Generates comprehensive performance reports for students including:
 * - Attendance summary
 * - Grade statistics
 * - Course-by-course breakdown
 * - Performance trends
 * - Recommendations
 */
const StudentPerformanceReport: React.FC<StudentPerformanceReportProps> = ({ studentId, onClose }) => {
  const langContext = useLanguage();
  console.log('StudentPerformanceReport mounted with language:', langContext.language);

  // Wrapper for translation that supports both namespace format and legacy format
  const t = (key: string, options?: { ns?: string; [key: string]: unknown }): string => {
    if (options?.ns) {
      // Convert to prefixed format: reports:key -> reports.key
      const fullKey = `${options.ns}.${key}`;
      const result = langContext.t(fullKey, { ...options, ns: undefined });
      console.log(`Translation: ${fullKey} [${langContext.language}] => ${result}`);
      return result;
    }
    return langContext.t(key, options);
  };
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courseNotes, setCourseNotes] = useState<Record<string, string>>({});

  // Report configuration
  const [config, setConfig] = useState<ReportConfig>({
    period: 'semester',
    startDate: null,
    endDate: null,
    courseIds: [],
    includeAttendance: true,
    includeGrades: true,
    includePerformance: true,
    includeHighlights: true,
    format: 'json'
  });

  // Generate report
  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const reportRequest = {
        student_id: studentId,
        period: config.period,
        start_date: config.startDate,
        end_date: config.endDate,
        course_ids: config.courseIds.length > 0 ? config.courseIds : undefined,
        include_attendance: config.includeAttendance,
        include_grades: config.includeGrades,
        include_performance: config.includePerformance,
        include_highlights: config.includeHighlights,
        format: config.format,
        language: langContext.language
      };
      const response = await reportsAPI.generateStudentReport(reportRequest);
      setReport(response.data);
      setCourseNotes({});
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('error', { ns: 'reports' }) || 'Error generating report'));
    } finally {
      setLoading(false);
    }
  };

  // Download report in PDF/CSV format
  const handleDownloadReport = async (format: 'pdf' | 'csv') => {
    setLoading(true);
    setError(null);
    try {
      const reportRequest = {
        student_id: studentId,
        period: config.period,
        start_date: config.startDate,
        end_date: config.endDate,
        course_ids: config.courseIds.length > 0 ? config.courseIds : undefined,
        include_attendance: config.includeAttendance,
        include_grades: config.includeGrades,
        include_performance: config.includePerformance,
        include_highlights: config.includeHighlights,
        format: format,
        language: langContext.language
      };
      const response = await reportsAPI.downloadStudentReport(reportRequest);

      // Create blob from response
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_performance_${studentId}_${config.period}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('downloadError', { ns: 'reports' }) || 'Download failed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle configuration changes
  const handleConfigChange = <K extends keyof ReportConfig>(field: K, value: ReportConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions for UI styling
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <span className="text-green-600">&uarr;</span>;
      case 'declining':
        return <span className="text-red-600">&darr;</span>;
      case 'stable':
        return <span className="text-blue-600">&rarr;</span>;
      default:
        return null;
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReportPeriodLabel = (period: string) => {
    const key = `reports.period_${period}`;
    const translated = t(key);
    return translated === key ? period : translated;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">{t('studentPerformanceReport', { ns: 'reports' })}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Configuration Panel */}
          {!report && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-3">{t('configuration', { ns: 'reports' })}</h3>

              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('period', { ns: 'reports' })}
                </label>
                <select
                  value={config.period}
                  onChange={(e) => handleConfigChange('period', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={t('period', { ns: 'reports' })}
                >
                  <option value="week">{t('period_week', { ns: 'reports' })}</option>
                  <option value="month">{t('period_month', { ns: 'reports' })}</option>
                  <option value="semester">{t('period_semester', { ns: 'reports' })}</option>
                  <option value="year">{t('period_year', { ns: 'reports' })}</option>
                  <option value="custom">{t('period_custom', { ns: 'reports' })}</option>
                </select>
              </div>

              {/* Date Range (for custom period) */}
              {config.period === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('startDate', { ns: 'reports' })}
                    </label>
                    <input
                      type="date"
                      value={config.startDate || ''}
                      onChange={(e) => handleConfigChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={t('startDate', { ns: 'reports' })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('endDate', { ns: 'reports' })}
                    </label>
                    <input
                      type="date"
                      value={config.endDate || ''}
                      onChange={(e) => handleConfigChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={t('endDate', { ns: 'reports' })}
                    />
                  </div>
                </div>
              )}

              {/* Include Options */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('includeData', { ns: 'reports' })}
                </label>
                <div className="space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeAttendance}
                      onChange={(e) => handleConfigChange('includeAttendance', e.target.checked)}
                      className="mr-2"
                    />
                    {t('includeAttendance', { ns: 'reports' })}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeGrades}
                      onChange={(e) => handleConfigChange('includeGrades', e.target.checked)}
                      className="mr-2"
                    />
                    {t('includeGrades', { ns: 'reports' })}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includePerformance}
                      onChange={(e) => handleConfigChange('includePerformance', e.target.checked)}
                      className="mr-2"
                    />
                    {t('includePerformance', { ns: 'reports' })}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeHighlights}
                      onChange={(e) => handleConfigChange('includeHighlights', e.target.checked)}
                      className="mr-2"
                    />
                    {t('includeHighlights', { ns: 'reports' })}
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? t('generating', { ns: 'reports' }) : t('generate', { ns: 'reports' })}
              </button>

              {/* Download Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadReport('pdf')}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {loading ? '...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => handleDownloadReport('csv')}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {loading ? '...' : 'Download CSV'}
                </button>
              </div>

              {error && (
                <div className="mt-2 text-red-600 text-sm">{error}</div>
              )}
            </div>
          )}

          {/* Report Display */}
          {report && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{report.student_name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">{t('email', { ns: 'reports' })}:</span>
                    <p className="font-medium">{report.student_email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('period', { ns: 'reports' })}:</span>
                    <p className="font-medium">{getReportPeriodLabel(report.report_period)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('startDate', { ns: 'reports' })}:</span>
                    <p className="font-medium">{report.start_date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('endDate', { ns: 'reports' })}:</span>
                    <p className="font-medium">{report.end_date}</p>
                  </div>
                </div>
              </div>

              {/* Overall Attendance */}
              {report.overall_attendance && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">{t('attendanceSummary', { ns: 'reports' })}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">{t('attendanceRate', { ns: 'reports' })}:</span>
                      <span className={`font-bold ${getAttendanceColor(report.overall_attendance.attendance_rate)}`}>
                        {report.overall_attendance.attendance_rate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('totalDays', { ns: 'reports' })}:</span>
                      <span>{report.overall_attendance.total_days}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('present', { ns: 'reports' })}:</span>
                      <span className="text-green-600">{report.overall_attendance.present}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('absent', { ns: 'reports' })}:</span>
                      <span className="text-red-600">{report.overall_attendance.absent}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('unexcusedAbsences', { ns: 'reports' })}:</span>
                      <span className="text-red-600 font-medium">{report.overall_attendance.unexcused_absences}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall Grades */}
              {report.overall_grades && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">{t('gradesSummary', { ns: 'reports' })}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 mr-1">{t('averageGrade', { ns: 'reports' })}:</span>
                      <span className={`font-bold ${getGradeColor(report.overall_grades.average_percentage)}`}>
                        {report.overall_grades.average_percentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 mr-1">{t('totalAssignments', { ns: 'reports' })}:</span>
                      <span>{report.overall_grades.total_assignments}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 mr-1">{t('highestGrade', { ns: 'reports' })}:</span>
                      <span className="text-green-600">{report.overall_grades.highest_grade}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 mr-1">{t('lowestGrade', { ns: 'reports' })}:</span>
                      <span className="text-red-600">{report.overall_grades.lowest_grade}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{t('trend', { ns: 'reports' })}:</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(report.overall_grades.grade_trend)}
                        <span>{t(`trend_${report.overall_grades.grade_trend}`, { ns: 'reports' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Course Breakdown */}
              {report.courses && report.courses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">{t('courseBreakdown', { ns: 'reports' })}</h3>
                  {report.courses.map((course, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">
                        {course.course_code}: {course.course_title}
                      </h4>

                      <div className="mb-3">
                        <label className="block text-sm text-gray-600 mb-1">
                          {t('courseNotes', { ns: 'reports' })}
                        </label>
                        <textarea
                          value={courseNotes[course.course_code] ?? ''}
                          onChange={(e) =>
                            setCourseNotes(prev => ({
                              ...prev,
                              [course.course_code]: e.target.value
                            }))
                          }
                          placeholder={t('courseNotesPlaceholder', { ns: 'reports' })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Course Attendance */}
                      {course.attendance && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600">{t('attendance', { ns: 'reports' })}:</p>
                          <p className={`text-sm font-medium ${getAttendanceColor(course.attendance.attendance_rate)}`}>
                            {t('attendanceRateValue', {
                              ns: 'reports',
                              rate: course.attendance.attendance_rate,
                              present: course.attendance.present,
                              total: course.attendance.total_days,
                            })}
                          </p>
                        </div>
                      )}

                      {/* Course Grades */}
                      {course.grades && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600">{t('grades', { ns: 'reports' })}:</p>
                          <p className={`text-sm font-medium ${getGradeColor(course.grades.average_percentage)}`}>
                            {course.grades.average_percentage}% {getTrendIcon(course.grades.grade_trend)}
                          </p>
                        </div>
                      )}

                      {/* Performance Categories */}
                      {course.performance_categories && course.performance_categories.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">{t('performanceCategories', { ns: 'reports' })}:</p>
                          <div className="space-y-1">
                            {course.performance_categories.map((perf, perfIdx) => (
                              <div key={perfIdx} className="text-sm">
                                <span className="font-medium">{perf.category}:</span> {perf.score}/{perf.max_score}
                                {perf.notes && <span className="text-gray-500 ml-2">({perf.notes})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">{t('recommendations', { ns: 'reports' })}</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {report.recommendations.map((rec, idx) => {
                      // Handle translation keys from backend
                      // Format: "namespace:key" or "namespace:key||interpolationData"
                      if (rec.includes(':')) {
                        const [nsKey, interpolationData] = rec.split('||');
                        const [ns, key] = nsKey.split(':');

                        if (interpolationData) {
                          // Has interpolation data (e.g., course names)
                          // For reports namespace, we pass the data to i18n context function
                          const translated = t(`${ns}.${key}`, { courses: interpolationData });
                          return (
                            <li key={idx}>{translated}</li>
                          );
                        } else {
                          // Simple translation key - use namespace.key format
                          const translated = t(`${ns}.${key}`);
                          return (
                            <li key={idx}>{translated}</li>
                          );
                        }
                      }
                      // Fallback for old format (hardcoded text)
                      return <li key={idx}>{rec}</li>;
                    })}
                  </ul>
                </div>
              )}

              {/* Highlights */}
              {report.highlights && report.highlights.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">{t('highlights', { ns: 'reports' })}</h3>
                  <div className="space-y-2">
                    {report.highlights.map((highlight, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{highlight.date}</span>
                        <span className="mx-2">•</span>
                        <span className="text-blue-600">{highlight.category}</span>
                        <span className="mx-2">•</span>
                        <span>{highlight.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  {t('print', { ns: 'reports' })}
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  {t('newReport', { ns: 'reports' })}
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {t('close', { ns: 'common' })}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceReport;
