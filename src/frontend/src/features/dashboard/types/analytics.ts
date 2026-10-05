/**
 * Analytics Type Definitions
 * Comprehensive TypeScript types for analytics feature
 */

// ==================== Prediction Types ====================
// GET /analytics/predictive/student (backend AnalyticsService.get_student_predictive_analytics).
// Text-like fields are codes; the panel translates them.

export type RiskLevel = 'low' | 'medium' | 'high';
export type GradeTrend = 'improving' | 'declining' | 'stable';
export type RiskFactor = 'good' | 'concerning' | 'critical';

export interface GradePrediction {
  date: string;
  predicted_grade: number;
  confidence: number;
}

export interface AttendancePrediction {
  day: string; // English weekday name, e.g. "Monday"
  predicted_attendance_rate: number;
  risk_level: RiskLevel;
  sample_size: number;
}

export interface RiskAssessment {
  risk_level: RiskLevel;
  risk_score: number;
  grade_average: number;
  attendance_rate: number;
  factors: { grades: RiskFactor; attendance: RiskFactor; trend: GradeTrend };
  recommendations: string[]; // tutoring | advisor | attendance | seek_support | on_track
}

export interface FinalGradeProjection {
  predicted_final_grade: number;
  confidence_percentage: number;
  scenarios: { optimistic: number; realistic: number; pessimistic: number };
  current_average: number;
  recommendation: string; // excellent | good | passing | at_risk
}

export interface StudentPredictions {
  student_id: number;
  course_id: number | null;
  grade_trend: GradeTrend | null;
  grade_predictions: GradePrediction[];
  attendance_predictions: AttendancePrediction[];
  risk_assessment: RiskAssessment | null;
  final_grade_projection: FinalGradeProjection | null;
  insufficient_data: Array<'grades' | 'attendance'>;
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
