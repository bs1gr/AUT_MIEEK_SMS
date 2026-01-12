/**
 * Tests for Analytics component cards (Performance, Attendance, Trends, Grades)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceCard } from "../PerformanceCard";
import { AttendanceCard } from "../AttendanceCard";
import { TrendsChart } from "../TrendsChart";
import { GradeDistributionChart } from "../GradeDistributionChart";

// Mock useTranslation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
      render(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("analytics.performance_title")).toBeInTheDocument();
    });

    it("displays overall average percentage", () => {
      render(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("85.5%")).toBeInTheDocument();
    });

    it("displays grade letter B for 85% average", () => {
      render(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("B")).toBeInTheDocument();
    });

    it("displays course breakdown", () => {
      render(<PerformanceCard data={mockPerformanceData} />);
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("displays correct grade for A (90+)", () => {
      const data = { ...mockPerformanceData, overall_average: 95 };
      const { container } = render(<PerformanceCard data={data} />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("displays correct grade for F (<60)", () => {
      const data = { ...mockPerformanceData, overall_average: 45 };
      render(<PerformanceCard data={data} />);
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
      render(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText("analytics.attendance_title")).toBeInTheDocument();
    });

    it("displays overall attendance percentage", () => {
      render(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("displays course attendance breakdown", () => {
      render(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("shows good status for high attendance", () => {
      render(<AttendanceCard data={mockAttendanceData} />);
      expect(screen.getByText(/analytics.attendance_good/)).toBeInTheDocument();
    });

    it("shows warning status for low attendance", () => {
      const data = { ...mockAttendanceData, overall_attendance_rate: 50.0 };
      render(<AttendanceCard data={data} />);
      expect(screen.getByText(/analytics.attendance_warning/)).toBeInTheDocument();
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
      render(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText("analytics.trends_title")).toBeInTheDocument();
    });

    it("displays trend direction badge for improving", () => {
      render(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText(/analytics.trend_improving/)).toBeInTheDocument();
    });

    it("displays trend direction badge for declining", () => {
      const data = { ...mockTrendsData, overall_trend: "declining" as const };
      render(<TrendsChart data={data} />);
      expect(screen.getByText(/analytics.trend_declining/)).toBeInTheDocument();
    });

    it("displays moving average value", () => {
      render(<TrendsChart data={mockTrendsData} />);
      expect(screen.getByText("80%")).toBeInTheDocument();
    });

    it("displays correct data point count", () => {
      render(<TrendsChart data={mockTrendsData} />);
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
      render(<GradeDistributionChart data={mockDistributionData} />);
      expect(
        screen.getByText("analytics.grade_distribution_title")
      ).toBeInTheDocument();
    });

    it("displays total grades count", () => {
      render(<GradeDistributionChart data={mockDistributionData} />);
      expect(screen.getByText("22")).toBeInTheDocument();
    });

    it("displays class average", () => {
      render(<GradeDistributionChart data={mockDistributionData} />);
      expect(screen.getByText("81.5%")).toBeInTheDocument();
    });

    it("displays grade range legend", () => {
      render(<GradeDistributionChart data={mockDistributionData} />);
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
      render(<GradeDistributionChart data={data} />);
      expect(
        screen.getByText("analytics.no_distribution_data")
      ).toBeInTheDocument();
    });
  });
});
