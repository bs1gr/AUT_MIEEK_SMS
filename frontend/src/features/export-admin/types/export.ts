/**
 * Export Admin UI TypeScript Interfaces
 * Defines types for admin dashboard components
 */

// Export Job Types
export interface ExportJob {
  id: string;
  export_type: 'students' | 'courses' | 'grades';
  export_format: 'excel' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  progress_percent: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
  filters?: Record<string, unknown>;
  record_count?: number;
}

export interface CreateExportRequest {
  export_type: 'students' | 'courses' | 'grades';
  export_format?: 'excel' | 'csv' | 'pdf';
  filters?: Record<string, unknown>;
  limit?: number;
}

// Schedule Types
export type ScheduleFrequency = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface ExportSchedule {
  id: string;
  name: string;
  export_type: 'students' | 'courses' | 'grades';
  export_format: 'excel' | 'csv' | 'pdf';
  frequency: ScheduleFrequency;
  cron_expression?: string;
  filters?: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleRequest {
  name: string;
  export_type: 'students' | 'courses' | 'grades';
  export_format?: 'excel' | 'csv' | 'pdf';
  frequency: ScheduleFrequency;
  cron_expression?: string;
  filters?: Record<string, unknown>;
}

// Metrics Types
export interface ExportMetrics {
  total_exports: number;
  successful_exports: number;
  failed_exports: number;
  total_records_exported: number;
  average_duration_seconds: number;
  success_rate_percent: number;
  by_format: Record<'excel' | 'csv' | 'pdf', FormatMetrics>;
  by_entity: Record<'students' | 'courses' | 'grades', EntityMetrics>;
  slowest_exports: ExportJob[];
  trend_data: TrendDataPoint[];
}

export interface FormatMetrics {
  count: number;
  avg_duration: number;
  avg_file_size: number;
  success_rate: number;
}

export interface EntityMetrics {
  count: number;
  avg_duration: number;
  total_records: number;
  success_rate: number;
}

export interface TrendDataPoint {
  date: string;
  duration_ms: number;
  success_count: number;
  failure_count: number;
  record_count: number;
}

// Settings Types
export interface ExportSettings {
  retention_days: number;
  cleanup_enabled: boolean;
  cleanup_schedule: string;
  max_concurrent_exports: number;
  export_timeout_seconds: number;
  max_records_per_export: number;
  archive_enabled: boolean;
  archive_after_days: number;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  from_email: string;
  admin_emails: string[];
  notify_on_completion: boolean;
  notify_on_failure: boolean;
  notify_on_schedule_failure: boolean;
}

// Filter Types
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
  value_min?: unknown;
  value_max?: unknown;
}

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between' | 'isEmpty' | 'isNotEmpty';

// Pagination
export interface PaginationParams {
  skip: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// API Response wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    request_id?: string;
    timestamp?: string;
    version?: string;
  };
}

// Component Props
export interface ExportDashboardProps {
  onRefresh?: () => void;
}

export interface ExportJobListProps {
  onJobSelected?: (job: ExportJob) => void;
  onJobDeleted?: (jobId: string) => void;
  onJobDownloaded?: (jobId: string) => void;
}

export interface ExportSchedulerProps {
  onScheduleCreated?: (schedule: ExportSchedule) => void;
  onScheduleUpdated?: (schedule: ExportSchedule) => void;
  onScheduleDeleted?: (scheduleId: string) => void;
}

export interface ExportMetricsChartProps {
  metrics: ExportMetrics;
  period?: 'week' | 'month' | 'quarter' | 'year';
  onPeriodChange?: (period: string) => void;
}

export interface EmailConfigPanelProps {
  config: EmailConfig;
  onSave?: (config: EmailConfig) => Promise<void>;
  onTest?: () => Promise<void>;
}

export interface ExportSettingsPanelProps {
  settings: ExportSettings;
  onSave?: (settings: ExportSettings) => Promise<void>;
}

export interface FilterBuilderProps {
  entityType: 'students' | 'courses' | 'grades';
  value?: Record<string, unknown>;
  onChange?: (filters: Record<string, unknown>) => void;
}

export interface ScheduleBuilderProps {
  frequency: ScheduleFrequency;
  cronExpression?: string;
  onChange?: (frequency: ScheduleFrequency, cron?: string) => void;
}

export interface ExportDetailModalProps {
  export: ExportJob;
  open: boolean;
  onClose?: () => void;
  onDownload?: (jobId: string) => void;
  onRerun?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

// Date Range for filtering
export interface DateRange {
  startDate: Date;
  endDate: Date;
}
