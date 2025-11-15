import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/LanguageContext';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock, AlertCircle, Save, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { formatLocalDate, inferWeekStartsOnMonday } from '@/utils/date';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

type Props = { courses: any[]; students: any[] };

const ATTENDANCE_STATES = ['Present', 'Absent', 'Late', 'Excused'] as const;
type AttendanceState = typeof ATTENDANCE_STATES[number];
const isTrackedStatus = (status?: string): status is AttendanceState =>
  Boolean(status && ATTENDANCE_STATES.includes(status as AttendanceState));

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
  const [datesWithAttendance, setDatesWithAttendance] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());
  const [showPeriodBreakdown, setShowPeriodBreakdown] = useState(false);



  const dayNamesShort = useMemo(
    () => (t('dayNames') ? t('dayNames').split(',').map((day: string) => day.trim()) : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']),
    [t]
  );
  const weekStartsOnMonday = useMemo(
    () => inferWeekStartsOnMonday(dayNamesShort, language === 'el'),
    [dayNamesShort, language]
  );
  const selectedDateStr = useMemo(() => formatLocalDate(selectedDate), [selectedDate]);
  const fullDayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const getWeekdayIndex = (d: Date) => {
    const weekday = d.getDay();
    return weekday === 0 ? 6 : weekday - 1;
  };

  const matchesScheduleDay = (value: any, dateObj: Date) => {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    const weekdayIndex = getWeekdayIndex(dateObj);
    const dayName = fullDayNames[dateObj.getDay()];
    return (
      normalized === dayName.toLowerCase() ||
      normalized === dayName.slice(0, 3).toLowerCase() ||
      normalized === String(weekdayIndex)
    );
  };

  const getScheduleEntriesForDate = (course: any, dateObj: Date) => {
    if (!course?.teaching_schedule) return [];
    const schedule = course.teaching_schedule;
    const entries: any[] = [];
    if (Array.isArray(schedule)) {
      schedule.forEach((entry: any) => {
        if (entry && matchesScheduleDay(entry.day, dateObj)) {
          entries.push(entry);
        }
      });
    } else if (typeof schedule === 'object') {
      const weekday = fullDayNames[dateObj.getDay()];
      const keysToCheck = [weekday, weekday.toLowerCase(), String(getWeekdayIndex(dateObj))];
      keysToCheck.forEach((key) => {
        if ((schedule as Record<string, any>)[key]) {
          entries.push({ day: weekday, ...(schedule as Record<string, any>)[key] });
        }
      });
    }
    return entries;
  };

  const periodCount = useMemo(() => {
    if (!selectedCourse || !selectedDate) return 1;
    const course = localCourses.find((c) => c.id === selectedCourse);
    if (!course) return 1;
    const entries = getScheduleEntriesForDate(course, selectedDate);
    if (!entries.length) return 1;
    const total = entries.reduce((sum: number, entry: any) => {
      const value = Number(entry?.periods ?? entry?.period_count ?? entry?.count ?? 1);
      if (Number.isFinite(value) && value > 0) {
        return sum + value;
      }
      return sum + 1;
    }, 0);
    return total > 0 ? total : 1;
  }, [localCourses, selectedCourse, selectedDate]);

  const activePeriods = useMemo(() => Array.from({ length: periodCount }, (_, idx) => idx + 1), [periodCount]);
  const hasMultiplePeriods = periodCount > 1;

  useEffect(() => {
    setExpandedStudents(new Set());
  }, [selectedCourse, selectedDateStr]);

  useEffect(() => {
    if (!hasMultiplePeriods) {
      setShowPeriodBreakdown(false);
    }
  }, [hasMultiplePeriods]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getAttendanceKey = (studentId: number, periodNumber = 1, dateStr = selectedDateStr) =>
    `${studentId}|${periodNumber}|${dateStr}`;

  const translateStatusLabel = (status: string) => {
    switch (status) {
      case 'Present':
        return t('present') || 'Present';
      case 'Absent':
        return t('absent') || 'Absent';
      case 'Late':
        return t('late') || 'Late';
      case 'Excused':
        return t('excused') || 'Excused';
      default:
        return status;
    }
  };

  const statusBadgeClasses: Record<string, string> = {
    Present: 'border-green-200 bg-green-50 text-green-700',
    Absent: 'border-red-200 bg-red-50 text-red-700',
    Late: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    Excused: 'border-blue-200 bg-blue-50 text-blue-700',
  };

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

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Class Participation': t('classParticipation') || 'Class Participation',
      'Homework/Assignments': t('homework') || 'Homework/Assignments',
      'Homework': t('homework') || 'Homework',
      'Lab Work': t('labWork') || 'Lab Work',
      'Continuous Assessment': t('continuousAssessment') || 'Continuous Assessment',
      'Quizzes': t('quizzes') || 'Quizzes',
      'Project': t('project') || 'Project',
      'Presentation': t('presentation') || 'Presentation',
    };
    return categoryMap[category] || category;
  };

  const getStudentPeriodStatuses = (studentId: number) => {
    const statuses: Record<number, string> = {};
    activePeriods.forEach((period) => {
      const value = attendanceRecords[getAttendanceKey(studentId, period)];
      if (value) {
        statuses[period] = value;
      }
    });
    return statuses;
  };

  const toggleStudentPeriods = (studentId: number) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const isStudentExpanded = (studentId: number) => expandedStudents.has(studentId);

  const getAggregatedStatus = (studentId: number) => {
    const statuses = Object.values(getStudentPeriodStatuses(studentId));
    if (!statuses.length) {
      return { status: undefined, isMixed: false, hasAny: false };
    }
    const first = statuses[0];
    const isUniform = statuses.every((status) => status === first);
    return {
      status: isUniform ? first : undefined,
      isMixed: !isUniform,
      hasAny: true,
    };
  };

  const clearPeriodAttendance = (studentId: number, periodNumber: number) => {
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      delete next[getAttendanceKey(studentId, periodNumber)];
      return next;
    });
  };

  const clearStudentAttendance = (studentId: number) => {
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      activePeriods.forEach((period) => {
        delete next[getAttendanceKey(studentId, period)];
      });
      return next;
    });
  };

  const clearPerformanceForStudents = (studentIds: number[]) => {
    if (!studentIds?.length) return;
    setDailyPerformance((prev) => {
      const updated = { ...prev };
      studentIds.forEach((studentId) => {
        evaluationCategories.forEach((rule) => {
          const key = `${studentId}-${rule.category}`;
          delete updated[key];
        });
      });
      return updated;
    });
  };

  const clearPerformanceForStudent = (studentId: number) => {
    clearPerformanceForStudents([studentId]);
  };

  const applyAttendanceStatus = (studentId: number, status: string, periodNumber?: number) => {
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      const targetPeriods = periodNumber ? [periodNumber] : activePeriods;
      targetPeriods.forEach((period) => {
        next[getAttendanceKey(studentId, period)] = status;
      });

      if (status === 'Absent') {
        const allAbsent = activePeriods.every((period) => next[getAttendanceKey(studentId, period)] === 'Absent');
        if (allAbsent) {
          clearPerformanceForStudent(studentId);
        }
      }

      return next;
    });
  };

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
  // Only run when courses list changes length (not on every mutation)
  const coursesLength = localCourses?.length || 0;
  const courseIds = useMemo(() => localCourses?.map(c => c.id).join(',') || '', [localCourses]);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!localCourses || localCourses.length === 0) { setCoursesWithEnrollment(new Set()); return; }
      try {
        const results = await Promise.all(localCourses.map(async (c) => {
          try {
            const r = await fetch(`${API_BASE_URL}/enrollments/course/${c.id}/students`);
            if (!r.ok) {
              console.warn(`[AttendanceView] Fetch failed for course ${c.id}`);
              return { id: c.id, count: 0 };
            }
            const arr = await r.json();
            console.log(`[AttendanceView] Enrollments for course ${c.id}:`, arr);
            // Accept both array and object-with-items
            if (Array.isArray(arr)) {
              return { id: c.id, count: arr.length };
            } else if (arr && Array.isArray(arr.items)) {
              return { id: c.id, count: arr.items.length };
            } else {
              return { id: c.id, count: 0 };
            }
          } catch (err) {
            console.error(`[AttendanceView] Error fetching enrollments for course ${c.id}:`, err);
            return { id: c.id, count: 0 };
          }
        }));
        const ids = new Set<number>();
        results.forEach(({ id, count }) => { if (count > 0) ids.add(id); });
        console.log('[AttendanceView] coursesWithEnrollment:', Array.from(ids));
        setCoursesWithEnrollment(ids);
      } catch (err) {
        console.error('[AttendanceView] Error in fetchEnrollments:', err);
        setCoursesWithEnrollment(new Set());
      }
    };
    fetchEnrollments();
  }, [courseIds]); // Only depend on course IDs string, not entire array

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
  // Only run once when course is selected, not continuously
  const [courseDetailsFetched, setCourseDetailsFetched] = useState<Set<number>>(new Set());

  useEffect(() => {
    const refreshSelectedCourse = async () => {
      if (!selectedCourse || courseDetailsFetched.has(selectedCourse as number)) return;
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
        setCourseDetailsFetched(prev => new Set(prev).add(selectedCourse as number));
      } catch { /* noop */ }
    };
    refreshSelectedCourse();
  }, [selectedCourse]); // Only depend on selectedCourse, not localCourses

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

  const refreshAttendancePrefill = useCallback(async () => {
    if (!selectedCourse || !selectedDateStr) return;
    const dateStr = selectedDateStr;
    try {
      const attRes = await fetch(`${API_BASE_URL}/attendance/date/${dateStr}/course/${selectedCourse}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const next: Record<string, string> = {};
        if (Array.isArray(attData)) {
          attData.forEach((a: any) => {
            if (!a?.student_id) return;
            const periodNumber = Number(a.period_number ?? 1);
            const safePeriod = Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1;
            const recordDate = formatLocalDate(a.date || dateStr);
            next[getAttendanceKey(a.student_id, safePeriod, recordDate)] = a.status;
          });
        }
        setAttendanceRecords(next);
      } else {
        setAttendanceRecords({});
      }

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
  }, [selectedCourse, selectedDateStr]);

  // Prefill existing attendance and daily performance for selected date/course
  useEffect(() => {
    refreshAttendancePrefill();
  }, [refreshAttendancePrefill]);

  // Fetch dates with attendance records for the current month
  useEffect(() => {
    const fetchDatesWithAttendance = async () => {
      if (!selectedCourse) {
        setDatesWithAttendance(new Set());
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JS months are 0-indexed
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      try {
        const res = await fetch(`${API_BASE_URL}/attendance/course/${selectedCourse}?start_date=${startDate}&end_date=${endDate}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Extract unique, timezone-safe dates from attendance records
            const uniqueDates = new Set<string>();
            data.forEach((record: any) => {
              if (!record?.date) return;
              uniqueDates.add(formatLocalDate(record.date));
            });
            setDatesWithAttendance(uniqueDates);
          }
        }
      } catch (error) {
        console.error('Failed to fetch attendance dates:', error);
        setDatesWithAttendance(new Set());
      }
    };

    fetchDatesWithAttendance();
  }, [selectedCourse, currentMonth]);

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getDaysInMonth = (date: Date, startOnMonday: boolean) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    const offset = startOnMonday ? (firstDay.getDay() + 6) % 7 : firstDay.getDay();
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };
  const days = useMemo(() => getDaysInMonth(currentMonth, weekStartsOnMonday), [currentMonth, weekStartsOnMonday]);
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

  const setAttendance = (studentId: number, status: string, periodNumber?: number) => {
    applyAttendanceStatus(studentId, status, periodNumber);
  };

  const selectAllAttendance = (status: string) => {
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      const periods = activePeriods.length ? activePeriods : [1];
      (enrolledStudents || []).forEach((student) => {
        periods.forEach((period) => {
          next[getAttendanceKey(student.id, period)] = status;
        });
      });
      return next;
    });

    if (status === 'Absent') {
      clearPerformanceForStudents((enrolledStudents || []).map((s) => s.id));
    }

    showToast((t('allStudentsMarked') || 'All students marked') + `: ${status}`, 'success');
  };

  const clearAllAttendance = () => {
    if (!enrolledStudents || enrolledStudents.length === 0) return;
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      const periods = activePeriods.length ? activePeriods : [1];
      enrolledStudents.forEach((student) => {
        periods.forEach((period) => {
          delete next[getAttendanceKey(student.id, period)];
        });
      });
      return next;
    });
  };

  const makeEmptyStatusCounts = () => {
    const counts: Record<string, number> = {};
    ATTENDANCE_STATES.forEach((status) => {
      counts[status] = 0;
    });
    return counts;
  };

  const attendanceAnalytics = useMemo(() => {
    const overall = makeEmptyStatusCounts();
    const perPeriod: Record<number, Record<string, number>> = {};
    activePeriods.forEach((period) => {
      perPeriod[period] = makeEmptyStatusCounts();
    });

    const studentsList = enrolledStudents || [];
    if (!studentsList.length) {
      return { overall, perPeriod, totalSlots: 0, recordedSlots: 0, pendingSlots: 0 };
    }

    let recordedSlots = 0;
    let pendingSlots = 0;

    studentsList.forEach((student) => {
      activePeriods.forEach((period) => {
        const key = getAttendanceKey(student.id, period);
        const status = attendanceRecords[key];
        if (isTrackedStatus(status)) {
          overall[status] += 1;
          perPeriod[period][status] += 1;
          recordedSlots += 1;
        } else {
          pendingSlots += 1;
        }
      });
    });

    const totalSlots = studentsList.length * activePeriods.length;

    return { overall, perPeriod, totalSlots, recordedSlots, pendingSlots };
  }, [attendanceRecords, enrolledStudents, activePeriods, selectedDateStr]);

  const statusOrder = [...ATTENDANCE_STATES];
  const coveragePercent = attendanceAnalytics.totalSlots
    ? Math.round((attendanceAnalytics.recordedSlots / attendanceAnalytics.totalSlots) * 100)
    : 0;

  const setPerformanceScore = (studentId: number, category: string, score: number | string) => {
    const key = `${studentId}-${category}`;
    const val = typeof score === 'string' ? parseFloat(score) : score;
    setDailyPerformance((prev) => ({ ...prev, [key]: val }));
  };

  const saveAll = async () => {
    if (!selectedCourse) { showToast(t('selectCourse') || 'Select course', 'error'); return; }
    setLoading(true);
    try {
      const dateStr = formatLocalDate(selectedDate);
      const attendancePromises = Object.entries(attendanceRecords).map(([key, status]) => {
        const tokens = key.includes('|') ? key.split('|') : key.split('-');
        const [studentIdStr, periodNumberStr, storedDate] = tokens;
        const studentId = parseInt(studentIdStr, 10);
        if (!studentId) return Promise.resolve(null);
        const periodNumber = periodNumberStr ? parseInt(periodNumberStr, 10) : 1;
        const payloadDate = storedDate || dateStr;
        return fetch(`${API_BASE_URL}/attendance/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            course_id: selectedCourse,
            date: payloadDate,
            status,
            period_number: Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1,
            notes: '',
          })
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
      await refreshAttendancePrefill();
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
              const hasAttendance = datesWithAttendance.has(formatLocalDate(day));

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => teaching && setSelectedDate(day)}
                  disabled={!teaching}
                  className={`aspect-square p-2 rounded text-center transition relative ${
                    !teaching ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' : ''
                  } ${
                    teaching && today ? 'ring-2 ring-indigo-500' : ''
                  } ${
                    teaching && selected ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow' : ''
                  } ${
                    teaching && !selected && hasAttendance ? 'bg-green-100 hover:bg-green-200 text-gray-700 font-semibold' : ''
                  } ${
                    teaching && !selected && !hasAttendance ? 'bg-gray-50 hover:bg-indigo-100 text-gray-700' : ''
                  }`}
                >
                  {day.getDate()}
                  {teaching && hasAttendance && !selected && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
              <span>{t('attendanceRecorded') || 'Attendance recorded'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-50 border border-gray-300"></div>
              <span>{t('noAttendanceYet') || 'No attendance yet'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-600 to-purple-600"></div>
              <span>{t('selectedDate') || 'Selected date'}</span>
            </div>
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
                    <p className="font-semibold text-gray-700">{translateCategory(rule.category)}</p>
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
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button onClick={() => selectAllAttendance('Present')} className="w-full sm:w-auto px-3 py-2 rounded bg-green-500 text-white flex items-center justify-center sm:justify-start gap-2"><CheckCircle size={16} /> {t('present') || 'Present'}</button>
          <button onClick={() => selectAllAttendance('Absent')} className="w-full sm:w-auto px-3 py-2 rounded bg-red-500 text-white flex items-center justify-center sm:justify-start gap-2"><XCircle size={16} /> {t('absent') || 'Absent'}</button>
          <button onClick={() => selectAllAttendance('Late')} className="w-full sm:w-auto px-3 py-2 rounded bg-yellow-500 text-white flex items-center justify-center sm:justify-start gap-2"><Clock size={16} /> {t('late') || 'Late'}</button>
          <button onClick={() => selectAllAttendance('Excused')} className="w-full sm:w-auto px-3 py-2 rounded bg-blue-500 text-white flex items-center justify-center sm:justify-start gap-2"><AlertCircle size={16} /> {t('excused') || 'Excused'}</button>
          <button onClick={clearAllAttendance} className="w-full sm:w-auto px-3 py-2 rounded bg-gray-200 text-gray-800 flex items-center justify-center sm:justify-start gap-2">{t('clear') || 'Clear'}</button>
        </div>
      </div>

        {/* Analytics Snapshot */}
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 text-indigo-700 rounded-xl p-2"><BarChart3 size={20} /></div>
              <div>
                <h4 className="font-semibold text-gray-800">{t('attendanceInsights') || 'Attendance insights'}</h4>
                <p className="text-xs text-gray-500">{t('overallSummary') || 'Overall summary for this day'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{t('coverageLabel') || 'Coverage'}: {coveragePercent}%</p>
              <p className="text-xs text-gray-500">{attendanceAnalytics.recordedSlots}/{attendanceAnalytics.totalSlots || 0} {t('recordsTracked') || 'records tracked'}</p>
              {attendanceAnalytics.pendingSlots > 0 && (
                <p className="text-xs text-amber-600">
                  {t('pendingRecords', { count: attendanceAnalytics.pendingSlots }) || `${attendanceAnalytics.pendingSlots} pending`}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {statusOrder.map((status) => (
              <div key={status} className={`rounded-xl border px-3 py-2 text-center ${statusBadgeClasses[status] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                <p className="text-[11px] uppercase tracking-wide font-semibold">{translateStatusLabel(status)}</p>
                <p className="text-xl font-bold">{attendanceAnalytics.overall[status] || 0}</p>
              </div>
            ))}
          </div>
          {hasMultiplePeriods && (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowPeriodBreakdown((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-white border rounded-lg px-3 py-2"
              >
                <span>{showPeriodBreakdown ? (t('hidePeriodBreakdown') || 'Hide per-period breakdown') : (t('showPeriodBreakdown') || 'Show per-period breakdown')}</span>
                {showPeriodBreakdown ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </button>
              {showPeriodBreakdown && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('perPeriodBreakdown') || 'Per-period breakdown'}</p>
                  {activePeriods.map((period) => (
                    <div key={period} className="border rounded-2xl p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                        <span className="font-semibold text-gray-800">{t('periodLabel', { number: period }) || `Period ${period}`}</span>
                        <span className="text-xs text-gray-500">{t('studentsTracked', { count: enrolledStudents?.length || 0 }) || `${enrolledStudents?.length || 0} students`}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {statusOrder.map((status) => (
                          <div key={`${period}-${status}`} className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[11px] text-gray-600">{translateStatusLabel(status)}</p>
                            <p className="text-lg font-semibold text-gray-900">{attendanceAnalytics.perPeriod[period]?.[status] || 0}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t('markAttendanceFor') || 'Mark attendance for'} — {selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          <button onClick={saveAll} disabled={loading || (!Object.keys(attendanceRecords).length && !Object.keys(dailyPerformance).length)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={16} /> {loading ? (t('saving') || 'Saving...') : (t('saveAll') || 'Save All')}</button>
        </div>

        <div className="space-y-3">
          {(enrolledStudents && enrolledStudents.length > 0 ? enrolledStudents : []).map((s) => {
            const periodStatuses = getStudentPeriodStatuses(s.id);
            const aggregatedStatus = getAggregatedStatus(s.id);
            const uniformStatus = aggregatedStatus.status;
            const isAbsentAllDay = uniformStatus === 'Absent';

            const perPeriodButtons = (period: number, periodStatus?: string) => (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setAttendance(s.id, 'Present', period)}
                  className={`px-2 py-1 rounded text-xs ${periodStatus === 'Present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'}`}
                  aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('present') || 'Present'}`}
                >
                  <CheckCircle size={12} />
                </button>
                <button
                  onClick={() => setAttendance(s.id, 'Absent', period)}
                  className={`px-2 py-1 rounded text-xs ${periodStatus === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}
                  aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('absent') || 'Absent'}`}
                >
                  <XCircle size={12} />
                </button>
                <button
                  onClick={() => setAttendance(s.id, 'Late', period)}
                  className={`px-2 py-1 rounded text-xs ${periodStatus === 'Late' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}
                  aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('late') || 'Late'}`}
                >
                  <Clock size={12} />
                </button>
                <button
                  onClick={() => setAttendance(s.id, 'Excused', period)}
                  className={`px-2 py-1 rounded text-xs ${periodStatus === 'Excused' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}
                  aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('excused') || 'Excused'}`}
                >
                  <AlertCircle size={12} />
                </button>
                {periodStatus && periodStatus !== 'Present' && (
                  <button
                    onClick={() => clearPeriodAttendance(s.id, period)}
                    className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700"
                  >
                    {t('clear') || 'Clear'}
                  </button>
                )}
              </div>
            );

            return (
              <div key={s.id} className="bg-gray-50 rounded border p-3 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full text-white flex items-center justify-center font-bold">{String(s.first_name || '').charAt(0)}{String(s.last_name || '').charAt(0)}</div>
                    <div>
                      <div className="font-semibold text-gray-800">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-gray-500">{s.student_id}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    <button onClick={() => setAttendance(s.id, 'Present')} aria-label={`${t('present') || 'Present'} - ${s.first_name} ${s.last_name}`} title={t('present') || 'Present'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'}`}><CheckCircle size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Absent')} aria-label={`${t('absent') || 'Absent'} - ${s.first_name} ${s.last_name}`} title={t('absent') || 'Absent'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}><XCircle size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Late')} aria-label={`${t('late') || 'Late'} - ${s.first_name} ${s.last_name}`} title={t('late') || 'Late'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Late' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}><Clock size={14} /></button>
                    <button onClick={() => setAttendance(s.id, 'Excused')} aria-label={`${t('excused') || 'Excused'} - ${s.first_name} ${s.last_name}`} title={t('excused') || 'Excused'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Excused' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}><AlertCircle size={14} /></button>
                    {aggregatedStatus.isMixed && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {t('mixedStatus') || 'Mixed periods'}
                      </span>
                    )}
                    {evaluationCategories.length > 0 && (
                      <button
                        onClick={() => { setSelectedStudentForPerformance(s); setShowPerformanceModal(true); }}
                        disabled={isAbsentAllDay}
                        className={`ml-2 px-3 py-1 rounded text-sm flex items-center gap-1 ${isAbsentAllDay ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        <TrendingUp size={14} /> {t('rate') || 'Rate'}
                      </button>
                    )}
                  </div>
                </div>

                {hasMultiplePeriods && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleStudentPeriods(s.id)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-white border rounded-lg px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <Clock size={12} className="text-indigo-500" />
                        {isStudentExpanded(s.id) ? (t('hidePerPeriod') || 'Hide per-period attendance') : (t('showPerPeriod') || 'Show per-period attendance')}
                      </span>
                      {isStudentExpanded(s.id) ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    {isStudentExpanded(s.id) && (
                      <div className="space-y-2">
                        <div className="space-y-2">
                          {activePeriods.map((period) => (
                            <div key={period} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border rounded-lg p-2">
                              <span className="text-xs font-semibold text-gray-700">{t('periodLabel', { number: period }) || `Period ${period}`}</span>
                              {perPeriodButtons(period, periodStatuses[period])}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-200">
                          <button
                            onClick={() => setAttendance(s.id, 'Absent')}
                            className="px-3 py-1 rounded text-xs bg-red-100 text-red-700 flex items-center gap-1"
                          >
                            <XCircle size={12} /> {t('markAllPeriodsAbsent') || 'Mark all periods absent'}
                          </button>
                          <button
                            onClick={() => clearStudentAttendance(s.id)}
                            className="px-3 py-1 rounded text-xs bg-gray-200 text-gray-700"
                          >
                            {t('clear') || 'Clear'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              const modalStatus = getAggregatedStatus(selectedStudentForPerformance.id).status;
              const isAbsent = modalStatus === 'Absent';

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
                              <div className="font-semibold text-gray-800">{translateCategory(rule.category)}</div>
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
                            aria-label={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                            title={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
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
