/**
 * Tests for useAnalytics custom hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAnalytics } from "../hooks/useAnalytics";

// Mock apiClient
vi.mock("../../../api/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("useAnalytics Hook", () => {
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const { apiClient } = require("../../../api/api");
    mockGet = apiClient.get;
    vi.clearAllMocks();
  });

  it("returns initial state with loading true", () => {
    mockGet.mockResolvedValue({});

    const { result } = renderHook(() => useAnalytics(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.performance).toBe(null);
    expect(result.current.trends).toBe(null);
    expect(result.current.attendance).toBe(null);
    expect(result.current.gradeDistribution).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it("fetches student analytics data", async () => {
    const performanceData = { overall_average: 85, period_days: 30, courses: {} };
    const trendsData = { trend_data: [], overall_trend: "stable", moving_average: 85 };
    const attendanceData = { overall_attendance_rate: 90, total_classes: 20, courses: {} };

    mockGet
      .mockResolvedValueOnce(performanceData)
      .mockResolvedValueOnce(trendsData)
      .mockResolvedValueOnce(attendanceData);

    const { result } = renderHook(() => useAnalytics(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.performance).toEqual(performanceData);
    expect(result.current.trends).toEqual(trendsData);
    expect(result.current.attendance).toEqual(attendanceData);
    expect(result.current.error).toBe(null);
  });

  it("fetches course analytics data", async () => {
    const distributionData = {
      distribution: { "A (90-100%)": 5 },
      average_percentage: 85,
      total_grades: 20,
    };

    mockGet.mockResolvedValueOnce(distributionData);

    const { result } = renderHook(() => useAnalytics(undefined, 1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.gradeDistribution).toEqual(distributionData);
  });

  it("handles error when fetching fails", async () => {
    const error = new Error("Network error");
    mockGet.mockRejectedValue(error);

    const { result } = renderHook(() => useAnalytics(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.code).toBe("FETCH_ERROR");
  });

  it("returns error when neither studentId nor courseId provided", async () => {
    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.code).toBe("INVALID_PARAMS");
  });

  it("provides refetch function", async () => {
    mockGet.mockResolvedValue({ data: "test" });

    const { result } = renderHook(() => useAnalytics(1));

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe("function");

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.refetch();

    // Should call the API again
    expect(mockGet).toHaveBeenCalledTimes(4); // 3 initial + 1 refetch
  });

  it("combines student and course analytics when both IDs provided", async () => {
    const perfData = { overall_average: 85, period_days: 30, courses: {} };
    const trendsData = { trend_data: [], overall_trend: "stable", moving_average: 85 };
    const attendanceData = { overall_attendance_rate: 90, total_classes: 20, courses: {} };
    const distData = { distribution: {}, average_percentage: 85, total_grades: 20 };

    mockGet
      .mockResolvedValueOnce(perfData)
      .mockResolvedValueOnce(trendsData)
      .mockResolvedValueOnce(attendanceData)
      .mockResolvedValueOnce(distData);

    const { result } = renderHook(() => useAnalytics(1, 1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.performance).toEqual(perfData);
    expect(result.current.trends).toEqual(trendsData);
    expect(result.current.attendance).toEqual(attendanceData);
    expect(result.current.gradeDistribution).toEqual(distData);
  });

  it("handles partial data loading", async () => {
    const perfData = { overall_average: 85, period_days: 30, courses: {} };

    mockGet
      .mockResolvedValueOnce(perfData)
      .mockRejectedValueOnce(new Error("Trends API down"))
      .mockRejectedValueOnce(new Error("Attendance API down"));

    const { result } = renderHook(() => useAnalytics(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.performance).toEqual(perfData);
    expect(result.current.trends).toBe(null);
    expect(result.current.attendance).toBe(null);
  });
});
