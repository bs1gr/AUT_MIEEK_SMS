/**
 * useAnalytics Hook
 * Custom hook for managing analytics data fetching and caching
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../api/api";

interface AnalyticsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface AnalyticsData {
  performance: unknown | null;
  trends: unknown | null;
  attendance: unknown | null;
  gradeDistribution: unknown | null;
  isLoading: boolean;
  error: AnalyticsError | null;
  refetch: () => Promise<void>;
}

/**
 * useAnalytics Hook
 * Fetches analytics data for a student or course
 *
 * @param studentId - Optional student ID
 * @param courseId - Optional course ID
 * @returns Analytics data and loading/error states
 */
export const useAnalytics = (
  studentId?: number,
  courseId?: number
): AnalyticsData => {
  const [performance, setPerformance] = useState(null);
  const [trends, setTrends] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AnalyticsError | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!studentId && !courseId) {
      setError({
        code: "INVALID_PARAMS",
        message: "Either studentId or courseId must be provided",
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const requests = [];

      if (studentId) {
        // Student analytics endpoints
        requests.push(
          (async () => {
            try {
              const perfRes = await apiClient.get(
                `/analytics/student/${studentId}/performance`
              );
              setPerformance(perfRes);
            } catch (err) {
              console.error("Error fetching performance:", err);
            }
          })(),
          (async () => {
            try {
              const trendsRes = await apiClient.get(
                `/analytics/student/${studentId}/trends`
              );
              setTrends(trendsRes);
            } catch (err) {
              console.error("Error fetching trends:", err);
            }
          })(),
          (async () => {
            try {
              const attRes = await apiClient.get(
                `/analytics/student/${studentId}/attendance`
              );
              setAttendance(attRes);
            } catch (err) {
              console.error("Error fetching attendance:", err);
            }
          })()
        );
      }

      if (courseId) {
        // Course analytics endpoints
        requests.push(
          (async () => {
            try {
              const distRes = await apiClient.get(
                `/analytics/course/${courseId}/grade-distribution`
              );
              setGradeDistribution(distRes);
            } catch (err) {
              console.error("Error fetching grade distribution:", err);
            }
          })()
        );
      }

      // Wait for all requests
      await Promise.all(requests);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError({
        code: "FETCH_ERROR",
        message: "Failed to fetch analytics data",
        details: { error: String(err) },
      });
    } finally {
      setIsLoading(false);
    }
  }, [studentId, courseId]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    performance,
    trends,
    attendance,
    gradeDistribution,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
};

export default useAnalytics;
