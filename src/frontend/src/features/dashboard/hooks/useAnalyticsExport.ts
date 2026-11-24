import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { getStoredDateTimeSettings } from '@/utils/dateTime';
import { downloadBlob } from '@/utils/downloadFile';

/**
 * What the Analytics page shows, for the export to follow (plan todo 75 stage 4): the class, the
 * division and the course; in the student view, the student. Empty means "all".
 */
export interface AnalyticsExportFilters {
  academicYear?: string;
  classDivision?: string;
  courseId?: number | null;
  studentId?: number | null;
}

type ExportFormat = 'pdf' | 'excel';

/** The export's query: the language, the time zone and every filter that is set. */
export const analyticsExportParams = (
  language: string,
  timeZone: string,
  filters: AnalyticsExportFilters = {}
): Record<string, string | number> => {
  const params: Record<string, string | number> = { language, timezone: timeZone };
  if (filters.academicYear) params.academic_year = filters.academicYear;
  if (filters.classDivision) params.class_division = filters.classDivision;
  if (filters.courseId) params.course_id = filters.courseId;
  if (filters.studentId) params.student_id = filters.studentId;
  return params;
};

/**
 * Hook for exporting analytics data
 */
export function useAnalyticsExport() {
  const { language } = useLanguage();
  const exportDashboardMutation = useMutation({
    mutationFn: async ({ format, filters }: { format: ExportFormat; filters?: AnalyticsExportFilters }) => {
      try {
        const endpoint = format === 'pdf' ? '/analytics/export/pdf' : '/analytics/export/excel';
        const dateTimeSettings = getStoredDateTimeSettings();

        const response = await apiClient({
          method: 'POST',
          url: endpoint,
          params: analyticsExportParams(language, dateTimeSettings.timeZone, filters),
          responseType: 'arraybuffer',
          headers: {
            'Accept-Language': language === 'el' ? 'el-GR' : 'en-US',
          },
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

        await downloadBlob(blob, filename);

        return { success: true, format, filename };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to export';
        throw new Error(`Failed to export as ${format}: ${message}`, { cause: error });
      }
    },
  });

  return {
    exportPDF: (filters?: AnalyticsExportFilters) => exportDashboardMutation.mutate({ format: 'pdf', filters }),
    exportExcel: (filters?: AnalyticsExportFilters) => exportDashboardMutation.mutate({ format: 'excel', filters }),
    isExporting: exportDashboardMutation.isPending,
    exportError: exportDashboardMutation.error instanceof Error
      ? exportDashboardMutation.error.message
      : null,
  };
}
