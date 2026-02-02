/**
 * CHANGELOG (2025-11-29, by GitHub Copilot)
 * - Fixed: UI only shows attendance/rating from DB, never stale/pending state
 * - Fixed: No auto-select of course/date; user must choose
 * - Fixed: Null checks for selectedDate everywhere (prevents TypeError)
 * - Fixed: 'Changes pending...' only shows for real unsaved changes
 * - Fixed: After save, local state is cleared and indicator disappears
 * - Fixed: Frontend treats 404 from daily-performance as 'no data', not error
 * - Improved: UI always reflects DB, shows empty if no data
 */
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLanguage } from '@/LanguageContext';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, BarChart3, ChevronDown, ChevronUp, CloudUpload } from 'lucide-react';
import { formatLocalDate, inferWeekStartsOnMonday } from '@/utils/date';
import type { Course, Student, TeachingScheduleEntry } from '@/types';
import { eventBus, EVENTS } from '@/utils/events';
import apiClient from '@/api/api';
import { useAutosave } from '@/hooks/useAutosave';

const API_BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api/v1';

// Version marker to verify code reload (quiet unless debug)
const DEBUG_ATTENDANCE_LOGS = import.meta.env.DEV && false;
const debugAttendance = (...args: unknown[]) => {
  if (DEBUG_ATTENDANCE_LOGS) {
    console.warn('[AttendanceView]', ...args);
  }
};

debugAttendance('CODE VERSION: 2024-11-29-FIX-404-ERRORS - 404 error handling ACTIVE');

type Props = { courses: Course[]; students?: Student[] };

// Teaching schedule can arrive either as an array of entries or an object keyed by day.


type EvaluationRule = { category: string; weight?: number };
type RawAttendanceRecord = { student_id: number; period_number?: number; date?: string; status: string };
type RawDailyPerformanceRecord = { student_id: number; category: string; score: number };

const ATTENDANCE_STATES = ['Present', 'Absent', 'Late', 'Excused'] as const;
type AttendanceState = typeof ATTENDANCE_STATES[number];
const isTrackedStatus = (status?: string): status is AttendanceState =>
  Boolean(status && ATTENDANCE_STATES.includes(status as AttendanceState));

const shallowEqualStringMap = (a: Record<string, string>, b: Record<string, string>) => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const shallowEqualNumberMap = (a: Record<string, number>, b: Record<string, number>) => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const AttendanceView: React.FC<Props> = ({ courses }) => {



  const { t, language } = useLanguage();
  // Do not auto-select course/date until user chooses
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [localCourses, setLocalCourses] = useState<Course[]>(courses || []);
  const [coursesWithEnrollment, setCoursesWithEnrollment] = useState<Set<number>>(new Set());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [attendanceRecordIds, setAttendanceRecordIds] = useState<Record<string, number>>({}); // Track API record IDs
  const [dailyPerformance, setDailyPerformance] = useState<Record<string, number>>({});
  const [dailyPerformanceIds, setDailyPerformanceIds] = useState<Record<string, number>>({}); // Track API record IDs

  // Persisted state from backend (used to detect dirty/pending changes)
  const [persistedAttendanceRecords, setPersistedAttendanceRecords] = useState<Record<string, string>>({});
  const [persistedDailyPerformance, setPersistedDailyPerformance] = useState<Record<string, number>>({});

  const [evaluationCategories, setEvaluationCategories] = useState<EvaluationRule[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState<Student | null>(null);
  const [datesWithAttendance, setDatesWithAttendance] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());
  const [showPeriodBreakdown, setShowPeriodBreakdown] = useState(false);
  const todayStr = formatLocalDate(new Date());

  // Request deduplication - prevent concurrent duplicate requests
  const activeRequestsRef = useRef<Set<string>>(new Set());
  const courseDetailsFetchedRef = useRef<Set<number>>(new Set());
  // debounce timer (currently unused in this refactor)
  // const attendanceFetchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const dayNamesShort = useMemo(
    () => (t('dayNames') ? t('dayNames').split(',').map((day: string) => day.trim()) : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']),
    [t]
  );
  const weekStartsOnMonday = useMemo(
    () => inferWeekStartsOnMonday(dayNamesShort, language === 'el'),
    [dayNamesShort, language]
  );
  const selectedDateStr = useMemo(() => selectedDate ? formatLocalDate(selectedDate) : '', [selectedDate]);
  const isHistoricalMode = Boolean(selectedDateStr && selectedDateStr !== todayStr);
  const fullDayNames = useMemo(() => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], []);

  const getWeekdayIndex = (d: Date) => {
    const weekday = d.getDay();
    return weekday === 0 ? 6 : weekday - 1;
  };

  // Narrow unknown thrown values to objects with optional response.status
  const isResponseLike = (e: unknown): e is { response?: { status?: number } } => (
    typeof e === 'object' && e !== null && 'response' in e
  );

  useEffect(() => {
    const recallCourse = sessionStorage.getItem('attendance_recall_course');
    const recallDate = sessionStorage.getItem('attendance_recall_date');

    if (recallCourse) {
      const courseId = Number(recallCourse);
      if (Number.isFinite(courseId) && courseId > 0) {
        setSelectedCourse(courseId);
      }
    }

    if (recallDate) {
      const parsed = new Date(recallDate);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }

    sessionStorage.removeItem('attendance_recall_course');
    sessionStorage.removeItem('attendance_recall_date');
  }, []);


  const getScheduleEntriesForDate = useCallback((course: Course, dateObj: Date): TeachingScheduleEntry[] => {
    const matchesScheduleDay = (value: unknown, dateObjInner: Date) => {
      if (value === undefined || value === null) return false;
      const normalized = String(value).trim().toLowerCase();
      const weekdayIndex = getWeekdayIndex(dateObjInner);
      const dayName = fullDayNames[dateObjInner.getDay()];
      return (
        normalized === dayName.toLowerCase() ||
        normalized === dayName.slice(0, 3).toLowerCase() ||
        normalized === String(weekdayIndex)
      );
    };

    if (!course?.teaching_schedule) return [];
    const schedule = course.teaching_schedule as unknown;
    const entries: TeachingScheduleEntry[] = [];
    if (Array.isArray(schedule)) {
      (schedule as TeachingScheduleEntry[]).forEach((entry) => {
        if (entry && matchesScheduleDay(entry.day, dateObj)) {
          entries.push(entry);
        }
      });
    } else if (typeof schedule === 'object') {
      const weekday = fullDayNames[dateObj.getDay()];
      const keysToCheck = [weekday, weekday.toLowerCase(), String(getWeekdayIndex(dateObj))];
      keysToCheck.forEach((key) => {
        const value = (schedule as Record<string, TeachingScheduleEntry | undefined>)[key];
        if (value) {
          entries.push({ ...value, day: weekday });
        }
      });
    }
    return entries;
  }, [fullDayNames]);

  const periodCount = useMemo(() => {
    if (!selectedCourse || !selectedDate) return 1;
    const course = localCourses.find((c) => c.id === selectedCourse);
    if (!course) return 1;
    const entries = getScheduleEntriesForDate(course, selectedDate);
    if (!entries.length) return 1;
    const total = entries.reduce((sum: number, entry: TeachingScheduleEntry) => {
      const value = Number(entry.periods ?? entry.period_count ?? entry.count ?? 1);
      if (Number.isFinite(value) && value > 0) {
        return sum + value;
      }
      return sum + 1;
    }, 0);
    return total > 0 ? total : 1;
  }, [localCourses, selectedCourse, selectedDate, getScheduleEntriesForDate]);

  const activePeriods = useMemo(() => Array.from({ length: periodCount }, (_, idx) => idx + 1), [periodCount]);
  const hasMultiplePeriods = periodCount > 1;

  // Attendance key generator (moved above effects to avoid use-before-declare errors)
  const getAttendanceKey = useCallback((studentId: number, periodNumber = 1, dateStr = selectedDateStr) =>
    `${studentId}|${periodNumber}|${dateStr}`,
    [selectedDateStr]
  );

  useEffect(() => {
    setExpandedStudents(new Set());
  }, [selectedCourse, selectedDateStr, getAttendanceKey]);

  useEffect(() => {
    if (!hasMultiplePeriods) {
      setShowPeriodBreakdown(false);
    }
  }, [hasMultiplePeriods]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };


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
  const dailyTrackableCategories = useMemo(() => [
    'Class Participation', t('classParticipation'),
    'Homework/Assignments', 'Homework', t('homework'),
    'Lab Work', t('labWork'),
    'Continuous Assessment', t('continuousAssessment'),
    'Quizzes', t('quizzes'),
    'Project', t('project'),
    'Presentation', t('presentation')
  ], [t]);

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
        const dailyCats = (course.evaluation_rules as EvaluationRule[]).filter((rule) =>
          dailyTrackableCategories.some((cat) => rule.category?.includes(cat) || rule.category?.toLowerCase?.().includes(cat.toLowerCase()))
        );
        setEvaluationCategories(dailyCats);
      } else {
        setEvaluationCategories([]);
      }
    } catch {
      setEvaluationCategories([]);
    }
  }, [selectedCourse, localCourses, dailyTrackableCategories]);

  // Sync local courses with props (only on initial mount or when props change)
  useEffect(() => {
    if (Array.isArray(courses) && courses.length > 0) {
      setLocalCourses(courses);
    } else if (!Array.isArray(courses) || courses.length === 0) {
      // If courses not available from props, try to fetch them from API
      const fetchCourses = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/courses?limit=999`);
          if (response.ok) {
            const data = await response.json();
            const courseList = Array.isArray(data) ? data : data.items || [];
            if (courseList.length > 0) {
              debugAttendance('Fetched courses from API:', courseList);
              setLocalCourses(courseList);
            }
          }
        } catch (err) {
          console.error('[AttendanceView] Error fetching courses from API:', err);
        }
      };

      // Only fetch if we haven't already tried
      if (localCourses.length === 0) {
        fetchCourses();
      }
    }
  }, [courses, localCourses]);

  // Determine which courses have at least one enrolled student
  // Only run when courses list changes length (not on every mutation)
  // const coursesLength = localCourses?.length || 0;
  const courseIds = useMemo(() => localCourses?.map(c => c.id).join(',') || '', [localCourses]);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!localCourses || localCourses.length === 0) { setCoursesWithEnrollment(new Set()); return; }

      // Only fetch if we have a new courseIds value and haven't fetched this combo yet
      const requestKey = `enrollments-${courseIds}`;
      if (activeRequestsRef.current.has(requestKey)) {
        return;
      }

      activeRequestsRef.current.add(requestKey);

      try {
        // Immediately set all courses as selectable to avoid long waits
        // The enrollment count is only used for filtering, not for functionality
        const allCourseIds = new Set<number>();
        localCourses.forEach(c => allCourseIds.add(c.id));
        setCoursesWithEnrollment(allCourseIds);

        // Process courses in smaller batches to avoid overwhelming the server
        // Use shorter timeout (5 seconds) per batch to avoid long waits on slow enrollments API
        const BATCH_SIZE = 3; // Fetch 3 courses at a time instead of all at once
        const results: Array<{ id: number; count: number }> = [];

        for (let i = 0; i < localCourses.length; i += BATCH_SIZE) {
          const batch = localCourses.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(async (c) => {
            try {
              // Add a 5-second timeout to enrollment checks
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              try {
                const r = await fetch(`${API_BASE_URL}/enrollments/course/${c.id}/students`, {
                  signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!r.ok) {
                  debugAttendance(`Fetch failed for course ${c.id}`);
                  return { id: c.id, count: 0 };
                }
                const arr = await r.json();
                debugAttendance(`Enrollments for course ${c.id}:`, arr);
                // Accept both array and object-with-items
                if (Array.isArray(arr)) {
                  return { id: c.id, count: arr.length };
                } else if (arr && Array.isArray(arr.items)) {
                  return { id: c.id, count: arr.items.length };
                } else {
                  return { id: c.id, count: 0 };
                }
              } catch (fetchErr) {
                clearTimeout(timeoutId);
                if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
                  debugAttendance(`Enrollment fetch timeout for course ${c.id}`);
                } else {
                  console.error(`[AttendanceView] Error fetching enrollments for course ${c.id}:`, fetchErr);
                }
                return { id: c.id, count: 0 };
              }
            } catch (err) {
              console.error(`[AttendanceView] Unexpected error for course ${c.id}:`, err);
              return { id: c.id, count: 0 };
            }
          }));
          results.push(...batchResults);

          // Small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < localCourses.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Update with actual enrollment counts if available
        const ids = new Set<number>();
        results.forEach(({ id, count }) => { if (count > 0) ids.add(id); });
        debugAttendance('coursesWithEnrollment (final):', Array.from(ids));
        // If we found courses with enrollments, use that; otherwise keep all courses available
        if (ids.size > 0) {
          setCoursesWithEnrollment(ids);
        }
      } catch (err) {
        console.error('[AttendanceView] Error in fetchEnrollments:', err);
        // Keep all courses available as fallback
        const allCourseIds = new Set<number>();
        localCourses.forEach(c => allCourseIds.add(c.id));
        setCoursesWithEnrollment(allCourseIds);
      } finally {
        activeRequestsRef.current.delete(requestKey);
      }
    };
    fetchEnrollments();
  }, [courseIds, localCourses]); // Also include localCourses to satisfy exhaustive-deps

  // Ensure selectedCourse is within the filtered list
  useEffect(() => {
    if (!selectedCourse) return;
    if (!coursesWithEnrollment.has(selectedCourse as number)) {
      const first = localCourses.find((c) => coursesWithEnrollment.has(c.id));
      setSelectedCourse(first ? first.id : '');
    }
  }, [coursesWithEnrollment, localCourses, selectedCourse]);

  // Auto-select first course when available
  useEffect(() => {
    // Do not auto-select course
    // Only set selectedCourse if user chooses
  }, [localCourses]);

  // Keep selected course up-to-date (teaching_schedule) by fetching details
  // Only run once when course is selected, not continuously
  useEffect(() => {
    const refreshSelectedCourse = async () => {
      if (!selectedCourse) return;
      const courseId = selectedCourse as number;
      if (courseDetailsFetchedRef.current.has(courseId)) return;

      try {
        const resp = await fetch(`${API_BASE_URL}/courses/${courseId}`);
        if (!resp.ok) throw new Error(`Failed to fetch course: ${resp.status} ${resp.statusText}`);
        const detail = await resp.json();
        setLocalCourses((prev) => {
          const idx = prev.findIndex((c) => c.id === courseId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...detail };
          return next;
        });
        courseDetailsFetchedRef.current.add(courseId);
      } catch { /* noop */ }
    };
    refreshSelectedCourse();
  }, [selectedCourse]); // Only depend on selectedCourse and fetched set

  // Load enrolled students for selected course
  useEffect(() => {
    const loadEnrolled = async () => {
      if (!selectedCourse) { setEnrolledStudents([]); return; }
      try {
        const resp = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}/students`);
        if (!resp.ok) throw new Error(`Failed to fetch enrollments: ${resp.status} ${resp.statusText}`);
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

    // Request deduplication key
    const requestKey = `attendance-${selectedCourse}-${dateStr}`;

    // Prevent duplicate concurrent requests
    if (activeRequestsRef.current.has(requestKey)) {
      console.warn('[AttendanceView] Skipping duplicate request:', requestKey);
      return;
    }

    activeRequestsRef.current.add(requestKey);

    try {
      const attRes = await apiClient.get(`/attendance/date/${dateStr}/course/${selectedCourse}`);
      const attData = Array.isArray(attRes) ? attRes : (attRes.data ? (Array.isArray(attRes.data) ? attRes.data : []) : []);
      const next: Record<string, string> = {};
      const ids: Record<string, number> = {};
      if (Array.isArray(attData)) {
        (attData as (RawAttendanceRecord & { id?: number })[]).forEach((a) => {
          if (!a?.student_id) return;
          const periodNumber = Number(a.period_number ?? 1);
          const safePeriod = Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1;
          const recordDate = formatLocalDate(a.date || dateStr);
          const key = getAttendanceKey(a.student_id, safePeriod, recordDate);
          next[key] = a.status;
          if (a.id) {
            ids[key] = a.id;
          }
        });
      }
      setAttendanceRecords(next);
      setAttendanceRecordIds(ids);
      setPersistedAttendanceRecords(next);

      let dpData: (RawDailyPerformanceRecord & { id?: number })[] = [];
      try {
        const dpRes = await apiClient.get(`/daily-performance/date/${dateStr}/course/${selectedCourse}`);
        dpData = Array.isArray(dpRes) ? dpRes : (dpRes.data ? (Array.isArray(dpRes.data) ? dpRes.data : []) : []);
      } catch (error) {
        // If 404, treat as no data
        if (isResponseLike(error) && error.response?.status === 404) {
          dpData = [];
        } else {
          console.error('[AttendanceView] Error fetching daily performance:', error);
        }
      }
      const dp: Record<string, number> = {};
      const dpIds: Record<string, number> = {};
      if (Array.isArray(dpData)) {
        (dpData as (RawDailyPerformanceRecord & { id?: number })[]).forEach((r) => {
          const key = `${r.student_id}-${r.category}`;
          dp[key] = r.score;
          if (r.id) {
            dpIds[key] = r.id;
          }
        });
      }
      setDailyPerformance(dp);
      setDailyPerformanceIds(dpIds);
      setPersistedDailyPerformance(dp);
    } catch (error) {
      console.error('[AttendanceView] Error fetching attendance:', error);
      setAttendanceRecords({});
      setAttendanceRecordIds({});
      setDailyPerformance({});
      setDailyPerformanceIds({});
      setPersistedAttendanceRecords({});
      setPersistedDailyPerformance({});
    } finally {
      activeRequestsRef.current.delete(requestKey);
    }
  }, [selectedCourse, selectedDateStr, getAttendanceKey]);

  // Always fetch attendance and performance from backend on date/course change
  useEffect(() => {
    // Only fetch if both course and date are selected
    if (selectedCourse && selectedDate) {
      // Clear state before fetch to avoid stale data
      setAttendanceRecords({});
      setAttendanceRecordIds({});
      setDailyPerformance({});
      setDailyPerformanceIds({});
      setPersistedAttendanceRecords({});
      setPersistedDailyPerformance({});
      // Fetch new data
      refreshAttendancePrefill();
    }
  }, [selectedCourse, selectedDate, refreshAttendancePrefill]);

  // Fetch dates with attendance records for the current month
  useEffect(() => {
    const fetchDatesWithAttendance = async () => {
      if (!selectedCourse) {
        setDatesWithAttendance(new Set());
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Request deduplication key
      const requestKey = `dates-${selectedCourse}-${year}-${month}`;

      // Prevent duplicate concurrent requests
      if (activeRequestsRef.current.has(requestKey)) {
        console.warn('[AttendanceView] Skipping duplicate dates request:', requestKey);
        return;
      }

      activeRequestsRef.current.add(requestKey);

      try {
        const data = await apiClient.get(`/attendance/course/${selectedCourse}`, { params: { start_date: startDate, end_date: endDate } });
        const attData = Array.isArray(data) ? data : (data.data ? (Array.isArray(data.data) ? data.data : []) : []);
        if (Array.isArray(attData)) {
          // Extract unique, timezone-safe dates from attendance records
          const uniqueDates = new Set<string>();
          attData.forEach((record: RawAttendanceRecord & { date?: string | undefined }) => {
              if (!record?.date) return;
              uniqueDates.add(formatLocalDate(record.date));
            });
          setDatesWithAttendance(uniqueDates);
        }
      } catch (error) {
        console.error('Failed to fetch attendance dates:', error);
        setDatesWithAttendance(new Set());
      } finally {
        activeRequestsRef.current.delete(requestKey);
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
  const isSelected = (date?: Date | null) => date && selectedDate ? date.toDateString() === selectedDate.toDateString() : false;

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
    if ((sched as TeachingScheduleEntry[]).length === 0) return true; // empty schedule -> allow all weekdays
    return (sched as TeachingScheduleEntry[]).some((p: TeachingScheduleEntry) =>
        p.day === dayName ||
        p.day === dayName.toLowerCase() ||
        p.day === String(weekdayIndex) ||
        parseInt(p.day, 10) === weekdayIndex
      );
    }
    if (typeof sched === 'object') {
      const keys = Object.keys(sched as Record<string, TeachingScheduleEntry | undefined>);
      if (keys.length === 0) return true; // empty map -> allow all weekdays
      return Boolean(
        (sched as Record<string, TeachingScheduleEntry | undefined>)[dayName] ||
        (sched as Record<string, TeachingScheduleEntry | undefined>)[dayName.toLowerCase()] ||
        (sched as Record<string, TeachingScheduleEntry | undefined>)[String(weekdayIndex)]
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
  }, [attendanceRecords, enrolledStudents, activePeriods, getAttendanceKey]);

  const statusOrder = [...ATTENDANCE_STATES];
  const coveragePercent = attendanceAnalytics.totalSlots
    ? Math.round((attendanceAnalytics.recordedSlots / attendanceAnalytics.totalSlots) * 100)
    : 0;

  const setPerformanceScore = (studentId: number, category: string, score: number | string) => {
    const key = `${studentId}-${category}`;
    const val = typeof score === 'string' ? parseFloat(score) : score;
    setDailyPerformance((prev) => ({ ...prev, [key]: val }));
  };

  const performSave = useCallback(async () => {
    if (!selectedCourse) { showToast(t('selectCourse') || 'Select course', 'error'); return; }
    setLoading(true);
    try {
      const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
      console.warn('[Attendance] Saving - attendanceRecords:', attendanceRecords);
      console.warn('[Attendance] Saving - recordIds:', attendanceRecordIds);

      const attendancePromises = Object.entries(attendanceRecords).map(([key, status]) => {
        const recordId = attendanceRecordIds[key];
        const tokens = key.includes('|') ? key.split('|') : key.split('-');
        const [studentIdStr, periodNumberStr, storedDate] = tokens;
        const studentId = parseInt(studentIdStr, 10);
        if (!studentId) return Promise.resolve(null);
        const periodNumber = periodNumberStr ? parseInt(periodNumberStr, 10) : 1;
        const payloadDate = storedDate || dateStr;

        // If record has an ID from API, use PUT to update; otherwise POST to create
        if (recordId) {
          console.warn(`[Attendance] PUT /attendance/${recordId} - status: ${status}`);
          return apiClient.put(`/attendance/${recordId}`, { status })
            .then(res => {
              console.warn(`[Attendance] PUT response: success`);
              return res;
            })
              .catch(error => {
              // If record doesn't exist (404), create it instead
              if (isResponseLike(error) && error.response?.status === 404) {
                console.warn(`[Attendance] Record ${recordId} not found, creating new record`);
                return apiClient.post(`/attendance/`, {
                  student_id: studentId,
                  course_id: selectedCourse,
                  date: payloadDate,
                  status,
                  period_number: Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1,
                  notes: '',
                }).then(res => {
                  console.warn(`[Attendance] POST response (fallback): success`);
                  return res;
                });
              }
              throw error;
            });
        } else {
          console.warn(`[Attendance] POST /attendance - student: ${studentId}, status: ${status}`);
          return apiClient.post(`/attendance/`, {
            student_id: studentId,
            course_id: selectedCourse,
            date: payloadDate,
            status,
            period_number: Number.isFinite(periodNumber) && periodNumber > 0 ? periodNumber : 1,
            notes: '',
          }).then(res => {
            console.warn(`[Attendance] POST response: success`);
            return res;
          });
        }
      });

      const performancePromises = Object.entries(dailyPerformance).map(([key, score]) => {
        const recordId = dailyPerformanceIds[key];
        const [studentIdStr, category] = key.split('-');
        // Validate recordId: must be a positive integer
        const isValidId = Number.isInteger(recordId) && recordId > 0;
        console.warn(`[Performance] recordId for key '${key}':`, recordId, 'isValidId:', isValidId);
        if (isValidId) {
          const url = `/daily-performance/${recordId}`;
          console.warn(`[Performance] PUT ${url} - score: ${score}`);
          return apiClient.put(url, { score, max_score: 10.0 })
            .then(res => {
              console.warn(`[Performance] PUT response: success`);
              return res;
            })
            .catch(error => {
              // If record doesn't exist (404), create it instead
              if (isResponseLike(error) && error.response?.status === 404) {
                console.warn(`[Performance] Record ${recordId} not found, creating new record`);
                return apiClient.post(`/daily-performance/`, {
                  student_id: parseInt(studentIdStr, 10),
                  course_id: selectedCourse,
                  date: dateStr,
                  category,
                  score,
                  max_score: 10.0,
                  notes: ''
                }).then(res => {
                  // Update dailyPerformanceIds with new ID from response
                  if (res?.data?.id) {
                    setDailyPerformanceIds(prev => ({ ...prev, [key]: res.data.id }));
                  }
                  return res;
                });
              }
              throw error;
            });
        } else {
          // Always use POST if recordId is not valid
          return apiClient.post(`/daily-performance/`, {
            student_id: parseInt(studentIdStr, 10),
            course_id: selectedCourse,
            date: dateStr,
            category,
            score,
            max_score: 10.0,
            notes: ''
          }).then(res => {
            // Update dailyPerformanceIds with new ID from response
            if (res?.data?.id) {
              setDailyPerformanceIds(prev => ({ ...prev, [key]: res.data.id }));
            }
            return res;
          });
        }
      });

      // Process requests in chunks to avoid overwhelming the server
      // With 200/min limit, we can safely process 30 concurrent requests
      const allPromises = [...attendancePromises, ...performancePromises];
      const CHUNK_SIZE = 30; // Process 30 at a time for faster saves

      for (let i = 0; i < allPromises.length; i += CHUNK_SIZE) {
        const chunk = allPromises.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk);

        // Small delay only if there are more chunks to prevent server overload
        if (i + CHUNK_SIZE < allPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Emit events to notify other components that attendance/performance changed
      // Extract unique student IDs from the records
      const affectedStudentIds = new Set<number>();
      Object.keys(attendanceRecords).forEach(key => {
        const tokens = key.includes('|') ? key.split('|') : key.split('-');
        const studentId = parseInt(tokens[0], 10);
        if (studentId) affectedStudentIds.add(studentId);
      });
      Object.keys(dailyPerformance).forEach(key => {
        const studentId = parseInt(key.split('-')[0], 10);
        if (studentId) affectedStudentIds.add(studentId);
      });

      affectedStudentIds.forEach(studentId => {
        eventBus.emit(EVENTS.ATTENDANCE_BULK_ADDED, { studentId, courseId: selectedCourse });
        eventBus.emit(EVENTS.DAILY_PERFORMANCE_ADDED, { studentId, courseId: selectedCourse });
      });

      // Mark current state as persisted before attempting a refresh; this prevents the
      // autosave banner from sticking if a post-save refresh fails intermittently.
      setPersistedAttendanceRecords(attendanceRecords);
      setPersistedDailyPerformance(dailyPerformance);

      await refreshAttendancePrefill();
      // After refreshAttendancePrefill, state is synced with backend.
      // Keep the fetched values so dirty detection sees a clean state.
      showToast(t('savedSuccessfully') || 'Saved successfully', 'success');
    } catch (e) {
      console.error('[Attendance] Save error:', e);
      showToast(t('saveFailed') || 'Save failed', 'error');
      throw e; // Re-throw for autosave error handling
    } finally { setLoading(false); }
  }, [selectedCourse, selectedDate, attendanceRecords, attendanceRecordIds, dailyPerformance, dailyPerformanceIds, t, refreshAttendancePrefill]);

  // Autosave when attendance or performance changes
  // Only show pending if there are unsaved changes (local state differs from last fetched DB state)
  // Only show pending if there are unsaved changes after user interaction
  const hasDirtyAttendance = useMemo(
    () => !shallowEqualStringMap(attendanceRecords, persistedAttendanceRecords),
    [attendanceRecords, persistedAttendanceRecords]
  );
  const hasDirtyPerformance = useMemo(
    () => !shallowEqualNumberMap(dailyPerformance, persistedDailyPerformance),
    [dailyPerformance, persistedDailyPerformance]
  );

  const hasChanges = Boolean(selectedCourse && selectedDate && (hasDirtyAttendance || hasDirtyPerformance));
  const { isSaving: isAutosaving, isPending: autosavePending } = useAutosave(
    performSave,
    [attendanceRecords, dailyPerformance],
    {
      delay: 2000,
      enabled: hasChanges,
      skipInitial: true,
    }
  );

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
        {/* Autosave Indicator */}
        {(isAutosaving || autosavePending) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            <CloudUpload size={16} className={isAutosaving ? 'animate-pulse text-blue-600' : 'text-gray-400'} />
            <span>{isAutosaving ? (t('saving') || 'Saving...') : (t('autosavePending') || 'Changes pending...')}</span>
          </div>
        )}
      </div>

      {isHistoricalMode && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
          {t('historicalModeBanner') || 'Historical mode enabled'} — {selectedDateStr}
        </div>
      )}

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
            <select
              name="courseId"
              aria-label={t('course') || 'Course'}
              title={t('course') || 'Course'}
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full px-3 py-2 border rounded"
              data-testid="attendance-course-select"
            >
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
          <button onClick={clearAllAttendance} className="w-full sm:w-auto px-3 py-2 rounded bg-gray-700 text-white flex items-center justify-center sm:justify-start gap-2 hover:bg-gray-800">{t('clear') || 'Clear'}</button>
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
              <p className="text-[11px] uppercase tracking-wide font-semibold text-indigo-700">{translateStatusLabel(status)}</p>
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
                          <p className="text-[11px] text-indigo-700">{translateStatusLabel(status)}</p>
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
          <h3 className="text-lg font-bold">{t('markAttendanceFor') || 'Mark attendance for'} — {selectedDate ? selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('noDateSelected') || 'No date selected'}</h3>
        </div>

        <div className="space-y-3">
          {(enrolledStudents && enrolledStudents.length > 0 && selectedDate ? enrolledStudents : []).map((s) => {
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
            <p className="text-sm text-gray-600 mb-3">{t('rateStudentPerformanceFor') || 'Rate for'} {selectedDate ? selectedDate.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>

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
                              <div className="text-[11px] text-indigo-700">{t('outOf10') || 'out of 10'}</div>
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
                          <div className="flex justify-between text-[11px] text-indigo-700"><span>{t('poor') || 'Poor'} (0)</span><span>{t('averageRating') || t('average') || 'Average'} (5)</span><span>{t('excellent') || 'Excellent'} (10)</span></div>
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
