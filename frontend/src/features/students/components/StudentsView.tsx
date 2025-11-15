import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import { ListSkeleton, StudentCardSkeleton } from '@/components/ui';
import { attendanceAPI, gradesAPI, coursesAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import type { Student, Attendance, Grade, Course } from '@/types';
import { listContainerVariants, listItemVariants } from '@/utils/animations';
import { percentageToGreekScale, getGreekGradeColor, gpaToGreekScale, gpaToPercentage, getLetterGrade } from '@/utils/gradeUtils';
import CourseGradeBreakdown from './CourseGradeBreakdown';

const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || '/api/v1';

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
  finalGrade?: {
    overallGPA: number;
    greekGrade: number;
    percentage: number;
    letterGrade: string;
    totalCourses: number;
  };
  gradesList?: Grade[];
  courseSummary?: Array<{
    course_code: string;
    course_name: string;
    credits: number;
    final_grade: number;
    gpa: number;
    letter_grade: string;
  }>;
  error?: boolean;
}

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
  const [notesById, setNotesById] = useState<Record<number, string>>({});
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

  useEffect(() => {
    const loaded: Record<number, string> = {};
    (students || []).forEach((s) => {
      const k = `student_notes_${s.id}`;
      const v = localStorage.getItem(k) || '';
      loaded[s.id] = v;
    });
    setNotesById(loaded);
  }, [students]);

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
    } catch (e) {
      setStatsById((prev) => ({ ...prev, [studentId]: { error: true } as StudentStats }));
    }
  };

  const toggleExpand = (id: number): void => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !statsById[next]) loadStats(next);
  };

  const updateNote = (id: number, value: string): void => {
    setNotesById((prev) => ({ ...prev, [id]: value }));
    try { localStorage.setItem(`student_notes_${id}`, value); } catch {}
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
            <motion.li
              key={student.id}
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
                    onClick={() => {
                      if (expandedId === student.id) {
                        toggleExpand(student.id); // Close if already open
                      } else {
                        toggleExpand(student.id); // Open expanded view
                      }
                    }}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {expandedId === student.id ? t('close') : t('viewPerformance') || t('view')}
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
              {expandedId === student.id && (
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
                  {statsById[student.id] && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Average Grade */}
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md">
                        <div className="text-xs opacity-75 mb-1">{t('averageGrade') || 'Average'}</div>
                        <div className="text-2xl font-bold">{statsById[student.id].grades.average}%</div>
                        <div className="text-xs opacity-90">{statsById[student.id].grades.count} {t('assignments')}</div>
                      </div>

                      {/* Greek Scale Average */}
                      {statsById[student.id].gradesList && statsById[student.id].gradesList!.length > 0 && (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-md">
                          <div className="text-xs opacity-75 mb-1">{t('greekScale')}</div>
                          <div className="text-2xl font-bold">
                            {(() => {
                              const avgPercentage = statsById[student.id].gradesList!.reduce((sum, g) => sum + ((g.grade / g.max_grade) * 100), 0) / statsById[student.id].gradesList!.length;
                              return percentageToGreekScale(avgPercentage).toFixed(1);
                            })()}
                          </div>
                          <div className="text-xs opacity-90">0-20</div>
                        </div>
                      )}

                      {/* Attendance */}
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-md">
                        <div className="text-xs opacity-75 mb-1">{t('absences') || 'Absences'}</div>
                        <div className="text-2xl font-bold">{statsById[student.id].attendance.absent}/{statsById[student.id].attendance.total}</div>
                        <div className="text-xs opacity-90">{statsById[student.id].attendance.attendanceRate}%</div>
                      </div>

                      {/* Letter Grade */}
                      {statsById[student.id].gradesList && statsById[student.id].gradesList!.length > 0 && (
                        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white shadow-md">
                          <div className="text-xs opacity-75 mb-1">{t('letterGrade')}</div>
                          <div className="text-2xl font-bold">
                            {(() => {
                              const avgPercentage = statsById[student.id].gradesList!.reduce((sum, g) => sum + ((g.grade / g.max_grade) * 100), 0) / statsById[student.id].gradesList!.length;
                              return getLetterGrade(avgPercentage);
                            })()}
                          </div>
                          <div className="text-xs opacity-90">{t('grade')}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Grade Breakdown - Per Course */}
                  {statsById[student.id] && (
                    <CourseGradeBreakdown
                      gradesList={statsById[student.id].gradesList || []}
                      coursesMap={coursesMap}
                      onNavigateToCourse={(courseId) => handleCourseNavigate(student.id, courseId)}
                    />
                  )}

                  {/* Performance Details & Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Attendance Details */}
                    <div className="border rounded-lg p-4 bg-white shadow-md">
                      <div className="font-semibold text-gray-800 mb-3">{t('attendanceDetails') || 'Attendance Details'}</div>
                      {statsById[student.id] && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">{t('totalClasses') || 'Total Classes'}:</span>
                            <span className="font-semibold text-gray-800">{statsById[student.id].attendance.total}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-semibold text-green-600">{t('present')}:</span>
                            <span className="font-semibold text-green-600">{statsById[student.id].attendance.present}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-semibold text-red-600">{t('absent')}:</span>
                            <span className="font-semibold text-red-600">{statsById[student.id].attendance.absent}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-semibold text-yellow-600">{t('late')}:</span>
                            <span className="font-semibold text-yellow-600">{statsById[student.id].attendance.late}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-semibold text-blue-600">{t('excused')}:</span>
                            <span className="font-semibold text-blue-600">{statsById[student.id].attendance.excused}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 bg-indigo-50 rounded mt-2">
                            <span className="font-semibold text-gray-800">{t('attendanceRate') || 'Attendance Rate'}:</span>
                            <span className="font-bold text-indigo-600 text-lg">{statsById[student.id].attendance.attendanceRate}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grade Statistics */}
                    <div className="border rounded-lg p-4 bg-white shadow-md">
                      <div className="font-semibold text-gray-800 mb-3">{t('gradeStatistics') || 'Grade Statistics'}</div>
                      {statsById[student.id]?.gradesList && statsById[student.id].gradesList!.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">{t('totalAssignments') || 'Total Assignments'}:</span>
                            <span className="font-semibold text-gray-800">{statsById[student.id].gradesList!.length}</span>
                          </div>
                          {(() => {
                            const grades = statsById[student.id].gradesList!;
                            const percentages = grades.map(g => (g.grade / g.max_grade) * 100);
                            const avgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
                            const maxPercentage = Math.max(...percentages);
                            const minPercentage = Math.min(...percentages);
                            const avgGreek = percentageToGreekScale(avgPercentage);
                            const maxGreek = percentageToGreekScale(maxPercentage);
                            const minGreek = percentageToGreekScale(minPercentage);

                            return (
                              <>
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="text-gray-600">{t('highest') || 'Highest'}:</span>
                                  <span className="font-semibold text-green-600">{maxPercentage.toFixed(1)}% ({maxGreek.toFixed(1)}/20)</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="text-gray-600">{t('lowest') || 'Lowest'}:</span>
                                  <span className="font-semibold text-red-600">{minPercentage.toFixed(1)}% ({minGreek.toFixed(1)}/20)</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-indigo-50 rounded mt-2">
                                  <span className="font-semibold text-gray-800">{t('averageGrade')}:</span>
                                  <span className="font-bold text-indigo-600 text-lg">{avgPercentage.toFixed(1)}% ({avgGreek.toFixed(1)}/20)</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">{t('noGradesYet') || 'No grades yet'}</div>
                      )}
                    </div>
                  </div>

                  {/* Grade Distribution Chart */}
                  {statsById[student.id]?.gradesList && statsById[student.id].gradesList!.length > 0 && (
                    <div className="border rounded-lg p-4 bg-white shadow-md">
                      <div className="font-semibold text-gray-800 mb-3">{t('gradeDistribution') || 'Grade Distribution'}</div>
                      {(() => {
                        const grades = statsById[student.id].gradesList!;
                        const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
                        grades.forEach(g => {
                          const percentage = (g.grade / g.max_grade) * 100;
                          const letter = getLetterGrade(percentage);
                          distribution[letter as keyof typeof distribution]++;
                        });
                        const total = grades.length;
                        const progressColorClasses: Record<string, string> = {
                          A: 'grade-progress--a',
                          B: 'grade-progress--b',
                          C: 'grade-progress--c',
                          D: 'grade-progress--d',
                          F: 'grade-progress--f',
                        };

                        return (
                          <div className="space-y-3">
                            {Object.entries(distribution).map(([grade, count]) => {
                              const percentage = total > 0 ? (count / total * 100) : 0;

                              return (
                                  <div key={grade}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-700">{t('grade')} {grade}</span>
                                    <span className="text-gray-600">{count} {t('assignments')} ({percentage.toFixed(0)}%)</span>
                                  </div>
                                  <div className="grade-progress-track" role="presentation">
                                    <progress
                                      className={`grade-progress ${progressColorClasses[grade] || 'grade-progress--default'}`}
                                      value={percentage}
                                      max={100}
                                      aria-label={t('grade') + ' ' + grade}
                                    ></progress>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Notes Section */}
                  <div className="border rounded-lg p-4 bg-white shadow-md">
                    <div className="font-semibold text-gray-800 mb-2">{t('notes')}</div>
                    <textarea
                      value={notesById[student.id] || ''}
                      onChange={(e) => updateNote(student.id, e.target.value)}
                      className="w-full min-h-[100px] border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={t('notePlaceholder') || 'Add notes about this student...'}
                    />
                  </div>
                </div>
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
};

export default StudentsView;
