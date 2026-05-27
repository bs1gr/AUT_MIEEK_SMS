import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { getStoredDateTimeSettings } from '@/utils/dateTime';

/**
 * Hook for exporting analytics data
 */
export function useAnalyticsExport() {
  const { language } = useLanguage();
  const exportDashboardMutation = useMutation({
    mutationFn: async (format: 'pdf' | 'excel' = 'pdf') => {
      try {
        const endpoint = format === 'pdf' ? '/analytics/export/pdf' : '/analytics/export/excel';
        const dateTimeSettings = getStoredDateTimeSettings();
        const urlWithLanguage = `${endpoint}?language=${encodeURIComponent(language)}&timezone=${encodeURIComponent(dateTimeSettings.timeZone)}`;
        console.log('[Analytics Export] Sending to URL with language:', language, 'timezone:', dateTimeSettings.timeZone);

        const response = await apiClient({
          method: 'POST',
          url: urlWithLanguage,
          responseType: 'arraybuffer',
          headers: {
            'Accept-Language': language === 'el' ? 'el-GR' : 'en-US',
          },
        });
        console.log('[Analytics Export] Response received for', format);

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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to export';
        throw new Error(`Failed to export as ${format}: ${message}`);
      }
    },
  });

  return {
    exportPDF: () => exportDashboardMutation.mutate('pdf'),
    exportExcel: () => exportDashboardMutation.mutate('excel'),
    isExporting: exportDashboardMutation.isPending,
    exportError: exportDashboardMutation.error instanceof Error
      ? exportDashboardMutation.error.message
      : null,
  };
}
