/**
 * Tests for AnalyticsDashboard component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { useAnalytics } from "../hooks/useAnalytics";

// Mock the analytics hook
vi.mock("../hooks/useAnalytics", () => ({
  useAnalytics: vi.fn(),
}));

// Mock child components
vi.mock("../components/PerformanceCard", () => ({
  PerformanceCard: ({ data: _data }: { data: unknown }) => (
    <div data-testid="performance-card">Performance Card</div>
  ),
}));

vi.mock("../components/TrendsChart", () => ({
  TrendsChart: ({ data: _data }: { data: unknown }) => (
    <div data-testid="trends-chart">Trends Chart</div>
  ),
}));

vi.mock("../components/AttendanceCard", () => ({
  AttendanceCard: ({ data: _data }: { data: unknown }) => (
    <div data-testid="attendance-card">Attendance Card</div>
  ),
}));

vi.mock("../components/GradeDistributionChart", () => ({
  GradeDistributionChart: ({ data: _data }: { data: unknown }) => (
    <div data-testid="grade-distribution">Grade Distribution</div>
  ),
}));

// Mock useTranslation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("AnalyticsDashboard", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // Fixed: Use ES6 import instead of require()
  const mockUseAnalytics = vi.mocked(useAnalytics);

  beforeEach(() => {
    // Reset mock before each test
    mockUseAnalytics.mockReset();
  });

  it("renders dashboard with title", () => {
    mockUseAnalytics.mockReturnValue({
      performance: null,
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText("analytics.title")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockUseAnalytics.mockReturnValue({
      performance: null,
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: true,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText(/common.loading/)).toBeInTheDocument();
  });

  it("renders error state", () => {
    const error = {
      code: "ERROR",
      message: "Test error message",
    };

    mockUseAnalytics.mockReturnValue({
      performance: null,
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: false,
      error,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText("analytics.error_title")).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it("renders all widget cards when data is present", async () => {
    const mockData = {
      student: { id: 1, first_name: "Test", last_name: "User" },
      overall_average: 85,
      period_days: 30,
      courses: {},
    };

    mockUseAnalytics.mockReturnValue({
      performance: mockData,
      trends: mockData,
      attendance: mockData,
      gradeDistribution: mockData,
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("performance-card")).toBeInTheDocument();
      expect(screen.getByTestId("trends-chart")).toBeInTheDocument();
      expect(screen.getByTestId("attendance-card")).toBeInTheDocument();
      expect(screen.getByTestId("grade-distribution")).toBeInTheDocument();
    });
  });

  it("handles refresh button click", async () => {
    const mockRefetch = vi.fn();

    mockUseAnalytics.mockReturnValue({
      performance: null,
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    const refreshButton = screen.getByRole("button", {
      name: "common.refresh",
    });
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("disables refresh button during loading", () => {
    mockUseAnalytics.mockReturnValue({
      performance: null,
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: true,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    const refreshButton = screen.getByRole("button", {
      name: /common.loading/,
    });
    expect(refreshButton).toBeDisabled();
  });

  it("only renders widgets with data", () => {
    mockUseAnalytics.mockReturnValue({
      performance: { student: { id: 1 }, overall_average: 85, period_days: 30, courses: {} },
      trends: null,
      attendance: null,
      gradeDistribution: null,
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("performance-card")).toBeInTheDocument();
    expect(screen.queryByTestId("trends-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("attendance-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grade-distribution")).not.toBeInTheDocument();
  });
});
