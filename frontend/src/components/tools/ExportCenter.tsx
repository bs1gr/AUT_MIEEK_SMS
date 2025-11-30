import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Download, FileText, FileSpreadsheet, Users, Calendar, FileCheck, Book, TrendingUp, Award, Briefcase, BarChart3, Database, Upload } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { studentsAPI, coursesAPI, sessionAPI } from '../../api/api';
import type { OperationsLocationState } from '@/features/operations/types';
import type { Student as StudentType, Course as CourseType } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


type Student = StudentType;

interface ExportCenterProps {
  variant?: 'standalone' | 'embedded';
}

// Session Export/Import Component
interface SessionExportImportProps {
  t: (key: string) => string;
  showToast: (message: string, type?: string) => void;
}

const SessionExportImport = ({ t, showToast }: SessionExportImportProps) => {
  // const { language } = useLanguage();
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'update' | 'skip'>('update');
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [exportingSession, setExportingSession] = useState(false);
  const [importingSession, setImportingSession] = useState(false);
  const [validatingImport, setValidatingImport] = useState(false);
  type ImportValidationResult = {
    validation_passed?: boolean;
    errors?: unknown[];
    total_errors?: number;
    summary?: Record<string, { created?: number; updated?: number; errors?: unknown[] }>;
    [key: string]: unknown;
  } | null;

  const [validationResult, setValidationResult] = useState<ImportValidationResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSemesters = useCallback(async () => {
    setLoadingSemesters(true);
    try {
      const data: unknown = await sessionAPI.listSemesters();
      const list = Array.isArray(data)
        ? (data as string[])
        : ((data as { semesters?: string[] })?.semesters || (data as { list?: string[] })?.list || []);
      setSemesters(list);
      if (list && list.length > 0) setSelectedSemester(list[0]);
    } catch (error) {
      console.error('Failed to load semesters:', error);
      showToast(t('failedToLoadSemesters'), 'error');
    } finally {
      setLoadingSemesters(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  const handleExportSession = async () => {
    if (!selectedSemester) {
      showToast(t('selectSemester'), 'error');
      return;
    }

    setExportingSession(true);
    try {
      // The sessionAPI returns the raw Blob for exports
      const blob = await sessionAPI.exportSession(selectedSemester);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // No headers are available when the API client returns a raw Blob, so
      // fall back to a sensible default filename.
      const filename = `session_export_${selectedSemester.replace(/\s+/g, '_')}.json`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(t('sessionExportSuccess'), 'success');
    } catch (error) {
      console.error('Session export failed:', error);
      showToast(t('sessionExportFailed'), 'error');
    } finally {
      setExportingSession(false);
    }
  };

  const handleImportSession = async () => {
    if (!selectedFile) {
      showToast(t('selectFile'), 'error');
      return;
    }

    setImportingSession(true);
    try {
      const result = await sessionAPI.importSession(selectedFile, mergeStrategy);
      
      // Show summary
        const summary = (result as { summary?: Record<string, { created?: number; updated?: number; errors?: unknown[] }> }).summary || {};
      const totalCreated = Object.values(summary).reduce((sum: number, item: { created?: number }) => sum + (item.created || 0), 0);
      const totalUpdated = Object.values(summary).reduce((sum: number, item: { updated?: number }) => sum + (item.updated || 0), 0);
      const totalErrors = Object.values(summary).reduce((sum: number, item: { errors?: unknown[] }) => sum + ((item.errors?.length as number) || 0), 0);

      if (typeof totalErrors === 'number' && totalErrors > 0) {
        showToast(`${t('sessionImportSuccess')} (${t('created')}: ${totalCreated}, ${t('updated')}: ${totalUpdated}, ${t('errors')}: ${totalErrors})`, 'warning');
      } else {
        showToast(`${t('sessionImportSuccess')} (${t('created')}: ${totalCreated}, ${t('updated')}: ${totalUpdated})`, 'success');
      }
      
      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload semesters in case new ones were added
      loadSemesters();
    } catch (error: unknown) {
      console.error('Session import failed:', error);
      const err = error as { response?: { data?: { detail?: string } } } | undefined;
      const errorMsg = err?.response?.data?.detail || t('sessionImportFailed');
      showToast(errorMsg, 'error');
    } finally {
      setImportingSession(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setValidationResult(null); // Clear previous validation
    }
  };

  const handleValidateImport = async () => {
    if (!selectedFile) {
      showToast(t('selectFile'), 'error');
      return;
    }

    setValidatingImport(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await sessionAPI.importSession(selectedFile, mergeStrategy, true); // dry_run=true
      setValidationResult(response);
      
      if (response.validation_passed) {
        showToast(t('validationPassed'), 'success');
      }
    } catch (error: unknown) {
      console.error('Validation failed:', error);
      const err = error as { response?: { data?: { context?: { validation_errors?: unknown[]; total_errors?: number } } ; detail?: string } } | undefined;
      const errorData = err?.response?.data;
      
      if (errorData?.context?.validation_errors) {
        setValidationResult({
          validation_passed: false,
          errors: errorData.context.validation_errors,
          total_errors: errorData.context.total_errors
        });
        showToast(t('validationFailed', { count: errorData.context.total_errors }), 'error');
      } else {
        showToast(errorData?.detail || t('sessionImportFailed'), 'error');
      }
    } finally {
      setValidatingImport(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center space-x-2 mb-6">
        <Database size={24} className="text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">{t('sessionExportImport')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Session */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-xl">
              <Download className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('exportCompleteSession')}</h3>
              <p className="text-sm text-gray-600">{t('exportSessionDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectSemester')}
              </label>
              {loadingSemesters ? (
                <div className="text-sm text-gray-500">{t('loadingSemesters')}</div>
              ) : semesters.length === 0 ? (
                <div className="text-sm text-gray-500">{t('noSemestersFound')}</div>
              ) : (
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label={t('selectSemester')}
                >
                  <option value="">{t('chooseSemester')}</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleExportSession}
              disabled={exportingSession || !selectedSemester || semesters.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {exportingSession ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('exportingSession')}</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>{t('exportSession')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Session */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-3 rounded-xl">
              <Upload className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('importSession')}</h3>
              <p className="text-sm text-gray-600">{t('importSessionDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectFile')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                aria-label={t('selectFile')}
                title={t('chooseSessionFile')}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  📄 {selectedFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('mergeStrategy')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeStrategy"
                    value="update"
                    checked={mergeStrategy === 'update'}
                    onChange={(e) => setMergeStrategy(e.target.value as 'update' | 'skip')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">
                    <strong>{t('updateExisting')}</strong> - {t('updateExistingDesc')}
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeStrategy"
                    value="skip"
                    checked={mergeStrategy === 'skip'}
                    onChange={(e) => setMergeStrategy(e.target.value as 'update' | 'skip')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">
                    <strong>{t('skipExisting')}</strong> - {t('skipExistingDesc')}
                  </span>
                </label>
              </div>
            </div>

            {/* Validation Result Display */}
            {validationResult && (
              <div className={`p-4 rounded-lg ${validationResult.validation_passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {validationResult.validation_passed ? (
                  <div>
                    <div className="flex items-center space-x-2 text-green-800 font-semibold mb-2">
                      <span>✅</span>
                      <span>{t('validationPassed')}</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <p>{t('readyToImport')}</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>{validationResult.counts?.courses || 0} {t('courses')}</li>
                        <li>{validationResult.counts?.students || 0} {t('students')}</li>
                        <li>{validationResult.counts?.grades || 0} {t('grades')}</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2 text-red-800 font-semibold mb-2">
                      <span>❌</span>
                      <span>{t('validationFailed', { count: Number(validationResult.total_errors || 0) })}</span>
                    </div>
                    <div className="text-sm text-red-700 max-h-40 overflow-y-auto">
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.errors?.slice(0, 10).map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {validationResult.errors?.length > 10 && (
                          <li className="font-semibold">{t('andMoreErrors', { count: validationResult.errors.length - 10 })}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleValidateImport}
                disabled={validatingImport || !selectedFile}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {validatingImport ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('validating')}</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>{t('validate')}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleImportSession}
                disabled={importingSession || !selectedFile || (validationResult && !validationResult.validation_passed)}
                className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {importingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('importingSession')}</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>{t('importSessionButton')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Safety Note */}
            <div className="text-xs text-gray-500 italic">
              {t('validationTip')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExportCenter = ({ variant = 'standalone' }: ExportCenterProps) => {
  const { t, language } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);
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

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
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
  }, [t, showToast]);

  
  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    } catch {
      showToast(t('failedToLoadData'), 'error');
    } finally {
      setLoading(prev => ({ ...prev, [exportType]: false }));
    }
  };

  const handlePrintCalendar = () => {
    setShowPrintCalendar(true);
    setTimeout(() => {
      if (printCalendar) printCalendar();
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
              tabIndex={-1}
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

        {/* Session Export/Import Section */}
        <SessionExportImport t={t} showToast={showToast} />

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <FileCheck size={24} className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">{t('individualStudentReports')}</h2>
          </div>
          <p className="text-gray-600 mb-6">{t('generateComprehensive')}</p>

          {/* DEBUG: Show number of students loaded */}
          <div className="mb-2 text-xs text-gray-500">{t('loadedStudents', { count: students.length })}</div>
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
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipExcel') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipPDF') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
              <span dangerouslySetInnerHTML={{ __html: t('exportTipStudentReports') }} />
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-600 font-bold">{t('bullet')}</span>
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
  courses?: CourseType[];
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

const buildPrintableSchedule = (courses: CourseType[]): Record<string, PrintableSession[]> => {
  const schedule = WEEKDAY_CONFIG.reduce<Record<string, PrintableSession[]>>((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {} as Record<string, PrintableSession[]>);

  (Array.isArray(courses) ? courses : []).forEach((course) => {
    const entries = extractScheduleEntries(course?.teaching_schedule);
    entries.forEach(({ day, data }) => {
      if (!schedule[day]) return;
      const dataRec = data as Record<string, unknown> | undefined;
      const start = normalizeTimeString(dataRec?.start_time as string | undefined);
      const duration = Number(dataRec?.duration as number | string) || 45;
      const periods = Number(dataRec?.periods as number | string) || 1;
      schedule[day].push({
        courseId: course?.id ?? `${course?.course_code || course?.course_name}-${day}`,
        courseName: course?.course_name || (course as { name?: string })?.name || '',
        courseCode: course?.course_code || '',
        start,
        end: calculateEndTime(start, periods, duration),
        duration,
        periods,
        location: (dataRec?.location as string) || course?.location || (course as { room?: string })?.room || '',
      });
    });
  });

  Object.keys(schedule).forEach((day) => {
    schedule[day].sort((a, b) => (a.start > b.start ? 1 : -1));
  });

  return schedule;
};

const extractScheduleEntries = (schedule: unknown): Array<{ day: string; data: unknown }> => {
  const entries: Array<{ day: string; data: unknown }> = [];
  if (!schedule) return entries;

  const pushEntry = (day?: string, data?: unknown) => {
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
