/**
 * useAsyncExport Hook - Manage async Excel export jobs
 *
 * Handles:
 * - Creating export job (immediate response)
 * - Polling export status
 * - Download link generation
 * - Error handling and retry logic
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../api/api';

export interface ExportJob {
  id: number;
  export_type: 'students' | 'courses' | 'grades';
  file_format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  file_path?: string;
  created_at: string;
  completed_at?: string;
}

export interface CreateExportRequest {
  export_type: 'students' | 'courses' | 'grades';
  file_format: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

/**
 * Hook for creating and managing async exports
 */
export const useAsyncExport = () => {
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  // Create export job (immediate, non-blocking)
  const createExport = useMutation({
    mutationFn: async (request: CreateExportRequest) => {
      const response = await apiClient.post('/import-export/exports', request);
      return response.data;
    },
    onSuccess: (data) => {
      const job = data.data; // APIResponse wrapper
      setExportJob(job);
      setPollingActive(true); // Start polling
    },
    onError: (error) => {
      console.error('Failed to create export:', error);
      setPollingActive(false);
    },
  });

  // Poll export status
  const { data: statusData, isLoading: isPolling } = useQuery({
    queryKey: ['exportJob', exportJob?.id],
    queryFn: async () => {
      if (!exportJob?.id) return null;
      const response = await apiClient.get(`/import-export/exports/${exportJob.id}`);
      return response.data.data; // Unwrap APIResponse
    },
    enabled: pollingActive && !!exportJob?.id,
    refetchInterval: (query) => {
      // Use query.state.data instead of statusData to avoid closure issues
      const data = query?.state?.data;
      if (!data) return 2000; // Keep polling if no data yet
      if (data.status === 'completed' || data.status === 'failed') {
        setPollingActive(false);
        return false; // Stop polling
      }
      return 2000; // Poll every 2 seconds
    },
    staleTime: 0, // Always refetch
  });

  // Use polled data if available, fall back to initial exportJob
  const currentExportJob = statusData || exportJob;

  // Download completed export
  const downloadExport = useCallback(async () => {
    const job = currentExportJob;
    if (!job?.id || job.status !== 'completed') {
      console.error('Export not ready for download');
      return;
    }

    try {
      // Fetch file
      const response = await apiClient.get(
        `/import-export/exports/${job.id}/download`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${job.export_type}_export_${job.id}.${job.file_format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download export:', error);
    }
  }, [currentExportJob]);

  // Cancel export job
  const cancelExport = useCallback(async () => {
    if (!exportJob?.id) return;

    try {
      await apiClient.post(`/import-export/exports/${exportJob.id}/cancel`);
      setPollingActive(false);
    } catch (error) {
      console.error('Failed to cancel export:', error);
    }
  }, [exportJob?.id]);

  return {
    exportJob,
    isCreating: createExport.isPending,
    isPolling,
    isComplete: exportJob?.status === 'completed',
    isFailed: exportJob?.status === 'failed',
    createExport: createExport.mutate,
    downloadExport,
    cancelExport,
  };
};

/**
 * Hook for fetching export history
 */
export const useExportHistory = (options?: { exportType?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['exportHistory', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.exportType) params.append('export_type', options.exportType);
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await apiClient.get(`/import-export/exports?${params.toString()}`);
      return response.data.data; // Unwrap APIResponse
    },
    staleTime: 30000, // 30 second cache
  });
};
