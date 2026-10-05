/**
 * React Query hooks for the SMTP settings endpoints (/import-export/settings/email).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/api';
import type { APIResponse, EmailConfig } from '../types/email';

const API_BASE = '/import-export';

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
