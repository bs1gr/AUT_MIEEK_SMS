import { useState, useEffect, useMemo, useCallback, useRef, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  Calendar,
  Star,
  TrendingUp,
  CheckCircle,
  Award,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { gpaToPercentage, formatAllGrades, getLetterGrade } from '@/utils/gradeUtils';
import { getLocalizedCategory } from '@/utils/categoryLabels';
import { listContainerVariants, listItemVariants } from '@/utils/animations';
import { CourseCardSkeleton } from '@/components/ui';
import './EnhancedDashboardView.css';
import type { OperationsLocationState } from '@/features/operations/types';
import { Student, Course } from '@/types';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1';

// Extended student type with analytics data
interface StudentWithGPA extends Student {
  overallGPA: number;
  totalCourses: number;
  totalCredits: number;
  failedCourses: number;
}

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ComponentType<{ size?: number }>;
  color: 'indigo' | 'purple' | 'green' | 'yellow';
  subtitle?: string;
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: StatCardProps) => {
  const colorClasses: Record<StatCardProps['color'], string> = {
    indigo: 'text-indigo-600 bg-indigo-100',
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-emerald-600 bg-emerald-100',
    yellow: 'text-amber-600 bg-amber-100',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colorClasses[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

type AccentColor = 'indigo' | 'emerald' | 'amber' | 'violet';

const accentStyles: Record<AccentColor, { iconBg: string; border: string; label: string }> = {
  indigo: {
    iconBg: 'bg-indigo-100 text-indigo-600',
    border: 'border-indigo-100',
    label: 'text-indigo-500',
  },
  emerald: {
    iconBg: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-100',
    label: 'text-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-100 text-amber-600',
    border: 'border-amber-100',
    label: 'text-amber-500',
  },
  violet: {
    iconBg: 'bg-violet-100 text-violet-600',
    border: 'border-violet-100',
    label: 'text-violet-500',
  },
};

type MetricCardProps = {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ size?: number }>;
  accent?: AccentColor;
};

const MetricCard = ({ title, value, hint, icon: Icon, accent = 'indigo' }: MetricCardProps) => {
  const styles = accentStyles[accent] ?? accentStyles.indigo;

  return (
    <div className={`rounded-2xl border ${styles.border} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="mb-4 flex items-center justify-between">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <Icon size={22} />
        </div>
        <span className={`text-xs font-semibold ${styles.label}`}>{hint}</span>
      </div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
};

type EnhancedDashboardProps = {
  students: Student[];
  courses: Course[];
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
  };
};

const EnhancedDashboardView = ({ students, courses, stats }: EnhancedDashboardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate ? useNavigate() : undefined;

  const goToExport = useCallback(
    (scrollTo: OperationsLocationState['scrollTo']) => {
      if (!navigate) {
        return;
      }
      const state: OperationsLocationState = { tab: 'exports', scrollTo };
      navigate('/operations', { state });
    },
    [navigate]
  );

  const handleGoToExportCourses = useCallback(() => {
    goToExport('courses-excel');
  }, [goToExport]);

  const handleGoToExportGrades = useCallback(() => {
    goToExport('all-grades-excel');
  }, [goToExport]);

  const handleGoToExportStudents = useCallback(() => {
    goToExport('students-excel');
  }, [goToExport]);

  const [topPerformers, setTopPerformers] = useState<StudentWithGPA[]>([]);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avgClassSize, setAvgClassSize] = useState<number>(0);
  const [activeCourseCount, setActiveCourseCount] = useState<number>(0);

  const studentsCount = students.length;
  const coursesCount = courses.length;

  const activeStudentsCount = useMemo(
    () => (students || []).filter((student) => student.is_active !== false).length,
    [students]
  );

  const topPerformersCourseTotal = useMemo(
    () => topPerformers.reduce((sum: number, student) => sum + (student.totalCourses || 0), 0),
    [topPerformers]
  );

  const averageTopPerformerPct = useMemo(() => {
    if (!topPerformers.length) {
      return 0;
    }
    const avgGpa =
      topPerformers.reduce((sum: number, student) => sum + (student.overallGPA || 0), 0) /
      topPerformers.length;
    return (avgGpa / 4) * 100;
  }, [topPerformers]);

  const yearBuckets = useMemo(() => {
    const buckets: Record<number, number> = {};
    (students || []).forEach((student) => {
      const numericYear = Number.isFinite(Number(student.study_year))
        ? Number(student.study_year)
        : 0;
      buckets[numericYear] = (buckets[numericYear] || 0) + 1;
    });
    return buckets;
  }, [students]);

  const yearEntries = useMemo(
    () =>
      Object.entries(yearBuckets)
        .map(([yearKey, count]) => ({ year: Number(yearKey), count }))
        .sort((a, b) => a.year - b.year),
    [yearBuckets]
  );

  const handleToggleAnalytics = () => {
    if (!showMore) {
      setShowMore(true);
      window.setTimeout(
        () => analyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80
      );
    } else {
      setShowMore(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadEnrollmentStats = useCallback(async () => {
    if (courses.length === 0) {
      setAvgClassSize(0);
      setActiveCourseCount(0);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/?limit=500`);
      if (!response.ok) throw new Error(`Failed to fetch enrollments: ${response.status} ${response.statusText}`);
      const data = await response.json();
      const enrollments = data.items || [];

      if (Array.isArray(enrollments) && enrollments.length > 0) {
        const enrollmentCounts = enrollments.reduce(
          (acc: Record<number, number>, enrollment: { course_id?: number }) => {
            if (enrollment.course_id) {
              acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
            }
            return acc;
          },
          {}
        );

        const coursesWithEnrollments = Object.keys(enrollmentCounts).length;
        setActiveCourseCount(coursesWithEnrollments);

        if (coursesWithEnrollments > 0) {
          const totalEnrolled = Object.values(enrollmentCounts).reduce(
            (sum, count) => sum + count,
            0
          );
          const avg = totalEnrolled / coursesWithEnrollments;
          setAvgClassSize(Math.round(avg));
        } else {
          setAvgClassSize(0);
        }
      } else {
        setAvgClassSize(0);
        setActiveCourseCount(0);
      }
    } catch (error) {
      console.error('Error loading enrollment stats:', error);
      setAvgClassSize(0);
      setActiveCourseCount(0);
    }
  }, [courses]);

  const loadDashboardData = useCallback(async () => {
    if (students.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const studentPromises = students.slice(0, 5).map(async (student) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(
            `${API_BASE_URL}/analytics/student/${student.id}/all-courses-summary`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`Failed to fetch student summary: ${response.status}`);
          const data = await response.json();
          const failedCourses = (data.courses || []).filter(
            (course: { letter_grade?: string; gpa?: string | number }) => course.letter_grade === 'F' || (course.gpa && parseFloat(String(course.gpa)) < 1.0)
          ).length;

          return {
            ...student,
            overallGPA: data.overall_gpa || 0,
            totalCourses: data.courses?.length || 0,
            totalCredits: data.total_credits || 0,
            failedCourses,
          };
        } catch (error) {
          return {
            ...student,
            overallGPA: 0,
            totalCourses: 0,
            totalCredits: 0,
            failedCourses: 0,
          };
        }
      });

      const studentsWithGPA = await Promise.all(studentPromises);
      const sorted = studentsWithGPA
        .filter((entry) => entry.overallGPA > 0)
        .sort((a, b) => b.overallGPA - a.overallGPA)
        .slice(0, 5);

      setTopPerformers(sorted);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [students]);

  useEffect(() => {
    if (students.length > 0) {
      loadDashboardData();
    }
  }, [students, loadDashboardData]);

  useEffect(() => {
    if (courses.length > 0) {
      loadEnrollmentStats();
    }
  }, [courses, loadEnrollmentStats]);

  return (
    <div className="space-y-6 bg-slate-100 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="MIEEK Logo" 
            className="h-10 w-auto object-contain"
          />
          <h2 className="text-3xl font-semibold text-slate-900">{t('dashboardTitle')}</h2>
        </div>
        <button
          type="button"
          onClick={handleToggleAnalytics}
          className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-indigo-600 transition-all hover:border-indigo-400 hover:text-indigo-700"
        >
          <span className="text-sm font-medium">
            {showMore ? t('hideDetailedAnalytics') : t('viewDetailedAnalytics')}
          </span>
          <ArrowRight size={18} className={`transition-transform ${showMore ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalStudents')}
          value={stats.totalStudents || 0}
          icon={Users}
          color="indigo"
          subtitle={`${stats.activeStudents || 0} ${t('active').toLowerCase()}`}
        />
        <StatCard
          title={t('activeCourses')}
          value={activeCourseCount}
          icon={BookOpen}
          color="purple"
          subtitle={t('withEnrollments')}
        />
        <StatCard
          title={t('avgClassSize')}
          value={avgClassSize}
          icon={TrendingUp}
          color="green"
          subtitle={t('studentsPerCourse')}
        />
        <StatCard
          title={t('enrollmentRate')}
          value={
            stats.totalStudents
              ? `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}%`
              : '0%'
          }
          icon={CheckCircle}
          color="yellow"
          subtitle={t('activeEnrollment')}
        />
      </div>

      {showMore && (
        <div ref={analyticsRef} className="space-y-8">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span>{t('loadingStudentData')}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <MetricCard
              icon={Calendar}
              title={t('thisWeek')}
              hint={t('activeStudents')}
              value={activeStudentsCount}
              accent="indigo"
            />
            <MetricCard
              icon={Star}
              title={t('assessments')}
              hint={t('totalEnrollments')}
              value={topPerformersCourseTotal}
              accent="emerald"
            />
            <MetricCard
              icon={TrendingUp}
              title={t('performance')}
              hint={t('averageGPATop')}
              value={`${averageTopPerformerPct.toFixed(1)}%`}
              accent="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Award size={22} className="text-amber-500" />
                  <span>{t('topPerformingStudents')}</span>
                </h3>
                <button onClick={handleGoToExportGrades} className="export-referral-link">
                  {t('exportGradesLink') || 'Export Grades'}
                </button>
              </div>
              <p className="text-sm text-slate-500">{t('byGPA')}</p>
              {topPerformers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <Target size={42} className="opacity-40" />
                  <p>{t('noPerformanceData')}</p>
                  <p className="text-xs text-slate-400">{t('studentsNeedGrades')}</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {topPerformers.map((student, index: number) => {
                    const gpa = Number(student.overallGPA || 0);
                    const formatted = formatAllGrades(gpa);
                    const pct = gpaToPercentage(gpa);
                    const letter = getLetterGrade(pct);
                    const failedCount = student.failedCourses || 0;
                    const statusLabel =
                      failedCount > 0
                        ? t('failedCoursesCount', { count: failedCount }).replace(
                            '{count}',
                            String(failedCount)
                          )
                        : formatted.description;
                    const accentPalette = [
                      'border-amber-400 bg-amber-50',
                      'border-slate-300 bg-slate-50',
                      'border-orange-300 bg-orange-50',
                    ];
                    const rowAccent = accentPalette[index] || 'border-indigo-200 bg-slate-50';

                    return (
                      <div
                        key={student.id || index}
                        className={`rounded-xl border-l-4 ${rowAccent} p-4`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {student.totalCourses || 0} {t('courses')} • {student.totalCredits || 0}{' '}
                              {t('credits')}
                            </p>
                            <p className={`text-xs ${failedCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {statusLabel} • {formatted.greekGrade}/20 • {letter}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-semibold text-indigo-600">
                                {formatted.percentage}%
                              </p>
                              <p className="text-xs text-slate-500">GPA {formatted.gpa}</p>
                            </div>
                            <div className="rounded-lg border border-indigo-200 bg-white px-5 py-3 text-center">
                              <p className="text-lg font-semibold text-indigo-700">{Math.round(pct)}</p>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                                /100
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <BookOpen size={22} className="text-violet-500" />
                  <span>{t('activeCourses')}</span>
                </h3>
                <button onClick={handleGoToExportCourses} className="export-referral-link">
                  {t('exportCoursesLink') || 'Export Courses'}
                </button>
              </div>
              <motion.div
                className="space-y-3"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => <CourseCardSkeleton key={index} />)
                ) : courses && courses.length > 0 ? (
                  courses.slice(0, 6).map((course) => (
                    <motion.div
                      key={course.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200"
                      variants={listItemVariants}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{course.course_code}</p>
                          <p className="text-sm text-slate-600">{course.course_name}</p>
                          {course.semester && (
                            <p className="mt-1 text-xs text-slate-400">{course.semester}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
                          {course.credits || 0} {t('creditsAbbr') || 'cr'}
                        </span>
                      </div>
                      {Array.isArray(course.evaluation_rules) &&
                        course.evaluation_rules.length > 0 && (
                          <div className="mt-3 border-t border-slate-200 pt-2">
                            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                              <CheckCircle size={12} className="text-emerald-500" />
                              <span>{t('evaluationRules') || 'Evaluation rules'}</span>
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(course.evaluation_rules || []).slice(0, 6).map((rule: { category?: string; weight?: string | number }, idx: number) => {
                                const weightValue = parseFloat(String(rule?.weight ?? ''));
                                const weightLabel = Number.isFinite(weightValue)
                                  ? `${Math.round(weightValue)}%`
                                  : '';
                                const localizedCategory = getLocalizedCategory(
                                  String(rule?.category || ''),
                                  t
                                );

                                return (
                                  <span
                                    key={`${course.id}-rule-${idx}`}
                                    className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                                  >
                                    <span className="font-medium">{localizedCategory || '-'}</span>
                                    {weightLabel && (
                                      <span className="ml-1 text-indigo-600">{weightLabel}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                            {course.evaluation_rules.length > 6 && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                +{course.evaluation_rules.length - 6} {t('moreLabel')}
                              </p>
                            )}
                          </div>
                        )}
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    {t('noCoursesAvailable') || 'No courses available.'}
                  </p>
                )}
              </motion.div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Users size={22} className="text-indigo-500" />
                <span>{t('recentStudents')}</span>
              </h3>
              <button onClick={handleGoToExportStudents} className="export-referral-link">
                {t('exportStudentsLink') || 'Export Students'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(students || []).slice(0, 6).map((student) => (
                <div
                  key={student.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-semibold text-white">
                      {String(student.first_name || '').charAt(0)}
                      {String(student.last_name || '').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{student.student_id}</p>
                      {student.enrollment_date && (
                        <p className="mt-1 text-xs text-slate-400">
                          {t('enrolled')} {new Date(student.enrollment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        student.is_active !== false ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      <CheckCircle size={12} />
                      {student.is_active !== false ? t('active') || 'Active' : t('inactive') || 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Users size={22} className="text-emerald-500" />
                <span>{t('yearAnalytics')}</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {yearEntries.map(({ year, count }, index) => {
                const label = year === 0 ? t('unknownYear') : `${t('year')} ${year}`;
                const palette = [
                  'border-indigo-200 bg-indigo-50',
                  'border-emerald-200 bg-emerald-50',
                  'border-amber-200 bg-amber-50',
                  'border-purple-200 bg-purple-50',
                ];
                const bucketStyle = palette[index % palette.length];
                return (
                  <div key={`${label}-${index}`} className={`rounded-xl border ${bucketStyle} p-4`}>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {studentsCount > 0 ? ((count / studentsCount) * 100).toFixed(1) : '0.0'}% {t('totalStudents')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-slate-900">
              {t('systemInformation') || 'System Information'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('totalStudents'), value: studentsCount },
                { label: t('totalCourses') || 'Total courses', value: coursesCount },
                {
                  label: t('configuredCourses') || 'Configured courses',
                  value: (courses || []).filter(
                    (course) =>
                      Array.isArray(course.evaluation_rules) && course.evaluation_rules.length > 0
                  ).length,
                },
                { label: t('activeEnrollment') || 'Active enrollment', value: stats.activeStudents || 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboardView;
