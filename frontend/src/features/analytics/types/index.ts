/**
 * Analytics Feature Types
 * Type definitions for analytics data structures
 */

export interface StudentInfo {
  id: number;
  first_name: string;
  last_name: string;
}

export interface CourseInfo {
  id: number;
  code: string;
  name: string;
}

// Performance Types
export interface CoursePerformance {
  course_name: string;
  average: number;
  grade_count: number;
}

export interface PerformanceData {
  student?: StudentInfo;
  overall_average: number;
  period_days: number;
  courses?: Record<number, CoursePerformance>;
}

// Trends Types
export interface TrendPoint {
  date: string;
  grade: number;
  moving_average?: number;
}

export type TrendDirection = "improving" | "declining" | "stable";

export interface TrendsData {
  student?: StudentInfo;
  trend_data: TrendPoint[];
  overall_trend: TrendDirection;
  moving_average: number;
}

// Attendance Types
export interface CourseAttendance {
  course_name: string;
  total_classes: number;
  present: number;
  absent: number;
  attendance_rate: number;
}

export interface AttendanceData {
  student?: StudentInfo;
  overall_attendance_rate: number;
  total_classes: number;
  courses?: Record<string, CourseAttendance>;
}

// Grade Distribution Types
export interface DistributionBucket {
  range: string;
  count: number;
}

export interface GradeDistributionData {
  course?: CourseInfo;
  distribution: Record<string, number> | DistributionBucket[];
  average_percentage?: number;
  total_grades: number;
}

// Analytics API Response Types
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}

// Analytics Hook Types
export interface AnalyticsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface UseAnalyticsResult {
  performance: PerformanceData | null;
  trends: TrendsData | null;
  attendance: AttendanceData | null;
  gradeDistribution: GradeDistributionData | null;
  isLoading: boolean;
  error: AnalyticsError | null;
  refetch: () => Promise<void>;
}

// Component Props Types
export interface PerformanceCardProps {
  data: PerformanceData;
}

export interface TrendsChartProps {
  data: TrendsData;
}

export interface AttendanceCardProps {
  data: AttendanceData;
}

export interface GradeDistributionChartProps {
  data: GradeDistributionData;
}

export interface AnalyticsDashboardProps {
  studentId?: number;
  courseId?: number;
}
