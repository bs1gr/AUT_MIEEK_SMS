import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { Student, Grade, Course } from '@/types';
import { listItemVariants } from '@/utils/animations';
import { percentageToGreekScale, getLetterGrade } from '@/utils/gradeUtils';
import { useLanguage } from '@/LanguageContext';
import CourseGradeBreakdown from './CourseGradeBreakdown';

interface StudentStats {
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: string;
  };
  grades: {
    count: number;
    average: string;
  };
  gradesList?: Grade[];
}

interface StudentCardProps {
  student: Student;
  isExpanded: boolean;
  stats: StudentStats | undefined;
  coursesMap: Map<number, Course>;
  onToggleExpand: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
}

/**
 * Memoized StudentCard component
 * Re-renders only when props change (student, stats, isExpanded, coursesMap)
 */
const StudentCard: React.FC<StudentCardProps> = memo(({
  student,
  isExpanded,
  stats,
  coursesMap,
  onToggleExpand,
  onEdit,
  onDelete,
}) => {
  const { t } = useLanguage();

  // Memoize expensive average calculations
  const avgGreekGrade = React.useMemo(() => {
    if (!stats?.gradesList || stats.gradesList.length === 0) return null;
    const avgPercentage = stats.gradesList.reduce(
      (sum, g) => sum + ((g.grade / g.max_grade) * 100),
      0
    ) / stats.gradesList.length;
    return percentageToGreekScale(avgPercentage);
  }, [stats?.gradesList]);

  const letterGrade = React.useMemo(() => {
    if (!avgGreekGrade) return null;
    return getLetterGrade(avgGreekGrade);
  }, [avgGreekGrade]);

  return (
    <motion.li
      className="border p-4 rounded shadow-sm"
      variants={listItemVariants}
    >
      <div className="flex justify-between items-center">
        <div>
          <strong>{student.first_name} {student.last_name}</strong><br />
          <span>{t('studentId')}: {student.student_id}</span>
          {student.study_year && (
            <span className="ml-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
              {t('year')} {student.study_year}
            </span>
          )}
        </div>
        <div className="space-x-2">
          <button
            onClick={() => onToggleExpand(student.id)}
            className="text-indigo-600 hover:underline font-medium"
          >
            {isExpanded ? t('close') : t('viewPerformance') || t('view')}
          </button>
          <button
            onClick={() => onEdit(student)}
            className="text-green-600 hover:underline"
          >
            {t('edit')}
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="text-red-600 hover:underline"
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {isExpanded && stats && (
        <div className="mt-4 space-y-6">
          {/* Student Info Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                {student.first_name[0]}{student.last_name[0]}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{student.first_name} {student.last_name}</h3>
                <p className="text-white/80">{t('studentID')}: {student.student_id}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  {student.email && <span>📧 {student.email}</span>}
                  {student.study_year && <span>📚 {t('year')} {student.study_year}</span>}
                  <span className={student.is_active ? 'text-green-300' : 'text-red-300'}>
                    {student.is_active ? '✓ ' + t('active') : '✗ ' + t('inactive')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Average Grade */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md">
              <div className="text-xs opacity-75 mb-1">{t('averageGrade') || 'Average'}</div>
              <div className="text-2xl font-bold">{stats.grades.average}%</div>
              <div className="text-xs opacity-90">{stats.grades.count} {t('assignments')}</div>
            </div>

            {/* Greek Scale Average */}
            {avgGreekGrade !== null && (
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-md">
                <div className="text-xs opacity-75 mb-1">{t('greekScale')}</div>
                <div className="text-2xl font-bold">{avgGreekGrade.toFixed(1)}</div>
                <div className="text-xs opacity-90">0-20</div>
              </div>
            )}

            {/* Attendance */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-md">
              <div className="text-xs opacity-75 mb-1">{t('absences') || 'Absences'}</div>
              <div className="text-2xl font-bold">{stats.attendance.absent}/{stats.attendance.total}</div>
              <div className="text-xs opacity-90">{stats.attendance.attendanceRate}%</div>
            </div>

            {/* Letter Grade */}
            {letterGrade !== null && (
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white shadow-md">
                <div className="text-xs opacity-75 mb-1">{t('letterGrade')}</div>
                <div className="text-2xl font-bold">{letterGrade}</div>
                <div className="text-xs opacity-90">{t('grade')}</div>
              </div>
            )}
          </div>

          {/* Grade Breakdown */}
          {stats.gradesList && stats.gradesList.length > 0 && (
            <CourseGradeBreakdown
              gradesList={stats.gradesList}
              coursesMap={coursesMap}
            />
          )}
        </div>
      )}
    </motion.li>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  // Only re-render if these specific props change
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.stats === nextProps.stats &&
    prevProps.coursesMap === nextProps.coursesMap
  );
});

StudentCard.displayName = 'StudentCard';

export default StudentCard;