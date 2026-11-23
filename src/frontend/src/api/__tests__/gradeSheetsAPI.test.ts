import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

import apiClient from '../api';
import { gradeSheetsAPI } from '../gradeSheetsAPI';

const get = (apiClient as unknown as { get: ReturnType<typeof vi.fn> }).get;

describe('gradeSheetsAPI', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('asks for a sheet by kind, and for one assessment by its key', async () => {
    get.mockResolvedValue({ data: { kind: 'matrix', rows: [] } });

    await gradeSheetsAPI.sheet(7, 'matrix', 'left out');
    expect(get).toHaveBeenLastCalledWith('/grade-sheets/course/7', { params: { kind: 'matrix' } });

    await gradeSheetsAPI.sheet(7, 'assessment', 'final|τελικη');
    expect(get).toHaveBeenLastCalledWith('/grade-sheets/course/7', {
      params: { kind: 'assessment', assessment: 'final|τελικη' },
    });
  });

  it('unwraps the {success, data} envelope, and only that', async () => {
    get.mockResolvedValueOnce({ data: { success: true, data: { enrolled: 2, assessments: [] } } });
    expect(await gradeSheetsAPI.assessments(7)).toEqual({ enrolled: 2, assessments: [] });

    get.mockResolvedValueOnce({ data: { enrolled: 3, assessments: [] } });
    expect(await gradeSheetsAPI.assessments(7)).toEqual({ enrolled: 3, assessments: [] });
    expect(get).toHaveBeenLastCalledWith('/grade-sheets/course/7/assessments');
  });

  it("downloads under the server's file name, or a fallback when the header cannot be read", async () => {
    const blob = new Blob(['x']);
    get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename=grade_sheet_MATH_matrix_20261123.xlsx' },
    });

    const named = await gradeSheetsAPI.exportFile(7, 'excel', { kind: 'matrix', lang: 'el' });

    expect(named.filename).toBe('grade_sheet_MATH_matrix_20261123.xlsx');
    expect(named.blob).toBe(blob);
    expect(get).toHaveBeenLastCalledWith('/grade-sheets/course/7/export/excel', {
      params: { kind: 'matrix', lang: 'el' },
      responseType: 'blob',
    });

    get.mockResolvedValueOnce({ data: blob, headers: {} });
    const fallback = await gradeSheetsAPI.exportFile(7, 'pdf', { kind: 'assessment', assessment: 'final|τελικη' });
    expect(fallback.filename).toBe('grade_sheet_7_assessment.pdf');
    expect(get).toHaveBeenLastCalledWith('/grade-sheets/course/7/export/pdf', {
      params: { kind: 'assessment', assessment: 'final|τελικη' },
      responseType: 'blob',
    });
  });
});
