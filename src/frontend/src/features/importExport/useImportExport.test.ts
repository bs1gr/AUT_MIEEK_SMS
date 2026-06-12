import { renderHook } from '@testing-library/react';
import { useImportExport } from './useImportExport';

describe('useImportExport', () => {
  it('returns initial state (skeleton)', () => {
    const { result } = renderHook(() => useImportExport());
    expect(result.current.importJobs).toEqual([]);
    expect(result.current.exportJobs).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
