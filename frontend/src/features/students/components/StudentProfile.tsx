
import React, { useState, useEffect, useCallback } from 'react';
/* eslint-disable testing-library/no-await-sync-queries */
import { ArrowLeft, BookOpen, TrendingUp, Calendar, Star, CheckCircle, XCircle, Mail, Award, FileText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gradesAPI, attendanceAPI, highlightsAPI, studentsAPI } from '@/api/api';
import { GradeBreakdownModal } from '@/features/grading';
import StudentPerformanceReport from '@/components/StudentPerformanceReport';
import type { Student, Grade, Attendance, Highlight, HighlightCreatePayload, Course, CourseEnrollment } from '@/types';
import { eventBus, EVENTS } from '@/utils/events';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api/v1';

interface StudentProfileProps {
  studentId: number;
  onBack: () => void;
}

const StudentProfile = ({ studentId, onBack }: StudentProfileProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatDate } = useDateTimeFormatter();
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
  const [showPerformanceReport, setShowPerformanceReport] = useState(false);
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [highlightForm, setHighlightForm] = useState({
    semester: '',
    category: '',
    highlight_text: '',
    rating: '',
    is_positive: true,
  });
  const [highlightSaving, setHighlightSaving] = useState(false);
  const [highlightFormError, setHighlightFormError] = useState<string | null>(null);
  const canAddHighlight = ['admin', 'teacher'].includes((user?.role || '').toLowerCase());

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
      setError(t('failedToLoadStudentData', { ns: 'students' }));
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
  }, [studentId, loadStudentData]);

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
  }, [studentId, loadStudentData]);



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

  const translateAssignmentName = (name?: string) => {
    if (!name) return t('assignment', { ns: 'grades' });

    if (name === 'Sample Exam Assignment') {
      return t('sampleExamAssignment', { ns: 'grades' });
    }

    const midtermMatch = name.match(/^Midterm Exam\s*(.*)$/i);
    if (midtermMatch) {
      const suffix = midtermMatch[1]?.trim();
      return `${t('midtermExam', { ns: 'common' })}${suffix ? ` ${suffix}` : ''}`;
    }

    const finalMatch = name.match(/^Final Exam\s*(.*)$/i);
    if (finalMatch) {
      const suffix = finalMatch[1]?.trim();
      return `${t('finalExam', { ns: 'common' })}${suffix ? ` ${suffix}` : ''}`;
    }

    const assignmentMatch = name.match(/^Assignment\s*(.*)$/i);
    if (assignmentMatch) {
      const suffix = assignmentMatch[1]?.trim();
      return `${t('assignment', { ns: 'grades' })}${suffix ? ` ${suffix}` : ''}`;
    }

    return name;
  };

  const translateHighlightCategory = (category?: string | null) => {
    if (!category) return t('highlightCategoryFallback', { ns: 'students' });
    const normalized = category.toLowerCase();
    if (normalized === 'academic') return t('highlightCategoryAcademic', { ns: 'students' });
    if (normalized === 'achievement') return t('highlightCategoryAchievement', { ns: 'students' });
    if (normalized === 'behavior') return t('highlightCategoryBehavior', { ns: 'students' });
    if (normalized === 'extracurricular') return t('highlightCategoryExtracurricular', { ns: 'students' });
    if (normalized === 'note') return t('highlightCategoryNote', { ns: 'students' });
    return category;
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

  const resetHighlightForm = useCallback(() => {
    setHighlightForm({
      semester: '',
      category: '',
      highlight_text: '',
      rating: '',
      is_positive: true,
    });
    setHighlightFormError(null);
  }, []);

  const handleHighlightTemplate = (text: string, category?: string) => {
    setHighlightForm((prev) => ({
      ...prev,
      highlight_text: text,
      category: category ?? prev.category,
      is_positive: true,
    }));
  };

  const handleHighlightSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHighlightFormError(null);

    const semester = highlightForm.semester.trim();
    const highlightText = highlightForm.highlight_text.trim();
    if (!semester) {
      setHighlightFormError(t('highlightSemesterRequired', { ns: 'students' }));
      return;
    }
    if (!highlightText) {
      setHighlightFormError(t('highlightTextRequired', { ns: 'students' }));
      return;
    }

    const ratingValue = highlightForm.rating !== '' ? Number(highlightForm.rating) : undefined;
    const payload: HighlightCreatePayload = {
      student_id: studentId,
      semester,
      rating: Number.isFinite(ratingValue) ? ratingValue : undefined,
      category: highlightForm.category.trim() || undefined,
      highlight_text: highlightText,
      is_positive: highlightForm.is_positive,
    };

    try {
      setHighlightSaving(true);
      await highlightsAPI.create(payload);
      resetHighlightForm();
      setShowAddHighlight(false);
      await loadStudentData();
    } catch (error) {
      console.error('Failed to create highlight:', error);
      setHighlightFormError(t('highlightCreateFailed', { ns: 'students' }));
    } finally {
      setHighlightSaving(false);
    }
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
            {t('backToStudents', { ns: 'students' })}
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-indigo-700 font-semibold drop-shadow-sm">{t('studentNotFound', { ns: 'students' })}</p>
      </div>
    );
  }

  const stats = calculateStats();
  const distribution = gradeDistribution();
  const highestGradePercent = grades.length > 0
    ? Math.max(...grades.map((grade) => (grade.grade / grade.max_grade) * 100))
    : null;
  const classLabel = student.academic_year === 'A'
    ? t('classA', { ns: 'common' })
    : student.academic_year === 'B'
      ? t('classB', { ns: 'common' })
      : student.academic_year
        ? `${t('academicYear', { ns: 'common' })} ${student.academic_year}`
        : null;
  const studentName = `${student.first_name} ${student.last_name}`;
  const quickHighlightTemplates = [
    {
      key: 'bestGradeInClass',
      category: 'Academic',
      text: t('highlightTemplateBestGradeInClass', {
        ns: 'students',
        student: studentName,
        score: highestGradePercent ? highestGradePercent.toFixed(1) : '-'
      }),
    },
    {
      key: 'bestGradeInExam',
      category: 'Academic',
      text: t('highlightTemplateBestGradeInExam', { ns: 'students', student: studentName }),
    },
    {
      key: 'topRankInClass',
      category: 'Achievement',
      text: t('highlightTemplateTopRankInClass', { ns: 'students', student: studentName }),
    },
    {
      key: 'topRankInExam',
      category: 'Achievement',
      text: t('highlightTemplateTopRankInExam', { ns: 'students', student: studentName }),
    },
  ];

  return (
    <div data-testid="student-profile" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center space-x-2 text-indigo-700 hover:text-indigo-600 transition-colors font-semibold drop-shadow-sm"
        >
          <ArrowLeft size={20} />
          <span>{t('backToStudents', { ns: 'students' })}</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="px-8 py-8">
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white">
                {student.first_name[0]}{student.last_name[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-indigo-800 drop-shadow-sm">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="text-indigo-700 mt-1 font-semibold drop-shadow-sm">{t('studentID', { ns: 'students' })} {student.student_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="flex items-center space-x-3 text-indigo-700">
                <Mail size={20} />
                <span>{student.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-indigo-700">
                <Calendar size={20} />
                <span>{t('enrolled', { ns: 'students' })} {formatDate(student.enrollment_date)}</span>
              </div>
              <div className="md:col-span-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPerformanceReport(true)}
                  className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <FileText size={20} />
                  <span>{t('studentPerformanceReport', { ns: 'reports' })}</span>
                </button>
              </div>
              {classLabel && (
                <div className="flex items-center space-x-3 text-indigo-700">
                  <Award size={20} className="text-indigo-600" />
                  <span className="font-semibold text-indigo-700">{classLabel}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                {student.is_active ? (
                  <>
                    <CheckCircle size={20} className="text-green-600" style={{ color: '#22c55e' }} strokeWidth={2.5} />
                    <span className="text-green-600 font-semibold">{t('active', { ns: 'common' })}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="text-red-600" style={{ color: '#ef4444' }} strokeWidth={2.5} />
                    <span className="text-red-600 font-semibold">{t('inactive', { ns: 'common' })}</span>
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
              <span className="text-xs opacity-75">{t('overall', { ns: 'common' })}</span>
            </div>
            <p className="text-4xl font-bold">{stats.gpa}</p>
            <p className="text-sm opacity-90">{t('gpaOutOf', { ns: 'students' })}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Award size={24} />
              <span className="text-xs opacity-75">{t('average', { ns: 'common' })}</span>
            </div>
            <p className="text-4xl font-bold">{stats.avgGrade}%</p>
            <p className="text-sm opacity-90">{stats.totalGrades} {t('assignments', { ns: 'common' })}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={24} />
              <span className="text-xs opacity-75">{t('attendance', { ns: 'common' })}</span>
            </div>
            <p className="text-4xl font-bold">{stats.attendanceRate}%</p>
            <p className="text-sm opacity-90">{stats.totalClasses} {t('classes', { ns: 'common' })}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Star size={24} />
              <span className="text-xs opacity-75">{t('highlights', { ns: 'students' })}</span>
            </div>
            <p className="text-4xl font-bold">{highlights.length}</p>
            <p className="text-sm opacity-90">{t('totalAchievements', { ns: 'students' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
              <BookOpen size={24} className="text-indigo-600" />
              <span>{t('gradeDistribution', { ns: 'students' })}</span>
            </h3>

            <div className="space-y-4">
              {Object.entries(distribution).map(([grade, count], idx) => {
                const total = grades.length;
                const percentage = total > 0 ? (count / total * 100) : 0;
                // colour map intentionally omitted when rendering lightweight bars

                return (
                  <React.Fragment key={grade}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700">{t('grade', { ns: 'grades' })} {grade}</span>
                        <span className="text-gray-600">{count} {t('assignments', { ns: 'common' })} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{percentage.toFixed(0)}%</div>
                    </div>
                    {idx < Object.entries(distribution).length - 1 && (
                      <div className="border-t-2 border-gray-600 dark:border-gray-400 my-2" role="separator" aria-orientation="horizontal" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Recent Highlights */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <Star size={24} className="text-yellow-500" />
                <span>{t('recentHighlights', { ns: 'students' })}</span>
              </h3>
              {canAddHighlight && (
                <button
                  type="button"
                  onClick={() => setShowAddHighlight((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus size={16} />
                  <span>{showAddHighlight ? t('cancelAddHighlight', { ns: 'students' }) : t('addHighlight', { ns: 'students' })}</span>
                </button>
              )}
            </div>

            {canAddHighlight && showAddHighlight && (
              <form onSubmit={handleHighlightSubmit} className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-indigo-700">{t('highlightTemplates', { ns: 'students' })}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickHighlightTemplates.map((template) => (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => handleHighlightTemplate(template.text, template.category)}
                        className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        {t(template.key, { ns: 'students' })}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700" htmlFor="highlight-semester">
                      {t('highlightSemesterLabel', { ns: 'students' })}
                    </label>
                    <input
                      id="highlight-semester"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder={t('highlightSemesterPlaceholder', { ns: 'students' })}
                      value={highlightForm.semester}
                      onChange={(event) => setHighlightForm((prev) => ({ ...prev, semester: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700" htmlFor="highlight-category">
                      {t('highlightCategoryLabel', { ns: 'students' })}
                    </label>
                    <select
                      id="highlight-category"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={highlightForm.category}
                      onChange={(event) => setHighlightForm((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      <option value="">{t('highlightCategoryPlaceholder', { ns: 'students' })}</option>
                      <option value="Academic">{t('highlightCategoryAcademic', { ns: 'students' })}</option>
                      <option value="Achievement">{t('highlightCategoryAchievement', { ns: 'students' })}</option>
                      <option value="Behavior">{t('highlightCategoryBehavior', { ns: 'students' })}</option>
                      <option value="Extracurricular">{t('highlightCategoryExtracurricular', { ns: 'students' })}</option>
                      <option value="Note">{t('highlightCategoryNote', { ns: 'students' })}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700" htmlFor="highlight-rating">
                      {t('highlightRatingLabel', { ns: 'students' })}
                    </label>
                    <input
                      id="highlight-rating"
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder={t('highlightRatingPlaceholder', { ns: 'students' })}
                      value={highlightForm.rating}
                      onChange={(event) => setHighlightForm((prev) => ({ ...prev, rating: event.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="highlight-positive"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      checked={highlightForm.is_positive}
                      onChange={(event) => setHighlightForm((prev) => ({ ...prev, is_positive: event.target.checked }))}
                    />
                    <label htmlFor="highlight-positive" className="text-sm font-semibold text-gray-700">
                      {highlightForm.is_positive ? t('highlightPositive', { ns: 'students' }) : t('highlightNegative', { ns: 'students' })}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700" htmlFor="highlight-text">
                    {t('highlightTextLabel', { ns: 'students' })}
                  </label>
                  <textarea
                    id="highlight-text"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                    placeholder={t('highlightTextPlaceholder', { ns: 'students' })}
                    value={highlightForm.highlight_text}
                    onChange={(event) => setHighlightForm((prev) => ({ ...prev, highlight_text: event.target.value }))}
                  />
                </div>

                {highlightFormError && (
                  <p className="text-sm text-red-600">{highlightFormError}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={highlightSaving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {highlightSaving ? t('highlightSaving', { ns: 'students' }) : t('highlightSave', { ns: 'students' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetHighlightForm();
                      setShowAddHighlight(false);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {t('highlightCancel', { ns: 'students' })}
                  </button>
                </div>
              </form>
            )}

            {highlights.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noHighlights', { ns: 'students' })}</p>
            ) : (
              <div className="space-y-4">
                {highlights.slice(0, 5).map((highlight, idx) => (
                  <React.Fragment key={highlight.id}>
                    {(() => {
                      const ratingValue = Math.min(5, Math.round(highlight.rating ?? 0));
                      const highlightText = highlight.highlight_text || highlight.description || '';
                      return (
                    <div
                      className={`p-4 rounded-lg border-l-4 ${
                        highlight.is_positive
                          ? 'bg-green-50 border-green-500'
                          : 'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    {ratingValue > 0 && (
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={i < ratingValue ? 'text-yellow-500 fill-current' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-700">{translateHighlightCategory(highlight.category)}</p>
                    <p className="text-sm text-gray-600 mt-1">{highlightText}</p>
                    <p className="text-xs text-gray-500 mt-2">{highlight.semester || '-'}</p>
                  </div>
                      );
                    })()}
                  {idx < highlights.slice(0, 5).length - 1 && (
                    <div className="border-t-2 border-gray-600 dark:border-gray-400 my-2" role="separator" aria-orientation="horizontal" />
                  )}
                </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Courses & Actions */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('enrolledCourses', { ns: 'students' })}</h3>
          {enrollments.length === 0 ? (
            <p className="text-gray-500">{t('noEnrollments', { ns: 'students' })}</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e, idx) => {
                const course = coursesById[e.course_id];
                return (
                  <React.Fragment key={e.id}>
                    <div className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <div className="font-semibold text-gray-800">{course ? `${course.course_code} — ${course.course_name}` : `Course #${e.course_id}`}</div>
                        <div className="text-xs text-gray-500">{t('enrolled', { ns: 'students' })}: {e.enrolled_at ? formatDate(e.enrolled_at) : '-'}</div>
                      </div>
                      <div>
                        <button
                          className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                          onClick={() => { setBreakdownCourseId(e.course_id); setShowBreakdown(true); }}
                      >
                        {t('viewBreakdown', { ns: 'common' })}
                      </button>
                    </div>
                  </div>
                  {idx < enrollments.length - 1 && (
                    <div className="border-t-2 border-gray-600 dark:border-gray-400 my-2" role="separator" aria-orientation="horizontal" />
                  )}
                </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Grades */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">{t('recentGrades', { ns: 'dashboard' })}</h3>

          {grades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noGradesRecorded', { ns: 'grades' })}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('assignmentHeader', { ns: 'dashboard' })}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('scoreHeader', { ns: 'dashboard' })}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('percentageHeader', { ns: 'dashboard' })}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">{t('gradeHeader', { ns: 'dashboard' })}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t('dateHeader', { ns: 'dashboard' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.slice(0, 10).map(grade => {
                    const percentage = (Number(grade.grade) / Number(grade.max_grade) || 100) * 100;
                    const letter = getLetterGrade(percentage);
                    return (
                      <tr key={grade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{translateAssignmentName(grade.assignment_name)}</td>
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
                        <td className="px-6 py-4 text-gray-600">{grade.date_submitted ? formatDate(grade.date_submitted) : 'N/A'}</td>
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
            <h3 className="text-xl font-bold text-gray-800">{t('attendanceOverview', { ns: 'dashboard' })}</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="attendance-course-filter">{t('filterByCourse', { ns: 'dashboard' })}</label>
              <select
                id="attendance-course-filter"
                className="border rounded px-3 py-2 text-sm"
                value={attendanceCourseFilter ?? ''}
                onChange={(e) => setAttendanceCourseFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t('allCourses', { ns: 'dashboard' })}</option>
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
                      <p className="text-sm opacity-90">{t(status.toLowerCase(), { ns: 'reports' })}</p>
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

        {showPerformanceReport && (
          <StudentPerformanceReport
            studentId={studentId}
            onClose={() => setShowPerformanceReport(false)}
          />
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
