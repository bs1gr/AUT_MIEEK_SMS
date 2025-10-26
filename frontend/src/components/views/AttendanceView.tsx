import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../LanguageContext';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock, AlertCircle, Save, TrendingUp } from 'lucide-react';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

type Props = { courses: any[]; students: any[] };

const AttendanceView: React.FC<Props> = ({ courses, students }) => {
  const { t, language } = (useLanguage() as any) || { t: (k: string) => k, language: 'en' };

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [localCourses, setLocalCourses] = useState<any[]>(courses || []);
  const [coursesWithEnrollment, setCoursesWithEnrollment] = useState<Set<number>>(new Set());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [dailyPerformance, setDailyPerformance] = useState<Record<string, number>>({});
  const [evaluationCategories, setEvaluationCategories] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState<any>(null);

  const dayNamesShort = useMemo(() => (t('dayNames') ? t('dayNames').split(',') : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']), [t]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const getAttendanceKey = (studentId: number) => `${studentId}-${formatDate(selectedDate)}`;

  // Daily trackable categories - both EN and translated versions for matching
  const dailyTrackableCategories = [
    'Class Participation', t('classParticipation'),
    'Homework/Assignments', 'Homework', t('homework'),
    'Lab Work', t('labWork'),
    'Continuous Assessment', t('continuousAssessment'),
    'Quizzes', t('quizzes'),
    'Project', t('project'),
    'Presentation', t('presentation')
  ];

  useEffect(() => {
    if (!selectedCourse) { setEvaluationCategories([]); return; }
    try {
      const course = localCourses.find((c) => c.id === selectedCourse);
      if (course?.evaluation_rules) {
        const dailyCats = course.evaluation_rules.filter((rule: any) =>
          dailyTrackableCategories.some((cat) => rule.category?.includes(cat) || rule.category?.toLowerCase?.().includes(cat.toLowerCase()))
        );
        setEvaluationCategories(dailyCats);
      } else {
        setEvaluationCategories([]);
      }
    } catch {
      setEvaluationCategories([]);
    }
  }, [selectedCourse, localCourses]);

  // Sync local courses with props and fallback fetch if empty
  useEffect(() => {
    setLocalCourses(Array.isArray(courses) ? courses : []);
  }, [courses]);

  useEffect(() => {
    const ensureCourses = async () => {
      if (localCourses && localCourses.length > 0) return;
      try {
        const resp = await fetch(`${API_BASE_URL}/courses/`);
        const data = await resp.json();
        setLocalCourses(Array.isArray(data) ? data : []);
      } catch {
        setLocalCourses([]);
      }
    };
    ensureCourses();
  }, [localCourses?.length]);

  // Determine which courses have at least one enrolled student
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!localCourses || localCourses.length === 0) { setCoursesWithEnrollment(new Set()); return; }
      try {
        const results = await Promise.all(localCourses.map(async (c) => {
          try {
            const r = await fetch(`${API_BASE_URL}/enrollments/course/${c.id}/students`);
            if (!r.ok) return { id: c.id, count: 0 };
            const arr = await r.json();
            return { id: c.id, count: Array.isArray(arr) ? arr.length : 0 };
          } catch { return { id: c.id, count: 0 }; }
        }));
        const ids = new Set<number>();
        results.forEach(({ id, count }) => { if (count > 0) ids.add(id); });
        setCoursesWithEnrollment(ids);
      } catch { setCoursesWithEnrollment(new Set()); }
    };
    fetchEnrollments();
  }, [localCourses]);

  // Ensure selectedCourse is within the filtered list
  useEffect(() => {
    if (!selectedCourse) return;
    if (!coursesWithEnrollment.has(selectedCourse as number)) {
      const first = localCourses.find((c) => coursesWithEnrollment.has(c.id));
      setSelectedCourse(first ? first.id : '');
    }
  }, [coursesWithEnrollment]);

  // Auto-select first course when available
  useEffect(() => {
    if (!selectedCourse && localCourses && localCourses.length > 0) {
      setSelectedCourse(localCourses[0].id);
    }
  }, [localCourses, selectedCourse]);

  // Keep selected course up-to-date (teaching_schedule) by fetching details
  useEffect(() => {
    const refreshSelectedCourse = async () => {
      if (!selectedCourse) return;
      try {
        const resp = await fetch(`${API_BASE_URL}/courses/${selectedCourse}`);
        if (!resp.ok) return;
        const detail = await resp.json();
        setLocalCourses((prev) => {
          const idx = prev.findIndex((c) => c.id === selectedCourse);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...detail };
          return next;
        });
      } catch { /* noop */ }
    };
    refreshSelectedCourse();
  }, [selectedCourse]);

  // Load enrolled students for selected course
  useEffect(() => {
    const loadEnrolled = async () => {
      if (!selectedCourse) { setEnrolledStudents([]); return; }
      try {
        const resp = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}/students`);
        const data = await resp.json();
        setEnrolledStudents(Array.isArray(data) ? data : []);
      } catch {
        setEnrolledStudents([]);
      }
    };
    loadEnrolled();
  }, [selectedCourse]);

  // Prefill existing attendance and daily performance for selected date/course
  useEffect(() => {
    const loadPrefill = async () => {
      if (!selectedCourse || !selectedDate) return;
      const dateStr = formatDate(selectedDate);
      try {
        // Prefill Attendance
        const attRes = await fetch(`${API_BASE_URL}/attendance/date/${dateStr}/course/${selectedCourse}`);
        if (attRes.ok) {
          const attData = await attRes.json();
          const next: Record<string, string> = {};
          if (Array.isArray(attData)) {
            attData.forEach((a: any) => {
              next[`${a.student_id}-${dateStr}`] = a.status;
            });
          }
          setAttendanceRecords(next);
        } else {
          setAttendanceRecords({});
        }

        // Prefill Daily Performance
        const dpRes = await fetch(`${API_BASE_URL}/daily-performance/date/${dateStr}/course/${selectedCourse}`);
        if (dpRes.ok) {
          const dpData = await dpRes.json();
          const dp: Record<string, number> = {};
          if (Array.isArray(dpData)) {
            dpData.forEach((r: any) => {
              dp[`${r.student_id}-${r.category}`] = r.score;
            });
          }
          setDailyPerformance(dp);
        } else {
          setDailyPerformance({});
        }
      } catch {
        setAttendanceRecords({});
        setDailyPerformance({});
      }
    };
    loadPrefill();
  }, [selectedCourse, selectedDate]);

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    const offset = firstDay.getDay();
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };
  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'long', year: 'numeric' });

  const isToday = (date?: Date | null) => date ? date.toDateString() === new Date().toDateString() : false;
  const isSelected = (date?: Date | null) => date ? date.toDateString() === selectedDate.toDateString() : false;

  // Check if a specific date is a teaching day for the selected course
  const isTeachingDay = (date?: Date | null) => {
    if (!date) return false;
    const weekday = date.getDay(); // 0=Sun, 6=Sat
    if (weekday === 0 || weekday === 6) return false; // weekends are never school days

    // If no course selected, show all weekdays
    if (!selectedCourse) return true;

    const course = localCourses.find((c) => c.id === selectedCourse);
    const sched = course?.teaching_schedule;

    // If no schedule defined, allow all weekdays
    if (!sched) return true;

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = dayNames[date.getDay()];
    // Map weekday to 0-based index where 0=Monday, 1=Tuesday, etc. (not ISO)
    const weekdayIndex = weekday === 0 ? 6 : weekday - 1; // Convert: Sun(0)->6, Mon(1)->0, Tue(2)->1, etc.

    // Support both array-of-objects and map-of-days
    if (Array.isArray(sched)) {
      if (sched.length === 0) return true; // empty schedule -> allow all weekdays
      return sched.some((p: any) =>
        p.day === dayName ||
        p.day === dayName.toLowerCase() ||
        p.day === String(weekdayIndex) ||
        parseInt(p.day, 10) === weekdayIndex
      );
    }
    if (typeof sched === 'object') {
      const keys = Object.keys(sched as Record<string, any>);
      if (keys.length === 0) return true; // empty map -> allow all weekdays
      return Boolean(
        (sched as Record<string, any>)[dayName] ||
        (sched as Record<string, any>)[dayName.toLowerCase()] ||
        (sched as Record<string, any>)[String(weekdayIndex)]
      );
    }
    return true;
  };

  const setAttendance = (studentId: number, status: string) => {
    setAttendanceRecords((prev) => ({ ...prev, [getAttendanceKey(studentId)]: status }));
    
    // Clear daily performance scores when marking student as Absent
    if (status === 'Absent') {
      setDailyPerformance((prev) => {
        const updated = { ...prev };
        evaluationCategories.forEach((rule) => {
          const key = `${studentId}-${rule.category}`;
          delete updated[key];
        });
        return updated;
      });
    }
  };
  const selectAllAttendance = (status: string) => {
    const batch: Record<string, string> = {};
    (enrolledStudents || []).forEach((s) => { batch[getAttendanceKey(s.id)] = status; });
    setAttendanceRecords((prev) => ({ ...prev, ...batch }));
    showToast((t('allStudentsMarked') || 'All students marked') + `: ${status}`, 'success');
  };

  const setPerformanceScore = (studentId: number, category: string, score: number | string) => {
    const key = `${studentId}-${category}`;
    const val = typeof score === 'string' ? parseFloat(score) : score;
    setDailyPerformance((prev) => ({ ...prev, [key]: val }));
  };

  const saveAll = async () => {
    if (!selectedCourse) { showToast(t('selectCourse') || 'Select course', 'error'); return; }
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const attendancePromises = Object.entries(attendanceRecords).map(([key, status]) => {
        const [studentId] = key.split('-');
        return fetch(`${API_BASE_URL}/attendance/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: parseInt(studentId, 10), course_id: selectedCourse, date: dateStr, status, notes: '' })
        });
      });
      const performancePromises = Object.entries(dailyPerformance).map(([key, score]) => {
        const [studentIdStr, category] = key.split('-');
        return fetch(`${API_BASE_URL}/daily-performance/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: parseInt(studentIdStr, 10), course_id: selectedCourse, date: dateStr, category, score, max_score: 10.0, notes: '' })
        });
      });
      await Promise.all([...attendancePromises, ...performancePromises]);
      setAttendanceRecords({});
      setDailyPerformance({});
      showToast(t('savedSuccessfully') || 'Saved successfully', 'success');
    } catch (e) {
      showToast(t('saveFailed') || 'Save failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded shadow`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl"><CalIcon className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('enhancedAttendanceTitle') || 'Attendance & Daily Performance'}</h2>
            <p className="text-gray-600">{t('trackAttendanceDaily') || 'Track attendance and rate daily performance'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={previousMonth} aria-label={t('previousMonth') || 'Previous month'} title={t('previousMonth') || 'Previous month'} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
            <h3 className="text-lg font-semibold">{monthYear}</h3>
            <button onClick={nextMonth} aria-label={t('nextMonth') || 'Next month'} title={t('nextMonth') || 'Next month'} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNamesShort.map((dayName: string, idx: number) => (
              <div key={idx} className="text-center text-xs font-semibold py-1 text-gray-600">
                {dayName}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={idx} className="aspect-square" />;
              }

              const teaching = isTeachingDay(day);
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => teaching && setSelectedDate(day)}
                  disabled={!teaching}
                  className={`aspect-square p-2 rounded text-center transition ${
                    !teaching ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : ''
                  } ${
                    teaching && today ? 'ring-2 ring-indigo-500' : ''
                  } ${
                    teaching && selected ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow' : ''
                  } ${
                    teaching && !selected ? 'bg-gray-50 hover:bg-indigo-100 text-gray-700' : ''
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">{t('course') || 'Course'}</h3>
            <select aria-label={t('course') || 'Course'} title={t('course') || 'Course'} value={selectedCourse || ''} onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value, 10) : '')} className="w-full px-3 py-2 border rounded">
              <option value="">{t('selectCourse') || 'Select course'}</option>
              {localCourses.filter((c) => coursesWithEnrollment.has(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>
              ))}
            </select>
          </div>

          {evaluationCategories.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow p-6 border border-purple-200">
              <h4 className="text-md font-bold text-gray-800 mb-2">{t('dailyPerformance') || 'Daily Performance'}</h4>
              <div className="space-y-2">
                {evaluationCategories.map((rule, idx) => (
                  <div key={idx} className="bg-white rounded p-3 text-sm">
                    <p className="font-semibold text-gray-700">{rule.category}</p>
                    <p className="text-xs text-gray-500">{t('weight') || 'Weight'}: {rule.weight}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Select All */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow p-6 border border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Users size={20} className="text-indigo-600" />
          <h4 className="font-semibold">{t('quickActions') || 'Quick Actions'}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => selectAllAttendance('Present')} className="px-3 py-2 rounded bg-green-500 text-white flex items-center gap-2"><CheckCircle size={16} /> {t('present') || 'Present'}</button>
          <button onClick={() => selectAllAttendance('Absent')} className="px-3 py-2 rounded bg-red-500 text-white flex items-center gap-2"><XCircle size={16} /> {t('absent') || 'Absent'}</button>
          <button onClick={() => selectAllAttendance('Late')} className="px-3 py-2 rounded bg-yellow-500 text-white flex items-center gap-2"><Clock size={16} /> {t('late') || 'Late'}</button>
          <button onClick={() => selectAllAttendance('Excused')} className="px-3 py-2 rounded bg-blue-500 text-white flex items-center gap-2"><AlertCircle size={16} /> {t('excused') || 'Excused'}</button>
          <button onClick={() => setAttendanceRecords({})} className="px-3 py-2 rounded bg-gray-200 text-gray-800">{t('clear') || 'Clear'}</button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t('markAttendanceFor') || 'Mark attendance for'} — {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          <button onClick={saveAll} disabled={loading || (!Object.keys(attendanceRecords).length && !Object.keys(dailyPerformance).length)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={16} /> {loading ? (t('saving') || 'Saving...') : (t('saveAll') || 'Save All')}</button>
        </div>

        <div className="space-y-3">
          {(enrolledStudents && enrolledStudents.length > 0 ? enrolledStudents : []).map((s) => {
            const key = getAttendanceKey(s.id);
            const status = attendanceRecords[key];
            return (
              <div key={s.id} className="bg-gray-50 rounded border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full text-white flex items-center justify-center font-bold">{String(s.first_name || '').charAt(0)}{String(s.last_name || '').charAt(0)}</div>
                    <div>
                      <div className="font-semibold text-gray-800">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-gray-500">{s.student_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAttendance(s.id, 'Present')} aria-label={`${t('present') || 'Present'} - ${s.first_name} ${s.last_name}`} title={t('present') || 'Present'} className={`px-3 py-1 rounded text-sm ${status === 'Present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'}`}><CheckCircle size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Absent')} aria-label={`${t('absent') || 'Absent'} - ${s.first_name} ${s.last_name}`} title={t('absent') || 'Absent'} className={`px-3 py-1 rounded text-sm ${status === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}><XCircle size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Late')} aria-label={`${t('late') || 'Late'} - ${s.first_name} ${s.last_name}`} title={t('late') || 'Late'} className={`px-3 py-1 rounded text-sm ${status === 'Late' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}><Clock size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Excused')} aria-label={`${t('excused') || 'Excused'} - ${s.first_name} ${s.last_name}`} title={t('excused') || 'Excused'} className={`px-3 py-1 rounded text-sm ${status === 'Excused' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}><AlertCircle size={14} /></button>
                    {evaluationCategories.length > 0 && (
                      <button 
                        onClick={() => { setSelectedStudentForPerformance(s); setShowPerformanceModal(true); }} 
                        disabled={status === 'Absent'}
                        className={`ml-2 px-3 py-1 rounded text-sm flex items-center gap-1 ${status === 'Absent' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        <TrendingUp size={14} /> {t('rate') || 'Rate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {selectedCourse && enrolledStudents.length === 0 && (
            <div className="text-sm text-gray-500">{t('noStudentsEnrolled') || 'No students enrolled for this course'}</div>
          )}
        </div>
      </div>

      {/* Performance Modal */}
      {showPerformanceModal && selectedStudentForPerformance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold">{t('dailyPerformance') || 'Daily Performance'} — {selectedStudentForPerformance.first_name} {selectedStudentForPerformance.last_name}</h4>
              <button onClick={() => setShowPerformanceModal(false)} aria-label={t('close') || 'Close'} title={t('close') || 'Close'} className="p-2 hover:bg-gray-100 rounded"><XCircle size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{t('rateStudentPerformanceFor') || 'Rate for'} {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            {(() => {
              const studentAttendanceStatus = attendanceRecords[getAttendanceKey(selectedStudentForPerformance.id)];
              const isAbsent = studentAttendanceStatus === 'Absent';
              
              return (
                <>
                  {isAbsent && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-semibold">{t('studentMarkedAbsent') || 'Student is marked as Absent. Performance rating is disabled.'}</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {evaluationCategories.map((rule, idx) => {
                      const key = `${selectedStudentForPerformance.id}-${rule.category}`;
                      const curr = dailyPerformance[key] || 0;
                      return (
                        <div key={idx} className={`rounded p-4 border ${isAbsent ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-800">{rule.category}</div>
                              <div className="text-xs text-gray-500">{t('weightInFinalGrade') || 'Weight in final grade'}: {rule.weight}%</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${isAbsent ? 'text-gray-400' : 'text-indigo-600'}`}>{curr}</div>
                              <div className="text-[11px] text-gray-600">{t('outOf10') || 'out of 10'}</div>
                            </div>
                          </div>
                          <input 
                            type="range" 
                            min={0} 
                            max={10} 
                            step={0.5} 
                            value={curr} 
                            onChange={(e) => setPerformanceScore(selectedStudentForPerformance.id, rule.category, e.target.value)} 
                            disabled={isAbsent}
                            aria-label={`${t('dailyPerformance') || 'Daily Performance'}: ${rule.category}`}
                            title={`${t('dailyPerformance') || 'Daily Performance'}: ${rule.category}`}
                            className={`w-full ${isAbsent ? 'cursor-not-allowed' : ''}`} 
                          />
                          <div className="flex justify-between text-[11px] text-gray-600"><span>{t('poor') || 'Poor'} (0)</span><span>{t('average') || 'Average'} (5)</span><span>{t('excellent') || 'Excellent'} (10)</span></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
            
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowPerformanceModal(false)} className="flex-1 border px-3 py-2 rounded">{t('close') || 'Close'}</button>
              <button onClick={() => { setShowPerformanceModal(false); showToast(t('performanceScoresRecorded') || 'Scores recorded', 'success'); }} className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded">{t('done') || 'Done'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
