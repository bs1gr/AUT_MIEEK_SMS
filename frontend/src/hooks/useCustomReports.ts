/**
 * React Query hooks for Custom Reports API (Phase 6)
 */

import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { customReportsAPI, reportTemplatesAPI } from '@/api/customReportsAPI.js';
import { useNotifications } from './useNotifications';

// ==================== QUERY KEYS ====================

export const customReportKeys = {
  all: ['customReports'] as const,
  templates: () => [...customReportKeys.all, 'templates'] as const,
  template: (id: number) => [...customReportKeys.templates(), id] as const,
  reports: () => [...customReportKeys.all, 'reports'] as const,
  report: (id: number) => [...customReportKeys.reports(), id] as const,
  generated: (reportId: number) => [...customReportKeys.report(reportId), 'generated'] as const,
  statistics: () => [...customReportKeys.all, 'statistics'] as const,
};

// ==================== TEMPLATES HOOKS ====================

/**
 * Fetch all report templates
 */
export function useReportTemplates(options?: { is_public?: boolean; entity_type?: string }) {
  return useQuery({
    queryKey: [...customReportKeys.templates(), options],
    queryFn: () => reportTemplatesAPI.getAll(options || {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single template by ID
 */
export function useReportTemplate(id: number) {
  return useQuery({
    queryKey: customReportKeys.template(id),
    queryFn: () => reportTemplatesAPI.getById(id),
    enabled: !!id,
  });
}

/**
 * Create template mutation
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: reportTemplatesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
      showSuccess('customReports:templateCreated');
    },
    onError: () => {
      showError('customReports:errorSaving');
    },
  });
}

/**
 * Update template mutation
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      reportTemplatesAPI.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.template(variables.id) });
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
      showSuccess('customReports:templateUpdated');
    },
    onError: () => {
      showError('customReports:errorSaving');
    },
  });
}

/**
 * Delete template mutation
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: reportTemplatesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
      showSuccess('customReports:templateDeleted');
    },
    onError: () => {
      showError('customReports:errorDeleting');
    },
  });
}

// ==================== REPORTS HOOKS ====================

/**
 * Fetch all custom reports
 */
export function useCustomReports(options?: { status?: string; skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [...customReportKeys.reports(), options],
    queryFn: () => customReportsAPI.getAll(options || {}),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single report by ID
 */
export function useCustomReport(id: number) {
  return useQuery({
    queryKey: customReportKeys.report(id),
    queryFn: () => customReportsAPI.getById(id),
    enabled: !!id,
  });
}

/**
 * Create report mutation
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: customReportsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
      showSuccess('customReports:reportCreated');
    },
    onError: () => {
      showError('customReports:errorSaving');
    },
  });
}

/**
 * Update report mutation
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      customReportsAPI.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.report(variables.id) });
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
      showSuccess('customReports:reportUpdated');
    },
    onError: () => {
      showError('customReports:errorSaving');
    },
  });
}

/**
 * Delete report mutation
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: customReportsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
      showSuccess('customReports:reportDeleted');
    },
    onError: () => {
      showError('customReports:errorDeleting');
    },
  });
}

/**
 * Generate report mutation
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: customReportsAPI.generate,
    onSuccess: (_, reportId) => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.generated(reportId) });
      showSuccess('customReports:generationStarted');
    },
    onError: () => {
      showError('customReports:errorGenerating');
    },
  });
}

/**
 * Fetch generated reports for a report
 */
export function useGeneratedReports(reportId: number) {
  return useQuery({
    queryKey: customReportKeys.generated(reportId),
    queryFn: () => customReportsAPI.getGeneratedReports(reportId),
    enabled: !!reportId,
    refetchInterval: 5000, // Poll every 5s for status updates
  });
}

/**
 * Download generated report
 */
export function useDownloadReport() {
  const { showError } = useNotifications();

  return useMutation({
    mutationFn: ({ reportId, generatedId }: { reportId: number; generatedId: number }) =>
      customReportsAPI.download(reportId, generatedId),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${variables.generatedId}.pdf`; // Default, could be improved
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      showError('customReports:errorGenerating');
    },
  });
}

/**
 * Fetch report statistics
 */
export function useReportStatistics() {
  return useQuery({
    queryKey: customReportKeys.statistics(),
    queryFn: customReportsAPI.getStatistics,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
