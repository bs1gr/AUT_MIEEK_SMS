import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Download, FileText, FileSpreadsheet, Users, Calendar, FileCheck, Book, TrendingUp, Award, Briefcase, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { studentsAPI, coursesAPI } from '../../api/api';
import type { OperationsLocationState } from '@/features/operations/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


interface Student {
  id: number | string;
  student_id: string;
  first_name: string;
  last_name: string;
  [key: string]: any;
}

interface ExportCenterProps {
  variant?: 'standalone' | 'embedded';
}

const ExportCenter = ({ variant = 'standalone' }: ExportCenterProps) => {
  const { t, language } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [showPrintCalendar, setShowPrintCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  // Map of refs for each export card
  const exportCardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const location = useLocation();
  const locationState = (location.state ?? {}) as OperationsLocationState;
  const { scrollTo } = locationState;
  const { hash } = location;
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
    onAfterPrint: () => setShowPrintCalendar(false),
    // removeAfterPrint: true, // not supported in this version
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, coursesData] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll(0, 1000)  // Request up to 1000 courses
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast(t('failedToLoadData'), 'error');
      setStudents([]);
      setCourses([]);
    }
  };

  const showToast = (message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = async (endpoint: string, filename: string, exportType: string) => {
    setLoading(prev => ({ ...prev, [exportType]: true }));

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Accept-Language': language || 'en',
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(t('downloading'), 'success');
    } catch (error) {
      showToast(t('failedToLoadData'), 'error');
    } finally {
      setLoading(prev => ({ ...prev, [exportType]: false }));
    }
  };

  const handlePrintCalendar = () => {
    setShowPrintCalendar(true);
    setTimeout(() => {
      printCalendar && printCalendar();
    }, 100);
  };

  const exportOptions = [
    {
      id: 'print-calendar',
      title: t('printCalendar'),
      description: t('printCalendarDesc'),
      icon: Calendar,
      color: 'from-indigo-500 to-indigo-700',
      onClick: handlePrintCalendar,
      format: 'Print'
    },
    {
      id: 'students-csv',
      title: t('studentsListCSV'),
      description: t('exportAllStudentsCSV'),
      icon: Users,
      color: 'from-yellow-500 to-yellow-600',
      endpoint: '/export/students/csv',
      filename: 'students.csv',
      format: 'CSV'
    },
    {
      id: 'all-data-zip',
      title: t('exportAllDataZIP'),
      description: t('exportAllDataDescription'),
      icon: Download,
      color: 'from-gray-500 to-gray-700',
      endpoint: '/export/all/zip',
      filename: 'all_data.zip',
      format: 'ZIP'
    },
    {
      id: 'students-excel',
      title: t('studentsListExcel'),
      description: t('exportAllStudents'),
      icon: Users,
      color: 'from-green-500 to-green-600',
      endpoint: '/export/students/excel',
      filename: 'students.xlsx',
      format: 'Excel'
    },
    {
      id: 'students-pdf',
      title: t('studentsDirectoryPDF'),
      description: t('exportStudentDirectory'),
      icon: Users,
      color: 'from-red-500 to-red-600',
      endpoint: '/export/students/pdf',
      filename: 'students.pdf',
      format: 'PDF'
    },
    {
      id: 'courses-excel',
      title: t('coursesListExcel'),
      description: t('exportAllCourses'),
      icon: Book,
      color: 'from-purple-500 to-purple-600',
      endpoint: '/export/courses/excel',
      filename: 'courses.xlsx',
      format: 'Excel'
    },
    {
      id: 'courses-pdf',
      title: t('coursesCatalogPDF'),
      description: t('exportCourseCatalog'),
      icon: Book,
      color: 'from-indigo-500 to-indigo-600',
      endpoint: '/export/courses/pdf',
      filename: 'courses.pdf',
      format: 'PDF'
    },
    {
      id: 'attendance-excel',
      title: t('attendanceRecordsExcel'),
      description: t('exportAllAttendance'),
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
      endpoint: '/export/attendance/excel',
      filename: 'attendance.xlsx',
      format: 'Excel'
    },
    {
      id: 'attendance-analytics-excel',
      title: t('attendanceAnalyticsExcel'),
      description: t('exportAttendanceAnalytics'),
      icon: BarChart3,
      color: 'from-slate-600 to-indigo-700',
      endpoint: '/export/attendance/analytics/excel',
      filename: 'attendance_analytics.xlsx',
      format: 'Excel'
    },
    {
      id: 'all-grades-excel',
      title: t('allGradesExcel'),
      description: t('exportAllGrades'),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      endpoint: '/export/grades/excel',
      filename: 'all_grades.xlsx',
      format: 'Excel'
    },
    {
      id: 'enrollments-excel',
      title: t('enrollmentsExcel'),
      description: t('exportEnrollments'),
      icon: Briefcase,
      color: 'from-cyan-500 to-cyan-600',
      endpoint: '/export/enrollments/excel',
      filename: 'enrollments.xlsx',
      format: 'Excel'
    },
    {
      id: 'performance-excel',
      title: t('dailyPerformanceExcel'),
      description: t('exportDailyPerformance'),
      icon: Award,
      color: 'from-amber-500 to-amber-600',
      endpoint: '/export/performance/excel',
      filename: 'daily_performance.xlsx',
      format: 'Excel'
    },
    {
      id: 'highlights-excel',
      title: t('highlightsExcel'),
      description: t('exportHighlights'),
      icon: Award,
      color: 'from-pink-500 to-pink-600',
      endpoint: '/export/highlights/excel',
      filename: 'highlights.xlsx',
      format: 'Excel'
    }
  ];

  const isEmbedded = variant === 'embedded';
  const wrapperClass = isEmbedded
    ? 'space-y-8'
    : 'min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8';
  const contentClass = isEmbedded ? 'space-y-8' : 'max-w-7xl mx-auto';

  return (
    <div className={wrapperClass}>
      {/* Print Calendar Modal/Section */}
      {showPrintCalendar && (
        <div className="print-calendar-hidden">
          <div ref={calendarRef}>
            <PrintableCalendarSheet courses={courses} t={t} language={language} />
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
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl">
            <Download className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('exportCenter')}</h1>
            <p className="text-gray-600">{t('downloadYourData')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {exportOptions.map(option => (
            <div
              key={option.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              ref={(el) => {
                exportCardRefs.current[option.id] = el;
              }}
              tabIndex={0}
            >
              <div className={`bg-gradient-to-br ${option.color} p-4 rounded-xl w-fit mb-4`}>
                <option.icon className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{option.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{option.description}</p>
              {option.id === 'print-calendar' ? (
                <button
                  onClick={option.onClick}
                  disabled={loading[option.id]}
                  className={`w-full bg-gradient-to-r ${option.color} text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2`}
                >
                  <Download size={20} />
                  <span>{t('exportTo' + option.format)}</span>
                </button>
              ) : (
                <button
                  onClick={option.onClick ? option.onClick : () => handleExport(option.endpoint!, option.filename!, option.id)}
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
                      <span>{t('exportTo' + option.format)}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <FileCheck size={24} className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">{t('individualStudentReports')}</h2>
          </div>
          <p className="text-gray-600 mb-6">{t('generateComprehensive')}</p>

          {/* DEBUG: Show number of students loaded */}
          <div className="mb-2 text-xs text-gray-500">{`Loaded students: ${students.length}`}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.length === 0 ? (
              <div className="col-span-2 text-center text-gray-400 py-8">{t('noStudentsFound')}</div>
            ) : (
              students.map(student => (
                <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-600">{student.student_id}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {/* Grades (Excel) */}
                      <button
                        onClick={() => handleExport(
                          `/export/grades/excel/${student.id}`,
                          `grades_${student.student_id}.xlsx`,
                          `grades-${student.id}`
                        )}
                        disabled={loading[`grades-${student.id}`]}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportGrades') + ' (Excel)'}
                      >
                        <FileSpreadsheet size={20} />
                      </button>
                      {/* Attendance (Excel) */}
                      <button
                        onClick={() => handleExport(
                          `/export/attendance/excel/${student.id}`,
                          `attendance_${student.student_id}.xlsx`,
                          `attendance-${student.id}`
                        )}
                        disabled={loading[`attendance-${student.id}`]}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportAttendance') + ' (Excel)'}
                      >
                        <Calendar size={20} />
                      </button>
                      {/* Daily Performance (Excel) */}
                      <button
                        onClick={() => handleExport(
                          `/export/performance/excel/${student.id}`,
                          `performance_${student.student_id}.xlsx`,
                          `performance-${student.id}`
                        )}
                        disabled={loading[`performance-${student.id}`]}
                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportPerformance') + ' (Excel)'}
                      >
                        <TrendingUp size={20} />
                      </button>
                      {/* Highlights (Excel) */}
                      <button
                        onClick={() => handleExport(
                          `/export/highlights/excel/${student.id}`,
                          `highlights_${student.student_id}.xlsx`,
                          `highlights-${student.id}`
                        )}
                        disabled={loading[`highlights-${student.id}`]}
                        className="p-2 text-pink-600 hover:bg-pink-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportHighlights') + ' (Excel)'}
                      >
                        <Award size={20} />
                      </button>
                      {/* Enrollments (Excel) */}
                      <button
                        onClick={() => handleExport(
                          `/export/enrollments/excel/${student.id}`,
                          `enrollments_${student.student_id}.xlsx`,
                          `enrollments-${student.id}`
                        )}
                        disabled={loading[`enrollments-${student.id}`]}
                        className="p-2 text-cyan-600 hover:bg-cyan-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportEnrollments') + ' (Excel)'}
                      >
                        <Briefcase size={20} />
                      </button>
                      {/* Full Report (PDF) */}
                      <button
                        onClick={() => handleExport(
                          `/export/student-report/pdf/${student.id}`,
                          `report_${student.student_id}.pdf`,
                          `report-${student.id}`
                        )}
                        disabled={loading[`report-${student.id}`]}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('exportReport') + ' (PDF)'}
                      >
                        <FileText size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp size={24} className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">{t('courseAnalyticsReports')}</h2>
          </div>
          <p className="text-gray-600 mb-6">{t('generateCourseAnalytics')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map(course => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                      {course.course_code ? course.course_code.substring(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{course.course_code} - {course.course_name}</p>
                      <p className="text-sm text-gray-600">{course.semester || t('na')} | {course.credits || 0} {t('credits')}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleExport(
                        `/export/analytics/course/${course.id}/pdf`,
                        `course_analytics_${course.course_code}.pdf`,
                        `course-analytics-${course.id}`
                      )}
                      disabled={loading[`course-analytics-${course.id}`]}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                      title={t('exportCourseAnalytics') + ' (PDF)'}
                    >
                      <FileText size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl p-6 border border-indigo-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('exportTipsHeader')} {t('exportTips')}</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipExcel') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipPDF') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipStudentReports') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>{t('exportTipTimestamp')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

type PrintableSession = {
  courseId: number | string;
  courseName: string;
  courseCode?: string;
  start: string;
  end: string;
  duration: number;
  periods: number;
  location?: string;
};

interface PrintableCalendarSheetProps {
  courses?: any[];
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
}

const WEEKDAY_CONFIG: Array<{ key: string; labelKey: string }> = [
  { key: 'Monday', labelKey: 'monday' },
  { key: 'Tuesday', labelKey: 'tuesday' },
  { key: 'Wednesday', labelKey: 'wednesday' },
  { key: 'Thursday', labelKey: 'thursday' },
  { key: 'Friday', labelKey: 'friday' },
];

const PrintableCalendarSheet = ({ courses = [], t, language }: PrintableCalendarSheetProps) => {
  const scheduleByDay = useMemo(() => buildPrintableSchedule(courses), [courses]);
  const totalSessions = useMemo(
    () => Object.values(scheduleByDay).reduce((sum, sessions) => sum + sessions.length, 0),
    [scheduleByDay]
  );
  const scheduledCourseCount = useMemo(() => {
    const ids = new Set<string | number>();
    Object.values(scheduleByDay).forEach((sessions) => {
      sessions.forEach((session) => ids.add(session.courseId));
    });
    return ids.size;
  }, [scheduleByDay]);
  const generatedOn = useMemo(
    () => new Intl.DateTimeFormat(language || 'en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
    [language]
  );

  return (
    <div className="print-calendar-sheet">
      <header className="print-calendar-sheet__header">
        <div>
          <p className="print-calendar-sheet__title">{t('printCalendarSheetTitle')}</p>
          <p className="print-calendar-sheet__subtitle">{t('printCalendarSheetSubtitle')}</p>
        </div>
        <div className="print-calendar-sheet__meta">
          <div className="print-calendar-sheet__meta-block">
            <span className="print-calendar-sheet__meta-label">{t('printCalendarSummary')}</span>
            <p className="print-calendar-sheet__meta-value">{t('printCalendarCoursesCount', { count: scheduledCourseCount })}</p>
            <p className="print-calendar-sheet__meta-sub">{t('printCalendarSessionsCount', { count: totalSessions })}</p>
          </div>
          <div className="print-calendar-sheet__meta-block">
            <span className="print-calendar-sheet__meta-label">
              {t('printCalendarGeneratedOn', { date: generatedOn })}
            </span>
          </div>
        </div>
      </header>

      <section className="print-calendar-sheet__legend">
        <h3>{t('printCalendarLegend')}</h3>
        <div className="print-calendar-sheet__legend-items">
          <span>
            {t('printCalendarLegendDurationLabel')}: {t('printCalendarLegendDurationHint')}
          </span>
          <span>
            {t('printCalendarLegendPeriodsLabel')}: {t('printCalendarLegendPeriodsHint')}
          </span>
          <span>{t('printCalendarLegendNote')}</span>
        </div>
      </section>

      <section className="print-calendar-sheet__grid">
        {WEEKDAY_CONFIG.map((dayConfig) => {
          const sessions = scheduleByDay[dayConfig.key] || [];
          return (
            <div key={dayConfig.key} className="print-calendar-sheet__day">
              <div className="print-calendar-sheet__day-header">
                <span>{t(dayConfig.labelKey)}</span>
                <span>
                  {sessions.length} {sessions.length === 1 ? t('class') : t('classes')}
                </span>
              </div>
              {sessions.length === 0 ? (
                <p className="print-calendar-sheet__empty">{t('printCalendarNoClassesDay')}</p>
              ) : (
                <ul className="print-calendar-sheet__sessions">
                  {sessions.map((session, idx) => (
                    <li key={`${session.courseId}-${dayConfig.key}-${idx}`} className="print-calendar-sheet__session">
                      <div className="print-calendar-sheet__session-title">
                        <span>
                          {session.courseCode ? `${session.courseCode} · ${session.courseName}` : session.courseName}
                        </span>
                        <span>
                          {session.start} – {session.end}
                        </span>
                      </div>
                      <div className="print-calendar-sheet__session-meta">
                        <span>
                          {t('printCalendarLegendDurationLabel')}: {session.duration * session.periods} {t('minutes')}
                        </span>
                        <span>
                          {t('printCalendarLegendPeriodsLabel')}: {session.periods}
                        </span>
                        {session.location && <span>{session.location}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <footer className="print-calendar-sheet__footer">{t('printCalendarFooterNote')}</footer>
    </div>
  );
};

const buildPrintableSchedule = (courses: any[]): Record<string, PrintableSession[]> => {
  const schedule = WEEKDAY_CONFIG.reduce<Record<string, PrintableSession[]>>((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {} as Record<string, PrintableSession[]>);

  (Array.isArray(courses) ? courses : []).forEach((course) => {
    const entries = extractScheduleEntries(course?.teaching_schedule);
    entries.forEach(({ day, data }) => {
      if (!schedule[day]) return;
      const start = normalizeTimeString(data?.start_time);
      const duration = Number(data?.duration) || 45;
      const periods = Number(data?.periods) || 1;
      schedule[day].push({
        courseId: course?.id ?? `${course?.course_code || course?.course_name}-${day}`,
        courseName: course?.course_name || course?.name || '',
        courseCode: course?.course_code || '',
        start,
        end: calculateEndTime(start, periods, duration),
        duration,
        periods,
        location: data?.location || course?.location || course?.room || '',
      });
    });
  });

  Object.keys(schedule).forEach((day) => {
    schedule[day].sort((a, b) => (a.start > b.start ? 1 : -1));
  });

  return schedule;
};

const extractScheduleEntries = (schedule: any): Array<{ day: string; data: any }> => {
  const entries: Array<{ day: string; data: any }> = [];
  if (!schedule) return entries;

  const pushEntry = (day?: string, data?: any) => {
    if (!day) return;
    entries.push({ day, data: data || {} });
  };

  if (Array.isArray(schedule)) {
    schedule.forEach((entry) => pushEntry(entry?.day, entry));
  } else if (schedule && typeof schedule === 'object') {
    Object.entries(schedule).forEach(([day, cfg]) => pushEntry(day, cfg));
  }

  return entries;
};

const normalizeTimeString = (value?: string): string => {
  if (!value || typeof value !== 'string') {
    return '08:00';
  }
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? '0');
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '08:00';
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const calculateEndTime = (start: string, periods: number, duration: number): string => {
  const [hoursRaw, minutesRaw] = start.split(':');
  const startHour = Number(hoursRaw);
  const startMinute = Number(minutesRaw);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
    return start;
  }
  const startMinutes = startHour * 60 + startMinute;
  const totalMinutes = startMinutes + periods * duration;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export default ExportCenter;
