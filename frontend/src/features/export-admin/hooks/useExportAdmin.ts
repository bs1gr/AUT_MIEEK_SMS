/**
 * Custom hooks for export admin API calls
 * Uses React Query for data management and caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/api';
import {
  ExportJob,
  CreateExportRequest,
  ExportSchedule,
  CreateScheduleRequest,
  ExportMetrics,
  ExportSettings,
  EmailConfig,
  PaginatedResponse,
  PaginationParams,
  APIResponse,
} from '../types/export';

const API_BASE = '/api/v1/import-export';

// ===== Export Jobs Hooks =====

export const useExportJobs = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['exportJobs', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.skip !== undefined) query.append('skip', params.skip.toString());
      if (params?.limit !== undefined) query.append('limit', params.limit.toString());
      if (params?.sort_by) query.append('sort_by', params.sort_by);
      if (params?.sort_order) query.append('sort_order', params.sort_order);

      const response = await apiClient.get<APIResponse<PaginatedResponse<ExportJob>>>(
        `${API_BASE}/exports?${query.toString()}`
      );
      return response.data;
    },
  });
};

export const useExportJob = (jobId: string | null) => {
  return useQuery({
    queryKey: ['exportJob', jobId],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportJob>>(
        `${API_BASE}/exports/${jobId}`
      );
      return response.data;
    },
    enabled: !!jobId,
  });
};

export const useCreateExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateExportRequest) => {
      const response = await apiClient.post<APIResponse<{ job_id: string }>>(
        `${API_BASE}/exports`,
        request
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportJobs'] });
    },
  });
};

export const useDeleteExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      await apiClient.delete(`${API_BASE}/exports/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportJobs'] });
    },
  });
};

export const useDownloadExport = () => {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiClient.get<Blob>(
        `${API_BASE}/exports/${jobId}/download`,
        { responseType: 'blob' }
      );
      return response;
    },
  });
};

export const useRerunExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiClient.post<APIResponse<{ job_id: string }>>(
        `${API_BASE}/exports/${jobId}/rerun`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportJobs'] });
    },
  });
};

// ===== Export Schedules Hooks =====

export const useExportSchedules = () => {
  return useQuery({
    queryKey: ['exportSchedules'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportSchedule[]>>(
        `${API_BASE}/schedules`
      );
      return response.data;
    },
  });
};

export const useExportSchedule = (scheduleId: string | null) => {
  return useQuery({
    queryKey: ['exportSchedule', scheduleId],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportSchedule>>(
        `${API_BASE}/schedules/${scheduleId}`
      );
      return response.data;
    },
    enabled: !!scheduleId,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateScheduleRequest) => {
      const response = await apiClient.post<APIResponse<ExportSchedule>>(
        `${API_BASE}/schedules`,
        request
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportSchedules'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, data }: { scheduleId: string; data: Partial<ExportSchedule> }) => {
      const response = await apiClient.put<APIResponse<ExportSchedule>>(
        `${API_BASE}/schedules/${scheduleId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportSchedules'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiClient.delete(`${API_BASE}/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportSchedules'] });
    },
  });
};

export const useToggleSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) => {
      const response = await apiClient.put<APIResponse<ExportSchedule>>(
        `${API_BASE}/schedules/${scheduleId}/toggle`,
        { is_active: isActive }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportSchedules'] });
    },
  });
};

// ===== Export Metrics Hooks =====

export const useExportMetrics = (days: number = 7) => {
  return useQuery({
    queryKey: ['exportMetrics', days],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportMetrics>>(
        `${API_BASE}/metrics?days=${days}`
      );
      return response.data;
    },
  });
};

export const useExportPerformanceStats = () => {
  return useQuery({
    queryKey: ['exportPerformanceStats'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<any>>(
        `${API_BASE}/metrics/performance/stats`
      );
      return response.data;
    },
  });
};

export const useSlowestExports = (limit: number = 10) => {
  return useQuery({
    queryKey: ['slowestExports', limit],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportJob[]>>(
        `${API_BASE}/metrics/slowest?limit=${limit}`
      );
      return response.data;
    },
  });
};

// ===== Export Settings Hooks =====

export const useExportSettings = () => {
  return useQuery({
    queryKey: ['exportSettings'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportSettings>>(
        `${API_BASE}/settings`
      );
      return response.data;
    },
  });
};

export const useUpdateExportSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<ExportSettings>) => {
      const response = await apiClient.put<APIResponse<ExportSettings>>(
        `${API_BASE}/settings`,
        settings
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportSettings'] });
    },
  });
};

// ===== Email Config Hooks =====

export const useEmailConfig = () => {
  return useQuery({
    queryKey: ['emailConfig'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<EmailConfig>>(
        `${API_BASE}/settings/email`
      );
      return response.data;
    },
  });
};

export const useUpdateEmailConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<EmailConfig>) => {
      const response = await apiClient.put<APIResponse<EmailConfig>>(
        `${API_BASE}/settings/email`,
        config
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConfig'] });
    },
  });
};

export const useTestEmailConfig = () => {
  return useMutation({
    mutationFn: async (recipientEmail: string) => {
      const response = await apiClient.post<APIResponse<{ success: boolean }>>(
        `${API_BASE}/settings/email/test`,
        { recipient_email: recipientEmail }
      );
      return response.data;
    },
  });
};

// ===== Polling Hook for Job Progress =====

export const useExportJobProgress = (jobId: string | null, pollInterval: number = 2000) => {
  return useQuery({
    queryKey: ['exportJobProgress', jobId],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<ExportJob>>(
        `${API_BASE}/exports/${jobId}`
      );
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when export is complete or failed
      if (data?.data?.status === 'completed' || data?.data?.status === 'failed') {
        return false;
      }
      return pollInterval;
    },
  });
};

// ===== Refresh Hook =====

export const useRefreshExports = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['exportJobs'] });
    queryClient.invalidateQueries({ queryKey: ['exportSchedules'] });
    queryClient.invalidateQueries({ queryKey: ['exportMetrics'] });
  };
};
