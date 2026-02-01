/**
 * Custom Reports API Integration (Phase 6)
 * Provides API functions for custom report management and generation
 */

import { apiClient, extractAPIResponseData, extractAPIError } from './api.js';

// ==================== TYPE DEFINITIONS ====================

/**
 * @typedef {Object} ReportTemplate
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} entity_type - Entity type (students, courses, grades, etc.)
 * @property {Array<string>} selected_fields
 * @property {Array<Object>} filters
 * @property {Array<Object>} sorting_rules
 * @property {boolean} is_public
 * @property {boolean} is_favorite
 * @property {number} created_by_user_id
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} CustomReport
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} entity_type
 * @property {Array<string>} selected_fields
 * @property {Array<Object>} filters
 * @property {Array<Object>} sorting_rules
 * @property {string} output_format - pdf, excel, or csv
 * @property {string|null} schedule_config - JSON string for scheduling
 * @property {Array<string>} email_recipients
 * @property {number} owner_id
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} GeneratedReport
 * @property {number} id
 * @property {number} report_id
 * @property {string} file_path
 * @property {number} file_size
 * @property {string} status
 * @property {string|null} error_message
 * @property {string} generated_at
 * @property {Object} generation_metadata
 */

// ==================== TEMPLATES API ====================

export const reportTemplatesAPI = {
  /**
   * Get all templates
   * @param {Object} options - Query options
   * @param {boolean} options.is_public - Filter by public templates
   * @param {string} options.entity_type - Filter by entity type
   * @returns {Promise<ReportTemplate[]>}
   */
  getAll: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.is_public !== undefined) params.append('is_public', options.is_public);
      if (options.entity_type) params.append('entity_type', options.entity_type);
      
      const response = await apiClient.get(`/custom-reports/templates/?${params.toString()}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error('[customReportsAPI] Error fetching templates:', error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Get template by ID
   * @param {number} id - Template ID
   * @returns {Promise<ReportTemplate>}
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/custom-reports/templates/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching template ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Create new template
   * @param {Partial<ReportTemplate>} templateData - Template data
   * @returns {Promise<ReportTemplate>}
   */
  create: async (templateData) => {
    try {
      const response = await apiClient.post('/custom-reports/templates/', templateData);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error('[customReportsAPI] Error creating template:', error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Update template
   * @param {number} id - Template ID
   * @param {Partial<ReportTemplate>} updates - Template updates
   * @returns {Promise<ReportTemplate>}
   */
  update: async (id, updates) => {
    try {
      const response = await apiClient.put(`/custom-reports/templates/${id}`, updates);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error updating template ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Delete template
   * @param {number} id - Template ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/custom-reports/templates/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error deleting template ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },
};

// ==================== REPORTS API ====================

export const customReportsAPI = {
  /**
   * Get all reports
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status
   * @param {number} options.skip - Pagination offset
   * @param {number} options.limit - Pagination limit
   * @returns {Promise<CustomReport[]>}
   */
  getAll: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.skip !== undefined) params.append('skip', options.skip);
      if (options.limit !== undefined) params.append('limit', options.limit);
      
      const response = await apiClient.get(`/custom-reports/reports/?${params.toString()}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error('[customReportsAPI] Error fetching reports:', error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Get report by ID
   * @param {number} id - Report ID
   * @returns {Promise<CustomReport>}
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/custom-reports/reports/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching report ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Create new report
   * @param {Partial<CustomReport>} reportData - Report data
   * @returns {Promise<CustomReport>}
   */
  create: async (reportData) => {
    try {
      const response = await apiClient.post('/custom-reports/reports/', reportData);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error('[customReportsAPI] Error creating report:', error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Update report
   * @param {number} id - Report ID
   * @param {Partial<CustomReport>} updates - Report updates
   * @returns {Promise<CustomReport>}
   */
  update: async (id, updates) => {
    try {
      const response = await apiClient.put(`/custom-reports/reports/${id}`, updates);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error updating report ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Delete report
   * @param {number} id - Report ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/custom-reports/reports/${id}`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error deleting report ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Generate report
   * @param {number} id - Report ID
   * @returns {Promise<{job_id: string, status: string}>}
   */
  generate: async (id) => {
    try {
      const response = await apiClient.post(`/custom-reports/reports/${id}/generate`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error generating report ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Get generated reports for a report
   * @param {number} id - Report ID
   * @returns {Promise<GeneratedReport[]>}
   */
  getGeneratedReports: async (id) => {
    try {
      const response = await apiClient.get(`/custom-reports/reports/${id}/generated`);
      return extractAPIResponseData(response);
    } catch (error) {
      console.error(`[customReportsAPI] Error fetching generated reports for ${id}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Download generated report
   * @param {number} reportId - Report ID
   * @param {number} generatedId - Generated report ID
   * @returns {Promise<Blob>}
   */
  download: async (reportId, generatedId) => {
    try {
      const response = await apiClient.get(
        `/custom-reports/reports/${reportId}/generated/${generatedId}/download`,
        { responseType: 'blob' }
      );
      return response.data; // Blob doesn't need unwrapping
    } catch (error) {
      console.error(`[customReportsAPI] Error downloading report ${generatedId}:`, error);
      throw extractAPIError(error.response);
    }
  },

  /**
   * Get report statistics
   * @returns {Promise<Object>}
   */
  getStatistics: async () => {
    try {
      const response = await apiClient.get('/custom-reports/reports/statistics');
      return extractAPIResponseData(response);
    } catch (error) {
      console.error('[customReportsAPI] Error fetching statistics:', error);
      throw extractAPIError(error.response);
    }
  },
};

// Export combined API for convenience
export default {
  templates: reportTemplatesAPI,
  reports: customReportsAPI,
};
