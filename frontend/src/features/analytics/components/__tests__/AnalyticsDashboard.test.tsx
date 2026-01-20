/**
 * Tests for AnalyticsDashboard component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactElement } from "react";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import AnalyticsDashboard from "../AnalyticsDashboard";
import { useAnalytics } from "../../hooks/useAnalytics";

// Initialize i18n for tests
i18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "analytics.title": "Analytics Dashboard",
        "analytics.performance_title": "Performance",
        "analytics.attendance_title": "Attendance",
        "analytics.trends_title": "Trends",
        "analytics.grade_distribution_title": "Grade Distribution",
        "common.loading": "Loading",
        "common.error": "Error",
        "common.refresh": "Refresh",
      },
    },
  },
});

// Custom render function that includes i18n provider
const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock the analytics hook
vi.mock("../../hooks/useAnalytics", () => ({
  useAnalytics: vi.fn(),
}));

// Mock child components
vi.mock("../PerformanceCard", () => ({
  PerformanceCard: ({ data: _data }: { data: unknown }) => (
    <div data-testid="performance-card">Performance Card</div>
  ),
}));

vi.mock("../TrendsChart", () => ({
  TrendsChart: ({ data: _data }: { data: unknown }) => (
    <div data-testid="trends-chart">Trends Chart</div>
  ),
}));

vi.mock("../AttendanceCard", () => ({
  AttendanceCard: ({ data: _data }: { data: unknown }) => (
    <div data-testid="attendance-card">Attendance Card</div>
  ),
}));

vi.mock("../GradeDistributionChart", () => ({
  GradeDistributionChart: ({ data: _data }: { data: unknown }) => (
    <div data-testid="grade-distribution">Grade Distribution</div>
  ),
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

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
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

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    // Look for the loading spinner (not the refresh button which also has the text)
    const loadingSpinner = screen.getByText(/Loading/i).closest('.loading-spinner');
    expect(loadingSpinner).toBeInTheDocument();
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

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard studentId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
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

    renderWithProviders(
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

    renderWithProviders(
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

    renderWithProviders(
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

    renderWithProviders(
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
