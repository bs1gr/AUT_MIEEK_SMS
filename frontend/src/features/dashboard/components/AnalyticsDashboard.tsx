import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/LanguageContext';
import { useDashboardData } from '@/api/hooks/useAnalytics';
import { useAnalyticsExport } from '../hooks/useAnalyticsExport';
import { useDashboards } from '../hooks/useDashboards';
import apiClient, {
  extractAPIResponseData,
  enrollmentsAPI,
  gradesAPI,
  attendanceAPI,
  studentsAPI,
  coursesAPI,
} from '@/api/api';
import type { Course, Student, CourseEnrollment, Grade, Attendance } from '@/types';
import {
  PerformanceChart,
  GradeDistributionChart,
  AttendanceChart,
  TrendChart,
  StatsPieChart,
  ScatterPlot,
  GradeHeatmap,
  StudentProgressionSankey,
  PerformanceTreemap,
  GradeDistributionBoxPlot,
  type PerformanceDataPoint,
  type GradeDistributionData,
  type AttendanceData,
  type TrendData,
  type PieChartData,
  type ScatterDataPoint,
  type HeatmapDataPoint,
  type SankeyDataPoint,
  type TreemapDataPoint,
  type BoxPlotDataPoint,
} from './AnalyticsCharts';
import { normalizeDivisionLabelValue, matchesSelectedDivisionValue } from './divisionUtils';
import { Users, BookOpen, TrendingUp, Calendar, Download } from 'lucide-react';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';

/**
 * Summary Card Component
 */
interface SummaryCardProps {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, label, value, unit }) => (
  <div
    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    data-testid="summary-card"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
        <Icon size={24} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {value}
          {unit && <span className="ml-1 text-sm text-slate-500">{unit}</span>}
        </p>
      </div>
    </div>
  </div>
);

/**
 * Analytics Dashboard Page
 */
export const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { formatDate } = useDateTimeFormatter();
  const { exportPDF, exportExcel, isExporting, exportError } = useAnalyticsExport();
  const { defaultDashboard } = useDashboards();
  const MAX_ANALYTICS_PAGE_SIZE = 1000;
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'semester'>('semester');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classAggregates, setClassAggregates] = useState<Array<{ label: string; count: number; average: number }>>([]);
  const [courseAggregates, setCourseAggregates] = useState<Array<{ label: string; count: number; average: number }>>([]);
  const [divisionAggregates, setDivisionAggregates] = useState<Array<{ label: string; count: number; average: number }>>([]);
  const [analyticsGrades, setAnalyticsGrades] = useState<Grade[]>([]);
  const [analyticsEnrollments, setAnalyticsEnrollments] = useState<CourseEnrollment[]>([]);
  const [analyticsAttendance, setAnalyticsAttendance] = useState<Attendance[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [gradeDistributionData, setGradeDistributionData] = useState<GradeDistributionData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  const { dashboard, isLoading, refetch } = useDashboardData();
  const { dashboards } = useDashboards();
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);

  const activeDashboard = useMemo(() => {
    if (selectedDashboardId) {
      return dashboards.find((d: { id: number }) => d.id === selectedDashboardId);
    }
    return defaultDashboard;
  }, [selectedDashboardId, dashboards, defaultDashboard]);

  const visibleCharts = useMemo(() => {
    if (!activeDashboard?.configuration?.charts) {
      return new Set([
        'performance',
        'gradeDistribution',
        'attendance',
        'trend',
        'pieChart',
        'scatter',
        'heatmap',
        'sankey',
        'treemap',
        'boxplot',
      ]);
    }
    return new Set(activeDashboard.configuration.charts);
  }, [activeDashboard]);

  const activeStudents = useMemo(
    () => students.filter((student) => student.is_active !== false),
    [students]
  );
  const activeCourses = useMemo(
    () => courses.filter((course) => course.is_active !== false),
    [courses]
  );
  const activeStudentIds = useMemo(
    () => new Set(activeStudents.map((student) => student.id)),
    [activeStudents]
  );
  const activeCourseIdsFromEnrollments = useMemo(() => {
    if (analyticsEnrollments.length === 0) return new Set<number>();
    const ids = new Set<number>();
    analyticsEnrollments.forEach((enrollment) => {
      if (activeStudentIds.has(enrollment.student_id)) {
        ids.add(enrollment.course_id);
      }
    });
    return ids;
  }, [analyticsEnrollments, activeStudentIds]);
  const selectableCourses = useMemo(() => {
    if (activeCourseIdsFromEnrollments.size === 0) return activeCourses;
    return activeCourses.filter((course) => activeCourseIdsFromEnrollments.has(course.id));
  }, [activeCourses, activeCourseIdsFromEnrollments]);

  const divisionUnknownLabel = t('analytics.divisionUnknownLabel');

  const normalizeDivisionLabel = useCallback(
    (label?: string | null) => normalizeDivisionLabelValue(label, divisionUnknownLabel),
    [divisionUnknownLabel]
  );

  const matchesSelectedDivision = useCallback(
    (student: Student) => matchesSelectedDivisionValue(student.class_division, selectedDivision, divisionUnknownLabel),
    [selectedDivision, divisionUnknownLabel]
  );

  useEffect(() => {
    const loadLookups = async () => {
      try {
        let studentItems: Student[] = [];
        let courseItems: Course[] = [];
        let classAveragePayload: Array<{ label: string; count: number; average: number }> = [];
        let courseAveragePayload: Array<{ label: string; count: number; average: number }> = [];
        let divisionAveragePayload: Array<{ label: string; count: number; average: number }> = [];

        try {
          const lookupsResponse = await apiClient.get('/analytics/lookups');
          const lookupsPayload = extractAPIResponseData<{
            students?: Student[];
            courses?: Course[];
            class_averages?: Array<{ label: string; count: number; average: number }>;
            course_averages?: Array<{ label: string; count: number; average: number }>;
            division_averages?: Array<{ label: string; count: number; average: number }>;
          }>(
            lookupsResponse.data ?? lookupsResponse
          );
          studentItems = lookupsPayload.students ?? [];
          courseItems = lookupsPayload.courses ?? [];
          classAveragePayload = lookupsPayload.class_averages ?? [];
          courseAveragePayload = lookupsPayload.course_averages ?? [];
          divisionAveragePayload = lookupsPayload.division_averages ?? [];
        } catch (err) {
          console.warn('Analytics lookups endpoint failed, falling back to students/courses APIs:', err);
          const [fallbackStudents, fallbackCourses] = await Promise.all([
            studentsAPI.getAll(0, 1000),
            coursesAPI.getAll(0, 1000),
          ]);
          studentItems = fallbackStudents;
          courseItems = fallbackCourses;
        }

        setStudents(studentItems);
        setCourses(courseItems);

        const activeStudentItems = studentItems.filter((student) => student.is_active !== false);
        const activeCourseItems = courseItems.filter((course) => course.is_active !== false);

        if (activeStudentItems.length > 0) {
          setSelectedStudent((prev) => prev ?? activeStudentItems[0].id);
        }
        if (activeCourseItems.length > 0) {
          setSelectedCourse((prev) => prev ?? activeCourseItems[0].id);
        }

        let enrollmentItems: CourseEnrollment[] = [];
        let gradeItems: Grade[] = [];
        let attendanceItems: Attendance[] = [];

        const fetchAllPages = async <T,>(
          fetchPage: (skip: number, limit: number) => Promise<{ items?: T[]; total?: number }>
        ): Promise<T[]> => {
          const results: T[] = [];
          let skip = 0;
          let total: number | undefined;
          while (total === undefined || results.length < total) {
            const page = await fetchPage(skip, MAX_ANALYTICS_PAGE_SIZE);
            const items = page.items ?? [];
            results.push(...items);
            if (typeof page.total === 'number') {
              total = page.total;
            }
            if (items.length < MAX_ANALYTICS_PAGE_SIZE) {
              break;
            }
            skip += MAX_ANALYTICS_PAGE_SIZE;
          }
          return results;
        };

        try {
          enrollmentItems = await fetchAllPages((skip, limit) => enrollmentsAPI.getAll(skip, limit));
        } catch (err) {
          console.warn('Analytics enrollments lookup failed:', err);
        }

        try {
          gradeItems = await fetchAllPages((skip, limit) => gradesAPI.getAll(skip, limit));
        } catch (err) {
          console.warn('Analytics grades lookup failed:', err);
        }

        try {
          attendanceItems = await fetchAllPages((skip, limit) => attendanceAPI.getAll(skip, limit));
        } catch (err) {
          console.warn('Analytics attendance lookup failed:', err);
        }

        setAnalyticsEnrollments(enrollmentItems);
        setAnalyticsGrades(gradeItems);
        setAnalyticsAttendance(attendanceItems);

        if (classAveragePayload.length > 0) {
          setClassAggregates(classAveragePayload);
        } else {
          const studentById = new Map<number, Student>();
          studentItems.forEach((student) => {
            studentById.set(student.id, student);
          });

          const classBuckets = new Map<string, { count: number; total: number }>();
          studentItems.forEach((student) => {
            const yearValue = Number(student.study_year);
            const label = student.academic_year
              ? student.academic_year
              : yearValue === 1
                ? 'A'
                : yearValue === 2
                  ? 'B'
                  : Number.isFinite(yearValue) && yearValue > 0
                    ? `${t('analytics.classYearLabel')} ${yearValue}`
                    : t('analytics.classUnknownLabel');
            const existing = classBuckets.get(label) ?? { count: 0, total: 0 };
            classBuckets.set(label, { ...existing, count: existing.count + 1 });
          });

          gradeItems.forEach((grade) => {
            if (!grade.max_grade || grade.max_grade <= 0) return;
            const student = studentById.get(grade.student_id);
            if (!student) return;
            const yearValue = Number(student.study_year);
            const label = student.academic_year
              ? student.academic_year
              : yearValue === 1
                ? 'A'
                : yearValue === 2
                  ? 'B'
                  : Number.isFinite(yearValue) && yearValue > 0
                    ? `${t('analytics.classYearLabel')} ${yearValue}`
                    : t('analytics.classUnknownLabel');
            const existing = classBuckets.get(label) ?? { count: 0, total: 0 };
            const percentage = (grade.grade / grade.max_grade) * 100;
            classBuckets.set(label, { count: existing.count, total: existing.total + percentage });
          });

          setClassAggregates(
            Array.from(classBuckets.entries())
              .map(([label, stats]) => ({
                label,
                count: stats.count,
                average: stats.count > 0 ? stats.total / stats.count : 0,
              }))
              .sort((a, b) => b.count - a.count)
          );
        }

        if (courseAveragePayload.length > 0) {
          setCourseAggregates(courseAveragePayload);
        } else {
          const enrollmentCounts = new Map<number, number>();
          enrollmentItems.forEach((enrollment) => {
            if (typeof enrollment.course_id !== 'number') return;
            enrollmentCounts.set(enrollment.course_id, (enrollmentCounts.get(enrollment.course_id) ?? 0) + 1);
          });

          const courseTotals = new Map<number, { count: number; total: number }>();
          gradeItems.forEach((grade) => {
            if (!grade.max_grade || grade.max_grade <= 0) return;
            if (typeof grade.course_id !== 'number') return;
            const existing = courseTotals.get(grade.course_id) ?? { count: 0, total: 0 };
            const percentage = (grade.grade / grade.max_grade) * 100;
            courseTotals.set(grade.course_id, {
              count: existing.count + 1,
              total: existing.total + percentage,
            });
          });

          setCourseAggregates(
            courseItems
              .map((course) => ({
                label: course.course_name,
                count: enrollmentCounts.get(course.id) ?? 0,
                average: (courseTotals.get(course.id)?.count ?? 0) > 0
                  ? (courseTotals.get(course.id)?.total ?? 0) / (courseTotals.get(course.id)?.count ?? 1)
                  : 0,
              }))
              .sort((a, b) => b.count - a.count)
          );
        }

        if (divisionAveragePayload.length > 0) {
          setDivisionAggregates(
            divisionAveragePayload.map((entry) => ({
              ...entry,
              label: normalizeDivisionLabel(entry.label),
            }))
          );
        } else {
          const divisionBuckets = new Map<string, { count: number; total: number }>();
          studentItems.forEach((student) => {
            const label = normalizeDivisionLabel(student.class_division);
            const existing = divisionBuckets.get(label) ?? { count: 0, total: 0 };
            divisionBuckets.set(label, { ...existing, count: existing.count + 1 });
          });

          gradeItems.forEach((grade) => {
            if (!grade.max_grade || grade.max_grade <= 0) return;
            const student = studentItems.find((s) => s.id === grade.student_id);
            if (!student) return;
            const label = normalizeDivisionLabel(student.class_division);
            const existing = divisionBuckets.get(label) ?? { count: 0, total: 0 };
            const percentage = (grade.grade / grade.max_grade) * 100;
            divisionBuckets.set(label, { count: existing.count, total: existing.total + percentage });
          });

          setDivisionAggregates(
            Array.from(divisionBuckets.entries())
              .map(([label, stats]) => ({
                label,
                count: stats.count,
                average: stats.count > 0 ? stats.total / stats.count : 0,
              }))
              .sort((a, b) => b.count - a.count)
          );
        }
      } catch (err) {
        console.error('Failed to load analytics lookups:', err);
      }
    };

    loadLookups();
  }, [t, normalizeDivisionLabel]);

  const effectiveSelectedStudent = useMemo(() => {
    const hasSelected = selectedStudent !== null && activeStudents.some((student) => student.id === selectedStudent);
    if (!selectedDivision) {
      if (hasSelected) return selectedStudent;
      return activeStudents[0]?.id ?? null;
    }
    if (selectedStudent) {
      const current = activeStudents.find((student) => student.id === selectedStudent);
      if (current && matchesSelectedDivision(current)) return selectedStudent;
    }
    const fallback = activeStudents.find((student) => matchesSelectedDivision(student));
    return fallback ? fallback.id : null;
  }, [selectedDivision, selectedStudent, activeStudents, matchesSelectedDivision]);

  const effectiveSelectedCourse = useMemo(() => {
    if (selectedCourse !== null && selectableCourses.some((course) => course.id === selectedCourse)) {
      return selectedCourse;
    }
    return selectableCourses[0]?.id ?? null;
  }, [selectedCourse, selectableCourses]);

  const pieChartData = useMemo<PieChartData[]>(() => {
    const filteredStudents = selectedDivision
      ? students.filter((student) => matchesSelectedDivision(student))
      : students;
    const totalStudents = filteredStudents.length;
    const activeCount = filteredStudents.filter((s) => s.is_active !== false).length;
    const inactiveCount = Math.max(0, totalStudents - activeCount);

    return [
      { name: t('active'), value: activeCount },
      { name: t('inactive'), value: inactiveCount },
    ];
  }, [selectedDivision, students, t, matchesSelectedDivision]);

  const filteredCourseAggregates = useMemo(() => {
    if (!selectedDivision) return courseAggregates;
    const filteredStudents = students.filter((student) => matchesSelectedDivision(student));
    const studentIds = new Set(filteredStudents.map((student) => student.id));
    if (studentIds.size === 0) return [];

    const enrollmentCounts = new Map<number, number>();
    analyticsEnrollments.forEach((enrollment) => {
      if (!studentIds.has(enrollment.student_id)) return;
      enrollmentCounts.set(enrollment.course_id, (enrollmentCounts.get(enrollment.course_id) ?? 0) + 1);
    });

    const courseTotals = new Map<number, { count: number; total: number }>();
    analyticsGrades.forEach((grade) => {
      if (!studentIds.has(grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;
      const existing = courseTotals.get(grade.course_id) ?? { count: 0, total: 0 };
      const percentage = (grade.grade / grade.max_grade) * 100;
      courseTotals.set(grade.course_id, {
        count: existing.count + 1,
        total: existing.total + percentage,
      });
    });

    return courses
      .map((course) => ({
        label: course.course_name,
        count: enrollmentCounts.get(course.id) ?? 0,
        average: (courseTotals.get(course.id)?.count ?? 0) > 0
          ? (courseTotals.get(course.id)?.total ?? 0) / (courseTotals.get(course.id)?.count ?? 1)
          : 0,
      }))
      .filter((entry) => entry.count > 0 || entry.average > 0)
      .sort((a, b) => b.count - a.count);
  }, [selectedDivision, students, courses, analyticsEnrollments, analyticsGrades, courseAggregates, matchesSelectedDivision]);

  const divisionGradeDistributionData = useMemo<GradeDistributionData[]>(() => {
    if (!selectedDivision || !effectiveSelectedCourse) {
      return gradeDistributionData;
    }

    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const filteredGrades = analyticsGrades.filter(
      (grade) =>
        grade.course_id === effectiveSelectedCourse &&
        divisionStudents.has(grade.student_id) &&
        grade.max_grade &&
        grade.max_grade > 0
    );

    const buckets = [
      { label: 'A (90-100)', min: 90, max: 100 },
      { label: 'B (80-89)', min: 80, max: 89.999 },
      { label: 'C (70-79)', min: 70, max: 79.999 },
      { label: 'D (60-69)', min: 60, max: 69.999 },
      { label: 'F (0-59)', min: 0, max: 59.999 },
    ];

    const totalGrades = filteredGrades.length;
    const counts = buckets.map(() => 0);

    filteredGrades.forEach((grade) => {
      const percentage = (grade.grade / grade.max_grade) * 100;
      const bucketIndex = buckets.findIndex(
        (bucket) => percentage >= bucket.min && percentage <= bucket.max
      );
      if (bucketIndex >= 0) counts[bucketIndex] += 1;
    });

    return buckets.map((bucket, index) => ({
      grade: bucket.label,
      count: counts[index],
      percentage: totalGrades > 0 ? (counts[index] / totalGrades) * 100 : 0,
    }));
  }, [selectedDivision, effectiveSelectedCourse, analyticsGrades, gradeDistributionData, students, matchesSelectedDivision]);

  const divisionTrendData = useMemo<TrendData[]>(() => {
    if (!selectedDivision) return trendData;

    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const filteredGrades = analyticsGrades.filter((grade) => {
      if (!divisionStudents.has(grade.student_id)) return false;
      if (effectiveSelectedCourse && grade.course_id !== effectiveSelectedCourse) return false;
      if (!grade.max_grade || grade.max_grade <= 0) return false;
      return Boolean(grade.date_assigned || grade.date_submitted);
    });

    const buckets = new Map<string, { total: number; count: number }>();
    filteredGrades.forEach((grade) => {
      const dateValue = grade.date_assigned || grade.date_submitted;
      if (!dateValue) return;
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = buckets.get(key) ?? { total: 0, count: 0 };
      const percentage = (grade.grade / grade.max_grade) * 100;
      buckets.set(key, { total: existing.total + percentage, count: existing.count + 1 });
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, stats], index) => ({
        week: index + 1,
        average: stats.count > 0 ? stats.total / stats.count : 0,
      }));
  }, [selectedDivision, analyticsGrades, students, trendData, effectiveSelectedCourse, matchesSelectedDivision]);

  const divisionPerformanceData = useMemo<PerformanceDataPoint[]>(() => {
    if (!selectedDivision) return performanceData;
    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const filteredGrades = analyticsGrades.filter((grade) => {
      if (!divisionStudents.has(grade.student_id)) return false;
      if (effectiveSelectedCourse && grade.course_id !== effectiveSelectedCourse) return false;
      if (!grade.max_grade || grade.max_grade <= 0) return false;
      return Boolean(grade.date_assigned || grade.date_submitted);
    });

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    return filteredGrades.map((grade) => {
      const course = courseById.get(grade.course_id);
      const courseLabel = course ? course.course_name : t('courses');
      const dateValue = grade.date_assigned || grade.date_submitted;
      const dateLabel = dateValue ? formatDate(dateValue) : t('dateLabel');
      const percentage = (grade.grade / grade.max_grade) * 100;
      return {
        date: dateLabel,
        course: courseLabel,
        grade: Number(percentage ?? 0),
        trend: Number(percentage ?? 0),
      };
    });
  }, [selectedDivision, analyticsGrades, students, courses, effectiveSelectedCourse, performanceData, formatDate, t, matchesSelectedDivision]);

  const divisionAttendanceData = useMemo<AttendanceData[]>(() => {
    if (!selectedDivision) return attendanceData;
    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const filteredAttendance = analyticsAttendance.filter((record) => {
      if (!divisionStudents.has(record.student_id)) return false;
      if (effectiveSelectedCourse && record.course_id !== effectiveSelectedCourse) return false;
      return true;
    });

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    const courseBuckets = new Map<number, { present: number; absent: number; total: number }>();
    filteredAttendance.forEach((record) => {
      const bucket = courseBuckets.get(record.course_id) ?? { present: 0, absent: 0, total: 0 };
      bucket.total += 1;
      if (record.status === 'Present' || record.status === 'Excused') {
        bucket.present += 1;
      } else {
        bucket.absent += 1;
      }
      courseBuckets.set(record.course_id, bucket);
    });

    return Array.from(courseBuckets.entries()).map(([courseId, stats]) => {
      const course = courseById.get(courseId);
      const label = course ? course.course_name : t('courses');
      return {
        course: label,
        rate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
        present: stats.present,
        absent: stats.absent,
      };
    });
  }, [selectedDivision, analyticsAttendance, students, courses, effectiveSelectedCourse, attendanceData, t, matchesSelectedDivision]);

  const divisionScatterData = useMemo<ScatterDataPoint[]>(() => {
    if (!selectedDivision) return [];
    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const studentStats = new Map<number, { totalGrade: number; gradeCount: number; present: number; total: number }>();
    divisionStudents.forEach((studentId) => {
      studentStats.set(studentId, { totalGrade: 0, gradeCount: 0, present: 0, total: 0 });
    });

    analyticsGrades.forEach((grade) => {
      if (!divisionStudents.has(grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;
      const stat = studentStats.get(grade.student_id);
      if (!stat) return;
      const percentage = (grade.grade / grade.max_grade) * 100;
      stat.totalGrade += percentage;
      stat.gradeCount += 1;
    });

    analyticsAttendance.forEach((record) => {
      if (!divisionStudents.has(record.student_id)) return;
      const stat = studentStats.get(record.student_id);
      if (!stat) return;
      stat.total += 1;
      if (record.status === 'Present' || record.status === 'Excused') {
        stat.present += 1;
      }
    });

    const result: ScatterDataPoint[] = [];
    studentStats.forEach((stat, studentId) => {
      if (stat.gradeCount > 0 && stat.total > 0) {
        const student = students.find((s) => s.id === studentId);
        result.push({
          x: (stat.present / stat.total) * 100,
          y: stat.totalGrade / stat.gradeCount,
          name: student ? `${student.first_name} ${student.last_name}` : `Student ${studentId}`,
        });
      }
    });

    return result;
  }, [selectedDivision, students, analyticsGrades, analyticsAttendance, matchesSelectedDivision]);

  const divisionHeatmapData = useMemo<HeatmapDataPoint[]>(() => {
    if (!selectedDivision) return [];
    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    const weekBuckets = new Map<string, Map<number, { total: number; count: number }>>();

    analyticsGrades.forEach((grade) => {
      if (!divisionStudents.has(grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;
      if (!grade.date_assigned && !grade.date_submitted) return;

      const dateValue = grade.date_assigned || grade.date_submitted;
      if (!dateValue) return;

      const date = new Date(dateValue);
      const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
      const _monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const _weekKey = `W${weekNum}`;

      const course = courseById.get(grade.course_id);
      const courseLabel = course ? course.course_name : t('courses');

      if (!weekBuckets.has(courseLabel)) {
        weekBuckets.set(courseLabel, new Map());
      }

      const courseMap = weekBuckets.get(courseLabel)!;
      const percentage = (grade.grade / grade.max_grade) * 100;

      if (!courseMap.has(weekNum)) {
        courseMap.set(weekNum, { total: 0, count: 0 });
      }

      const bucket = courseMap.get(weekNum)!;
      bucket.total += percentage;
      bucket.count += 1;
    });

    const result: HeatmapDataPoint[] = [];
    weekBuckets.forEach((courseMap, course) => {
      courseMap.forEach((bucket, week) => {
        result.push({
          week,
          course,
          averageGrade: bucket.count > 0 ? bucket.total / bucket.count : 0,
        });
      });
    });

    return result.sort((a, b) => {
      if (a.course !== b.course) return a.course.localeCompare(b.course);
      const aWeek = typeof a.week === 'number' ? a.week : parseInt(String(a.week), 10);
      const bWeek = typeof b.week === 'number' ? b.week : parseInt(String(b.week), 10);
      return aWeek - bWeek;
    });
  }, [selectedDivision, students, analyticsGrades, courses, matchesSelectedDivision, t]);

  const divisionSankeyData = useMemo<SankeyDataPoint[]>(() => {
    if (!selectedDivision) return [];
    const divisionStudents = new Set(
      students.filter((student) => matchesSelectedDivision(student)).map((student) => student.id)
    );
    if (divisionStudents.size === 0) return [];

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    const courseOutcomes = new Map<string, { passed: number; failed: number; incomplete: number }>();

    const enrollments = new Map<number, Set<number>>();
    analyticsEnrollments.forEach((enrollment) => {
      if (!divisionStudents.has(enrollment.student_id)) return;
      if (!enrollments.has(enrollment.course_id)) {
        enrollments.set(enrollment.course_id, new Set());
      }
      enrollments.get(enrollment.course_id)!.add(enrollment.student_id);
    });

    analyticsGrades.forEach((grade) => {
      if (!divisionStudents.has(grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;

      const course = courseById.get(grade.course_id);
      const courseLabel = course ? course.course_name : t('courses');

      if (!courseOutcomes.has(courseLabel)) {
        courseOutcomes.set(courseLabel, { passed: 0, failed: 0, incomplete: 0 });
      }

      const percentage = (grade.grade / grade.max_grade) * 100;
      const outcome = courseOutcomes.get(courseLabel)!;

      if (percentage >= 50) {
        outcome.passed += 1;
      } else if (percentage > 0) {
        outcome.failed += 1;
      } else {
        outcome.incomplete += 1;
      }
    });

    const result: SankeyDataPoint[] = [];
    courseOutcomes.forEach((outcomes, course) => {
      if (outcomes.passed > 0) result.push({ source: course, target: 'Pass', value: outcomes.passed });
      if (outcomes.failed > 0) result.push({ source: course, target: 'Fail', value: outcomes.failed });
      if (outcomes.incomplete > 0) result.push({ source: course, target: 'Incomplete', value: outcomes.incomplete });
    });

    return result;
  }, [selectedDivision, students, analyticsGrades, analyticsEnrollments, courses, matchesSelectedDivision, t]);

  const divisionTreemapData = useMemo<TreemapDataPoint[]>(() => {
    if (!selectedDivision) return [];
    const divisionStudents = students.filter((student) => matchesSelectedDivision(student));
    if (divisionStudents.length === 0) return [];

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    const courseData = new Map<string, { grades: number[]; count: number }>();

    analyticsGrades.forEach((grade) => {
      if (!divisionStudents.some((s) => s.id === grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;

      const course = courseById.get(grade.course_id);
      const courseLabel = course ? course.course_name : t('courses');

      if (!courseData.has(courseLabel)) {
        courseData.set(courseLabel, { grades: [], count: 0 });
      }

      const percentage = (grade.grade / grade.max_grade) * 100;
      const data = courseData.get(courseLabel)!;
      data.grades.push(percentage);
      data.count += 1;
    });

    const treeData: TreemapDataPoint[] = Array.from(courseData.entries()).map(([course, data]) => {
      const avgGrade = data.grades.length > 0 ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length : 0;
      return {
        name: course,
        value: avgGrade > 0 ? Math.max(avgGrade, 5) : 5,
      };
    });

    return treeData.length > 0
      ? [
          {
            name: selectedDivision,
            children: treeData,
          },
        ]
      : [];
  }, [selectedDivision, students, analyticsGrades, courses, matchesSelectedDivision, t]);

  const divisionBoxPlotData = useMemo<BoxPlotDataPoint[]>(() => {
    if (!selectedDivision) return [];
    const divisionStudents = students.filter((student) => matchesSelectedDivision(student));
    if (divisionStudents.length === 0) return [];

    const courseById = new Map<number, Course>();
    courses.forEach((course) => courseById.set(course.id, course));

    const courseGrades = new Map<string, number[]>();

    analyticsGrades.forEach((grade) => {
      if (!divisionStudents.some((s) => s.id === grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;

      const course = courseById.get(grade.course_id);
      const courseLabel = course ? course.course_name : t('courses');

      if (!courseGrades.has(courseLabel)) {
        courseGrades.set(courseLabel, []);
      }

      const percentage = (grade.grade / grade.max_grade) * 100;
      courseGrades.get(courseLabel)!.push(percentage);
    });

    const calculateQuartiles = (values: number[]): { q1: number; q2: number; q3: number; min: number; max: number; mean: number } => {
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const q1Index = Math.floor(n * 0.25);
      const q2Index = Math.floor(n * 0.5);
      const q3Index = Math.floor(n * 0.75);

      return {
        min: sorted[0],
        q1: sorted[q1Index],
        q2: sorted[q2Index],
        q3: sorted[q3Index],
        max: sorted[n - 1],
        mean: sorted.reduce((a, b) => a + b, 0) / n,
      };
    };

    const boxPlotArray: BoxPlotDataPoint[] = Array.from(courseGrades.entries())
      .map(([course, grades]) => {
        const stats = calculateQuartiles(grades);
        return {
          name: course,
          ...stats,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return boxPlotArray;
  }, [selectedDivision, students, analyticsGrades, courses, matchesSelectedDivision, t]);

  const filteredClassAggregates = useMemo(() => {
    if (!selectedDivision) return classAggregates;
    const filteredStudents = students.filter((student) => matchesSelectedDivision(student));
    const studentIds = new Set(filteredStudents.map((student) => student.id));
    if (studentIds.size === 0) return [];

    const classBuckets = new Map<string, { count: number; total: number }>();
    filteredStudents.forEach((student) => {
      const yearValue = Number(student.study_year);
      const label = student.academic_year
        ? student.academic_year
        : yearValue === 1
          ? 'A'
          : yearValue === 2
            ? 'B'
            : Number.isFinite(yearValue) && yearValue > 0
              ? `${t('analytics.classYearLabel')} ${yearValue}`
              : t('analytics.classUnknownLabel');
      const existing = classBuckets.get(label) ?? { count: 0, total: 0 };
      classBuckets.set(label, { ...existing, count: existing.count + 1 });
    });

    analyticsGrades.forEach((grade) => {
      if (!studentIds.has(grade.student_id)) return;
      if (!grade.max_grade || grade.max_grade <= 0) return;
      const student = filteredStudents.find((s) => s.id === grade.student_id);
      if (!student) return;
      const yearValue = Number(student.study_year);
      const label = student.academic_year
        ? student.academic_year
        : yearValue === 1
          ? 'A'
          : yearValue === 2
            ? 'B'
            : Number.isFinite(yearValue) && yearValue > 0
              ? `${t('analytics.classYearLabel')} ${yearValue}`
              : t('analytics.classUnknownLabel');
      const existing = classBuckets.get(label) ?? { count: 0, total: 0 };
      const percentage = (grade.grade / grade.max_grade) * 100;
      classBuckets.set(label, { count: existing.count, total: existing.total + percentage });
    });

    return Array.from(classBuckets.entries())
      .map(([label, stats]) => ({
        label,
        count: stats.count,
        average: stats.count > 0 ? stats.total / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedDivision, students, analyticsGrades, classAggregates, t, matchesSelectedDivision]);

  const quickReportStats = useMemo(() => {
    if (!selectedDivision) {
      return {
        activeStudents: students.filter((s) => s.is_active !== false).length,
        totalStudents: students.length,
        averageGrade: (
          dashboard?.average_grade && dashboard.average_grade > 0
            ? dashboard.average_grade
            : performanceData.length > 0
              ? performanceData.reduce((sum, item) => sum + item.grade, 0) / performanceData.length
              : 0
        ),
        averageAttendance: (
          dashboard?.average_attendance && dashboard.average_attendance > 0
            ? dashboard.average_attendance
            : attendanceData.length > 0
              ? attendanceData.reduce((sum, item) => sum + item.rate, 0) / attendanceData.length
              : 0
        ),
        totalGrades: dashboard?.total_grades ?? 0,
      };
    }

    const filteredStudents = students.filter((student) => matchesSelectedDivision(student));
    const studentIds = new Set(filteredStudents.map((student) => student.id));
    const activeStudents = filteredStudents.filter((s) => s.is_active !== false).length;

    const filteredGrades = analyticsGrades.filter((grade) => studentIds.has(grade.student_id));
    const gradePercentages = filteredGrades
      .filter((grade) => grade.max_grade && grade.max_grade > 0)
      .map((grade) => (grade.grade / grade.max_grade) * 100);
    const averageGrade = gradePercentages.length > 0
      ? gradePercentages.reduce((sum, val) => sum + val, 0) / gradePercentages.length
      : 0;

    const filteredAttendance = analyticsAttendance.filter((record) => studentIds.has(record.student_id));
    const attendanceRate = filteredAttendance.length > 0
      ? (filteredAttendance.filter((record) => record.status === 'Present' || record.status === 'Excused').length
        / filteredAttendance.length) * 100
      : 0;

    return {
      activeStudents,
      totalStudents: filteredStudents.length,
      averageGrade,
      averageAttendance: attendanceRate,
      totalGrades: filteredGrades.length,
    };
  }, [selectedDivision, students, dashboard, performanceData, attendanceData, analyticsGrades, analyticsAttendance, matchesSelectedDivision]);

  useEffect(() => {
    const loadStudentAnalytics = async () => {
      if (!effectiveSelectedStudent) {
        setPerformanceData([]);
        setAttendanceData([]);
        setTrendData([]);
        return;
      }

      try {
        const [performanceRes, attendanceRes, trendsRes] = await Promise.all([
          apiClient.get(`/analytics/student/${effectiveSelectedStudent}/performance`, { params: { days_back: 90 } }),
          apiClient.get(`/analytics/student/${effectiveSelectedStudent}/attendance`),
          apiClient.get(`/analytics/student/${effectiveSelectedStudent}/trends`, { params: { limit: 10 } }),
        ]);

        const performancePayload = extractAPIResponseData<unknown>(performanceRes.data ?? performanceRes);
        const attendancePayload = extractAPIResponseData<unknown>(attendanceRes.data ?? attendanceRes);
        const trendsPayload = extractAPIResponseData<unknown>(trendsRes.data ?? trendsRes);

        const courseMap = (performancePayload as { courses?: Record<string, { course_name?: string; course_code?: string; grades?: Array<{ percentage?: number; date?: string | null }> }> }).courses ?? {};
        const perfPoints: PerformanceDataPoint[] = [];

        Object.values(courseMap).forEach((course) => {
          const courseLabel = course.course_name || course.course_code || t('courses');
          (course.grades || []).forEach((grade) => {
            perfPoints.push({
              date: grade.date ? formatDate(grade.date) : t('dateLabel'),
              course: courseLabel,
              grade: Number(grade.percentage ?? 0),
              trend: Number(grade.percentage ?? 0),
            });
          });
        });

        setPerformanceData(perfPoints);

        const attendanceCourses = (attendancePayload as { courses?: Record<string, { course_name?: string; attendance_rate?: number; present?: number; absent?: number; total_classes?: number }> }).courses ?? {};
        const attendanceList = Object.values(attendanceCourses).map((course) => {
          const total = course.total_classes ?? 0;
          const present = course.present ?? 0;
          const absent = course.absent ?? Math.max(0, total - present);
          return {
            course: course.course_name || t('courses'),
            rate: Number(course.attendance_rate ?? 0),
            present,
            absent,
          };
        });

        setAttendanceData(attendanceList);

        const trendItems = (trendsPayload as { trend_data?: Array<{ percentage?: number }> }).trend_data ?? [];
        setTrendData(
          trendItems.map((item, index) => ({
            week: index + 1,
            average: Number(item.percentage ?? 0),
          }))
        );
      } catch (err) {
        console.error('Failed to load student analytics:', err);
        setPerformanceData([]);
        setAttendanceData([]);
        setTrendData([]);
      }
    };

    loadStudentAnalytics();
  }, [effectiveSelectedStudent, t, formatDate]);

  useEffect(() => {
    const loadCourseDistribution = async () => {
      if (!effectiveSelectedCourse) {
        setGradeDistributionData([]);
        return;
      }

      try {
        const response = await apiClient.get(`/analytics/course/${effectiveSelectedCourse}/grade-distribution`);
        const payload = extractAPIResponseData<unknown>(response.data ?? response);
        const distribution = (payload as { distribution?: Record<string, number> }).distribution ?? {};
        const totalGrades = Number((payload as { total_grades?: number }).total_grades ?? 0);

        const mapped: GradeDistributionData[] = Object.entries(distribution).map(([grade, percentage]) => {
          const percentValue = Number(percentage ?? 0);
          const count = totalGrades > 0 ? Math.round((percentValue / 100) * totalGrades) : 0;
          return { grade, count, percentage: percentValue };
        });

        setGradeDistributionData(mapped);
      } catch (err) {
        console.error('Failed to load grade distribution:', err);
        setGradeDistributionData([]);
      }
    };

    loadCourseDistribution();
  }, [effectiveSelectedCourse]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="MIEEK Logo"
            className="h-10 w-auto object-contain"
          />
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">
              {t('analytics.dashboardTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('analytics.dashboardSubtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            {t('dashboardOverviewTab')}
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
            aria-current="page"
          >
            {t('dashboardAnalyticsTab')}
          </button>
        </div>
      </div>

      {(
        dashboard ||
        students.length > 0 ||
        courses.length > 0 ||
        performanceData.length > 0 ||
        attendanceData.length > 0
      ) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={Users}
            label={t('analytics.summaryTotalStudents')}
            value={dashboard?.total_students ?? students.length}
          />
          <SummaryCard
            icon={BookOpen}
            label={t('analytics.summaryTotalCourses')}
            value={dashboard?.total_courses ?? courses.length}
          />
          <SummaryCard
            icon={TrendingUp}
            label={t('analytics.summaryAverageGrade')}
            value={(
              dashboard?.average_grade && dashboard.average_grade > 0
                ? dashboard.average_grade
                : performanceData.length > 0
                  ? performanceData.reduce((sum, item) => sum + item.grade, 0) / performanceData.length
                  : 0
            ).toFixed(2)}
            unit="%"
          />
          <SummaryCard
            icon={Calendar}
            label={t('analytics.summaryAverageAttendance')}
            value={(
              dashboard?.average_attendance && dashboard.average_attendance > 0
                ? dashboard.average_attendance
                : attendanceData.length > 0
                  ? attendanceData.reduce((sum, item) => sum + item.rate, 0) / attendanceData.length
                  : 0
            ).toFixed(2)}
            unit="%"
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.divisionLabel')}
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectDivision')}</option>
            {Array.from(new Set(students.map((s) => normalizeDivisionLabel(s.class_division)).filter(Boolean)))
              .sort()
              .map((division) => (
                <option key={division as string} value={division as string}>
                  {division as string}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.studentLabel')}
          </label>
          <select
            value={effectiveSelectedStudent ?? ''}
            onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectStudent')}</option>
            {activeStudents
              .filter((student) => (selectedDivision ? matchesSelectedDivision(student) : true))
              .map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.courseLabel')}
          </label>
          <select
            value={effectiveSelectedCourse ?? ''}
            onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('analytics.selectCourse')}</option>
            {selectableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('analytics.timePeriod')}
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'semester')}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="week">{t('analytics.timePeriodWeek')}</option>
            <option value="month">{t('analytics.timePeriodMonth')}</option>
            <option value="semester">{t('analytics.timePeriodSemester')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">
            {t('dashboard.selectDashboard') || 'Dashboard'}
          </label>
          <select
            value={selectedDashboardId ?? ''}
            onChange={(e) => setSelectedDashboardId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{t('dashboard.defaultDashboard') || 'Default Dashboard'}</option>
            {dashboards.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => navigate('/dashboard-manager')}
          className="self-end rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          title={t('dashboard.manageDashboards') || 'Manage Dashboards'}
        >
          {t('dashboard.manage') || 'Manage'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {(visibleCharts.has('performance') || visibleCharts.has('gradeDistribution')) && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {visibleCharts.has('performance') && (
                <PerformanceChart
                  data={divisionPerformanceData}
                  title={t('analytics.chartStudentPerformance')}
                  height={350}
                />
              )}
              {visibleCharts.has('gradeDistribution') && (
                <GradeDistributionChart
                  data={divisionGradeDistributionData}
                  title={t('analytics.chartGradeDistribution')}
                  height={350}
                />
              )}
            </div>
          )}

          {(visibleCharts.has('attendance') || visibleCharts.has('trend')) && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {visibleCharts.has('attendance') && (
                <AttendanceChart
                  data={divisionAttendanceData}
                  title={t('analytics.chartAttendanceRate')}
                  height={350}
                />
              )}
              {visibleCharts.has('trend') && (
                <TrendChart
                  data={divisionTrendData}
                  title={t('analytics.chartPerformanceTrend')}
                  height={350}
                />
              )}
            </div>
          )}

          {(visibleCharts.has('pieChart') || visibleCharts.has('scatter')) && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {visibleCharts.has('pieChart') && (
                <StatsPieChart
                  data={pieChartData}
                  title={t('analytics.chartStudentStatus')}
                  height={350}
                />
              )}
              {visibleCharts.has('scatter') && (
                <ScatterPlot
                  data={divisionScatterData}
                  title={t('analytics.chartAttendanceGradeCorrelation') || 'Attendance vs Grade'}
                  xAxisLabel={t('analytics.attendance') || 'Attendance %'}
                  yAxisLabel={t('analytics.grade') || 'Grade %'}
                  height={350}
                />
              )}
            </div>
          )}

          {visibleCharts.has('heatmap') && (
            <div className="w-full">
              <GradeHeatmap
                data={divisionHeatmapData}
                title={t('analytics.chartGradeHeatmap') || 'Grade Distribution by Week'}
                height={300}
              />
            </div>
          )}

          {visibleCharts.has('sankey') && (
            <div className="w-full">
              <StudentProgressionSankey
                data={divisionSankeyData}
                title={t('analytics.chartStudentProgression') || 'Student Progression Flow'}
                height={350}
              />
            </div>
          )}

          {visibleCharts.has('treemap') && (
            <div className="w-full">
              <PerformanceTreemap
                data={divisionTreemapData}
                title={t('analytics.chartPerformanceHierarchy') || 'Performance by Course'}
                height={350}
              />
            </div>
          )}

          {visibleCharts.has('boxplot') && (
            <div className="w-full">
              <GradeDistributionBoxPlot
                data={divisionBoxPlotData}
                title={t('analytics.chartDistributionAnalysis') || 'Grade Distribution Analysis'}
                height={400}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('analytics.quickReportTitle')}
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">{t('analytics.quickReportActiveStudents')}</span>{' '}
                  {quickReportStats.activeStudents}/{quickReportStats.totalStudents}
                </p>
                <p>
                  <span className="font-medium text-slate-700">{t('analytics.quickReportAverageGrade')}</span>{' '}
                  {quickReportStats.averageGrade.toFixed(2)}%
                </p>
                <p>
                  <span className="font-medium text-slate-700">
                    {t('analytics.quickReportAverageAttendance')}
                  </span>{' '}
                  {quickReportStats.averageAttendance.toFixed(2)}%
                </p>
                <p>
                  <span className="font-medium text-slate-700">{t('analytics.quickReportTotalGrades')}</span>{' '}
                  {quickReportStats.totalGrades}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('analytics.classAverageSummaryTitle')}
              </h3>
              <div className="mt-4 space-y-3">
                {filteredClassAggregates.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('analytics.noClassData')}</p>
                ) : (
                  filteredClassAggregates.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                      <div>
                        <div className="font-medium text-slate-700">{entry.label}</div>
                        <div className="text-xs text-slate-500">
                          {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('analytics.courseAverageSummaryTitle')}
              </h3>
              <div className="mt-4 space-y-3">
                {filteredCourseAggregates.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('analytics.noCourseData')}</p>
                ) : (
                  filteredCourseAggregates.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                      <div>
                        <div className="font-medium text-slate-700">{entry.label}</div>
                        <div className="text-xs text-slate-500">
                          {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {entry.count} {t('analytics.enrolledLabel')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('analytics.divisionAverageSummaryTitle')}
              </h3>
              <div className="mt-4 space-y-3">
                {divisionAggregates.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('analytics.noDivisionData')}</p>
                ) : (
                  divisionAggregates.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between text-sm text-slate-600">
                      <div>
                        <div className="font-medium text-slate-700">
                          {normalizeDivisionLabel(entry.label)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t('analytics.averageLabel')} {entry.average.toFixed(2)}%
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportPDF()}
          disabled={isExporting}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download size={18} />
          {isExporting ? t('analytics.exporting') || 'Exporting...' : 'PDF'}
        </button>
        <button
          onClick={() => exportExcel()}
          disabled={isExporting}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download size={18} />
          {isExporting ? t('analytics.exporting') || 'Exporting...' : 'Excel'}
        </button>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          {t('analytics.refresh')}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          {t('analytics.back')}
        </button>
      </div>
      {exportError && (
        <p className="text-sm text-red-600" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
