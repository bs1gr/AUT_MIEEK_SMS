import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsExportParams, useAnalyticsExport } from '../useAnalyticsExport';

const apiClient = vi.hoisted(() => vi.fn());
const downloadBlob = vi.hoisted(() => vi.fn());

vi.mock('@/api/api', () => ({ default: apiClient }));
vi.mock('@/utils/downloadFile', () => ({ downloadBlob }));
vi.mock('@/LanguageContext', () => ({ useLanguage: () => ({ language: 'el' }) }));
vi.mock('@/utils/dateTime', () => ({ getStoredDateTimeSettings: () => ({ timeZone: 'Asia/Nicosia' }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

// Plan todo 75 stage 4: the export sends the filters on screen; it used to send none.
describe('useAnalyticsExport', () => {
  beforeEach(() => {
    apiClient.mockReset();
    apiClient.mockResolvedValue({ data: new ArrayBuffer(4) });
    downloadBlob.mockReset();
  });

  it('puts every filter that is set in the query, and nothing for "all"', () => {
    expect(analyticsExportParams('en', 'UTC')).toEqual({ language: 'en', timezone: 'UTC' });
    expect(
      analyticsExportParams('el', 'UTC', { academicYear: 'A', classDivision: '', courseId: null, studentId: 7 })
    ).toEqual({ language: 'el', timezone: 'UTC', academic_year: 'A', student_id: 7 });
  });

  it('sends the filters with the export and saves the file', async () => {
    const { result } = renderHook(() => useAnalyticsExport(), { wrapper });

    result.current.exportExcel({ academicYear: 'B', classDivision: 'B1', courseId: 3 });

    await waitFor(() => expect(downloadBlob).toHaveBeenCalled());
    expect(apiClient).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/analytics/export/excel',
        params: { language: 'el', timezone: 'Asia/Nicosia', academic_year: 'B', class_division: 'B1', course_id: 3 },
        responseType: 'arraybuffer',
      })
    );
    expect(downloadBlob.mock.calls[0][1]).toMatch(/^analytics_dashboard_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
