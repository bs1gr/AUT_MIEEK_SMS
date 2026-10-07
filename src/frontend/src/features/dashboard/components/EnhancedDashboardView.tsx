import { useState, useEffect, useMemo, useCallback, type ComponentType, type SVGProps } from 'react';
import { AttendanceNotRecorded, StudentsNeedingAttention } from './DashboardAttentionPanels';
import TopPerformersPanel from './TopPerformersPanel';
import { formatPercent } from './analyticsUi';
import { useClassOverview } from '@/api/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  Calendar,
  Star,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { getLocalizedCategory } from '@/utils/categoryLabels';
import { listContainerVariants, listItemVariants } from '@/utils/animations';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import './EnhancedDashboardView.css';
import type { OperationsLocationState } from '@/features/operations/types';
import { Student, Course } from '@/types';
import apiClient from '@/api/api';

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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: AccentColor;
};

const MetricCard = ({ title, value, hint, icon: Icon, accent = 'indigo' }: MetricCardProps) => {
  const styles = accentStyles[accent] ?? accentStyles.indigo;

  return (
    <div className={`rounded-2xl border ${styles.border} bg-white p-6 shadow-xs transition-shadow hover:shadow-md`}>
      <div className="mb-4 flex items-center justify-between">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <Icon width={22} height={22} />
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
  const navigate = useNavigate();
  const { formatDate } = useDateTimeFormatter();

  const goToExport = useCallback(
    (scrollTo: OperationsLocationState['scrollTo']) => {
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

  const [activeEnrollmentCourseIds, setActiveEnrollmentCourseIds] = useState<Set<number>>(new Set());

  // is_active is derived server-side from enrollments (active while students are enrolled)
  const isCourseActiveNow = useCallback((course: Course) => course.is_active === true, []);

  const activeCoursesWithEnrollments = useMemo(
    () =>
      courses.filter(
        (course) => isCourseActiveNow(course) && activeEnrollmentCourseIds.has(course.id)
      ),
    [courses, activeEnrollmentCourseIds, isCourseActiveNow]
  );

  // Average final grade, attendance and grading progress of all active students (same data as Analytics).
  const overviewSummary = useClassOverview({}).data?.summary;
  const [avgClassSize, setAvgClassSize] = useState<number>(0);
  const [activeCourseCount, setActiveCourseCount] = useState<number>(0);

  const studentsCount = students.length;
  const coursesCount = courses.length;

  const activeStudentsCount = useMemo(
    () => (students || []).filter((student) => student.is_active !== false).length,
    [students]
  );

  // Year of study counts active students only: inactive ones are no longer in a class.
  const yearBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    (students || []).filter((student) => student.is_active !== false).forEach((student) => {
      if (student.academic_year) {
        const label = String(student.academic_year).trim() || t('unknownYear');
        buckets[label] = (buckets[label] || 0) + 1;
        return;
      }

      const numericYear = Number.isFinite(Number(student.study_year))
        ? Number(student.study_year)
        : 0;

      let label = t('unknownYear');
      if (numericYear === 1) {
        label = t('classA') || 'A';
      } else if (numericYear === 2) {
        label = t('classB') || 'B';
      } else if (numericYear > 2) {
        label = `${t('year')} ${numericYear}`;
      }

      buckets[label] = (buckets[label] || 0) + 1;
    });
    return buckets;
  }, [students, t]);

  const yearEntries = useMemo(() => {
    const entries = Object.entries(yearBuckets).map(([label, count]) => ({ label, count }));
    const orderPriority = (label: string) => {
      if (label === (t('classA') || 'A')) return 1;
      if (label === (t('classB') || 'B')) return 2;
      if (label === t('unknownYear')) return 99;
      const match = label.match(/\b\d+\b/);
      return match ? 10 + Number(match[0]) : 50;
    };

    return entries.sort((a, b) => orderPriority(a.label) - orderPriority(b.label));
  }, [yearBuckets, t]);

  const loadEnrollmentStats = useCallback(async () => {
    if (courses.length === 0) {
      setAvgClassSize(0);
      setActiveCourseCount(0);
      setActiveEnrollmentCourseIds(new Set());
      return;
    }
    try {
      const response = await apiClient.get('/enrollments/', { params: { limit: 500 } });
      const data = response.data;
      const enrollments: { course_id?: number; student_id?: number; status?: string }[] =
        data?.items || data?.data?.items || data?.data || [];
      const activeCourseIds = new Set(
        courses.filter((course) => isCourseActiveNow(course)).map((course) => course.id)
      );
      const activeEnrollments = Array.isArray(enrollments)
        ? enrollments.filter((enrollment) => {
            const status = String(enrollment.status || '').toLowerCase();
            if (status !== 'active') {
              return false;
            }
            if (!enrollment.course_id) {
              return false;
            }
            return activeCourseIds.has(enrollment.course_id);
          })
        : [];

      if (activeEnrollments.length > 0) {
        const enrollmentCounts = activeEnrollments.reduce(
          (acc: Record<number, number>, enrollment) => {
            if (enrollment.course_id) {
              acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
            }
            return acc;
          },
          {} as Record<number, number>
        );

        const coursesWithEnrollments = Object.keys(enrollmentCounts).length;
        const courseIds = new Set(Object.keys(enrollmentCounts).map((id) => Number(id)));
        setActiveEnrollmentCourseIds(courseIds);
        setActiveCourseCount(coursesWithEnrollments);

        if (coursesWithEnrollments > 0) {
          const totalEnrolled = (Object.values(enrollmentCounts) as number[]).reduce((sum, count) => sum + count, 0);
          const avg = totalEnrolled / coursesWithEnrollments;
          setAvgClassSize(Math.round(avg));
        } else {
          setAvgClassSize(0);
        }
      } else {
        setAvgClassSize(0);
        setActiveCourseCount(0);
          setActiveEnrollmentCourseIds(new Set());
      }
    } catch (error) {
      console.error('Error loading enrollment stats:', error);
      setAvgClassSize(0);
      setActiveCourseCount(0);
      setActiveEnrollmentCourseIds(new Set());
    }
  }, [courses, isCourseActiveNow]);

  useEffect(() => {
    if (courses.length > 0) {
      loadEnrollmentStats();
    }
  }, [courses, loadEnrollmentStats]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.png"
            alt="MIEEK Logo"
            className="h-8 w-auto object-contain shrink-0"
          />
          <h2 className="text-xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 truncate">{t('dashboardTitle')}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white min-h-[40px]"
              aria-current="page"
            >
              {t('dashboardOverviewTab')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:text-slate-900 min-h-[40px]"
            >
              {t('dashboardAnalyticsTab')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalStudents')}
          value={stats.totalStudents || 0}
          icon={Users}
          color="indigo"
          subtitle={`${stats.activeStudents || 0} ${t('active', { count: stats.activeStudents || 0, ns: 'students' }).toLowerCase()}`}
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

        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <MetricCard
              icon={TrendingUp}
              title={t('dashboard.metricAverageFinal')}
              hint={
                overviewSummary?.pass_rate !== null && overviewSummary?.pass_rate !== undefined
                  ? t('analytics.overview.passRate', { rate: formatPercent(overviewSummary.pass_rate) })
                  : t('analytics.overview.nothingGraded')
              }
              value={formatPercent(overviewSummary?.average_final_grade)}
              accent="violet"
            />
            <MetricCard
              icon={Calendar}
              title={t('dashboard.metricAttendance')}
              hint={t('dashboard.metricAttendanceHint')}
              value={formatPercent(overviewSummary?.attendance_rate)}
              accent="indigo"
            />
            <MetricCard
              icon={Star}
              title={t('dashboard.metricGradingProgress')}
              hint={t('dashboard.metricGradingProgressHint')}
              value={overviewSummary ? `${overviewSummary.graded_enrollments} / ${overviewSummary.enrollments}` : '—'}
              accent="emerald"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TopPerformersPanel t={t} onExportGrades={handleGoToExportGrades} />

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
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
                {activeCoursesWithEnrollments.length > 0 ? (
                  activeCoursesWithEnrollments.slice(0, 6).map((course) => (
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StudentsNeedingAttention t={t} />
            <AttendanceNotRecorded t={t} formatDate={(d) => formatDate(d)} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Users size={22} className="text-emerald-500" />
                <span>{t('yearAnalytics')}</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {yearEntries.map(({ label, count }, index) => {
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
                      {activeStudentsCount > 0 ? ((count / activeStudentsCount) * 100).toFixed(1) : '0.0'}% {t('dashboard.ofActiveStudents')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
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
    </div>
  );
};

export default EnhancedDashboardView;
