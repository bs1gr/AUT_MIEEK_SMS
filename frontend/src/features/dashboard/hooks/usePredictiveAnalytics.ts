/**
 * usePredictiveAnalytics Hook
 * Manages predictive analytics API calls and state management
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/api';

interface PredictiveAnalyticsData {
  gradePredictions: any[];
  attendancePredictions: any[];
  riskAssessment: any;
  finalGradeProjection: any;
}

interface PredictiveAnalyticsParams {
  studentId?: number;
  courseId?: number;
  weeksAhead?: number;
  includeAttendance?: boolean;
  includeRislAssessment?: boolean;
  includeFinalGrade?: boolean;
}

/**
 * Fetch predictive analytics data for a student
 */
export const usePredictiveAnalytics = (
  params: PredictiveAnalyticsParams,
  enabled = true
): UseQueryResult<PredictiveAnalyticsData, Error> => {
  return useQuery({
    queryKey: ['predictive-analytics', params],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/predictive/student', {
        params: {
          student_id: params.studentId,
          course_id: params.courseId,
          weeks_ahead: params.weeksAhead || 4,
          include_attendance: params.includeAttendance !== false,
          include_risk_assessment: params.includeRislAssessment !== false,
          include_final_grade: params.includeFinalGrade !== false,
        },
      });
      return response.data;
    },
    enabled: enabled && (params.studentId !== undefined || params.courseId !== undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

/**
 * Fetch class-wide risk assessment
 */
export const usePredictiveClassRiskAssessment = (
  classId: number,
  enabled = true
): UseQueryResult<any, Error> => {
  return useQuery({
    queryKey: ['predictive-class-risk', classId],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/predictive/class/${classId}/risk-assessment`);
      return response.data;
    },
    enabled: enabled && classId !== undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

/**
 * Fetch at-risk students for a class
 */
export const usePredictiveAtRiskStudents = (
  classId: number,
  riskThreshold = 60,
  enabled = true
): UseQueryResult<any[], Error> => {
  return useQuery({
    queryKey: ['predictive-at-risk-students', classId, riskThreshold],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/predictive/class/${classId}/at-risk-students`, {
        params: {
          risk_threshold: riskThreshold,
        },
      });
      return response.data;
    },
    enabled: enabled && classId !== undefined,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });
};

/**
 * Fetch course-wide performance predictions
 */
export const usePredictiveCourseAnalytics = (
  courseId: number,
  enabled = true
): UseQueryResult<any, Error> => {
  return useQuery({
    queryKey: ['predictive-course-analytics', courseId],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/predictive/course/${courseId}`);
      return response.data;
    },
    enabled: enabled && courseId !== undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

/**
 * Helper hook for combining multiple predictive queries
 */
export const useCombinedPredictiveAnalytics = (
  studentId: number,
  classId: number,
  courseId: number,
  enabled = true
) => {
  const student = usePredictiveAnalytics(
    { studentId, weeksAhead: 4 },
    enabled && studentId !== undefined
  );

  const classRisk = usePredictiveClassRiskAssessment(classId, enabled && classId !== undefined);

  const courseAnalytics = usePredictiveCourseAnalytics(courseId, enabled && courseId !== undefined);

  return {
    studentData: student.data,
    studentIsLoading: student.isLoading,
    studentError: student.error?.message,

    classRiskData: classRisk.data,
    classRiskIsLoading: classRisk.isLoading,
    classRiskError: classRisk.error?.message,

    courseData: courseAnalytics.data,
    courseIsLoading: courseAnalytics.isLoading,
    courseError: courseAnalytics.error?.message,

    isLoading: student.isLoading || classRisk.isLoading || courseAnalytics.isLoading,
    error: student.error?.message || classRisk.error?.message || courseAnalytics.error?.message,
  };
};

export default usePredictiveAnalytics;
