/**
 * Tests for Analytics component cards (Performance, Attendance, Trends, Grades)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, RenderOptions } from "@testing-library/react";
import React, { ReactElement } from "react";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { PerformanceCard } from "../PerformanceCard";
import { AttendanceCard } from "../AttendanceCard";
import { TrendsChart } from "../TrendsChart";
import { GradeDistributionChart } from "../GradeDistributionChart";

// Initialize i18n for tests
i18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "analytics.performance_title": "Performance",
        "analytics.attendance_title": "Attendance",
        "analytics.trends_title": "Trends",
        "analytics.grade_distribution_title": "Grade Distribution",
        "analytics.attendance_good": "Good",
        "analytics.attendance_warning": "Warning",
        "analytics.trend_improving": "Improving",
        "analytics.trend_declining": "Declining",
        "analytics.no_distribution_data": "No distribution data",
        "analytics.gradeA": "A (90-100%)",
        "analytics.gradeB": "B (80-89%)",
        "analytics.gradeC": "C (70-79%)",
        "analytics.gradeD": "D (60-69%)",
        "analytics.gradeF": "F (<60%)",
        "analytics.overall_average": "Overall Average",
        "analytics.period": "Period",
        "days": "days",
      },
    },
  },
});

// Custom render function that includes providers
const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: unknown }) => <div>{children}</div>,
  LineChart: ({ children }: { children: unknown }) => <div>{children}</div>,
  BarChart: ({ children }: { children: unknown }) => <div>{children}</div>,
  Line: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe("Analytics Component Cards", () => {
  describe("PerformanceCard", () => {
    const mockPerformanceData = {
      student: { id: 1, first_name: "Test", last_name: "Student" },
      overall_average: 85.5,
      period_days: 30,
      courses: {
        1: {
          course_name: "Mathematics",
          average: 88.0,
          grade_count: 5,
        },
        2: {
          course_name: "English",
          average: 82.0,
          grade_count: 4,
        },
      },
    };

    it("renders performance card with title", () => {
      renderWithProviders(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("Performance")).toBeInTheDocument();
    });

    it("displays overall average percentage", () => {
      const { container } = renderWithProviders(<PerformanceCard data={mockPerformanceData} />);
      const percentage = container.textContent;
      expect(percentage).toContain("85.5");
      expect(percentage).toContain("%");
    });

    it("displays grade letter B for 85% average", () => {
      renderWithProviders(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("B")).toBeInTheDocument();
    });

    it("displays course breakdown", () => {
      renderWithProviders(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("displays correct grade for A (90+)", () => {
      const data = { ...mockPerformanceData, overall_average: 95 };
      renderWithProviders(<PerformanceCard data={data} />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("displays correct grade for F (<60)", () => {
      const data = { ...mockPerformanceData, overall_average: 45 };
      renderWithProviders(<PerformanceCard data={data} />);
      expect(screen.getByText("F")).toBeInTheDocument();
    });
  });

  describe("AttendanceCard", () => {
    const mockAttendanceData = {
      student: { id: 1, first_name: "Test", last_name: "Student" },
      overall_attendance_rate: 85.0,
      total_classes: 20,
      courses: {
        1: {
          course_name: "Mathematics",
          total_classes: 10,
          present: 9,
          absent: 1,
          attendance_rate: 90.0,
        },
        2: {
          course_name: "English",
          total_classes: 10,
          present: 7,
          absent: 3,
          attendance_rate: 70.0,
        },
      },
    };

    it("renders attendance card with title", () => {
      renderWithProviders(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText("Attendance")).toBeInTheDocument();
    });

    it("displays overall attendance percentage", () => {
      const { container } = renderWithProviders(<AttendanceCard data={mockAttendanceData} />);
      const attendance = container.textContent;
      expect(attendance).toContain("85");
      expect(attendance).toContain("%");
    });

    it("displays course attendance breakdown", () => {
      renderWithProviders(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("shows good status for high attendance", () => {
      renderWithProviders(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText(/Good/i)).toBeInTheDocument();
    });

    it("shows warning status for low attendance", () => {
      const data = { ...mockAttendanceData, overall_attendance_rate: 50.0 };
      renderWithProviders(<AttendanceCard data={data} />);
      expect(screen.getByText(/Warning/i)).toBeInTheDocument();
    });
  });

  describe("TrendsChart", () => {
    const mockTrendsData = {
      student: { id: 1, first_name: "Test", last_name: "Student" },
      trend_data: [
        { date: "2026-01-01", grade: 75, moving_average: 75 },
        { date: "2026-01-08", grade: 78, moving_average: 76.5 },
        { date: "2026-01-15", grade: 82, moving_average: 78.3 },
        { date: "2026-01-22", grade: 85, moving_average: 80.0 },
      ],
      overall_trend: "improving" as const,
      moving_average: 80.0,
    };

    it("renders trends chart with title", () => {
      renderWithProviders(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText("Trends")).toBeInTheDocument();
    });

    it("displays trend direction badge for improving", () => {
      renderWithProviders(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText(/Improving/i)).toBeInTheDocument();
    });

    it("displays trend direction badge for declining", () => {
      const data = { ...mockTrendsData, overall_trend: "declining" as const };
      renderWithProviders(<TrendsChart data={data} />);
      expect(screen.getByText(/Declining/i)).toBeInTheDocument();
    });

    it("displays moving average value", () => {
      const { container } = renderWithProviders(<TrendsChart data={mockTrendsData} />);
      const trendContent = container.textContent;
      expect(trendContent).toContain("80");
      expect(trendContent).toContain("%");
    });

    it("displays correct data point count", () => {
      renderWithProviders(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("GradeDistributionChart", () => {
    const mockDistributionData = {
      course: { id: 1, code: "MATH101", name: "Mathematics" },
      distribution: {
        "A (90-100%)": 5,
        "B (80-89%)": 8,
        "C (70-79%)": 6,
        "D (60-69%)": 2,
        "F (<60%)": 1,
      },
      average_percentage: 81.5,
      total_grades: 22,
    };

    it("renders grade distribution chart with title", () => {
      renderWithProviders(<GradeDistributionChart data={mockDistributionData} />);
      expect(
        screen.getByText("Grade Distribution")
      ).toBeInTheDocument();
    });

    it("displays total grades count", () => {
      renderWithProviders(<GradeDistributionChart data={mockDistributionData} />);
      expect(screen.getByText("22")).toBeInTheDocument();
    });

    it("displays class average", () => {
      renderWithProviders(<GradeDistributionChart data={mockDistributionData} />);
      expect(screen.getByText("81.5%")).toBeInTheDocument();
    });

    it("displays grade range legend", () => {
      renderWithProviders(<GradeDistributionChart data={mockDistributionData} />);
      expect(screen.getByText("A (90-100%)")).toBeInTheDocument();
      expect(screen.getByText("B (80-89%)")).toBeInTheDocument();
      expect(screen.getByText("C (70-79%)")).toBeInTheDocument();
      expect(screen.getByText("D (60-69%)")).toBeInTheDocument();
      expect(screen.getByText(/F \(<60%\)/)).toBeInTheDocument();
    });

    it("handles empty distribution", () => {
      const data = {
        ...mockDistributionData,
        distribution: {},
        total_grades: 0,
      };
      renderWithProviders(<GradeDistributionChart data={data} />);
      expect(
        screen.getByText("No distribution data")
      ).toBeInTheDocument();
    });
  });
});
