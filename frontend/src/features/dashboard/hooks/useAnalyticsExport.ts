import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/api';

/**
 * Hook for exporting analytics data
 */
export function useAnalyticsExport() {
  // TODO: Add notification support when useNotificationStore is available
  // const { addNotification } = useNotificationStore();

  const exportDashboardMutation = useMutation({
    mutationFn: async (format: 'pdf' | 'excel' = 'pdf') => {
      try {
        const endpoint = format === 'pdf' ? '/analytics/export/pdf' : '/analytics/export/excel';

        const response = await apiClient({
          method: 'POST',
          url: endpoint,
          responseType: 'arraybuffer',
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        const filename = `analytics_dashboard_${timestamp}.${extension}`;

        // Create blob and trigger download
        const blob = new Blob([response.data], {
          type: format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, format, filename };
      } catch (error: any) {
        throw new Error(error.response?.data?.message || `Failed to export as ${format}`);
      }
    },
    // TODO: Add notification callbacks when useNotificationStore is available
  });

  return {
    exportPDF: () => exportDashboardMutation.mutate('pdf'),
    exportExcel: () => exportDashboardMutation.mutate('excel'),
    isExporting: exportDashboardMutation.isPending,
  };
}
