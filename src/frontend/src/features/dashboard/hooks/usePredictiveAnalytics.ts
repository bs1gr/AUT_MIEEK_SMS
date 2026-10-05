/**
 * usePredictiveAnalytics: a student's predictions (GET /analytics/predictive/student),
 * shown on the Student Profile by PredictiveAnalyticsPanel.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/api';
import type { StudentPredictions } from '../types/analytics';

interface PredictiveAnalyticsParams {
  studentId?: number;
  courseId?: number;
  weeksAhead?: number;
  includeAttendance?: boolean;
  includeRiskAssessment?: boolean;
  includeFinalGrade?: boolean;
}

export const usePredictiveAnalytics = (
  params: PredictiveAnalyticsParams,
  enabled = true
): UseQueryResult<StudentPredictions, Error> => {
  return useQuery({
    queryKey: ['predictive-analytics', params],
    queryFn: async () => {
      const response = await apiClient.get<StudentPredictions>('/analytics/predictive/student', {
        params: {
          student_id: params.studentId,
          course_id: params.courseId,
          weeks_ahead: params.weeksAhead || 4,
          include_attendance: params.includeAttendance !== false,
          include_risk_assessment: params.includeRiskAssessment !== false,
          include_final_grade: params.includeFinalGrade !== false,
        },
      });
      return response.data;
    },
    enabled: enabled && params.studentId !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};

export default usePredictiveAnalytics;
