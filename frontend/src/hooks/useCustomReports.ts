/**
 * React Query hooks for Custom Reports API (Phase 6)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customReportsAPI, reportTemplatesAPI } from '@/api/customReportsAPI';

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

  return useMutation({
    mutationFn: reportTemplatesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
    },
  });
}

/**
 * Update template mutation
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      reportTemplatesAPI.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.template(variables.id) });
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
    },
  });
}

/**
 * Delete template mutation
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportTemplatesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.templates() });
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

  return useMutation({
    mutationFn: customReportsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
    },
  });
}

/**
 * Update report mutation
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      customReportsAPI.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.report(variables.id) });
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
    },
  });
}

/**
 * Delete report mutation
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customReportsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customReportKeys.reports() });
    },
  });
}

/**
 * Generate report mutation
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customReportsAPI.generate,
    onSuccess: (data, reportId) => {
      console.log('[useGenerateReport] Report generation started:', { reportId, data });
      queryClient.invalidateQueries({ queryKey: customReportKeys.generated(reportId) });
      // Show success feedback
      if (typeof window !== 'undefined') {
        console.log(`✅ Report ${reportId} generation queued successfully`);
        // Try to show browser alert if no other notification system
        try {
          const toast = document.createElement('div');
          toast.textContent = `Report generation started (Job ID: ${data?.job_id || 'processing'})`;
          toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 5000);
        } catch (e) {
          console.error('Could not show toast:', e);
        }
      }
    },
    onError: (error: any, reportId) => {
      console.error('[useGenerateReport] Error generating report:', { reportId, error });
      const message = error?.message || 'Failed to generate report';
      // Show error feedback
      if (typeof window !== 'undefined') {
        try {
          const toast = document.createElement('div');
          toast.textContent = `❌ Error: ${message}`;
          toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 5000);
        } catch (e) {
          console.error('Could not show error toast:', e);
        }
      }
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
