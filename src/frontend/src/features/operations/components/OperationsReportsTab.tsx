import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export interface OperationsReportsTabProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  studentIdParam: string | null;
  courseIdParam: string | null;
}

const OperationsReportsTab = ({ t, studentIdParam, courseIdParam }: OperationsReportsTabProps) => {
  const reportIcons = {
    list: t('icons.list', { ns: 'customReports', defaultValue: '📋' }),
    create: t('icons.create', { ns: 'customReports', defaultValue: '✏️' }),
    templates: t('icons.templates', { ns: 'customReports', defaultValue: '📚' }),
    students: t('icons.students', { ns: 'customReports', defaultValue: '👥' }),
    courses: t('icons.courses', { ns: 'customReports', defaultValue: '📚' }),
    grades: t('icons.grades', { ns: 'customReports', defaultValue: '⭐' }),
    attendance: t('icons.attendance', { ns: 'customReports', defaultValue: '✅' }),
    enrollments: t('icons.enrollments', { ns: 'customReports', defaultValue: '📊' }),
    formatPdf: t('icons.formatPdf', { ns: 'customReports', defaultValue: '📄' }),
    formatExcel: t('icons.formatExcel', { ns: 'customReports', defaultValue: '📊' }),
    formatCsv: t('icons.formatCsv', { ns: 'customReports', defaultValue: '📋' }),
    analytics: t('icons.analytics', { ns: 'customReports', defaultValue: '📊' }),
  };

  const buildTemplateLink = (params: { report_type?: string; format?: string; query?: string; tab?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.tab) queryParams.set('tab', params.tab);
    if (params.report_type) queryParams.set('report_type', params.report_type);
    if (params.format) queryParams.set('format', params.format);
    if (params.query) queryParams.set('query', params.query);
    if (studentIdParam && Number.isFinite(Number(studentIdParam))) {
      queryParams.set('studentId', studentIdParam);
    }
    if (courseIdParam && Number.isFinite(Number(courseIdParam))) {
      queryParams.set('courseId', courseIdParam);
    }
    const queryString = queryParams.toString();
    return `/operations/reports/templates${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
        <div className="mb-6 flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('customReports', { ns: 'customReports' })}</h2>
            <p className="text-sm text-slate-600">{t('helpDragFields', { ns: 'customReports' })}</p>
          </div>
        </div>

        {/* Reports Menu Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* View All Reports */}
          <Link
            to="/operations/reports"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.list}</div>
              <h3 className="font-semibold text-slate-900">{t('viewAll', { ns: 'customReports' })}</h3>
            </div>
            <p className="text-xs text-slate-600">{t('myReports', { ns: 'customReports' })}</p>
          </Link>

          {/* Create New Report */}
          <Link
            to="/operations/reports/builder"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.create}</div>
              <h3 className="font-semibold text-slate-900">{t('createNew', { ns: 'customReports' })}</h3>
            </div>
            <p className="text-xs text-slate-600">{t('reportBuilder', { ns: 'customReports' })}</p>
          </Link>

          {/* Browse Templates */}
          <Link
            to="/operations/reports/templates"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{reportIcons.templates}</div>
              <h3 className="font-semibold text-slate-900">{t('templates', { ns: 'customReports' })}</h3>
            </div>
            <p className="text-xs text-slate-600">{t('standardTemplates', { ns: 'customReports' })}</p>
          </Link>
        </div>

        {/* Report Types Submenu */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('entityType', { ns: 'customReports' })}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              to={buildTemplateLink({ report_type: 'student' })}
              className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
            >
              <div className="text-lg font-bold text-indigo-600">{reportIcons.students}</div>
              <p className="text-xs font-medium text-slate-700">{t('entity_students', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'course' })}
              className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
            >
              <div className="text-lg font-bold text-indigo-600">{reportIcons.courses}</div>
              <p className="text-xs font-medium text-slate-700">{t('entity_courses', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'grade' })}
              className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
            >
              <div className="text-lg font-bold text-indigo-600">{reportIcons.grades}</div>
              <p className="text-xs font-medium text-slate-700">{t('entity_grades', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'attendance' })}
              className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
            >
              <div className="text-lg font-bold text-indigo-600">{reportIcons.attendance}</div>
              <p className="text-xs font-medium text-slate-700">{t('entity_attendance', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'student', query: 'enrollment' })}
              className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
            >
              <div className="text-lg font-bold text-indigo-600">{reportIcons.enrollments}</div>
              <p className="text-xs font-medium text-slate-700">{t('entity_enrollments', { ns: 'customReports' })}</p>
            </Link>
          </div>
        </div>

        {/* Output Formats Submenu */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('outputFormat', { ns: 'customReports' })}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              to={buildTemplateLink({ format: 'pdf' })}
              className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
            >
              <p className="text-lg font-bold text-indigo-600">{reportIcons.formatPdf}</p>
              <p className="text-xs font-medium text-slate-700">{t('format_pdf', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ format: 'excel' })}
              className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
            >
              <p className="text-lg font-bold text-indigo-600">{reportIcons.formatExcel}</p>
              <p className="text-xs font-medium text-slate-700">{t('format_excel', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ format: 'csv' })}
              className="rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
            >
              <p className="text-lg font-bold text-indigo-600">{reportIcons.formatCsv}</p>
              <p className="text-xs font-medium text-slate-700">{t('format_csv', { ns: 'customReports' })}</p>
            </Link>
          </div>
        </div>

        {/* Analytics Templates */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('analyticsTemplates', { ns: 'customReports' })}</h3>
          <Link
            to={`/operations/reports/templates?tab=analytics`}
            className="inline-flex items-center gap-3 rounded-lg border-2 border-orange-200 bg-white px-6 py-4 transition hover:border-orange-400 hover:bg-orange-50"
          >
            <p className="text-2xl">{reportIcons.analytics}</p>
            <div className="text-left">
              <p className="font-semibold text-slate-900">{t('analyticsTemplates', { ns: 'customReports' })}</p>
              <p className="text-xs text-slate-600">{t('viewAnalyticsTemplates', { ns: 'customReports' })}</p>
            </div>
            <span className="ml-auto text-orange-600 font-semibold">→</span>
          </Link>
        </div>

        {/* Performance Breakdown Exports */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 uppercase tracking-wide">
            {t('performanceBreakdownExports', { ns: 'customReports' })}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={buildTemplateLink({ report_type: 'grade', query: 'Performance Breakdown', tab: 'analytics' })}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                  {reportIcons.grades}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {t('performanceBreakdownGrades', { ns: 'customReports' })}
                </p>
              </div>
              <p className="text-xs text-slate-600">{t('performanceBreakdownGradesDesc', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'attendance', query: 'Performance Audit', tab: 'analytics' })}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                  {reportIcons.attendance}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {t('performanceBreakdownAttendance', { ns: 'customReports' })}
                </p>
              </div>
              <p className="text-xs text-slate-600">{t('performanceBreakdownAttendanceDesc', { ns: 'customReports' })}</p>
            </Link>
            <Link
              to={buildTemplateLink({ report_type: 'daily_performance', query: 'Daily Performance', tab: 'analytics' })}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">
                  {reportIcons.analytics}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {t('performanceBreakdownDailyPerformance', { ns: 'customReports' })}
                </p>
              </div>
              <p className="text-xs text-slate-600">{t('performanceBreakdownDailyPerformanceDesc', { ns: 'customReports' })}</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsReportsTab;
