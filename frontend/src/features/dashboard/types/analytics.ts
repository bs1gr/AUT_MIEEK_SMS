/**
 * Analytics Type Definitions
 * Comprehensive TypeScript types for analytics feature
 */

// ==================== Prediction Types ====================

export interface GradePrediction {
  course_id: number;
  course_name: string;
  current_grade: number;
  predicted_grade: number;
  confidence: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AttendancePrediction {
  date: string;
  predicted_attendance: number;
  confidence: number;
}

export interface RiskAssessment {
  student_id: number;
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  factors: string[];
  recommendations: string[];
}

export interface FinalGradeProjection {
  course_id: number;
  course_name: string;
  projected_final_grade: number;
  confidence: number;
  required_grade_for_pass: number;
}

export interface PredictiveAnalyticsData {
  gradePredictions: GradePrediction[];
  attendancePredictions: AttendancePrediction[];
  riskAssessment: RiskAssessment;
  finalGradeProjection: FinalGradeProjection;
}

// ==================== Chart Types ====================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  xAxis?: string;
  yAxis?: string;
  series: ChartSeries[];
}

// ==================== Report Types ====================

export interface ReportConfig {
  name: string;
  description?: string;
  template: string;
  dataSeries: string[];
  filters: ReportFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number];
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeSummary: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ====================Drill-Down Types ====================

export interface DrillDownLevel {
  id: string;
  name: string;
  data: ChartDataPoint[];
  parent?: string;
}

export interface DrillDownState {
  currentLevel: DrillDownLevel;
  breadcrumb: DrillDownLevel[];
  canGoBack: boolean;
}

// ==================== Analytics API Response Types ====================

export interface AnalyticsSummary {
  total_students: number;
  total_courses: number;
  average_grade: number;
  attendance_rate: number;
}

export interface StudentAnalytics {
  student_id: number;
  student_name: string;
  total_courses: number;
  average_grade: number;
  attendance_rate: number;
  risk_level: 'high' | 'medium' | 'low';
}

export interface CourseAnalytics {
  course_id: number;
  course_name: string;
  enrolled_students: number;
  average_grade: number;
  pass_rate: number;
}
