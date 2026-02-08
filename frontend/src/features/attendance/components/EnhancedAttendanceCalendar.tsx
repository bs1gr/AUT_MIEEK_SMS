// EnhancedAttendanceCalendar.tsx
// Location: frontend/src/components/EnhancedAttendanceCalendar.tsx
// Fixed: Added commonCategories array and updated loadEvaluationCategories to show all rate options
// UPDATED: Added "Select All" buttons for each attendance status + full localization
// All hardcoded text replaced with translation keys

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock, AlertCircle, Star, TrendingUp, UserCheck, CloudUpload } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import Spinner from '@/components/ui/Spinner';
import { Student, Course, TeachingScheduleEntry } from '@/types';
import { studentsAPI, coursesAPI } from '@/api/api';
import { formatLocalDate, inferWeekStartsOnMonday } from '@/utils/date';
import { useAutosave } from '@/hooks/useAutosave';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';

const API_BASE_URL = '/api/v1';

const EnhancedAttendanceCalendar = () => {
  const { t, language } = useLanguage();
  const { formatDate, formatMonthYear, formatWeekday } = useDateTimeFormatter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [dailyPerformance, setDailyPerformance] = useState<Record<string, number>>({});
  const [evaluationCategories, setEvaluationCategories] = useState<Array<{ id?: number; category: string; weight?: number; description?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState<Student | null>(null);

  // FIXED: Common grade categories are defined centrally in CourseEvaluationRules and re-used there.

  // Stable toast helper so effects/callbacks can reference it safely
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [studentsData, coursesData] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll(0, 1000)  // Request up to 1000 courses
      ]);

      // API now returns arrays; prefer the array path and fall back to an empty list
      const studentList: Student[] = Array.isArray(studentsData) ? studentsData : [];
      const courseList: Course[] = Array.isArray(coursesData) ? coursesData : [];

      setStudents(studentList);
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourse(courseList[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast(t('failedToLoadData') || 'Failed to load data', 'error');
    }
  }, [t, showToast]);

  const loadEvaluationCategories = useCallback(() => {
    try {
      const course = courses.find(c => c.id === selectedCourse);
      if (course && course.evaluation_rules) {
        // Create a comprehensive list of daily-trackable categories
        const dailyTrackableCategories = [
          'Class Participation', 'Συμμετοχή στο Μάθημα',
          'Homework/Assignments', 'Homework', 'Εκπόνηση Εργασιών',
          'Lab Work', 'Εργαστηριακή Εργασία',
          'Continuous Assessment', 'Συνεχής Αξιολόγηση',
          'Quizzes', 'Κουίζ',
          'Project', 'Πρότζεκτ',
          'Presentation', 'Παρουσίαση'
        ];

        const dailyCategories = course.evaluation_rules.filter((rule: { category?: string }) =>
          dailyTrackableCategories.some(cat => {
            const catVal = rule.category ?? '';
            return catVal.includes(cat) || catVal.toLowerCase().includes(cat.toLowerCase());
          })
        );

        setEvaluationCategories(dailyCategories);
      } else {
        setEvaluationCategories([]);
      }
    } catch (error) {
      console.error('Error loading evaluation categories:', error);
      setEvaluationCategories([]);
    }
  }, [courses, selectedCourse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedCourse) {
      loadEvaluationCategories();
    }
  }, [selectedCourse, loadEvaluationCategories]);


  // FIXED: Updated to include ALL relevant evaluation categories for daily rating

  // showToast already declared above as a stable useCallback

  const getAttendanceKey = (studentId: number) => {
    return `${studentId}-${formatLocalDate(selectedDate)}`;
  };

  const setAttendance = (studentId: number, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [getAttendanceKey(studentId)]: status
    }));
  };

    // NEW: Select all students with a specific status
  const selectAllAttendance = (status: string) => {
    const newRecords: Record<string, string> = {};
    students.forEach(student => {
      const key = getAttendanceKey(student.id);
      newRecords[key] = status;
    });
    setAttendanceRecords(prev => ({
      ...prev,
      ...newRecords
    }));
    showToast(t('allStudentsMarked') || `All students marked as ${status}`, 'success');
  };

  const openPerformanceModal = (student: Student) => {
    setSelectedStudentForPerformance(student);
    setShowPerformanceModal(true);
  };

  const setPerformanceScore = (studentId: number, category: string, score: string | number) => {
    const key = `${studentId}-${category}`;
    setDailyPerformance(prev => ({
      ...prev,
      [key]: Number(score)
    }));
  };

  const performSave = useCallback(async () => {
    if (!selectedCourse) {
      showToast(t('Please select a course'), 'error');
      return;
    }

    setLoading(true);
    try {
      const attendancePromises = Object.entries(attendanceRecords).map(([key, status]) => {
        const [studentId] = key.split('-');
        return fetch(`${API_BASE_URL}/attendance/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: parseInt(studentId),
            course_id: selectedCourse,
            date: formatDate(selectedDate),
            status: status,
            notes: ''
          })
        });
      });

      const performancePromises = Object.entries(dailyPerformance).map(([key, score]) => {
        const [studentIdStr, category] = key.split('-');
        const studentId = parseInt(studentIdStr);

        return fetch(`${API_BASE_URL}/daily-performance/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            course_id: selectedCourse,
            date: formatDate(selectedDate),
            category: category,
            score: score,
            max_score: 10.0,
            notes: ''
          })
        });
      });

      await Promise.all([...attendancePromises, ...performancePromises]);

      showToast(t('Attendance and performance saved successfully!'), 'success');
      setAttendanceRecords({});
      setDailyPerformance({});
    } catch (error) {
      console.error('Save error:', error);
      showToast(t('Failed to save data'), 'error');
      throw error; // Re-throw for autosave error handling
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedDate, attendanceRecords, dailyPerformance, t, showToast]);

  // Autosave when attendance or performance changes
  const hasChanges = Object.keys(attendanceRecords).length > 0 || Object.keys(dailyPerformance).length > 0;
  const { isSaving: isAutosaving, isPending: autosavePending } = useAutosave(
    performSave,
    [attendanceRecords, dailyPerformance],
    {
      delay: 2000, // Save 2 seconds after last change
      enabled: hasChanges && selectedCourse !== null,
      skipInitial: true,
    }
  );

  const getDaysInMonth = (date: Date, startOnMonday: boolean): Array<Date | null> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = startOnMonday ? (firstDay.getDay() + 6) % 7 : firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isToday = (date?: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date?: Date | null) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isTeachingDay = (date?: Date | null) => {
    if (!date || !selectedCourse) return true;

    const course = courses.find(c => c.id === selectedCourse);
    if (!course || !course.teaching_schedule || course.teaching_schedule.length === 0) {
      return true;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];

    return Array.isArray(course.teaching_schedule)
      ? (course.teaching_schedule as TeachingScheduleEntry[]).some(period => period.day === dayName)
      : Object.keys(course.teaching_schedule || {}).some(k => k === dayName);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const dayNamesShort = useMemo(() => (String(t('dayNames') || 'Sun,Mon,Tue,Wed,Thu,Fri,Sat')).split(',').map((day) => String(day).trim()), [t]);
  const weekStartsOnMonday = useMemo(() => inferWeekStartsOnMonday(dayNamesShort, language === 'el'), [dayNamesShort, language]);
  const days = useMemo(() => getDaysInMonth(currentMonth, weekStartsOnMonday), [currentMonth, weekStartsOnMonday]);
  const localeOverride = language === 'el' ? 'el-GR' : 'en-US';
  const monthYear = formatMonthYear(currentMonth);

  // Get localized day names
  // dayNamesShort defined above

  // Attendance status options with translations
  const attendanceOptions = [
    {
      status: t('present'),
      label: String(t('present')),
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      activeColor: 'bg-green-500',
      textColor: 'text-green-700',
      activeTextColor: 'text-white'
    },
    {
      status: t('absent'),
      label: String(t('absent')),
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:bg-red-100',
      activeColor: 'bg-red-500',
      textColor: 'text-red-700',
      activeTextColor: 'text-white'
    },
    {
      status: t('late'),
      label: String(t('late')),
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100',
      activeColor: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      activeTextColor: 'text-white'
    },
    {
      status: t('excused'),
      label: String(t('excused')),
      icon: AlertCircle,
      color: 'blue',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      activeColor: 'bg-blue-500',
      textColor: 'text-blue-700',
      activeTextColor: 'text-white'
    },
    {
      status: t('clear'),
      label: String(t('clear')),
      icon: XCircle,
      color: 'gray',
      bgColor: 'bg-gray-700',
      hoverColor: 'hover:bg-gray-800',
      activeColor: 'bg-gray-600',
      textColor: 'text-white',
      activeTextColor: 'text-white'
    }
  ];


  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
          {toast.message}
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <Spinner />
          <p className="text-gray-600 mt-2">{t('loadingData')}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl">
            <Calendar className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{t('enhancedAttendanceTitle')}</h2>
            <p className="text-gray-600">{t('trackAttendanceDaily')}</p>
          </div>
        </div>
        {/* Autosave Indicator */}
        {(isAutosaving || autosavePending) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            <CloudUpload size={16} className={isAutosaving ? 'animate-pulse text-blue-600' : 'text-gray-400'} />
            <span>{isAutosaving ? (t('saving') || 'Saving...') : (t('autosavePending') || 'Changes pending...')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('previousMonth') || 'Previous month'}
              title={t('previousMonth') || 'Previous month'}
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{monthYear}</h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('nextMonth') || 'Next month'}
              title={t('nextMonth') || 'Next month'}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNamesShort.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const isTeachingDayCheck = isTeachingDay(day);

              return (
                <button
                  key={idx}
                  onClick={() => day && isTeachingDayCheck && setSelectedDate(day)}
                  disabled={!day || !isTeachingDayCheck}
                  className={`
                    aspect-square p-2 rounded-lg text-center transition-all
                    ${!day ? 'invisible' : ''}
                    ${!isTeachingDayCheck ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}
                    ${isTeachingDayCheck && isToday(day) ? 'ring-2 ring-indigo-500' : ''}
                    ${isTeachingDayCheck && isSelected(day) ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-lg' : ''}
                    ${isTeachingDayCheck && !isSelected(day) ? 'bg-gray-50 hover:bg-indigo-100 text-gray-700' : ''}
                  `}
                >
                  {day?.getDate()}
                </button>
              );
            })}
          </div>

          {selectedCourse && (() => {
            const course = courses.find(c => c.id === selectedCourse);
            if (course && course.teaching_schedule) {
              const hasArray = Array.isArray(course.teaching_schedule) && course.teaching_schedule.length > 0;
              const hasRecord = !Array.isArray(course.teaching_schedule) && Object.keys(course.teaching_schedule as Record<string, unknown>).length > 0;
              if (!hasArray && !hasRecord) return null;
              return (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    📅 {t('teachingDaysFor')} {course.course_code}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(course.teaching_schedule)
                      ? [...new Set((course.teaching_schedule as TeachingScheduleEntry[]).map(s => s.day))].map((day: string) => (
                          <span key={day} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {day}
                          </span>
                        ))
                      : Object.keys(course.teaching_schedule as Record<string, TeachingScheduleEntry | undefined>).map((day: string) => (
                          <span key={day} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {day}
                          </span>
                        ))}

                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('onlyTeachingDaysSelectable')}
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('selectedDate')}</h3>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-indigo-600">
                {selectedDate.getDate()}
              </p>
              <p className="text-gray-600">
                {formatMonthYear(selectedDate)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {formatWeekday(selectedDate, localeOverride)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('course')}</h3>
            <select
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              aria-label={t('selectCourse') || 'Select course'}
              title={t('selectCourse') || 'Select course'}
            >
              <option value="">{t('selectCourse')}</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.course_name}
                </option>
              ))}
            </select>
          </div>

          {evaluationCategories.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
                <Star size={20} className="text-purple-600" />
                <span>{t('dailyPerformance')}</span>
              </h3>
              <div className="space-y-2">
                {evaluationCategories.map((rule, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-700">{rule.category}</p>
                    <p className="text-xs text-gray-500">{t('weight')}: {rule.weight}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* NEW: Select All Buttons Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2x2 shadow-lg p-6 border-2 border-indigo-200">
        <div className="flex items-center space-x-2 mb-4">
          <UserCheck size={24} className="text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">{t('quickActions') || 'Quick Actions'}</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {attendanceOptions.map(({ status, icon: Icon, activeColor, activeTextColor, label }) => (
            <button
              key={`select-all-${status}`}
              onClick={() => selectAllAttendance(status)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeColor} ${activeTextColor} shadow-md hover:shadow-lg hover:scale-105`}
            >
              <Icon size={18} />
              <span>{t(`selectAll${status}`) || `Select All ${label}`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users size={24} className="text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-800">
              {t('markAttendanceFor')} - {formatDate(selectedDate)}
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          {students.map(student => {
            const key = getAttendanceKey(student.id);
            const currentStatus = attendanceRecords[key];

            return (
              <div key={student.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  {/* Student Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {student.first_name[0]}{student.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{student.student_id}</p>
                    </div>
                  </div>

                  {/* Attendance Buttons */}
                  <div className="flex items-center space-x-3">
                    {attendanceOptions.map(({ status, icon: Icon, bgColor, hoverColor, activeColor, textColor, activeTextColor }) => (
                      <button
                        key={status}
                        onClick={() => setAttendance(student.id, status)}
                        className={`
                          flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all
                          ${currentStatus === status
                            ? `${activeColor} ${activeTextColor} shadow-md ring-2 ring-offset-2`
                            : `${bgColor} ${textColor} ${hoverColor}`
                          }
                        `}
                        title={status}
                      >
                        <Icon size={18} />
                        <span className="text-sm">{status}</span>
                      </button>
                    ))}

                    {/* Performance Button */}
                    {evaluationCategories.length > 0 && (
                      <button
                        onClick={() => openPerformanceModal(student)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all flex items-center space-x-2 font-medium ml-2"
                      >
                        <TrendingUp size={18} />
                        <span className="text-sm">{t('rate')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Modal */}
      {showPerformanceModal && selectedStudentForPerformance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {t('dailyPerformance')} - {selectedStudentForPerformance.first_name} {selectedStudentForPerformance.last_name}
              </h3>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label={t('close') || 'Close'}
                title={t('close') || 'Close'}
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-gray-600">
                {t('rateStudentPerformanceFor')} {formatWeekday(selectedDate, localeOverride)} {formatDate(selectedDate)}
              </p>

              {evaluationCategories.map((rule, idx) => {
                const key = `${selectedStudentForPerformance.id}-${rule.category}`;
                const currentScore = dailyPerformance[key] || 0;

                return (
                  <div key={idx} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{rule.category}</h4>
                        <p className="text-sm text-gray-600">{t('weightInFinalGrade')}: {rule.weight}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-indigo-600">{currentScore}</p>
                        <p className="text-sm text-gray-600">{t('outOf10')}</p>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={currentScore}
                      onChange={(e) => setPerformanceScore(selectedStudentForPerformance.id, rule.category, e.target.value)}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      aria-label={`${rule.category} score`}
                      title={`${rule.category} score`}
                    />

                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                      <span>{t('poor')} (0)</span>
                      <span>{t('averageRating') || t('average')} (5)</span>
                      <span>{t('excellent')} (10)</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('close')}
                </button>
                <button
                  onClick={() => {
                    setShowPerformanceModal(false);
                    showToast(t('performanceScoresRecorded'), 'info');
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  {t('done')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAttendanceCalendar;
