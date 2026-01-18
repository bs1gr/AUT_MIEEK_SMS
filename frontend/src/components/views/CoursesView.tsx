// CourseManagement.tsx v2.0
// Location: frontend/src/components/views/CoursesView.tsx
// Enhanced with teaching schedule management and hours per week

import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Trash2, Save, AlertCircle, BookOpen, Calculator, Clock, Calendar as CalendarIcon, Download } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { generateCourseScheduleICS, downloadICS } from '../../utils/calendarUtils';
import { getLocalizedCategory, getCanonicalCategory } from '../../utils/categoryLabels';

const API_BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api/v1';

// ---- Types ----
type Rule = { category: string; weight: string | number; description?: string };
type DaySchedule = { periods: number; start_time: string; duration: number };
type TeachingScheduleItem = { day: string; periods: number; start_time: string; duration: number };
type CourseUpdatePayload = {
  evaluation_rules: Rule[];
  teaching_schedule: TeachingScheduleItem[];
  hours_per_week: number;
};
type StudentLite = {
  id: number;
  first_name: string;
  last_name: string;
  student_id: string;
  study_year?: number;
};
type EnrollmentLite = { course_id: number };
type ScheduleConflict = {
  student: string;
  studentYear: number | string;
  course: string;
  day: string;
  time: string;
  conflictTime: string;
};
type PaginatedResponse<T> = { items: T[]; total?: number; skip?: number; limit?: number };
type CourseType = {
  id: number;
  course_code: string;
  course_name: string;
  semester?: string;
  credits?: number;
  description?: string;
  evaluation_rules?: Rule[];
  teaching_schedule?: Record<string, DaySchedule>;
  hours_per_week?: number;
};
type ToastType = { message: string; type: 'success' | 'error' | 'info' };

const CourseManagement = ({ onAddCourse, onEdit, onDelete }: { onAddCourse?: () => void; onEdit?: (course: CourseType) => void; onDelete?: (courseId: number) => void }) => {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [evaluationRules, setEvaluationRules] = useState<Rule[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DaySchedule>>({});
  const [, setHoursPerWeek] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastType | null>(null);
  const [activeTab, setActiveTab] = useState('evaluation'); // 'evaluation' | 'schedule' | 'enrollment'
  const [allStudents, setAllStudents] = useState<StudentLite[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentLite[]>([]);
  const [selectedToEnroll, setSelectedToEnroll] = useState<number[]>([]);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState<boolean>(false);

  // Common grade categories using translations (bilingual labels for datalist)
  const commonCategories = [
    { en: 'Class Participation', translated: t('classParticipation') },
    { en: 'Homework/Assignments', translated: t('homework') },
    { en: 'Continuous Assessment', translated: t('continuousAssessment') },
    { en: 'Quizzes', translated: t('quizzes') },
    { en: 'Midterm Exam', translated: t('midtermExam') },
    { en: 'Final Exam', translated: t('finalExam') },
    { en: 'Lab Work', translated: t('labWork') },
    { en: 'Project', translated: t('project') },
    { en: 'Presentation', translated: t('presentation') }
  ];

  // Fixed: weekDays now properly stores both English and translated names
  const weekDays = [
    { en: 'Monday', el: 'Δευτέρα', translated: t('monday') },
    { en: 'Tuesday', el: 'Τρίτη', translated: t('tuesday') },
    { en: 'Wednesday', el: 'Τετάρτη', translated: t('wednesday') },
    { en: 'Thursday', el: 'Πέμπτη', translated: t('thursday') },
    { en: 'Friday', el: 'Παρασκευή', translated: t('friday') }
  ];

  // Initial load moved below where the callbacks are defined to avoid TDZ issues

  // loadCourseData effect moved below callback definitions to avoid TDZ issues

  // Reset pending selections when switching courses
  useEffect(() => {
    setSelectedToEnroll([]);
  }, [selectedCourse]);

  const showToast = useCallback((message: string, type: ToastType['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadAllStudents = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/students/`);
      const data = await resp.json();
      // Normalize PaginatedResponse to array
      const studentsArray: StudentLite[] = (data && (data as PaginatedResponse<StudentLite>).items)
        ? (data as PaginatedResponse<StudentLite>).items
        : (Array.isArray(data) ? (data as StudentLite[]) : []);
      setAllStudents(studentsArray);
    } catch {
      showToast(t('failedToLoadData'), 'error');
    }
  }, [showToast, t]);

  const loadEnrolledStudents = useCallback(async () => {
    if (!selectedCourse) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}/students`);
      const data = await resp.json();
      setEnrolledStudents(Array.isArray(data) ? data : []);
    } catch {
      setEnrolledStudents([]);
    }
  }, [selectedCourse]);

  const enrollSelected = async () => {
    if (!selectedCourse || selectedToEnroll.length === 0) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selectedToEnroll })
      });
      if (!resp.ok) throw new Error('fail');
      showToast(t('studentsEnrolled') || 'Students enrolled', 'success');
      setSelectedToEnroll([]);
      loadEnrolledStudents();
    } catch {
      showToast(t('failedToSaveData'), 'error');
    }
  };

  const unenroll = async (studentId: number) => {
    if (!selectedCourse) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}/student/${studentId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('fail');
      showToast(t('studentUnenrolled') || 'Student unenrolled', 'success');
      loadEnrolledStudents();
    } catch {
      showToast(t('failedToSaveData'), 'error');
    }
  };

  const loadCourses = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/`);
      const data = await response.json();
      // Backend returns PaginatedResponse { items, total, skip, limit }
      // Normalize to array for UI
      const coursesArray = data?.items ? data.items : (Array.isArray(data) ? data : []);
      setCourses(coursesArray as CourseType[]);
    } catch {
      showToast(t('failedToLoadData'), 'error');
    }
  }, [showToast, t]);

  // Initial load needs to run after callbacks are declared
  useEffect(() => {
    loadCourses();
    loadAllStudents();
  }, [loadCourses, loadAllStudents]);

  const loadCourseData = useCallback(() => {
    const course = courses.find((c) => c.id === selectedCourse!);
    if (course) {
      setEvaluationRules((course.evaluation_rules as Rule[]) || []);

      // Fix: Convert array format to Record format for weeklySchedule
      let scheduleRecord: Record<string, DaySchedule> = {};
      if (course.teaching_schedule) {
        if (Array.isArray(course.teaching_schedule)) {
          // Backend stores as array, convert to Record
          (course.teaching_schedule as TeachingScheduleItem[]).forEach((item) => {
            if (item.day) {
              scheduleRecord[item.day] = {
                periods: item.periods || 1,
                start_time: item.start_time || '17:00',
                duration: item.duration || 45
              };
            }
          });
        } else {
          // Already in Record format
          scheduleRecord = course.teaching_schedule as Record<string, DaySchedule>;
        }
      }
      setWeeklySchedule(scheduleRecord);
      setHoursPerWeek(course.hours_per_week || 0);
    } else {
      setEvaluationRules([]);
      setWeeklySchedule({});
      setHoursPerWeek(0);
    }
  }, [courses, selectedCourse]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData();
      loadEnrolledStudents();
    }
  }, [selectedCourse, courses, loadCourseData, loadEnrolledStudents]);

  // Evaluation Rules Functions
  const addRule = () => {
    setEvaluationRules([
      ...evaluationRules,
      { category: '', weight: '', description: '' }
    ]);
  };

  const updateRule = (index: number, field: keyof Rule, value: string | number) => {
    const newRules = [...evaluationRules];
    const updated: Rule = { ...newRules[index], [field]: value } as Rule;
    newRules[index] = updated;
    setEvaluationRules(newRules);
  };

  const removeRule = (index: number) => {
    setEvaluationRules(evaluationRules.filter((_, i) => i !== index));
  };

  const validateRules = () => {
    if (evaluationRules.length === 0) {
      showToast(t('pleaseAddRule'), 'error');
      return false;
    }

    const totalWeight = evaluationRules.reduce((sum, rule) => {
      return sum + (parseFloat(String(rule.weight)) || 0);
    }, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast(`${t('totalWeight')} ${totalWeight.toFixed(1)}%. ${t('totalMustEqual')}`, 'error');
      return false;
    }

    for (const rule of evaluationRules) {
      if (!rule.category || !rule.weight) {
        showToast(t('allRulesRequired'), 'error');
        return false;
      }
    }

    return true;
  };

  // Weekly Schedule Functions
  const toggleDay = (dayEn: string) => {
    setWeeklySchedule((prev) => {
      const newSchedule = { ...prev } as Record<string, DaySchedule>;
      if (newSchedule[dayEn]) {
        delete newSchedule[dayEn];
      } else {
        // Default: 45 minutes periods starting at 17:00 (5:00 PM)
        newSchedule[dayEn] = {
          periods: 1,
          start_time: '17:00',
          duration: 45
        };
      }
      return newSchedule;
    });
  };

  const updateDaySchedule = (dayEn: string, field: keyof DaySchedule, value: string | number) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [dayEn]: {
        ...prev[dayEn],
        [field]: field === 'periods' || field === 'duration' ? parseInt(String(value)) : String(value)
      }
    }));
  };

  const calculateTotalHours = () => {
    let total = 0;
    Object.values(weeklySchedule as Record<string, DaySchedule>).forEach((day) => {
      if (day.periods && day.duration) {
        total += (day.periods || 0) * ((day.duration || 0) / 60);
      }
    });
    return total.toFixed(1);
  };

  // Check for schedule conflicts with other courses (year-based)
  const checkScheduleConflicts = async (): Promise<ScheduleConflict[]> => {
    if (!selectedCourse || Object.keys(weeklySchedule).length === 0) {
      setScheduleConflicts([]);
      return [];
    }

    try {
      // Get current course info
      const currentCourse = courses.find(c => c.id === selectedCourse);
      if (!currentCourse) return [];

      // Get enrolled students for this course
      const enrolledResponse = await fetch(`${API_BASE_URL}/enrollments/course/${selectedCourse}/students`);
      const enrolled: StudentLite[] = await enrolledResponse.json();

      if (!Array.isArray(enrolled) || enrolled.length === 0) {
        setScheduleConflicts([]);
        return [];
      }

      // Group students by study year
      const studentsByYear: Record<number, StudentLite[]> = {};
      for (const student of enrolled) {
        const year = student.study_year || 0;
        if (!studentsByYear[year]) {
          studentsByYear[year] = [];
        }
        studentsByYear[year].push(student);
      }

      // Get all enrollments for these students
      const conflicts: ScheduleConflict[] = [];

      for (const studentsInYear of Object.values(studentsByYear)) {
        for (const student of studentsInYear) {
          // Get student's other courses via enrollments
          const studentEnrollmentsResponse = await fetch(`${API_BASE_URL}/enrollments/student/${student.id}`);
          const studentEnrollments: EnrollmentLite[] = await studentEnrollmentsResponse.json();

          if (!Array.isArray(studentEnrollments)) continue;

          // Check each enrollment's course schedule for conflicts
          for (const enrollment of studentEnrollments) {
            if (enrollment.course_id === selectedCourse) continue; // Skip current course

            const otherCourse = courses.find(c => c.id === enrollment.course_id);
            if (!otherCourse || !otherCourse.teaching_schedule) continue;

            // Convert other course schedule to Record format
            let otherSchedule: Record<string, DaySchedule> = {};
            if (Array.isArray(otherCourse.teaching_schedule)) {
              (otherCourse.teaching_schedule as TeachingScheduleItem[]).forEach((item) => {
                if (item.day) {
                  otherSchedule[item.day] = {
                    periods: item.periods || 1,
                    start_time: item.start_time || '17:00',
                    duration: item.duration || 45
                  };
                }
              });
            } else {
              otherSchedule = otherCourse.teaching_schedule as Record<string, DaySchedule>;
            }

            // Check for overlapping days and times
            for (const [day, schedule] of Object.entries(weeklySchedule)) {
              if (otherSchedule[day]) {
                const currentStart = schedule.start_time;
                const currentDuration = schedule.duration * schedule.periods;
                const otherStart = otherSchedule[day].start_time;
                const otherDuration = otherSchedule[day].duration * otherSchedule[day].periods;

                // Convert times to minutes for comparison
                const timeToMinutes = (timeStr: string) => {
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  return hours * 60 + minutes;
                };

                const currentStartMin = timeToMinutes(currentStart);
                const currentEndMin = currentStartMin + currentDuration;
                const otherStartMin = timeToMinutes(otherStart);
                const otherEndMin = otherStartMin + otherDuration;

                // Check for time overlap: Two time periods overlap if one starts before the other ends
                const hasOverlap = (currentStartMin < otherEndMin) && (otherStartMin < currentEndMin);

                if (hasOverlap) {
                  conflicts.push({
                    student: `${student.first_name} ${student.last_name}`,
                    studentYear: student.study_year || 'Unknown',
                    course: `${otherCourse.course_code} - ${otherCourse.course_name}`,
                    day,
                    time: currentStart,
                    conflictTime: otherStart
                  });
                }
              }
            }
          }
        }
      }

      setScheduleConflicts(conflicts);
      if (conflicts.length > 0) {
        setShowConflictWarning(true);
      }
      return conflicts;
    } catch (err) {
      console.error('Error checking conflicts:', err);
      return [];
    }
  };

  const saveCourseData = async () => {
    if (activeTab === 'evaluation' && !validateRules()) return;

    // Check for schedule conflicts before saving
    if (activeTab === 'schedule') {
      const foundConflicts = await checkScheduleConflicts();
      if (foundConflicts.length > 0 && !showConflictWarning) {
        // Conflicts found but warning wasn't shown yet - show it and don't save
        setShowConflictWarning(true);
        return;
      }
    }

    setLoading(true);
    try {
      const calculatedHours = parseFloat(calculateTotalHours());

      // Convert weeklySchedule (Record) to list of day objects expected by backend schema
      const scheduleList: TeachingScheduleItem[] = Object.entries(weeklySchedule || {}).map(([dayEn, cfg]) => ({
        day: dayEn,
        periods: Number(cfg.periods) || 0,
        start_time: cfg.start_time || '08:00',
        duration: Number(cfg.duration) || 0,
      }));

      // Validate hours_per_week backend constraint (>= 0.5) when schedule is provided
      if ((scheduleList?.length || 0) > 0 && (!Number.isFinite(calculatedHours) || calculatedHours < 0.5)) {
        showToast(t('hoursPerWeekTooLow') || 'Hours per week must be at least 0.5 when a schedule is set', 'error');
        setLoading(false);
        return;
      }

      // Build payload with hours_per_week
      // Normalize evaluation rule category names to canonical English before saving
      const normalizedRules = (evaluationRules || []).map((r) => ({
        ...r,
        category: getCanonicalCategory(String(r.category || ''), t),
      }));

      const payload: CourseUpdatePayload = {
        evaluation_rules: normalizedRules,
        teaching_schedule: scheduleList,
        hours_per_week: Number.isFinite(calculatedHours) ? calculatedHours : 0,
      };

      await fetch(`${API_BASE_URL}/courses/${selectedCourse}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showToast(t('courseDataSaved'), 'success');
      loadCourses();
    } catch {
      showToast(t('failedToSaveData'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSchedule = () => {
    try {
      if (!currentCourse) {
        showToast(t('pleaseSelectCourse'), 'error');
        return;
      }

      // Convert weeklySchedule to array format expected by calendar utils
      const scheduleArray = Object.entries(weeklySchedule || {}).map(([day, cfg]) => ({
        day,
        startTime: cfg.start_time || '17:00',
        endTime: calculateEndTime(cfg.start_time || '17:00', cfg.duration || 0),
        location: '', // Could be added to schedule config later
      }));

      if (scheduleArray.length === 0) {
        showToast(t('noScheduleToExport'), 'error');
        return;
      }

      const courseData = {
        course_code: currentCourse.course_code,
        course_name: currentCourse.course_name,
        semester: currentCourse.semester || t('currentSemester'),
        teaching_schedule: scheduleArray,
      };

      // Generate ICS content
      const icsContent = generateCourseScheduleICS(courseData);

      // Download file
      const filename = `${currentCourse.course_code}_schedule.ics`;
      downloadICS(icsContent, filename);

      showToast(t('scheduleExported'), 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast(t('scheduleExportError'), 'error');
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const getTotalWeight = () => {
    return evaluationRules.reduce((sum, rule) => {
      return sum + (parseFloat(String(rule.weight)) || 0);
    }, 0);
  };

  const totalWeight = getTotalWeight();
  const isValidTotal = Math.abs(totalWeight - 100) < 0.01;
  const calculatedHours = calculateTotalHours();
  const hasSchedule = Object.keys(weeklySchedule || {}).length > 0;
  const hoursOk = !hasSchedule || parseFloat(calculatedHours) >= 0.5;

  const currentCourse = courses.find((c) => c.id === (selectedCourse as number));

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
            <Settings className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{t('courseManagementTitle')}</h2>
            <p className="text-gray-600">{t('configureCourseSettings')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onAddCourse && onAddCourse()}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:shadow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={t('addCourse')}
          >
            <Plus size={18} />
            <span>{t('addCourse')}</span>
          </button>
          {selectedCourse && (
            <>
              <button
                onClick={() => currentCourse && onEdit && onEdit(currentCourse)}
                className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t('editCourse')}
              >
                <Settings size={16} />
                <span>{t('editCourse')}</span>
              </button>
              <button
                onClick={() => selectedCourse && onDelete && onDelete(selectedCourse)}
                className="inline-flex items-center space-x-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label={t('delete')}
              >
                <Trash2 size={16} />
                <span>{t('delete')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="course-select">{t('selectCourseForRules')}</label>
        <select
          id="course-select"
          value={selectedCourse || ''}
          onChange={(e) => setSelectedCourse(parseInt(e.target.value) || null)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          title={t('selectCourseForRules')}
        >
          <option value="">{t('chooseCourse')}</option>
          {courses.map((course: CourseType) => (
            <option key={course.id} value={course.id}>
              {course.course_code} - {course.course_name}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'evaluation'
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calculator size={20} />
                <span>{t('evaluationRules')}</span>
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'schedule'
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon size={20} />
                <span>{t('teachingSchedule')}</span>
              </button>
              <button
                onClick={() => setActiveTab('enrollment')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'enrollment'
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BookOpen size={20} />
                <span>{t('enrollment') || 'Enrollment'}</span>
              </button>
            </div>

            {/* Evaluation Rules Tab */}
            {activeTab === 'evaluation' && (
              <div className="p-6">
                {evaluationRules.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600">{t('currentRules') || 'Current evaluation rules'}:</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {evaluationRules.map((rule, idx) => {
                        const w = parseFloat(String(rule.weight));
                        const weightStr = Number.isFinite(w) ? `${w}%` : '';
                        const localizedCategory = getLocalizedCategory(String(rule.category || ''), t);
                        return (
                          <span key={`rule-pill-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 border border-indigo-200 text-indigo-800">
                            <span className="font-medium">{localizedCategory || '-'}</span>
                            {weightStr && <span className="ml-1 text-indigo-600">{weightStr}</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">{t('gradingComponents')}</h3>
                  <button
                    onClick={addRule}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Plus size={18} />
                    <span>{t('addRule')}</span>
                  </button>
                </div>

                {evaluationRules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                    <p>{t('noRulesDefined')}</p>
                    <p className="text-sm">{t('clickToStart')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluationRules.map((rule, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-5">
                            <label htmlFor={`category-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                              {t('categoryName')}
                            </label>
                            <input
                              id={`category-${index}`}
                              type="text"
                              value={rule.category}
                              onChange={(e) => updateRule(index, 'category', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                              placeholder={`${t('exampleLabel')}: ${t('midtermExam')}`}
                              list={`categories-${index}`}
                            />
                            <datalist id={`categories-${index}`}>
                              {commonCategories.map((cat, i) => (
                                <option key={i} value={cat.translated} label={`${cat.en} / ${cat.translated}`} />
                              ))}
                            </datalist>
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor={`weight-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                              {t('weight')}
                            </label>
                            <input
                              id={`weight-${index}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={rule.weight}
                              onChange={(e) => updateRule(index, 'weight', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                              placeholder="20"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <label htmlFor={`description-${index}`} className="block text-xs font-medium text-gray-600 mb-1">
                              {t('ruleDescription')}
                            </label>
                            <input
                              id={`description-${index}`}
                              type="text"
                              value={rule.description || ''}
                              onChange={(e) => updateRule(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                              placeholder={t('optional')}
                            />
                          </div>

                          <div className="md:col-span-1 flex items-end">
                            <button
                              onClick={() => removeRule(index)}
                              className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              title={t('remove')}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className={`mt-6 p-4 rounded-lg border-2 ${isValidTotal ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{t('totalWeight')}</span>
                        <span className={`text-2xl font-bold ${isValidTotal ? 'text-green-600' : 'text-orange-600'}`}>
                          {totalWeight.toFixed(1)}%
                        </span>
                      </div>
                      {!isValidTotal && (
                        <p className="text-sm text-orange-600 mt-2 flex items-center space-x-1">
                          <AlertCircle size={16} />
                          <span>{t('totalMustEqual')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teaching Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{t('weeklyTeachingSchedule')}</h3>
                    <p className="text-gray-600">{t('configureWeeklyDistribution')}</p>
                  </div>
                  {hasSchedule && (
                    <button
                      onClick={handleExportSchedule}
                      className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                      title={t('exportScheduleToCalendar')}
                    >
                      <Download size={18} />
                      <span>{t('exportSchedule')}</span>
                    </button>
                  )}
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('totalHoursPerWeek')}</p>
                      <p className="text-3xl font-bold text-indigo-600">{calculatedHours}</p>
                      <p className="text-xs text-gray-500">{t('hours')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('teachingDays')}</p>
                      <p className="text-3xl font-bold text-purple-600">{Object.keys(weeklySchedule).length}</p>
                      <p className="text-xs text-gray-500">{t('daysPerWeek')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('totalPeriods')}</p>
                      <p className="text-3xl font-bold text-green-600">
                        {Object.values(weeklySchedule).reduce((sum, day) => sum + (day.periods || 0), 0)}
                      </p>
                      <p className="text-xs text-gray-500">{t('periodsPerWeek')}</p>
                    </div>
                  </div>
                  {hasSchedule && !hoursOk && (
                    <div className="mt-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
                      {t('hoursPerWeekTooLow') || 'Hours per week must be at least 0.5 when a schedule is set.'}
                    </div>
                  )}
                </div>

                {/* Schedule Information Panel */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6 border-2 border-purple-200">
                  <div className="flex items-start space-x-3">
                    <Clock size={24} className="text-purple-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 mb-2">{t('scheduleNote')}</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p className="flex items-center space-x-2">
                          <span className="font-semibold">{t('intermissionInfo')}:</span>
                        </p>
                        <p className="ml-4">• {t('intermission1')}</p>
                        <p className="ml-4">• {t('intermission2')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Conflict Warning */}
                {showConflictWarning && scheduleConflicts.length > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 mb-6 border-2 border-red-300">
                    <div className="flex items-start space-x-3">
                      <AlertCircle size={28} className="text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 text-lg mb-2">{t('scheduleConflictDetected')}</h4>
                        <p className="text-red-700 mb-3">{t('scheduleConflictWarning')}</p>

                        <div className="bg-white rounded-lg p-3 border border-red-200">
                          <p className="font-semibold text-gray-800 mb-2">{t('conflictDetails')}:</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {scheduleConflicts.slice(0, 10).map((conflict, idx) => (
                              <div key={idx} className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                                <p className="font-semibold">{conflict.student} <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{t('year')} {conflict.studentYear}</span></p>
                                <p className="text-gray-600">{conflict.course}</p>
                                <p className="text-xs text-gray-500">{conflict.day}: {conflict.time} ↔ {conflict.conflictTime}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 mt-4">
                          <button
                            onClick={() => setShowConflictWarning(false)}
                            className="bg-white border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            {t('editSchedule')}
                          </button>
                          <button
                            onClick={async () => {
                              setShowConflictWarning(false);
                              setScheduleConflicts([]);
                              // Proceed with save after clearing warning
                              await saveCourseData();
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            {t('saveAnyway')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Week Days Schedule */}
                <div className="space-y-4">
                  {weekDays.map(day => {
                    const isActive = weeklySchedule[day.en];
                    const dayData = weeklySchedule[day.en] || { periods: 1, start_time: '17:00', duration: 45 };

                    return (
                      <div
                        key={day.en}
                        className={`rounded-lg border-2 transition-all ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-500'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleDay(day.en)}
                                className={`w-6 h-6 rounded border-2 transition-all ${
                                  isActive
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'border-gray-300 hover:border-indigo-400'
                                }`}
                              >
                                {isActive && (
                                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div>
                                <p className={`font-bold ${isActive ? 'text-indigo-900' : 'text-gray-700'}`}>
                                  {day.translated}
                                </p>
                                {isActive && (
                                  <span>
                          {t('scheduleCompact', { start: sched.start_time, periods: sched.periods, duration: sched.duration })}
                        </span>
                                )}
                              </div>
                            </div>
                            {isActive && (
                              <div className="text-right">
                                <p className="text-2xl font-bold text-indigo-600">
                                  {(dayData.periods * dayData.duration / 60).toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-600">{t('hours')}</p>
                              </div>
                            )}
                          </div>

                          {isActive && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-indigo-200">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`periods-${day.en}`}>
                                  {t('numberOfPeriods')}
                                </label>
                                <input
                                  id={`periods-${day.en}`}
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={dayData.periods}
                                  onChange={(e) => updateDaySchedule(day.en, 'periods', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  title={t('numberOfPeriods')}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`starttime-${day.en}`}>
                                  {t('startTime')}
                                </label>
                                <input
                                  id={`starttime-${day.en}`}
                                  type="time"
                                  value={dayData.start_time}
                                  onChange={(e) => updateDaySchedule(day.en, 'start_time', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  title={t('startTime')}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`duration-${day.en}`}>
                                  {t('periodDuration')} ({t('minutes')})
                                </label>
                                <select
                                  id={`duration-${day.en}`}
                                  value={dayData.duration}
                                  onChange={(e) => updateDaySchedule(day.en, 'duration', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  title={`${t('periodDuration')} (${t('minutes')})`}
                                >
                                  <option value="45">{t('durationOptionDefault', { minutes: 45, minuteLabel: t('minutes'), defaultLabel: t('default') })}</option>
                                  <option value="50">{t('durationOption', { minutes: 50, minuteLabel: t('minutes') })}</option>
                                  <option value="60">{t('durationOption', { minutes: 60, minuteLabel: t('minutes') })}</option>
                                  <option value="90">{t('durationOption', { minutes: 90, minuteLabel: t('minutes') })}</option>
                                  <option value="120">{t('durationOption', { minutes: 120, minuteLabel: t('minutes') })}</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Enrollment Tab */}
            {activeTab === 'enrollment' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{t('enrollmentManagement')}</h3>
                  <p className="text-gray-600">{t('assignStudentsToCourse')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h4 className="font-semibold mb-2">{t('allStudents') || 'All Students'}</h4>
                    <div className="mb-2">
                      <input
                        type="text"
                        aria-label="student search"
                        data-testid="student-search-input"
                        placeholder={t('search')}
                        className="w-full px-3 py-2 border rounded"
                        onChange={(e) => {
                          const q = e.target.value.toLowerCase();
                          allStudents.filter((s) => `${s.first_name} ${s.last_name} ${s.student_id}`.toLowerCase().includes(q));
                          // simple filter display only; keep original in allStudents
                          // For simplicity, not persisting filtered state; just show all with CSS if needed
                        }}
                      />
                    </div>
                    <div className="max-h-72 overflow-auto space-y-2">
                      {allStudents.map((s) => {
                        const enrolled = enrolledStudents.some((e) => e.id === s.id);
                        return (
                          <label
                            key={s.id}
                            htmlFor={`enroll-${s.id}`}
                            aria-label={`enroll ${s.first_name} ${s.last_name}`}
                            className={`flex items-center justify-between bg-white rounded p-2 border ${enrolled ? 'opacity-60' : ''}`}
                          >
                            <div>
                              <div className="font-medium">{s.first_name} {s.last_name}</div>
                              <div className="text-xs text-gray-500">{s.student_id}</div>
                            </div>
                            <input
                              id={`enroll-${s.id}`}
                              type="checkbox"
                              aria-label={`enroll ${s.first_name} ${s.last_name}`}
                              data-testid={`enroll-checkbox-${s.id}`}
                              disabled={enrolled}
                              checked={selectedToEnroll.includes(s.id)}
                              onChange={(e) => {
                                setSelectedToEnroll((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id));
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-right">
                      <button onClick={enrollSelected} disabled={selectedToEnroll.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{t('enrollSelected') || 'Enroll Selected'}</button>
                    </div>
                  </div>

                    <div className="bg-gray-50 rounded-lg p-4 border">
                    <h4 className="font-semibold mb-2">{t('enrolledStudents')}</h4>
                    <div className="max-h-96 overflow-auto space-y-2">
                      {enrolledStudents.length === 0 && <div className="text-sm text-gray-500">{t('noClasses')}</div>}
                      {enrolledStudents.map((s) => (
                        <div key={s.id} className="flex items-center justify-between bg-white rounded p-2 border">
                          <div>
                            <div className="font-medium">{s.first_name} {s.last_name}</div>
                            <div className="text-xs text-gray-500">{s.student_id}</div>
                          </div>
                          <button onClick={() => unenroll(s.id)} className="px-3 py-1 text-red-600 border border-red-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">{t('unenroll')}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={async () => {
                if (activeTab === 'evaluation') {
                  setEvaluationRules([]);
                } else {
                  // Clear schedule and save immediately
                  setWeeklySchedule({});
                  // Wait for state to update, then save
                  setTimeout(async () => {
                    setLoading(true);
                    try {
                      const payload: CourseUpdatePayload = {
                        // When clearing schedule keep evaluation rules but normalize categories
                        evaluation_rules: (evaluationRules || []).map((r) => ({ ...r, category: getCanonicalCategory(String(r.category || ''), t) })),
                        teaching_schedule: [], // Empty schedule
                        hours_per_week: 0,
                      };

                      await fetch(`${API_BASE_URL}/courses/${selectedCourse}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                      });

                      showToast(t('scheduleCleared') || 'Schedule cleared successfully', 'success');
                      loadCourses();
                      setScheduleConflicts([]); // Clear conflicts since schedule is empty
                      setShowConflictWarning(false);
                    } catch {
                      showToast(t('failedToSaveData'), 'error');
                    } finally {
                      setLoading(false);
                    }
                  }, 100);
                }
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t('clearAll')}
            </button>
            <button
              onClick={saveCourseData}
              disabled={loading || (activeTab === 'evaluation' && !isValidTotal) || (activeTab === 'schedule' && !hoursOk)}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Save size={20} />
              <span>{loading ? t('saving') : t('saveChanges')}</span>
            </button>
          </div>
        </>
      )}

      {/* Example Schedule */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
          <BookOpen size={20} className="text-indigo-600" />
          <span>{t('exampleSchedule')}</span>
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('exampleScheduleEntry', { day: t('monday'), count: 2, start: '08:00', minutes: 50, periodLabel: t('periods'), minuteLabel: t('minutes') })}</span>
            <span className="font-bold text-indigo-600">1.67 {t('hours')}</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('exampleScheduleEntry', { day: t('wednesday'), count: 1, start: '10:00', minutes: 50, periodLabel: t('period'), minuteLabel: t('minutes') })}</span>
            <span className="font-bold text-indigo-600">0.83 {t('hours')}</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('exampleScheduleEntry', { day: t('friday'), count: 2, start: '14:00', minutes: 50, periodLabel: t('periods'), minuteLabel: t('minutes') })}</span>
            <span className="font-bold text-indigo-600">1.67 {t('hours')}</span>
          </div>
          <div className="flex justify-between p-3 bg-indigo-100 rounded font-bold">
            <span>{t('totalHoursPerWeek')}</span>
            <span className="text-indigo-600">4.17 {t('hours')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;
