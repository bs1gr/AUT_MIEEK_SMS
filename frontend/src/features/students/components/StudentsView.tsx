import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListSkeleton, StudentCardSkeleton } from '@/components/ui';
import { attendanceAPI, gradesAPI, coursesAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import type { Student, Attendance, Grade, Course } from '@/types';
import { listContainerVariants } from '@/utils/animations';
import { gpaToGreekScale, gpaToPercentage, getLetterGrade } from '@/utils/gradeUtils';
import StudentCard from './StudentCard';
import type { StudentStats } from './studentTypes';

const API_BASE_URL: string = (
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api/v1'
);

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [internalSearch, setInternalSearch] = useState<string>('');
  const resolvedSearch = typeof searchTerm === 'string' ? searchTerm : internalSearch;
  const setResolvedSearch = typeof setSearchTerm === 'function' ? setSearchTerm : setInternalSearch;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statsById, setStatsById] = useState<Record<number, StudentStats>>({});
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
        (response.items || []).forEach((course: Course) => {
          map.set(course.id, course);
        });
        setCoursesMap(map);
      } catch (e) {
        console.error('Failed to fetch courses:', e);
      }
    };
    fetchCourses();
  }, []);

  // notesById is derived via useMemo; no effect needed

  const filtered = useMemo(() => {
    const q = (resolvedSearch || '').toLowerCase();
    if (!q) return students || [];
    return (students || []).filter((s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      String(s.student_id || '').toLowerCase().includes(q) ||
      String(s.email || '').toLowerCase().includes(q)
    );
  }, [students, resolvedSearch]);

  const loadStats = async (studentId: number): Promise<void> => {
    try {
      const [attendance, grades, finalGradeSummary] = await Promise.all([
        attendanceAPI.getByStudent(studentId),
        gradesAPI.getByStudent(studentId),
        fetch(`${API_BASE_URL}/analytics/student/${studentId}/all-courses-summary`).then(res => res.json()).catch(() => null),
      ]);
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

      // Process final grade summary if available
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
          courseSummary,
        },
      }));
    } catch {
      setStatsById((prev) => ({ ...prev, [studentId]: { error: true } as StudentStats }));
    }
  };

  const toggleExpand = (id: number): void => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !statsById[next]) loadStats(next);
  };

  const updateNote = (id: number, value: string): void => {
    setNotesOverrides((prev) => ({ ...prev, [id]: value }));
    try {
      localStorage.setItem(`student_notes_${id}`, value);
    } catch {}
  };

  const handleCourseNavigate = useCallback((studentId: number, courseId: number) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('grading_filter_student', studentId.toString());
      sessionStorage.setItem('grading_filter_course', courseId.toString());
    }
    navigate('/grading');
  }, [navigate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          value={resolvedSearch}
          onChange={(e) => setResolvedSearch(e.target.value)}
          placeholder={t('searchStudents')}
          className="border px-4 py-2 rounded w-full max-w-md"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {t('addStudent')}
        </button>
      </div>

      {/* Loading State with Skeleton */}
      {loading && <ListSkeleton count={5} itemComponent={StudentCardSkeleton} />}

      {/* Student List */}
      {!loading && (filtered.length === 0) && (
        <p className="text-gray-500 text-center py-8">{t('noStudentsFound')}</p>
      )}

      {!loading && filtered.length > 0 && (
        <motion.ul
          className="space-y-2"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((student) => (
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
              onViewProfile={onViewProfile}
            />
          ))}
        </motion.ul>
      )}
    </div>
  );
};

export default StudentsView;
