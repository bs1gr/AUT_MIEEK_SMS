/**
 * Custom Reports API Integration (Phase 6)
 * Provides API functions for custom report management and generation
 */

import type { AxiosResponse } from 'axios';
import apiClient from './api';
import { extractAPIResponseData, extractAPIError } from './api';

// ==================== TYPE DEFINITIONS ====================

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  report_type: string; // matches backend
  fields: string[] | UnknownRecord; // backend returns both formats
  filters?: UnknownRecord[] | UnknownRecord; // array or dict format
  aggregations?: UnknownRecord[] | UnknownRecord;
  sort_by?: UnknownRecord[] | UnknownRecord; // array or dict format
  default_export_format?: string;
  default_include_charts?: boolean;
  is_system: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomReport {
  id: number;
  name: string;
  description: string;
  report_type: string; // matches backend: student, course, grade, attendance, custom
  template_id?: number;
  fields: UnknownRecord; // matches backend: dict format
  filters?: UnknownRecord;
  aggregations?: UnknownRecord;
  sort_by?: UnknownRecord;
  export_format: 'pdf' | 'excel' | 'csv'; // matches backend field name
  include_charts: boolean;
  schedule_enabled: boolean;
  schedule_frequency?: string;
  schedule_cron?: string;
  email_recipients?: string[];
  email_enabled: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GeneratedReport {
  id: number;
  report_id: number;
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  status: string;
  error_message: string | null;
  generated_at: string;
  generation_metadata?: Record<string, unknown>;
}

// ==================== TEMPLATES API ====================

export const reportTemplatesAPI = {
  /**
   * Get all templates
   */
  getAll: async (options: { category?: string; report_type?: string; is_active?: boolean } = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.report_type) params.append('report_type', options.report_type);
      if (options.is_active !== undefined) params.append('is_active', String(options.is_active));

      const queryString = params.toString();
      const url = `/custom-reports/templates${queryString ? `?${queryString}` : ''}`;
      const response = await apiClient.get(url);
      return extractAPIResponseData(response) as ReportTemplate[];
    } catch (error) {
      console.error('[customReportsAPI] Error fetching templates:', error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Get template by ID
   */
  getById: async (id: number) => {
    try {
      const response = await apiClient.get(`/custom-reports/templates/${id}`);
      return extractAPIResponseData(response) as ReportTemplate;
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching template ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Create new template
   */
  create: async (templateData: Partial<ReportTemplate>) => {
    try {
      const response = await apiClient.post('/custom-reports/templates/', templateData);
      return extractAPIResponseData(response) as ReportTemplate;
    } catch (error) {
      console.error('[customReportsAPI] Error creating template:', error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Update template
   */
  update: async (id: number, updates: Partial<ReportTemplate>) => {
    try {
      const response = await apiClient.put(`/custom-reports/templates/${id}`, updates);
      return extractAPIResponseData(response) as ReportTemplate;
    } catch (error) {
      console.error(`[customReportsAPI] Error updating template ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Delete template
   */
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/custom-reports/templates/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error deleting template ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Import default templates
   */
  importDefaults: async () => {
    try {

      const response = await apiClient.post('/custom-reports/templates/import');

      const data = extractAPIResponseData(response) as Record<string, unknown>;

      return data;
    } catch (error) {
      console.error('[customReportsAPI] Error importing default templates:', error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },
};

// ==================== REPORTS API ====================

export const customReportsAPI = {
  /**
   * Get all reports
   */
  getAll: async (options: { status?: string; skip?: number; limit?: number } = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('report_type', options.status);
      if (options.skip !== undefined) params.append('skip', String(options.skip));
      if (options.limit !== undefined) params.append('limit', String(options.limit));

      const queryString = params.toString();
      const url = queryString ? `/?${queryString}` : '/';
      const response = await apiClient.get(`/custom-reports${url}`);
      return extractAPIResponseData(response) as CustomReport[];
    } catch (error) {
      console.error('[customReportsAPI] Error fetching reports:', error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Get report by ID
   */
  getById: async (id: number) => {
    try {
      const response = await apiClient.get(`/custom-reports/${id}`);
      return extractAPIResponseData(response) as CustomReport;
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching report ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Create new report
   */
  create: async (reportData: Partial<CustomReport>) => {
    try {

      const response = await apiClient.post('/custom-reports/', reportData);
      return extractAPIResponseData(response) as CustomReport;
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse<unknown>; message?: string };
      console.error('[customReportsAPI] Error creating report:', axiosError);
      console.error('[customReportsAPI] Response status:', axiosError.response?.status);
      console.error('[customReportsAPI] Response data:', axiosError.response?.data);

      // Log detailed validation errors
      if (axiosError.response?.status === 422 && axiosError.response?.data) {
        const responseData = axiosError.response.data;
        console.error('[customReportsAPI] 🔴 VALIDATION ERROR DETAILS:');
        console.error('  Full response:', JSON.stringify(responseData, null, 2));

        // Try to extract Pydantic validation errors
        if (isRecord(responseData)) {
          if ('detail' in responseData) {
            console.error('  Detail:', responseData.detail);
          }
          if ('errors' in responseData) {
            console.error('  Errors:', responseData.errors);
          }
        }
      }

      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Update report
   */
  update: async (id: number, updates: Partial<CustomReport>) => {
    try {
      const response = await apiClient.put(`/custom-reports/${id}`, updates);
      return extractAPIResponseData(response) as CustomReport;
    } catch (error) {
      console.error(`[customReportsAPI] Error updating report ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Delete report
   */
  delete: async (id: number) => {
    try {
      const response = await apiClient.delete(`/custom-reports/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error deleting report ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Generate report
   */
  generate: async (id: number) => {
    try {
      const response = await apiClient.post(`/custom-reports/${id}/generate`, {
        export_format: null,
        include_charts: null,
        email_recipients: null,
      });

      return extractAPIResponseData(response) as { job_id: string; status: string };
    } catch (error) {
      const axiosError = error as { response?: AxiosResponse<unknown>; message?: string };
      console.error(`[customReportsAPI] Error generating report ${id}:`, axiosError);
      console.error('[customReportsAPI] Response data:', axiosError.response?.data);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Get generated reports for a report
   */
  getGeneratedReports: async (id: number) => {
    try {
      const response = await apiClient.get(`/custom-reports/${id}/generated`);
      return extractAPIResponseData(response) as GeneratedReport[];
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching generated reports for ${id}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Download generated report
   */
  download: async (reportId: number, generatedId: number) => {
    try {
      // Fetch the list of generated reports to get the correct filename
      const generatedList = await apiClient.get(
        `/custom-reports/${reportId}/generated?limit=500`
      );
      const reports = extractAPIResponseData(generatedList) as GeneratedReport[];
      const targetReport = reports.find(r => r.id === generatedId);
      const filename = targetReport?.file_name || `report_${generatedId}.pdf`;

      // Then fetch the actual file
      const response = await apiClient.get(
        `/custom-reports/${reportId}/generated/${generatedId}/download`,
        { responseType: 'blob' }
      );

      return { blob: response.data, filename };
    } catch (error) {
      console.error(`[customReportsAPI] Error downloading report ${generatedId}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Delete generated report
   */
  deleteGenerated: async (reportId: number, generatedId: number) => {
    try {
      const response = await apiClient.delete(
        `/custom-reports/${reportId}/generated/${generatedId}`
      );
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error deleting generated report ${generatedId}:`, error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },

  /**
   * Get report statistics
   */
  getStatistics: async () => {
    try {
      const response = await apiClient.get('/custom-reports/statistics');
      return extractAPIResponseData(response) as Record<string, unknown>;
    } catch (error) {
      console.error('[customReportsAPI] Error fetching statistics:', error);
      throw extractAPIError(
        (error as { response?: AxiosResponse }).response
      );
    }
  },
};

// Export combined API for convenience
export default {
  templates: reportTemplatesAPI,
  reports: customReportsAPI,
};
