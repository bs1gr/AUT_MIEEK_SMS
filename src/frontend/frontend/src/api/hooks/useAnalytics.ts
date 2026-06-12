import { useQuery } from '@tanstack/react-query';
import { apiClient, extractAPIResponseData } from '@/api/api';

/**
 * Analytics API Response Types
 */

export interface StudentSummary {
  student_id: number;
  student_name: string;
  email: string;
  total_courses: number;
  average_grade: number;
  attendance_rate: number;
  trend: 'improving' | 'declining' | 'stable';
  courses_summary: {
    course_id: number;
    course_name: string;
    grade: number;
    letter_grade: string;
    attendance_rate: number;
  }[];
}

export interface CourseStats {
  course_id: number;
  course_name: string;
  total_students: number;
  average_grade: number;
  grade_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  attendance_rate: number;
}

export interface DashboardSummary {
  total_students: number;
  total_courses: number;
  total_grades: number;
  total_attendance_records: number;
  average_grade: number;
  average_attendance: number;
  timestamp: string;
}

export interface StudentPerformance {
  student_id: number;
  course_id: number;
  final_grade: number;
  letter_grade: string;
  percentage: number;
  components: {
    grade_weight: number;
    daily_performance_weight: number;
    attendance_weight: number;
  };
}

/**
 * React Query Hooks for Analytics API
 */

/**
 * Fetch dashboard summary (system-wide metrics)
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardSummary>('/analytics/dashboard');
      return extractAPIResponseData<DashboardSummary>(response.data ?? response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Fetch student summary with all courses
 */
export function useStudentSummary(studentId: number | null) {
  return useQuery({
    queryKey: ['analytics', 'student', studentId, 'summary'],
    queryFn: async () => {
      if (!studentId) throw new Error('Student ID is required');
      const response = await apiClient.get<StudentSummary>(`/analytics/student/${studentId}/summary`);
      return response;
    },
    enabled: !!studentId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
}

/**
 * Fetch all courses summary for a student
 */
export function useStudentAllCoursesSummary(studentId: number | null) {
  return useQuery({
    queryKey: ['analytics', 'student', studentId, 'all-courses'],
    queryFn: async () => {
      if (!studentId) throw new Error('Student ID is required');
      const response = await apiClient.get<StudentSummary>(`/analytics/student/${studentId}/all-courses-summary`);
      return response;
    },
    enabled: !!studentId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
}

/**
 * Calculate final grade for a student in a course
 */
export function useCalculateFinalGrade(studentId: number | null, courseId: number | null) {
  return useQuery({
    queryKey: ['analytics', 'final-grade', studentId, courseId],
    queryFn: async () => {
      if (!studentId || !courseId) throw new Error('Student ID and Course ID are required');
      const response = await apiClient.get<StudentPerformance>(
        `/analytics/student/${studentId}/course/${courseId}/final-grade`
      );
      return response;
    },
    enabled: !!studentId && !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Combined hook for dashboard initialization - fetches all dashboard data at once
 */
export function useDashboardData() {
  const dashboardQuery = useDashboardSummary();

  return {
    dashboard: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}

/**
 * Combined hook for student analytics - fetches all student-related data
 */
export function useStudentAnalytics(studentId: number | null) {
  const summaryQuery = useStudentSummary(studentId);
  const allCoursesQuery = useStudentAllCoursesSummary(studentId);

  return {
    summary: summaryQuery.data,
    allCourses: allCoursesQuery.data,
    isLoading: summaryQuery.isLoading || allCoursesQuery.isLoading,
    error: summaryQuery.error || allCoursesQuery.error,
    refetch: async () => {
      await summaryQuery.refetch();
      await allCoursesQuery.refetch();
    },
  };
}
