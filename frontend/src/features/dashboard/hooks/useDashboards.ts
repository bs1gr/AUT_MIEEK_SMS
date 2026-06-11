import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import apiClient from '@/api/api';

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  configuration: {
    charts: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ErrorResponse {
  error?: { message: string };
  message?: string;
}

/**
 * Hook for managing custom dashboards
 */
export function useDashboards() {
  const queryClient = useQueryClient();

  // Fetch all dashboards for current user
  const {
    data: dashboards = [],
    isLoading: isLoadingDashboards,
    error: dashboardsError,
    refetch: refetchDashboards,
  } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/dashboards');
        return response.data?.data || [];
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
        return [];
      }
    },
  });

  // Fetch default dashboard
  const {
    data: defaultDashboard,
    isLoading: isLoadingDefault,
  } = useQuery({
    queryKey: ['defaultDashboard'],
    enabled: !isLoadingDashboards && dashboards.length > 0,
    queryFn: async () => {
      try {
        const dashboardsList = queryClient.getQueryData<Dashboard[]>(['dashboards']) || dashboards;
        return dashboardsList.find((d) => d.is_default) || null;
      } catch (error) {
        console.error('Failed to fetch default dashboard:', error);
        return null;
      }
    },
  });

  // Create dashboard mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      configuration: { charts: string[] };
    }) => {
      try {
        const response = await apiClient.post('/dashboards', data);
        return response.data?.data;
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.message || 'Failed to create dashboard';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['defaultDashboard'] });
    },
  });

  // Update dashboard mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        description?: string;
        configuration?: { charts: string[] };
      };
    }) => {
      try {
        const response = await apiClient.put(`/dashboards/${id}`, data);
        return response.data?.data;
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.message || 'Failed to update dashboard';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['defaultDashboard'] });
    },
  });

  // Delete dashboard mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiClient.delete(`/dashboards/${id}`);
        return { success: true };
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.message || 'Failed to delete dashboard';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['defaultDashboard'] });
    },
  });

  // Set default dashboard mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiClient.post(`/dashboards/${id}/set-default`);
        return response.data?.data;
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.message || 'Failed to set default dashboard';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['defaultDashboard'] });
    },
  });

  return {
    dashboards,
    defaultDashboard,
    isLoadingDashboards,
    isLoadingDefault,
    dashboardsError,
    refetchDashboards,
    createDashboard: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message,
    updateDashboard: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message,
    deleteDashboard: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message,
    setDefaultDashboard: setDefaultMutation.mutate,
    isSettingDefault: setDefaultMutation.isPending,
    setDefaultError: setDefaultMutation.error?.message,
  };
}
