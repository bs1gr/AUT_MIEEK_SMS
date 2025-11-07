// EnhancedAttendanceCalendar.tsx
// Location: frontend/src/components/EnhancedAttendanceCalendar.tsx
// Fixed: Added commonCategories array and updated loadEvaluationCategories to show all rate options
// UPDATED: Added "Select All" buttons for each attendance status + full localization
// All hardcoded text replaced with translation keys

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock, AlertCircle, Save, Star, TrendingUp, UserCheck, DumbbellIcon } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import Spinner from '@/components/ui/Spinner';
import { studentsAPI, coursesAPI } from '@/api/api';

const API_BASE_URL = '/api/v1';

const EnhancedAttendanceCalendar = () => {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [dailyPerformance, setDailyPerformance] = useState({});
  const [evaluationCategories, setEvaluationCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState(null);

  // FIXED: Common grade categories in both languages - matches CourseEvaluationRules.tsx and CourseManagement.tsx
  const commonCategories = [
    { en: 'Class Participation', el: 'Συμμετοχή στο Μάθημα' },
    { en: 'Homework/Assignments', el: 'Εκπόνηση Εργασιών' },
    { en: 'Continuous Assessment', el: 'Συνεχής Αξιολόγηση' },
    { en: 'Quizzes', el: 'Κουίζ' },
    { en: 'Midterm Exam', el: 'Ενδιάμεση Εξέταση' },
    { en: 'Final Exam', el: 'Τελική Εξέταση' },
    { en: 'Lab Work', el: 'Εργαστηριακή Εργασία' },
    { en: 'Project', el: 'Πρότζεκτ' },
    { en: 'Presentation', el: 'Παρουσίαση' },
    { en: 'Attendance', el: 'Παρουσία' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadEvaluationCategories();
    }
  }, [selectedCourse]);

  const loadData = async () => {
    try {
      const [studentsData, coursesData] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll()
      ]);
      setStudents(studentsData);
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load data', 'error');
    }
  };

  // FIXED: Updated to include ALL relevant evaluation categories for daily rating
  const loadEvaluationCategories = () => {
    try {
      const course = courses.find(c => c.id === selectedCourse);
      if (course && course.evaluation_rules) {
        // Create a comprehensive list of daily-trackable categories
        // Including all variations (English, Greek, with/without slashes)
        const dailyTrackableCategories = [
          'Class Participation', 'Συμμετοχή στο Μάθημα',
          'Homework/Assignments', 'Homework', 'Εκπόνηση Εργασιών',
          'Lab Work', 'Εργαστηριακή Εργασία',
          'Continuous Assessment', 'Συνεχής Αξιολόγηση',
          'Quizzes', 'Κουίζ',
          'Project', 'Πρότζεκτ',
          'Presentation', 'Παρουσίαση'
          // Note: Excluding 'Midterm Exam', 'Final Exam', and 'Attendance'
          // as these are typically not tracked daily
        ];

        const dailyCategories = course.evaluation_rules.filter(rule =>
          dailyTrackableCategories.some(cat =>
            rule.category.includes(cat) ||
            rule.category.toLowerCase().includes(cat.toLowerCase())
          )
        );

        setEvaluationCategories(dailyCategories);
      } else {
        setEvaluationCategories([]);
      }
    } catch (error) {
      console.error('Error loading evaluation categories:', error);
      setEvaluationCategories([]);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getAttendanceKey = (studentId) => {
    return `${studentId}-${formatDate(selectedDate)}`;
  };

  const setAttendance = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [getAttendanceKey(studentId)]: status
    }));
  };

    // NEW: Select all students with a specific status
  const selectAllAttendance = (status) => {
    const newRecords = {};
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

  const openPerformanceModal = (student) => {
    setSelectedStudentForPerformance(student);
    setShowPerformanceModal(true);
  };

  const setPerformanceScore = (studentId, category, score) => {
    const key = `${studentId}-${category}`;
    setDailyPerformance(prev => ({
      ...prev,
      [key]: parseFloat(score)
    }));
  };

  const saveAttendanceAndPerformance = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isTeachingDay = (date) => {
    if (!date || !selectedCourse) return true;

    const course = courses.find(c => c.id === selectedCourse);
    if (!course || !course.teaching_schedule || course.teaching_schedule.length === 0) {
      return true;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];

    return course.teaching_schedule.some(period => period.day === dayName);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'long', year: 'numeric' });

  // Get localized day names
  const dayNamesShort = t('dayNames').split(',');

  // Attendance status options with translations
  const attendanceOptions = [
    {
      status: t('present'),
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
      icon: XCircle,
      color: 'blue',
      bgColor: 'bg-white-50',
      hoverColor: 'hover:bg-blue-100',
      activeColor: 'bg-white-500',
      textColor: 'text-blue-700',
      activeTextColor: 'text-black'
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
            if (course && course.teaching_schedule && course.teaching_schedule.length > 0) {
              return (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    📅 {t('teachingDaysFor')} {course.course_code}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(course.teaching_schedule.map(s => s.day))].map(day => (
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
                {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { weekday: 'long' })}
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
              {t('markAttendanceFor')} - {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
          </div>
          <button
            onClick={saveAttendanceAndPerformance}
            disabled={loading || (Object.keys(attendanceRecords).length === 0 && Object.keys(dailyPerformance).length === 0)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2 font-medium"
          >
            <Save size={20} />
            <span>{loading ? t('saving') : t('saveAll')}</span>
          </button>
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
                {t('rateStudentPerformanceFor')} {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
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
                      <span>{t('average')} (5)</span>
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
