/**
 * Analytics Feature Index
 * Exports all analytics components, hooks, and utilities
 */

// Components
export { AnalyticsDashboard } from "./components/AnalyticsDashboard";
export { PerformanceCard } from "./components/PerformanceCard";
export { TrendsChart } from "./components/TrendsChart";
export { AttendanceCard } from "./components/AttendanceCard";
export { GradeDistributionChart } from "./components/GradeDistributionChart";

// Hooks
export { useAnalytics } from "./hooks/useAnalytics";

// Types
export type {
  PerformanceData,
  TrendsData,
  AttendanceData,
  GradeDistributionData,
} from "./types";
