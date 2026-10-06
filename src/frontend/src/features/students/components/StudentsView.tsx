import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListSkeleton, StudentCardSkeleton } from '@/components/ui';
import { attendanceAPI, gradesAPI, coursesAPI, analyticsAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { usePerformanceMonitor } from '@/hooks';
import type { Student, Attendance, Grade, Course } from '@/types';

import { gpaToGreekScale, gpaToPercentage, getLetterGrade } from '@/utils/gradeUtils';
import StudentCard from './StudentCard';
import type { StudentStats } from './studentTypes';
import { eventBus, EVENTS } from '@/utils/events';

// Filter values: '' = all, NOT_SET = students with no value in that field.
const ALL = '';
const NOT_SET = '__not_set__';
type SortKey = 'name' | 'division' | 'year';

const fieldValue = (value?: string | null): string => (value ?? '').trim();
const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const byName = (a: Student, b: Student): number =>
  `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
// Students without a value sort after those with one.
const byField = (field: 'academic_year' | 'class_division') => (a: Student, b: Student): number => {
  const x = fieldValue(a[field]);
  const y = fieldValue(b[field]);
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  return naturalCompare(x, y);
};
const COMPARATORS: Record<SortKey, (a: Student, b: Student) => number> = {
  name: byName,
  division: (a, b) => byField('class_division')(a, b) || byName(a, b),
  year: (a, b) => byField('academic_year')(a, b) || byField('class_division')(a, b) || byName(a, b),
};
const matchesFilter = (value: string, filter: string): boolean =>
  filter === ALL || (filter === NOT_SET ? !value : value === filter);
const distinctValues = (students: Student[], field: 'academic_year' | 'class_division'): string[] =>
  Array.from(new Set(students.map((s) => fieldValue(s[field])).filter(Boolean))).sort(naturalCompare);

interface StudentsViewProps {
  students: Student[];
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onViewProfile: (id: number) => void;
  loading: boolean;
  setShowAddModal: (show: boolean) => void;
}

const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  searchTerm,
  setSearchTerm,
  onEdit,
  onDelete,
  onViewProfile,
  loading,
  setShowAddModal,
}) => {
  // Performance monitoring for component renders
  usePerformanceMonitor('StudentsView');

  const { t } = useLanguage();
  const navigate = useNavigate();
  const [internalSearch, setInternalSearch] = useState<string>('');
  const resolvedSearch = typeof searchTerm === 'string' ? searchTerm : internalSearch;
  const setResolvedSearch = typeof setSearchTerm === 'function' ? setSearchTerm : setInternalSearch;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statsById, setStatsById] = useState<Record<number, StudentStats>>({});
  const [cascadedSectionExpanded, setCascadedSectionExpanded] = useState({ active: true, inactive: false });
  // Derive notes from localStorage for the current students list
  const derivedNotesById = useMemo(() => {
    const loaded: Record<number, string> = {};
    (students || []).forEach((s) => {
      try {
        const k = `student_notes_${s.id}`;
        const v = localStorage.getItem(k) || "";
        loaded[s.id] = v;
      } catch {
        loaded[s.id] = "";
      }
    });
    return loaded;
  }, [students]);
  // Track session edits so UI reflects changes immediately without re-reading storage
  const [notesOverrides, setNotesOverrides] = useState<Record<number, string>>({});
  const notesById = useMemo(
    () => ({ ...derivedNotesById, ...notesOverrides }),
    [derivedNotesById, notesOverrides]
  );
  const [coursesMap, setCoursesMap] = useState<Map<number, Course>>(new Map());

  // Fetch all courses once for mapping course_id to course info
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesAPI.getAll(0, 1000); // Fetch up to 1000 courses
        const map = new Map<number, Course>();
        const resp = response as unknown;
        const list = Array.isArray(resp)
          ? (resp as Course[])
          : (Array.isArray((resp as { items?: unknown })?.items) ? (resp as { items?: Course[] }).items! : []);
        (list || []).forEach((course: Course) => {
          map.set(course.id, course);
        });
        setCoursesMap(map);
      } catch (e) {
        console.error('Failed to fetch courses:', e);
      }
    };
    fetchCourses();
  }, []);

  const loadStats = useCallback(async (studentId: number): Promise<void> => {
    try {
      const [attendance, grades, finalGradeSummaryRaw] = await Promise.all([
        attendanceAPI.getByStudent(studentId),
        gradesAPI.getByStudent(studentId),
        analyticsAPI.getAllCoursesSummary(studentId).catch(() => null),
      ]);
      const finalGradeSummary = finalGradeSummaryRaw as {
        overall_gpa?: number;
        courses?: StudentStats['courseSummary'];
      } | null;
      const total = attendance.length;
      const present = attendance.filter((a: Attendance) => a.status === 'Present').length;
      const absent = attendance.filter((a: Attendance) => a.status === 'Absent').length;
      const late = attendance.filter((a: Attendance) => a.status === 'Late').length;
      const excused = attendance.filter((a: Attendance) => a.status === 'Excused').length;
      const attendanceRate = total > 0 ? (((present + excused) / total) * 100).toFixed(1) : '0.0';

      let avg = 0;
      if (grades.length > 0) {
        const percentages = grades.map((g: Grade) => (g.grade / g.max_grade) * 100);
        avg = percentages.reduce((sum: number, p: number) => sum + p, 0) / percentages.length;
      }

      let finalGrade = undefined;
      let courseSummary = undefined;
      if (finalGradeSummary && finalGradeSummary.overall_gpa) {
        const gpa = finalGradeSummary.overall_gpa;
        finalGrade = {
          overallGPA: gpa,
          greekGrade: gpaToGreekScale(gpa),
          percentage: gpaToPercentage(gpa),
          letterGrade: getLetterGrade(gpaToPercentage(gpa)),
          totalCourses: finalGradeSummary.courses?.length || 0,
        };
        courseSummary = finalGradeSummary.courses || [];
      }

      setStatsById((prev) => ({
        ...prev,
        [studentId]: {
          attendance: { total, present, absent, late, excused, attendanceRate },
          grades: { count: grades.length, average: Number.isFinite(avg) ? avg.toFixed(1) : '0.0' },
          finalGrade,
          gradesList: grades,
          attendanceList: attendance,
          courseSummary,
        },
      }));
    } catch {
      setStatsById((prev) => ({ ...prev, [studentId]: { error: true } as StudentStats }));
    }
  }, []);

  // Listen for data changes and invalidate affected student's stats
  useEffect(() => {
    const invalidateStudentStats = (payload: unknown) => {
      const { studentId } = (payload as { studentId?: number }) || {};
      if (typeof studentId === 'number' && statsById[studentId]) {
        setStatsById((prev) => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });
        if (expandedId === studentId) {
          loadStats(studentId);
        }
      }
    };

    const unsubscribeGradeAdded = eventBus.on(EVENTS.GRADE_ADDED, invalidateStudentStats);
    const unsubscribeGradeUpdated = eventBus.on(EVENTS.GRADE_UPDATED, invalidateStudentStats);
    const unsubscribeGradeDeleted = eventBus.on(EVENTS.GRADE_DELETED, invalidateStudentStats);
    const unsubscribeGradesBulk = eventBus.on(EVENTS.GRADES_BULK_ADDED, invalidateStudentStats);
    const unsubscribeAttendanceAdded = eventBus.on(EVENTS.ATTENDANCE_ADDED, invalidateStudentStats);
    const unsubscribeAttendanceBulk = eventBus.on(EVENTS.ATTENDANCE_BULK_ADDED, invalidateStudentStats);
    const unsubscribeAttendanceUpdated = eventBus.on(EVENTS.ATTENDANCE_UPDATED, invalidateStudentStats);
    const unsubscribeAttendanceDeleted = eventBus.on(EVENTS.ATTENDANCE_DELETED, invalidateStudentStats);
    const unsubscribeDailyPerformance = eventBus.on(EVENTS.DAILY_PERFORMANCE_ADDED, invalidateStudentStats);

    return () => {
      unsubscribeGradeAdded();
      unsubscribeGradeUpdated();
      unsubscribeGradeDeleted();
      unsubscribeGradesBulk();
      unsubscribeAttendanceAdded();
      unsubscribeAttendanceBulk();
      unsubscribeAttendanceUpdated();
      unsubscribeAttendanceDeleted();
      unsubscribeDailyPerformance();
    };
  }, [statsById, expandedId, loadStats]);

  // notesById is derived via useMemo; no effect needed

  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [divisionFilter, setDivisionFilter] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const filtersActive = yearFilter !== ALL || divisionFilter !== ALL || sortKey !== 'name';

  const yearOptions = useMemo(() => distinctValues(students || [], 'academic_year'), [students]);
  const divisionOptions = useMemo(() => distinctValues(students || [], 'class_division'), [students]);
  const hasMissingYear = useMemo(() => (students || []).some((s) => !fieldValue(s.academic_year)), [students]);
  const hasMissingDivision = useMemo(() => (students || []).some((s) => !fieldValue(s.class_division)), [students]);

  const yearLabel = (value: string): string =>
    value === 'A' ? t('classA') : value === 'B' ? t('classB') : `${t('academicYear')} ${value}`;

  const filtered = useMemo(() => {
    const q = (resolvedSearch || '').toLowerCase();
    return (students || []).filter((s) =>
      (!q ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        String(s.student_id || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q)) &&
      matchesFilter(fieldValue(s.academic_year), yearFilter) &&
      matchesFilter(fieldValue(s.class_division), divisionFilter)
    );
  }, [students, resolvedSearch, yearFilter, divisionFilter]);

  const toggleExpand = useCallback((id: number): void => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !statsById[next]) loadStats(next);
  }, [expandedId, statsById, loadStats]);

  const updateNote = useCallback((id: number, value: string): void => {
    setNotesOverrides((prev) => ({ ...prev, [id]: value }));
    try {
      localStorage.setItem(`student_notes_${id}`, value);
    } catch {}
  }, []);

  const handleCourseNavigate = useCallback((studentId: number, courseId: number) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('grading_filter_student', studentId.toString());
      sessionStorage.setItem('grading_filter_course', courseId.toString());
    }
    navigate('/grading');
  }, [navigate]);

  const handleRecallGrade = useCallback((studentId: number, courseId: number, gradeId: number) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('grading_filter_student', studentId.toString());
      sessionStorage.setItem('grading_filter_course', courseId.toString());
      sessionStorage.setItem('grading_recall_grade_id', gradeId.toString());
    }
    navigate('/grading');
  }, [navigate]);

  const handleRecallAttendance = useCallback((courseId: number, date: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('attendance_recall_course', courseId.toString());
      sessionStorage.setItem('attendance_recall_date', date);
    }
    navigate('/attendance');
  }, [navigate]);

  // Cascade students by active/inactive status
  const cascadedStudents = useMemo(() => {
    const active: Student[] = [];
    const inactive: Student[] = [];

    (filtered || []).forEach((student) => {
      if (student.is_active) {
        active.push(student);
      } else {
        inactive.push(student);
      }
    });

    const compare = COMPARATORS[sortKey];
    return {
      active: active.sort(compare),
      inactive: inactive.sort(compare),
    };
  }, [filtered, sortKey]);

  // Render cascaded section
  const renderCascadedSection = (title: string, students: Student[], sectionKey: 'active' | 'inactive') => {
    if (students.length === 0) return null;

    const isExpanded = cascadedSectionExpanded[sectionKey];

    return (
      <div key={sectionKey} className="space-y-2">
        <button
          onClick={() => setCascadedSectionExpanded(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
          className="w-full flex items-center gap-3 px-6 py-4 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg border-b-2 border-gray-300"
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <h2 className="text-lg font-semibold text-gray-900">
            {title} ({students.length})
          </h2>
        </button>

        {isExpanded && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ul className="space-y-2">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  stats={statsById[student.id]}
                  isExpanded={expandedId === student.id}
                  noteValue={notesById[student.id] || ''}
                  onNoteChange={(value) => updateNote(student.id, value)}
                  onToggleExpand={toggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  coursesMap={coursesMap}
                  onNavigateToCourse={(courseId) => handleCourseNavigate(student.id, courseId)}
                  onRecallGrade={(gradeId, courseId) => handleRecallGrade(student.id, courseId, gradeId)}
                  onRecallAttendance={(courseId, date) => handleRecallAttendance(courseId, date)}
                  onViewProfile={onViewProfile}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={resolvedSearch}
          onChange={(e) => setResolvedSearch(e.target.value)}
          placeholder={t('searchStudents')}
          className="border px-4 py-2 rounded flex-1 min-w-0"
          aria-label={t('searchStudents')}
          data-testid="student-search-input"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="shrink-0 bg-indigo-600 text-white px-3 py-2 sm:px-4 rounded flex items-center gap-1"
          aria-label={t('addStudent')}
          data-testid="add-student-btn"
        >
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">{t('addStudent')}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3" data-testid="student-filters">
        <label className="flex min-w-36 flex-1 flex-col text-xs font-medium text-slate-600 sm:flex-none">
          {t('academicYear')}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="mt-1 rounded border bg-white px-2 py-1.5 text-sm text-slate-800"
            data-testid="student-year-filter"
          >
            <option value={ALL}>{t('filterAllYears')}</option>
            {yearOptions.map((value) => (
              <option key={value} value={value}>{yearLabel(value)}</option>
            ))}
            {hasMissingYear && <option value={NOT_SET}>{t('filterNotSet')}</option>}
          </select>
        </label>
        <label className="flex min-w-36 flex-1 flex-col text-xs font-medium text-slate-600 sm:flex-none">
          {t('classDivision')}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="mt-1 rounded border bg-white px-2 py-1.5 text-sm text-slate-800"
            data-testid="student-division-filter"
          >
            <option value={ALL}>{t('filterAllDivisions')}</option>
            {divisionOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
            {hasMissingDivision && <option value={NOT_SET}>{t('filterNotSet')}</option>}
          </select>
        </label>
        <label className="flex min-w-36 flex-1 flex-col text-xs font-medium text-slate-600 sm:flex-none">
          {t('sortBy')}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="mt-1 rounded border bg-white px-2 py-1.5 text-sm text-slate-800"
            data-testid="student-sort-select"
          >
            <option value="name">{t('sortByName')}</option>
            <option value="division">{t('sortByDivision')}</option>
            <option value="year">{t('sortByYear')}</option>
          </select>
        </label>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setYearFilter(ALL);
              setDivisionFilter(ALL);
              setSortKey('name');
            }}
            className="rounded px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
            data-testid="student-filters-clear"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Loading State with Skeleton */}
      {loading && <ListSkeleton count={5} itemComponent={StudentCardSkeleton} />}

      {/* Student List */}
      {!loading && (filtered.length === 0) && (
        <p className="text-indigo-700 text-center py-8 font-semibold drop-shadow-xs">{t('noStudentsFound')}</p>
      )}

      {/* Cascaded Student List with Active/Inactive Sections */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-6">
          {renderCascadedSection(t('activeStudents') || 'Active Students', cascadedStudents.active, 'active')}
          {renderCascadedSection(t('inactiveStudents') || 'Inactive Students', cascadedStudents.inactive, 'inactive')}
        </div>
      )}
    </div>
  );
};

export default StudentsView;
