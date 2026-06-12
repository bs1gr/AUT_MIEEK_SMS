// Dashboard feature exports
export { default as EnhancedDashboardView } from './components/EnhancedDashboardView';
export { default as AnalyticsDashboard } from './components/AnalyticsDashboard';
export {
  PerformanceChart,
  GradeDistributionChart,
  AttendanceChart,
  TrendChart,
  StatsPieChart,
  type PerformanceDataPoint,
  type GradeDistributionData,
  type AttendanceData,
  type TrendData,
  type PieChartData,
} from './components/AnalyticsCharts';
// New Premium Features
export { CustomReportBuilder } from './components/CustomReportBuilder';
export { PredictiveAnalyticsPanel } from './components/PredictiveAnalyticsPanel';

// Builder Steps
export { ReportTemplate } from './components/builder-steps/ReportTemplate';
export { DataSeriesPicker } from './components/builder-steps/DataSeriesPicker';
export { ChartTypeSelector } from './components/builder-steps/ChartTypeSelector';
export { FilterConfiguration } from './components/builder-steps/FilterConfiguration';
export { ReportPreview } from './components/builder-steps/ReportPreview';

// Hooks
export { usePredictiveAnalytics } from './hooks/usePredictiveAnalytics';
