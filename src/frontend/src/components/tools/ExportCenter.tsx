import { useState, useEffect, useRef, useMemo, useCallback, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Download, FileText, Users, Calendar, Book, TrendingUp, Briefcase, ChevronDown, ChevronUp, type LucideProps } from 'lucide-react';
import { Trans } from 'react-i18next';
import { useLanguage } from '../../LanguageContext';
import apiClient, { coursesAPI } from '../../api/api';
import type { OperationsLocationState } from '@/features/operations/types';
import type { Course as CourseType } from '@/types';
import SessionExportImport from './SessionExportImport';
import PrintableCalendarSheet from './PrintableCalendarSheet';
import {
  DEFAULT_CALENDAR_LAYOUT,
  WEEKDAY_CONFIG,
  buildCalendarDraft,
  type CalendarLayoutOptions,
  type EditableCalendarSession,
} from './printableSchedule';

interface ExportCenterProps {
  variant?: 'standalone' | 'embedded';
}

type ExportFormat = {
  key: string;
  label: string;
  endpoint?: string;
  filename?: string;
  disabled?: boolean;
};

type ExportSingleOption = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<LucideProps>;
  color: string;
  onClick?: () => void;
  formatLabel: string;
  endpoint?: string;
  filename?: string;
  disabled?: boolean;
};

type ExportModuleOption = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<LucideProps>;
  color: string;
  formats: ExportFormat[];
};

const ExportCenter = ({ variant = 'standalone' }: ExportCenterProps) => {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [showCalendarReview, setShowCalendarReview] = useState(false);
  const [calendarDraft, setCalendarDraft] = useState<EditableCalendarSession[]>([]);
  const [calendarLayout, setCalendarLayout] = useState<CalendarLayoutOptions>(DEFAULT_CALENDAR_LAYOUT);
  const [expandedExportCardId, setExpandedExportCardId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    exportCards: false,
    sessionExport: false,
    reportsHub: false,
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  // Map of refs for each export card
  const exportCardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const location = useLocation();
  const locationState = (location.state ?? {}) as OperationsLocationState;
  const { scrollTo } = locationState;
  const { hash } = location;
  const reportShortcutParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const studentId = params.get('studentId');
    const courseId = params.get('courseId');
    const filtered = new URLSearchParams();
    if (studentId && Number.isFinite(Number(studentId))) {
      filtered.set('studentId', studentId);
    }
    if (courseId && Number.isFinite(Number(courseId))) {
      filtered.set('courseId', courseId);
    }
    return filtered;
  }, [location.search]);
  // Scroll/focus export card if navigated with scrollTo or hash
  useEffect(() => {
    let scrollToId = scrollTo;
    if (!scrollToId && hash) {
      const normalizedHash = hash.replace('#', '');
      // Accept both id and id with dashes/underscores
      scrollToId = normalizedHash;
    }
    if (scrollToId && exportCardRefs.current[scrollToId]) {
      setTimeout(() => {
        const ref = exportCardRefs.current[scrollToId];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ref.focus?.();
        }
      }, 200);
    }
  }, [hash, scrollTo]);
  const printCalendar = useReactToPrint({
    contentRef: calendarRef,
  });
  const performanceBreakdownLink = useMemo(() => {
    const params = new URLSearchParams(reportShortcutParams);
    params.set('templateName', 'Student Performance Breakdown - Grades');
    const queryString = params.toString();
    return `/operations/reports/builder${queryString ? `?${queryString}` : ''}`;
  }, [reportShortcutParams]);

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const coursesData = await coursesAPI.getAll(0, 1000);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast(t('failedToLoadData'), 'error');
      setCourses([]);
    }
  }, [t, showToast]);


  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExport = async (endpoint: string, filename: string, exportType: string) => {
    setLoading(prev => ({ ...prev, [exportType]: true }));

    try {
      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
        headers: {
          'Accept-Language': language || 'en',
        },
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(t('downloading'), 'success');
    } catch {
      showToast(t('failedToLoadData'), 'error');
    } finally {
      setLoading(prev => ({ ...prev, [exportType]: false }));
    }
  };

  const handleOpenCalendarReview = () => {
    setCalendarDraft(buildCalendarDraft(courses));
    setCalendarLayout(DEFAULT_CALENDAR_LAYOUT);
    setShowCalendarReview(true);
  };

  useEffect(() => {
    if (showCalendarReview && calendarDraft.length === 0 && courses.length > 0) {
      setCalendarDraft(buildCalendarDraft(courses));
    }
  }, [calendarDraft.length, courses, showCalendarReview]);


  const handleExportCalendarCsv = () => {
    const getDayLabel = (day: string) => {
      const match = WEEKDAY_CONFIG.find((entry) => entry.key === day);
      return match ? t(match.labelKey) : day;
    };
    const header = [
      t('printCalendarDay'),
      t('printCalendarCourseCode'),
      t('printCalendarCourseName'),
      t('printCalendarStart'),
      t('printCalendarEnd'),
      t('printCalendarDuration'),
      t('printCalendarPeriods'),
      t('printCalendarLocation')
    ];
    const rows = calendarDraft.map((session) => [
      getDayLabel(session.day),
      session.courseCode || '',
      session.courseName || '',
      session.start,
      session.end,
      String(session.duration),
      String(session.periods),
      session.location || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const csvWithBom = `\uFEFF${csv}`;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendar_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const exportSingles: ExportSingleOption[] = [
    {
      id: 'print-calendar',
      title: t('printCalendar'),
      description: t('printCalendarDesc'),
      icon: Calendar,
      color: 'from-indigo-500 to-indigo-700',
      onClick: handleOpenCalendarReview,
      formatLabel: t('exportToPrint'),
    },
  ];

  const exportModules: ExportModuleOption[] = [
    {
      id: 'students',
      title: t('studentsListExcel'),
      description: t('exportAllStudents'),
      icon: Users,
      color: 'from-blue-500 to-blue-700',
      formats: [
        { key: 'pdf', label: t('exportToPDF'), endpoint: '/export/students/pdf', filename: 'students.pdf' },
        { key: 'xlsx', label: t('exportToExcel'), endpoint: '/export/students/excel', filename: 'students.xlsx' },
        { key: 'csv', label: t('exportToCSV'), endpoint: '/export/students/csv', filename: 'students.csv' },
      ],
    },
    {
      id: 'courses',
      title: t('coursesListExcel'),
      description: t('exportAllCourses'),
      icon: Book,
      color: 'from-purple-500 to-purple-700',
      formats: [
        { key: 'pdf', label: t('exportToPDF'), endpoint: '/export/courses/pdf', filename: 'courses.pdf' },
        { key: 'xlsx', label: t('exportToExcel'), endpoint: '/export/courses/excel', filename: 'courses.xlsx' },
        { key: 'csv', label: t('exportToCSV'), endpoint: '/export/courses/csv', filename: 'courses.csv' },
      ],
    },
    {
      id: 'attendance',
      title: t('attendanceRecordsExcel'),
      description: t('exportAllAttendance'),
      icon: Calendar,
      color: 'from-cyan-500 to-cyan-700',
      formats: [
        { key: 'pdf', label: t('exportToPDF'), endpoint: '/export/attendance/pdf', filename: 'attendance.pdf' },
        { key: 'xlsx', label: t('exportToExcel'), endpoint: '/export/attendance/excel', filename: 'attendance.xlsx' },
        { key: 'csv', label: t('exportToCSV'), endpoint: '/export/attendance/csv', filename: 'attendance.csv' },
      ],
    },
    {
      id: 'all-grades',
      title: t('allGradesExcel'),
      description: t('exportAllGrades'),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-700',
      formats: [
        { key: 'pdf', label: t('exportToPDF'), endpoint: '/export/grades/pdf', filename: 'all_grades.pdf' },
        { key: 'xlsx', label: t('exportToExcel'), endpoint: '/export/grades/excel', filename: 'all_grades.xlsx' },
        { key: 'csv', label: t('exportToCSV'), endpoint: '/export/grades/csv', filename: 'all_grades.csv' },
      ],
    },
    {
      id: 'enrollments',
      title: t('enrollmentsExcel'),
      description: t('exportEnrollments'),
      icon: Briefcase,
      color: 'from-teal-500 to-teal-700',
      formats: [
        { key: 'pdf', label: t('exportToPDF'), endpoint: '/export/enrollments/pdf', filename: 'enrollments.pdf' },
        { key: 'xlsx', label: t('exportToExcel'), endpoint: '/export/enrollments/excel', filename: 'enrollments.xlsx' },
        { key: 'csv', label: t('exportToCSV'), endpoint: '/export/enrollments/csv', filename: 'enrollments.csv' },
      ],
    },
  ];

  const isEmbedded = variant === 'embedded';
  const wrapperClass = isEmbedded
    ? 'space-y-10'
    : 'min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8';
  const contentClass = isEmbedded ? 'space-y-10' : 'max-w-7xl mx-auto space-y-10';

  return (
    <div className={wrapperClass}>
      {/* Print Calendar Modal/Section */}
      {showCalendarReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t('printCalendarReviewTitle')}</h2>
                <p className="text-sm text-slate-600">{t('printCalendarReviewSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarReview(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">
                {t('printCalendarCustomizeTitle')}
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showHeader}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showHeader: e.target.checked }))}
                  />
                  {t('printCalendarShowHeader')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showSummary}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showSummary: e.target.checked }))}
                  />
                  {t('printCalendarShowSummary')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showGeneratedOn}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showGeneratedOn: e.target.checked }))}
                  />
                  {t('printCalendarShowGeneratedOn')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showLegend}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showLegend: e.target.checked }))}
                  />
                  {t('printCalendarShowLegend')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showFooter}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showFooter: e.target.checked }))}
                  />
                  {t('printCalendarShowFooter')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calendarLayout.showDayCardBackground}
                    onChange={(e) => setCalendarLayout((prev) => ({ ...prev, showDayCardBackground: e.target.checked }))}
                  />
                  {t('printCalendarShowDayCardBackground')}
                </label>
                <label className="flex flex-col gap-1">
                  <span>{t('printCalendarStylePreset')}</span>
                  <select
                    className="rounded border border-slate-200 bg-white px-2 py-1"
                    value={calendarLayout.stylePreset}
                    onChange={(e) =>
                      setCalendarLayout((prev) => ({ ...prev, stylePreset: e.target.value as CalendarLayoutOptions['stylePreset'] }))
                    }
                  >
                    <option value="classic">{t('printCalendarStyleClassic')}</option>
                    <option value="minimal">{t('printCalendarStyleMinimal')}</option>
                    <option value="bold">{t('printCalendarStyleBold')}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div ref={calendarRef}>
                <PrintableCalendarSheet
                  courses={courses}
                  t={t}
                  language={language}
                  scheduleOverride={calendarDraft}
                  layoutOptions={calendarLayout}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => printCalendar && printCalendar()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {t('exportToPDF')}
              </button>
              <button
                type="button"
                onClick={handleExportCalendarCsv}
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {t('exportToCSV')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print trigger for react-to-print is handled by useReactToPrint hook */}
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
          {toast.message}
        </div>
      )}

  <div className={contentClass}>
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50 to-purple-50 p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">{t('exportCenter')}</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{t('exportCenter')}</h1>
              <p className="text-base text-slate-700 max-w-3xl">{t('downloadYourData')}</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl w-fit">
              <Download className="text-white" size={28} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur">
          <div className="border-b border-slate-100 px-6 py-5">
            <button
              type="button"
              onClick={() => setExpandedSections((prev) => ({ ...prev, exportCards: !prev.exportCards }))}
              className="w-full flex items-center justify-between"
            >
              <span className="text-lg font-semibold text-slate-900">{t('exportCenter')}</span>
              {expandedSections.exportCards ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {expandedSections.exportCards && (
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exportSingles.map(option => (
                  <div
                    key={option.id}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                    ref={(el) => {
                      exportCardRefs.current[option.id] = el;
                    }}
                    tabIndex={-1}
                  >
                    <div className={`bg-gradient-to-br ${option.color} p-4 rounded-xl w-fit mb-4`}>
                      <option.icon className="text-white" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{option.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                    <button
                      onClick={
                        option.onClick ??
                        (() => {
                          if (option.endpoint && option.filename) {
                            handleExport(option.endpoint, option.filename, option.id);
                          }
                        })
                      }
                      disabled={loading[option.id]}
                      className={`w-full bg-gradient-to-r ${option.color} text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2`}
                    >
                      {loading[option.id] ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{t('exporting')}</span>
                        </>
                      ) : (
                        <>
                          <Download size={20} />
                          <span>{option.formatLabel}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
                {exportModules.map((module) => (
                  <div
                    key={module.id}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                    ref={(el) => {
                      exportCardRefs.current[module.id] = el;
                    }}
                    tabIndex={-1}
                  >
                    <div className={`bg-gradient-to-br ${module.color} p-4 rounded-xl w-fit mb-4`}>
                      <module.icon className="text-white" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{module.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                    <button
                      onClick={() =>
                        setExpandedExportCardId((prev) => (prev === module.id ? null : module.id))
                      }
                      className={`w-full bg-gradient-to-r ${module.color} text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-center space-x-2`}
                    >
                      <Download size={20} />
                      <span>{expandedExportCardId === module.id ? t('hideFormats') : t('chooseFormat')}</span>
                    </button>
                    {expandedExportCardId === module.id && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {module.formats.map((format) => {
                          const exportKey = `${module.id}-${format.key}`;
                          const isDisabled = format.disabled || !format.endpoint;
                          return (
                            <button
                              key={exportKey}
                              onClick={() =>
                                !isDisabled && handleExport(format.endpoint!, format.filename!, exportKey)
                              }
                              disabled={isDisabled || loading[exportKey]}
                              title={isDisabled ? t('exportFormatUnavailable') : undefined}
                              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                isDisabled
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-800 text-white hover:bg-slate-900'
                              }`}
                            >
                              {format.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur">
          <div className="border-b border-slate-100 px-6 py-5">
            <button
              type="button"
              onClick={() => setExpandedSections((prev) => ({ ...prev, sessionExport: !prev.sessionExport }))}
              className="w-full flex items-center justify-between"
            >
              <span className="text-lg font-semibold text-slate-900">{t('sessionExportImport')}</span>
              {expandedSections.sessionExport ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {expandedSections.sessionExport && (
            <div className="px-6 py-5">
              <SessionExportImport t={t} showToast={showToast} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur">
          <div className="border-b border-slate-100 px-6 py-5">
            <button
              type="button"
              onClick={() => setExpandedSections((prev) => ({ ...prev, reportsHub: !prev.reportsHub }))}
              className="w-full flex items-center justify-between"
            >
              <span className="text-lg font-semibold text-slate-900">{t('reportsHubTitle')}</span>
              {expandedSections.reportsHub ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {expandedSections.reportsHub && (
            <div className="px-6 py-5">
              <p className="text-gray-600 mb-6">{t('reportsHubDescription')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  to="/operations/reports"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                      <FileText size={18} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{t('openReports')}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{t('openReportsDesc')}</p>
                </Link>
                <Link
                  to="/operations/reports/templates"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                      <Download size={18} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{t('browseTemplates')}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{t('browseTemplatesDesc')}</p>
                </Link>
                <Link
                  to="/operations/reports/templates?tab=analytics"
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                      <TrendingUp size={18} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{t('browseAnalytics')}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{t('browseAnalyticsDesc')}</p>
                </Link>
                <Link
                  to={performanceBreakdownLink}
                  className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                      <FileText size={18} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{t('performanceBreakdownShortcut')}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{t('performanceBreakdownShortcutDesc')}</p>
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-100 to-purple-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('exportTipsHeader')} {t('exportTips')}</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span><Trans i18nKey="exportTipExcel" components={{ b: <b /> }} /></span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span><Trans i18nKey="exportTipPDF" components={{ b: <b /> }} /></span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span><Trans i18nKey="exportTipStudentReports" components={{ b: <b /> }} /></span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span>{t('exportTipTimestamp')}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ExportCenter;
