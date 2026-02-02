import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Student, Course } from '@/types';
import { listItemVariants } from '@/utils/animations';
import { percentageToGreekScale, getLetterGrade } from '@/utils/gradeUtils';
import { useLanguage } from '@/LanguageContext';
import CourseGradeBreakdown from './CourseGradeBreakdown';
import AttendanceDetails from './AttendanceDetails';
import GradeStatistics, { GradeInsights } from './GradeStatistics';
import GradeDistribution, { GradeDistributionData } from './GradeDistribution';
import NotesSection from './NotesSection';
import type { StudentStats } from './studentTypes';

interface StudentCardProps {
  student: Student;
  stats?: StudentStats;
  isExpanded: boolean;
  noteValue: string;
  onNoteChange: (value: string) => void;
  onToggleExpand: (id: number) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  coursesMap: Map<number, Course>;
  onNavigateToCourse?: (courseId: number) => void;
  onRecallGrade?: (gradeId: number, courseId: number) => void;
  onRecallAttendance?: (courseId: number, date: string) => void;
  onViewProfile?: (studentId: number) => void;
}

const StudentCard: React.FC<StudentCardProps> = memo(({
  student,
  stats,
  isExpanded,
  noteValue,
  onNoteChange,
  onToggleExpand,
  onEdit,
  onDelete,
  coursesMap,
  onNavigateToCourse,
  onRecallGrade,
  onRecallAttendance,
  onViewProfile,
}) => {
  const { t } = useLanguage();

  const gradeInsights = useMemo<GradeInsights | null>(() => {
    if (!stats?.gradesList || stats.gradesList.length === 0) return null;
    const percentages = stats.gradesList.map((g) => (g.grade / g.max_grade) * 100);
    const avgPercentage = percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
    const maxPercentage = Math.max(...percentages);
    const minPercentage = Math.min(...percentages);

    return {
      count: stats.gradesList.length,
      avgPercentage,
      avgGreek: percentageToGreekScale(avgPercentage),
      maxPercentage,
      maxGreek: percentageToGreekScale(maxPercentage),
      minPercentage,
      minGreek: percentageToGreekScale(minPercentage),
      letterGrade: getLetterGrade(avgPercentage),
    };
  }, [stats?.gradesList]);

  const gradeDistribution = useMemo<GradeDistributionData | null>(() => {
    if (!stats?.gradesList || stats.gradesList.length === 0) return null;
    const distribution: GradeDistributionData['distribution'] = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    stats.gradesList.forEach((grade) => {
      const percentage = (grade.grade / grade.max_grade) * 100;
      const letter = getLetterGrade(percentage) as keyof GradeDistributionData['distribution'];
      if (distribution[letter] !== undefined) {
        distribution[letter] += 1;
      }
    });

    return {
      distribution,
      total: stats.gradesList.length,
    };
  }, [stats?.gradesList]);

  const sortedGrades = useMemo(() => {
    if (!stats?.gradesList) return [];
    return [...stats.gradesList].sort((a, b) => {
      const aDate = a.date_submitted || a.date_assigned || '';
      const bDate = b.date_submitted || b.date_assigned || '';
      return bDate.localeCompare(aDate);
    });
  }, [stats?.gradesList]);

  const sortedAttendance = useMemo(() => {
    if (!stats?.attendanceList) return [];
    return [...stats.attendanceList].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [stats?.attendanceList]);

  const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}` || student.student_id?.toString() || '?';

  return (
    <motion.li className="border p-4 rounded shadow-sm" variants={listItemVariants} role="listitem">
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
          {onViewProfile && (
            <button
              onClick={() => onViewProfile(student.id)}
              className="text-blue-600 hover:underline"
              aria-label={t('viewProfile') || t('fullProfile') || 'View Profile'}
              data-testid={`student-view-profile-btn-${student.id}`}
            >
              {t('viewProfile') || t('fullProfile') || 'View Profile'}
            </button>
          )}
          <button
            onClick={() => onToggleExpand(student.id)}
            className="text-indigo-600 hover:underline font-medium"
            aria-label={isExpanded ? t('close') : t('viewPerformance') || t('view')}
            data-testid={`student-expand-btn-${student.id}`}
          >
            {isExpanded ? t('close') : t('viewPerformance') || t('view')}
          </button>
          <button
            onClick={() => onEdit(student)}
            className="text-green-600 hover:underline"
            aria-label={t('edit')}
            data-testid={`student-edit-btn-${student.id}`}
          >
            {t('edit')}
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="text-red-600 hover:underline"
            aria-label={t('delete')}
            data-testid={`student-delete-btn-${student.id}`}
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-6" role="region" aria-labelledby={`student-details-${student.id}`}>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg" id={`student-details-${student.id}`}>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold border-2 border-white/30" aria-hidden="true">
                {initials}
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

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md">
                <div className="text-xs opacity-75 mb-1">{t('averageGrade') || 'Average'}</div>
                <div className="text-2xl font-bold">{stats.grades.average}%</div>
                <div className="text-xs opacity-90">{stats.grades.count} {t('assignments')}</div>
              </div>

              {gradeInsights && (
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-md">
                  <div className="text-xs opacity-75 mb-1">{t('greekScale')}</div>
                  <div className="text-2xl font-bold">{gradeInsights.avgGreek.toFixed(1)}</div>
                  <div className="text-xs opacity-90">0-20</div>
                </div>
              )}

              {stats.attendance && (
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-md">
                  <div className="text-xs opacity-75 mb-1">{t('absences') || 'Absences'}</div>
                  <div className="text-2xl font-bold">{stats.attendance.absent}/{stats.attendance.total}</div>
                  <div className="text-xs opacity-90">{stats.attendance.attendanceRate}%</div>
                </div>
              )}

              {gradeInsights && (
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white shadow-md">
                  <div className="text-xs opacity-75 mb-1">{t('letterGrade')}</div>
                  <div className="text-2xl font-bold">{gradeInsights.letterGrade}</div>
                  <div className="text-xs opacity-90">{t('grade')}</div>
                </div>
              )}
            </div>
          )}

          {stats && (
            <CourseGradeBreakdown
              gradesList={stats.gradesList || []}
              coursesMap={coursesMap}
              onNavigateToCourse={onNavigateToCourse}
            />
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AttendanceDetails attendance={stats.attendance} />
              <GradeStatistics insights={gradeInsights} />
            </div>
          )}

          {gradeDistribution && gradeDistribution.total > 0 && (
            <GradeDistribution data={gradeDistribution} />
          )}

          {(sortedGrades.length > 0 || sortedAttendance.length > 0) && (
            <div className="border rounded-lg p-4 bg-white shadow-md">
              <div className="font-semibold text-indigo-800 mb-3 drop-shadow-sm">
                {t('historicalRecords') || 'Historical Records'}
              </div>

              {sortedGrades.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-800 mb-2">{t('pastGrades') || 'Past Grades'}</div>
                  <div className="space-y-2">
                    {sortedGrades.slice(0, 10).map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{grade.assignment_name || t('assignment') || 'Assignment'}</div>
                          <div className="text-[11px] text-gray-500">{grade.date_submitted || grade.date_assigned || '—'}</div>
                        </div>
                        <div className="text-right mr-3">
                          <div className="font-semibold text-gray-800">{grade.grade}/{grade.max_grade}</div>
                        </div>
                        {onRecallGrade && (
                          <button
                            type="button"
                            onClick={() => onRecallGrade(grade.id, grade.course_id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                          >
                            {t('recall') || 'Recall'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sortedAttendance.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-2">{t('pastAttendance') || 'Past Attendance'}</div>
                  <div className="space-y-2">
                    {sortedAttendance.slice(0, 10).map((record) => (
                      <div key={record.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{record.date || '—'}</div>
                          <div className="text-[11px] text-gray-500">{record.status}</div>
                        </div>
                        {onRecallAttendance && record.course_id && record.date && (
                          <button
                            type="button"
                            onClick={() => onRecallAttendance(record.course_id, record.date)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                          >
                            {t('recall') || 'Recall'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <NotesSection value={noteValue} onChange={onNoteChange} />
        </div>
      )}
    </motion.li>
  );
}, (prevProps, nextProps) => (
  prevProps.student.id === nextProps.student.id &&
  prevProps.isExpanded === nextProps.isExpanded &&
  prevProps.stats === nextProps.stats &&
  prevProps.noteValue === nextProps.noteValue &&
  prevProps.coursesMap === nextProps.coursesMap &&
  prevProps.onNavigateToCourse === nextProps.onNavigateToCourse
));

StudentCard.displayName = 'StudentCard';

export default StudentCard;
