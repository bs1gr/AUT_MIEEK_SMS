import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Download, FileText, FileSpreadsheet, Users, Calendar, FileCheck, Book, TrendingUp, Award, Briefcase } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { studentsAPI, coursesAPI } from '../../api/api';
import CalendarView from '@/features/calendar/components/CalendarView';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


interface Student {
  id: number | string;
  student_id: string;
  first_name: string;
  last_name: string;
  [key: string]: any;
}

const ExportCenter = () => {
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
  // Scroll/focus export card if navigated with scrollTo or hash
  useEffect(() => {
    let scrollToId = location.state && location.state.scrollTo;
    if (!scrollToId && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      // Accept both id and id with dashes/underscores
      scrollToId = hash;
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
  }, [location]);
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
        coursesAPI.getAll()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Print Calendar Modal/Section */}
      {showPrintCalendar && (
        <div className="print-calendar-hidden">
          <div ref={calendarRef}>
            <CalendarView courses={courses} />
          </div>
        </div>
      )}
      {/* Print trigger for react-to-print is handled by useReactToPrint hook */}
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
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
              ref={el => (exportCardRefs.current[option.id] = el)}
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

export default ExportCenter;
