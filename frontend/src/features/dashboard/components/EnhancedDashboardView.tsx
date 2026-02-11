import { useState, useEffect, useMemo, useCallback, useRef, type ComponentType, type SVGProps } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { getLetterGrade, percentageToGreekScale } from '@/utils/gradeUtils';
import { getLocalizedCategory } from '@/utils/categoryLabels';
import { listContainerVariants, listItemVariants } from '@/utils/animations';
import { CourseCardSkeleton } from '@/components/ui';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import './EnhancedDashboardView.css';
import type { OperationsLocationState } from '@/features/operations/types';
import { Student, Course } from '@/types';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1';

type DailyPerformanceRecord = {
  course_id?: number;
  category?: string;
  score?: number;
  max_score?: number;
};

const stripDiacritics = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (value?: string): string => {
  if (!value) {
    return '';
  }
  let normalized = stripDiacritics(String(value).trim().toLowerCase());
  normalized = normalized.replace(/[._()-]+/g, ' ').replace(/\s+/g, ' ').trim();

  const directMap: Record<string, string> = {
    'class participation': 'participation',
    participation: 'participation',
    'συμμετοχη': 'participation',
    behavior: 'behavior',
    'συμπεριφορα': 'behavior',
    effort: 'effort',
    'προσπαθεια': 'effort',
    skills: 'skills',
    'δεξιοτητες': 'skills',
    homework: 'homework',
    assignment: 'homework',
    assignments: 'homework',
    'εργασια': 'homework',
    coursework: 'homework',
    'εργασιες': 'homework',
    'continuous assessment': 'continuous',
    'συνεχης αξιολογηση': 'continuous',
    project: 'project',
    'προτζεκτ': 'project',
    'προγραμμα': 'project',
    quiz: 'quiz',
    quizzes: 'quiz',
    'κουιζ': 'quiz',
    'κουίζ': 'quiz',
    test: 'quiz',
    tests: 'quiz',
    lab: 'lab',
    'lab work': 'lab',
    'εργαστηριο': 'lab',
    'εργαστηρια': 'lab',
    presentation: 'presentation',
    'παρουσιαση': 'presentation',
    midterm: 'midterm',
    'midterm exam': 'midterm',
    'ενδιαμεση': 'midterm',
    'ενδιαμεση εξεταση': 'midterm',
    final: 'final',
    'final exam': 'final',
    'τελικη': 'final',
    'τελικη εξεταση': 'final',
    exam: 'exam',
    'εξεταση': 'exam',
    attendance: 'attendance',
    absences: 'attendance',
    'παρουσιες': 'attendance',
    'απουσιες': 'attendance',
    'φοιτηση': 'attendance',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  const containsMap: Array<[string, string[]]> = [
    ['participation', ['participation', 'συμμετοχ']],
    ['behavior', ['behavior', 'συμπεριφορ']],
    ['effort', ['effort', 'προσπαθ']],
    ['skills', ['skills', 'δεξιοτ']],
    ['homework', ['homework', 'assign', 'εργασ']],
    ['continuous', ['continuous assessment', 'συνεχ', 'αξιολογησ']],
    ['project', ['project', 'προτζεκ']],
    ['quiz', ['quiz', 'κουιζ', 'κουίζ', 'test', 'τεστ']],
    ['lab', ['lab', 'εργαστηρ']],
    ['presentation', ['presentation', 'παρουσιασ']],
    ['midterm', ['midterm', 'ενδιαμεσ']],
    ['final', ['final', 'τελικ']],
    ['exam', ['exam', 'εξετασ']],
    ['attendance', ['attendance', 'απουσ', 'παρουσ', 'φοιτησ']],
  ];

  for (const [key, needles] of containsMap) {
    if (needles.some((needle) => normalized.includes(needle))) {
      return key;
    }
  }

  return normalized;
};

const averageOf = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const toPercentage = (score?: number, maxScore?: number) => {
  if (!maxScore || maxScore <= 0 || score === undefined || score === null) {
    return null;
  }
  return (score / maxScore) * 100;
};

// Extended student type with analytics data
interface StudentWithGPA extends Student {
  overallGPA: number;
  totalCourses: number;
  totalCredits: number;
  failedCourses: number;
  attendanceRate: number;
  examAverage: number;
  continuousScore: number;
  participationScore: number;
  academicScore: number;
  overallScore: number;
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: AccentColor;
};

const MetricCard = ({ title, value, hint, icon: Icon, accent = 'indigo' }: MetricCardProps) => {
  const styles = accentStyles[accent] ?? accentStyles.indigo;

  return (
    <div className={`rounded-2xl border ${styles.border} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}>
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

  const handleGoToExportStudents = useCallback(() => {
    goToExport('students-excel');
  }, [goToExport]);

  const [topPerformers, setTopPerformers] = useState<StudentWithGPA[]>([]);
  const [rankingType, setRankingType] = useState<'gpa' | 'attendance' | 'exams' | 'overall'>('gpa');

  // Compute ranked students based on selected ranking type
  const rankedStudents = useMemo(() => {
    const students = [...topPerformers];
    switch (rankingType) {
      case 'gpa':
        return students.sort((a, b) => b.continuousScore - a.continuousScore).slice(0, 5);
      case 'attendance':
        return students.sort((a, b) => b.participationScore - a.participationScore).slice(0, 5);
      case 'exams':
        return students.sort((a, b) => b.academicScore - a.academicScore).slice(0, 5);
      case 'overall':
        return students.sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
      default:
        return students.slice(0, 5);
    }
  }, [topPerformers, rankingType]);

  const analyticsRef = useRef<HTMLDivElement>(null);
  const showMore = true;
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
    return (
      topPerformers.reduce((sum: number, student) => sum + (student.overallScore || 0), 0) /
      topPerformers.length
    );
  }, [topPerformers]);

  const yearBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    (students || []).forEach((student) => {
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
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/?limit=500`);
      if (!response.ok) throw new Error(`Failed to fetch enrollments: ${response.status} ${response.statusText}`);
      const data = await response.json();
      const enrollments: { course_id?: number }[] = data.items || [];

      if (Array.isArray(enrollments) && enrollments.length > 0) {
        const enrollmentCounts = enrollments.reduce(
          (acc: Record<number, number>, enrollment: { course_id?: number }) => {
            if (enrollment.course_id) {
              acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
            }
            return acc;
          },
          {} as Record<number, number>
        );

        const coursesWithEnrollments = Object.keys(enrollmentCounts).length;
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

    const DESIRED_TOP_COUNT = 5;
    const MIN_BUFFER = 12; // fetch a bit extra so ranking modes have data
    const MAX_STUDENTS_FOR_ANALYTICS = 60; // cap work to avoid long loading times
    const BATCH_SIZE = 6; // keep concurrent requests manageable

    const hasPerformanceData = (student: StudentWithGPA) =>
      (student.continuousScore ?? 0) > 0 ||
        (student.participationScore ?? 0) > 0 ||
        (student.academicScore ?? 0) > 0 ||
        (student.attendanceRate ?? 0) > 0 ||
        (student.examAverage ?? 0) > 0 ||
        (student.overallScore ?? 0) > 0 ||
        (student.totalCourses ?? 0) > 0 ||
        (student.totalCredits ?? 0) > 0;

    const fetchStudentSnapshot = async (student: Student): Promise<StudentWithGPA> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const [analyticsResponse, attendanceResponse, gradesResponse, performanceResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/analytics/student/${student.id}/all-courses-summary`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/attendance?student_id=${student.id}&limit=500`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/grades?student_id=${student.id}&limit=500`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/daily-performance/student/${student.id}`, { signal: controller.signal }),
        ]);

        clearTimeout(timeoutId);

        const analyticsData = analyticsResponse.ok ? await analyticsResponse.json() : null;
        const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : null;
        const gradesData = gradesResponse.ok ? await gradesResponse.json() : null;
        const performanceData = performanceResponse.ok ? await performanceResponse.json() : null;

        const failedCourses = (analyticsData?.courses || []).filter(
          (course: { letter_grade?: string; gpa?: string | number }) =>
            course.letter_grade === 'F' || (course.gpa && parseFloat(String(course.gpa)) < 1.0)
        ).length;

        const attendances = attendanceData?.items || attendanceData?.attendances || [];
        const attendanceRate = attendances.length > 0
          ? (attendances.filter((a: { status?: string }) => a.status?.toLowerCase() === 'present').length / attendances.length) * 100
          : 0;

        const grades = gradesData?.items || gradesData?.grades || [];
        const dailyPerformances: DailyPerformanceRecord[] = Array.isArray(performanceData)
          ? performanceData
          : performanceData?.items || [];

        const courseById = new Map(courses.map((course) => [course.id, course]));
        const courseIds = new Set<number>();
        grades.forEach((grade: { course_id?: number }) => {
          if (grade.course_id) courseIds.add(grade.course_id);
        });
        attendances.forEach((attendance: { course_id?: number }) => {
          if (attendance.course_id) courseIds.add(attendance.course_id);
        });
        dailyPerformances.forEach((perf) => {
          if (perf.course_id) courseIds.add(perf.course_id);
        });

        const examKeys = new Set(['midterm', 'final', 'exam']);
        const behaviorKeys = new Set(['behavior', 'effort', 'skills', 'continuous']);
        const participationKeys = new Set(['participation']);
        const attendanceKeys = new Set(['attendance']);
        const academicKeys = new Set([
          'homework',
          'project',
          'quiz',
          'lab',
          'presentation',
          'midterm',
          'final',
          'exam',
        ]);

        const courseScores: Array<{ continuous: number; participation: number; academic: number; overall: number }> = [];

        const examGrades = grades.filter((grade: { category?: string }) =>
          examKeys.has(normalizeCategory(grade.category))
        );
        const examAverage = examGrades.length
          ? averageOf(
              examGrades
                .map((grade: { grade?: number; max_grade?: number }) =>
                  toPercentage(grade.grade, grade.max_grade)
                )
                .filter((value: number | null): value is number => Number.isFinite(value))
            )
          : 0;

        courseIds.forEach((courseId) => {
          const course = courseById.get(courseId);
          if (!course || !Array.isArray(course.evaluation_rules) || course.evaluation_rules.length === 0) {
            return;
          }

          const courseGrades = grades.filter((grade: { course_id?: number }) => grade.course_id === courseId);
          const coursePerformances = dailyPerformances.filter((perf) => perf.course_id === courseId);
          const courseAttendances = attendances.filter(
            (attendance: { course_id?: number }) => attendance.course_id === courseId
          );

          const absences = courseAttendances.filter(
            (attendance: { status?: string }) => String(attendance.status || '').toLowerCase() === 'absent'
          ).length;
          const absencePenalty = Number(course.absence_penalty ?? 0);
          const attendanceScore = Math.max(0, 100 - absencePenalty * absences);

          const averageFromGrades = (categoryKey: string) =>
            averageOf(
              courseGrades
                .filter((grade: { category?: string }) => normalizeCategory(grade.category) === categoryKey)
                .map((grade: { grade?: number; max_grade?: number }) =>
                  toPercentage(grade.grade, grade.max_grade)
                )
                .filter((value: number | null): value is number => Number.isFinite(value))
            );

          const averageFromDaily = (categoryKey: string) =>
            averageOf(
              coursePerformances
                .filter((perf) => normalizeCategory(perf.category) === categoryKey)
                .map((perf) => toPercentage(perf.score, perf.max_score))
                .filter((value: number | null): value is number => Number.isFinite(value))
            );

          const averageFromParticipation = (categoryKey: string) => {
            const dailyValues = coursePerformances
              .filter((perf) => normalizeCategory(perf.category) === categoryKey)
              .map((perf) => toPercentage(perf.score, perf.max_score))
              .filter((value: number | null): value is number => Number.isFinite(value));
            const gradeValues = courseGrades
              .filter((grade: { category?: string }) => normalizeCategory(grade.category) === categoryKey)
              .map((grade: { grade?: number; max_grade?: number }) =>
                toPercentage(grade.grade, grade.max_grade)
              )
              .filter((value: number | null): value is number => Number.isFinite(value));

            if (dailyValues.length === 0 && gradeValues.length === 0) {
              return 0;
            }

            const dailyAvg = averageOf(dailyValues);
            const gradeAvg = averageOf(gradeValues);

            if (dailyValues.length > 0 && gradeValues.length > 0) {
              return averageOf([dailyAvg, gradeAvg]);
            }

            return dailyValues.length > 0 ? dailyAvg : gradeAvg;
          };

          let continuousSum = 0;
          let continuousWeight = 0;
          let participationSum = 0;
          let participationWeight = 0;
          let academicSum = 0;
          let academicWeight = 0;
          let hasAttendanceRule = false;

          course.evaluation_rules.forEach((rule) => {
            const weight = Number(rule.weight ?? 0);
            if (!rule.category || weight <= 0) {
              return;
            }
            const categoryKey = normalizeCategory(rule.category);

            if (behaviorKeys.has(categoryKey)) {
              const avg = averageOf([
                averageFromDaily(categoryKey),
                averageFromGrades(categoryKey),
              ].filter((value) => value > 0));
              if (avg > 0) {
                continuousSum += avg * weight;
                continuousWeight += weight;
              }
              return;
            }

            if (participationKeys.has(categoryKey)) {
              const avg = averageFromParticipation(categoryKey);
              if (avg > 0) {
                participationSum += avg * weight;
                participationWeight += weight;
              }
              return;
            }

            if (attendanceKeys.has(categoryKey)) {
              hasAttendanceRule = true;
              participationSum += attendanceScore * weight;
              participationWeight += weight;
              return;
            }

            if (academicKeys.has(categoryKey)) {
              const avg = averageFromGrades(categoryKey);
              if (avg > 0) {
                academicSum += avg * weight;
                academicWeight += weight;
              }
            }
          });

          const continuousScore = continuousWeight > 0 ? continuousSum / continuousWeight : 0;
          let participationScore = participationWeight > 0 ? participationSum / participationWeight : 0;
          if (!hasAttendanceRule && participationWeight > 0 && absencePenalty > 0 && absences > 0) {
            participationScore = Math.max(0, participationScore - absencePenalty * absences);
          }
          const academicScore = academicWeight > 0 ? academicSum / academicWeight : 0;
          const totalWeight = continuousWeight + participationWeight + academicWeight;
          const overallScore = totalWeight > 0
            ? (continuousScore * continuousWeight + participationScore * participationWeight + academicScore * academicWeight) / totalWeight
            : 0;

          courseScores.push({
            continuous: continuousScore,
            participation: participationScore,
            academic: academicScore,
            overall: overallScore,
          });
        });

        const continuousScore = courseScores.length
          ? averageOf(courseScores.map((score) => score.continuous))
          : 0;
        const participationScore = courseScores.length
          ? averageOf(courseScores.map((score) => score.participation))
          : 0;
        const academicScore = courseScores.length
          ? averageOf(courseScores.map((score) => score.academic))
          : 0;
        const overallScore = courseScores.length
          ? averageOf(courseScores.map((score) => score.overall))
          : 0;

        return {
          ...student,
          overallGPA: analyticsData?.overall_gpa || 0,
          totalCourses: analyticsData?.courses?.length || 0,
          totalCredits: analyticsData?.total_credits || 0,
          failedCourses,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          examAverage: Math.round(examAverage * 10) / 10,
          continuousScore: Math.round(continuousScore * 10) / 10,
          participationScore: Math.round(participationScore * 10) / 10,
          academicScore: Math.round(academicScore * 10) / 10,
          overallScore: Math.round(overallScore * 10) / 10,
        };
      } catch {
        return {
          ...student,
          overallGPA: 0,
          totalCourses: 0,
          totalCredits: 0,
          failedCourses: 0,
          attendanceRate: 0,
          examAverage: 0,
          continuousScore: 0,
          participationScore: 0,
          academicScore: 0,
          overallScore: 0,
        };
      }
    };

    setLoading(true);
    try {
      // Prioritize active students first to improve chances of meaningful analytics
      const prioritized = [...students].sort((a, b) => Number(b.is_active !== false) - Number(a.is_active !== false));
      const studentsForAnalytics = prioritized.slice(0, MAX_STUDENTS_FOR_ANALYTICS);

      const hydrated: StudentWithGPA[] = [];
      let withData: StudentWithGPA[] = [];

      for (let i = 0; i < studentsForAnalytics.length; i += BATCH_SIZE) {
        const batch = studentsForAnalytics.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(fetchStudentSnapshot));
        hydrated.push(...batchResults);

        // Filter incrementally and early-exit once we have enough data to render rankings
        withData = hydrated.filter(hasPerformanceData);
        const enoughData = withData.length >= Math.max(DESIRED_TOP_COUNT * 2, MIN_BUFFER);
        if (enoughData) break;
      }

      setTopPerformers(withData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [courses, students]);

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
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="MIEEK Logo"
            className="h-10 w-auto object-contain"
          />
          <h2 className="text-3xl font-semibold text-slate-900">{t('dashboardTitle')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
              aria-current="page"
            >
              {t('dashboardOverviewTab')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
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

              {/* Ranking Type Tabs */}
              <div className="mb-4 flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setRankingType('gpa')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    rankingType === 'gpa'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('byGPA') || 'By GPA'}
                </button>
                <button
                  onClick={() => setRankingType('attendance')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    rankingType === 'attendance'
                      ? 'border-b-2 border-emerald-500 text-emerald-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('byAttendance') || 'By Attendance'}
                </button>
                <button
                  onClick={() => setRankingType('exams')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    rankingType === 'exams'
                      ? 'border-b-2 border-violet-500 text-violet-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('byExams') || 'By Exams'}
                </button>
                <button
                  onClick={() => setRankingType('overall')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    rankingType === 'overall'
                      ? 'border-b-2 border-amber-500 text-amber-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('overall') || 'Overall'}
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  <p className="text-sm text-slate-500">{t('loadingStudentData')}</p>
                </div>
              ) : rankedStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <Target size={42} className="opacity-40" />
                  <p>{t('noPerformanceData')}</p>
                  <p className="text-xs text-slate-400">{t('studentsNeedGrades')}</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {rankedStudents.map((student, index: number) => {
                    const continuousPercent = Number.isFinite(student.continuousScore)
                      ? student.continuousScore
                      : 0;
                    const participationPercent = Number.isFinite(student.participationScore)
                      ? student.participationScore
                      : 0;
                    const academicPercent = Number.isFinite(student.academicScore)
                      ? student.academicScore
                      : 0;
                    const overallPercent = Number.isFinite(student.overallScore)
                      ? student.overallScore
                      : 0;
                    const greekAverage = percentageToGreekScale(continuousPercent);
                    const averageLetter = getLetterGrade(continuousPercent);
                    const failedCount = student.failedCourses || 0;

                    // Determine primary metric based on ranking type
                    let primaryValue = '';
                    let primaryLabel = '';
                    let secondaryInfo = '';

                    if (rankingType === 'gpa') {
                      primaryValue = `${continuousPercent.toFixed(1)}%`;
                      primaryLabel = t('continuousAssessment') || t('averageScore') || 'Continuous Assessment';
                      secondaryInfo = `${greekAverage.toFixed(1)}${t('outOf20')} ${t('bullet')} ${averageLetter}`;
                    } else if (rankingType === 'attendance') {
                      primaryValue = `${participationPercent.toFixed(1)}%`;
                      primaryLabel = t('participationAttendance') || t('byAttendance') || 'Participation & Attendance';
                      secondaryInfo = `${student.attendanceRate}% ${t('attendance')} ${t('bullet')} ${student.totalCourses || 0} ${t('courses')}`;
                    } else if (rankingType === 'exams') {
                      primaryValue = `${academicPercent.toFixed(1)}%`;
                      primaryLabel = t('academicPerformance') || t('byExams') || 'Academic Performance';
                      secondaryInfo = `${student.examAverage}% ${t('examAverage')} ${t('bullet')} ${student.totalCourses || 0} ${t('courses')}`;
                    } else {
                      primaryValue = `${overallPercent.toFixed(1)}%`;
                      primaryLabel = t('overallScore') || 'Overall Score';
                      secondaryInfo = `${academicPercent.toFixed(1)}% ${t('byExams')} ${t('bullet')} ${participationPercent.toFixed(1)}% ${t('byAttendance')}`;
                    }

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
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                {index + 1}
                              </span>
                              <p className="font-semibold text-slate-900">
                                {student.first_name} {student.last_name}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {student.totalCourses || 0} {t('courses')} {t('bullet')} {student.totalCredits || 0}{' '}
                              {t('credits')}
                            </p>
                            <p className={`text-xs ${failedCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {secondaryInfo}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-semibold text-indigo-600">
                                {primaryValue}
                              </p>
                              <p className="text-xs text-slate-500">{primaryLabel}</p>
                            </div>
                            {rankingType === 'gpa' && (
                              <div className="rounded-lg border border-indigo-200 bg-white px-5 py-3 text-center">
                                <p className="text-lg font-semibold text-indigo-700">
                                  {Math.round(continuousPercent)}
                                </p>
                                <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                                  /100
                                </p>
                              </div>
                            )}
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
                          {t('enrolled')} {formatDate(student.enrollment_date)}
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
