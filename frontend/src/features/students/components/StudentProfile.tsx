
import { useState, useEffect, useCallback } from 'react';
/* eslint-disable testing-library/no-await-sync-queries */
import { ArrowLeft, BookOpen, TrendingUp, Calendar, Star, CheckCircle, XCircle, Mail, Award } from 'lucide-react';
import { gradesAPI, attendanceAPI, highlightsAPI, studentsAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { GradeBreakdownModal } from '@/features/grading';
import type { Student, Grade, Attendance, Highlight, Course, CourseEnrollment } from '@/types';
import { eventBus, EVENTS } from '@/utils/events';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api/v1';

interface StudentProfileProps {
  studentId: number;
  onBack: () => void;
}

const StudentProfile = ({ studentId, onBack }: StudentProfileProps) => {
  const { t } = useLanguage();
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [coursesById, setCoursesById] = useState<Record<number, Course>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownCourseId, setBreakdownCourseId] = useState<number | null>(null);
  const [attendanceCourseFilter, setAttendanceCourseFilter] = useState<number | null>(null);

  // Move loadStudentData here so effects can depend on it without referencing a later declaration
  const loadStudentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load student, grades, and attendance data
      const [studentData, gradesData, attendanceData] = await Promise.all([
        studentsAPI.getById(studentId),
        gradesAPI.getByStudent(studentId),
        attendanceAPI.getByStudent(studentId)
      ]);

      setStudent(studentData);
      setGrades(Array.isArray(gradesData) ? gradesData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

      // Try to load highlights, but don't fail if endpoint doesn't exist
      try {
        const highlightsData = await highlightsAPI.getByStudent(studentId);
        setHighlights(Array.isArray(highlightsData) ? highlightsData : []);
      } catch (highlightsError) {
        console.warn('Highlights endpoint not available:', highlightsError);
        setHighlights([]);
      }

      // Load enrollments and course details
      try {
        const enrRes = await fetch(`${API_BASE_URL}/enrollments/student/${studentId}`);
        const enr = await enrRes.json();
        const enrolls: CourseEnrollment[] = Array.isArray(enr) ? enr : [];
        setEnrollments(enrolls);
        // Fetch unique courses
        const ids = Array.from(new Set(enrolls.map(e => e.course_id)));
        const dict: Record<number, Course> = {};
        await Promise.all(ids.map(async (cid) => {
          try {
            const cRes = await fetch(`${API_BASE_URL}/courses/${cid}`);
            if (cRes.ok) {
              const c = await cRes.json();
              dict[cid] = c;
            }
          } catch {}
        }));
        setCoursesById(dict);
      } catch {
        setEnrollments([]);
        setCoursesById({});
      }
    } catch (error) {
      console.error('Failed to load student data:', error);
      setError(t('failedToLoadStudentData'));
      // Set empty arrays to prevent errors
      setGrades([]);
      setAttendance([]);
      setHighlights([]);
      setEnrollments([]);
      setCoursesById({});
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
    // Do not include loadStudentData in deps to avoid loops
    // Callback itself depends on studentId and will be recreated when needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Listen for data changes and reload if it affects this student
  useEffect(() => {
    const handleDataChange = (args: unknown) => {
      if (typeof args === 'object' && args && 'studentId' in (args as Record<string, unknown>)) {
        const updatedStudentId = (args as Record<string, unknown>)['studentId'];
        if (typeof updatedStudentId === 'number' && updatedStudentId === studentId) {
          loadStudentData();
        }
      }
    };

    const unsubscribeGradeAdded = eventBus.on(EVENTS.GRADE_ADDED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeGradeUpdated = eventBus.on(EVENTS.GRADE_UPDATED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeGradeDeleted = eventBus.on(EVENTS.GRADE_DELETED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeGradesBulk = eventBus.on(EVENTS.GRADES_BULK_ADDED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeAttendanceAdded = eventBus.on(EVENTS.ATTENDANCE_ADDED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeAttendanceBulk = eventBus.on(EVENTS.ATTENDANCE_BULK_ADDED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeAttendanceUpdated = eventBus.on(EVENTS.ATTENDANCE_UPDATED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeAttendanceDeleted = eventBus.on(EVENTS.ATTENDANCE_DELETED, (...a: unknown[]) => handleDataChange(a[0]));
    const unsubscribeDailyPerformance = eventBus.on(EVENTS.DAILY_PERFORMANCE_ADDED, (...a: unknown[]) => handleDataChange(a[0]));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  

  const calculateStats = () => {
    // Attendance stats
    const totalClasses = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
  const attendanceRateNum = totalClasses > 0 ? (present / totalClasses * 100) : 0;

    // Grade stats
    const totalGrades = grades.length;
    const avgGradeNum = totalGrades > 0
      ? (grades.reduce((sum: number, g: Grade) => sum + (g.grade / g.max_grade * 100), 0) / totalGrades)
      : 0;

    // GPA calculation
    const gpaNum = totalGrades > 0
      ? ((avgGradeNum / 100) * 4.0)
      : 0;
    return { attendanceRate: Number(attendanceRateNum.toFixed(1)), avgGrade: Number(avgGradeNum.toFixed(1)), gpa: Number(gpaNum.toFixed(2)), totalClasses, totalGrades };
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const gradeDistribution = () => {
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(grade => {
      const percentage = (grade.grade / grade.max_grade) * 100;
      const letter = getLetterGrade(percentage);
      distribution[letter]++;
    });
    return distribution;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={onBack}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('backToStudents')}
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">{t('studentNotFound')}</p>
      </div>
    );
  }

  const stats = calculateStats();
  const distribution = gradeDistribution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t('backToStudents')}</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32"></div>
          <div className="px-8 pb-8">
            <div className="flex items-end space-x-6 -mt-16">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white">
                {student.first_name[0]}{student.last_name[0]}
              </div>
              <div className="pb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="text-gray-600 mt-1">{t('studentID')} {student.student_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail size={20} />
                <span>{student.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <Calendar size={20} />
                <span>{t('enrolled')} {student.enrollment_date}</span>
              </div>
              {student.study_year && (
                <div className="flex items-center space-x-3 text-gray-600">
                  <Award size={20} className="text-indigo-600" />
                  <span className="font-semibold text-indigo-700">{t('year')} {student.study_year}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                {student.is_active ? (
                  <>
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-green-600 font-semibold">{t('active')}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="text-red-600" />
                    <span className="text-red-600 font-semibold">{t('inactive')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={24} />
              <span className="text-xs opacity-75">{t('overall')}</span>
            </div>
            <p className="text-4xl font-bold">{stats.gpa}</p>
            <p className="text-sm opacity-90">{t('gpaOutOf')}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Award size={24} />
              <span className="text-xs opacity-75">{t('average')}</span>
            </div>
            <p className="text-4xl font-bold">{stats.avgGrade}%</p>
            <p className="text-sm opacity-90">{stats.totalGrades} {t('assignments')}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={24} />
              <span className="text-xs opacity-75">{t('attendance').toUpperCase()}</span>
            </div>
            <p className="text-4xl font-bold">{stats.attendanceRate}%</p>
            <p className="text-sm opacity-90">{stats.totalClasses} {t('classes')}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Star size={24} />
              <span className="text-xs opacity-75">{t('highlights')}</span>
            </div>
            <p className="text-4xl font-bold">{highlights.length}</p>
            <p className="text-sm opacity-90">{t('totalAchievements')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
              <BookOpen size={24} className="text-indigo-600" />
              <span>{t('gradeDistribution')}</span>
            </h3>

            <div className="space-y-4">
              {Object.entries(distribution).map(([grade, count]) => {
                const total = grades.length;
                const percentage = total > 0 ? (count / total * 100) : 0;
                // colour map intentionally omitted when rendering lightweight bars

                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700">{t('grade')} {grade}</span>
                      <span className="text-gray-600">{count} {t('assignments')} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{percentage.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Highlights */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
              <Star size={24} className="text-yellow-500" />
              <span>{t('recentHighlights')}</span>
            </h3>

            {highlights.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noHighlights')}</p>
            ) : (
              <div className="space-y-4">
                {highlights.slice(0, 5).map(highlight => (
                  <div
                    key={highlight.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      highlight.is_positive
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    {highlight.rating && (
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={i < (highlight.rating ?? 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-700">{highlight.category}</p>
                    <p className="text-sm text-gray-600 mt-1">{highlight.highlight_text}</p>
                    <p className="text-xs text-gray-500 mt-2">{highlight.semester}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Courses & Actions */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('enrolledCourses') || 'Enrolled Courses'}</h3>
          {enrollments.length === 0 ? (
            <p className="text-gray-500">{t('noEnrollments') || 'No enrollments found.'}</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map(e => {
                const course = coursesById[e.course_id];
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <div className="font-semibold text-gray-800">{course ? `${course.course_code} — ${course.course_name}` : `Course #${e.course_id}`}</div>
                      <div className="text-xs text-gray-500">{t('enrolled')}: {e.enrolled_at || '-'}</div>
                    </div>
                    <div>
                      <button
                        className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                        onClick={() => { setBreakdownCourseId(e.course_id); setShowBreakdown(true); }}
                      >
                        {t('viewBreakdown') || 'View Breakdown'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Grades */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">{t('recentGrades')}</h3>

          {grades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noGradesYet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('assignmentHeader')}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('scoreHeader')}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('percentageHeader')}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('gradeHeader')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('dateHeader')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.slice(0, 10).map(grade => {
                    const percentage = (grade.grade / grade.max_grade) * 100;
                    const letter = getLetterGrade(percentage);
                    return (
                      <tr key={grade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{grade.assignment_name}</td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {grade.grade} / {grade.max_grade}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-bold text-indigo-600">
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                            {letter}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{grade.date_submitted || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attendance Overview */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h3 className="text-xl font-bold text-gray-800">{t('attendanceOverview')}</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="attendance-course-filter">{t('filterByCourse') || 'Filter by course'}</label>
              <select
                id="attendance-course-filter"
                className="border rounded px-3 py-2 text-sm"
                value={attendanceCourseFilter ?? ''}
                onChange={(e) => setAttendanceCourseFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t('allCourses') || 'All Courses'}</option>
                {enrollments.map((enr) => {
                  const c = coursesById[enr.course_id];
                  const label = c ? `${c.course_code} — ${c.course_name}` : `Course #${enr.course_id}`;
                  return (
                    <option key={enr.id} value={enr.course_id}>{label}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {(() => {
            const att = attendanceCourseFilter ? attendance.filter(a => a.course_id === attendanceCourseFilter) : attendance;
            const total = att.length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['Present', 'Absent', 'Late', 'Excused'] as const).map(status => {
                  const count = att.filter(a => a.status === status).length;
                  const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                  const colors = {
                    Present: 'from-green-500 to-green-600',
                    Absent: 'from-red-500 to-red-600',
                    Late: 'from-yellow-500 to-yellow-600',
                    Excused: 'from-blue-500 to-blue-600'
                  } as const;

                  return (
                    <div key={status} className={`bg-gradient-to-br ${colors[status]} rounded-xl shadow p-4 text-white`}>
                      <p className="text-sm opacity-90">{t(status.toLowerCase())}</p>
                      <p className="text-3xl font-bold mt-2">{count}</p>
                      <p className="text-sm opacity-90 mt-1">{percentage}%</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {showBreakdown && breakdownCourseId && (
          <GradeBreakdownModal
            studentId={studentId}
            courseId={breakdownCourseId}
            courseName={coursesById[breakdownCourseId]?.course_name}
            onClose={() => { setShowBreakdown(false); setBreakdownCourseId(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
