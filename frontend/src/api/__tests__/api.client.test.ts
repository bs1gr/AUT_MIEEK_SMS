import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios BEFORE importing the module under test
vi.mock('axios', () => {
  const handlers: any = {};
  const instance: any = {
    interceptors: {
      request: {
        use: (onFulfilled: any, onRejected?: any) => {
          handlers.reqFulfilled = onFulfilled;
          handlers.reqRejected = onRejected;
        },
      },
      response: {
        use: (onFulfilled: any, onRejected?: any) => {
          handlers.resFulfilled = onFulfilled;
          handlers.resRejected = onRejected;
        },
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  const axiosDefault: any = {
    create: vi.fn(() => instance),
    get: vi.fn(), // used by getHealthStatus
    __instance: instance,
    __handlers: handlers,
  };
  return { default: axiosDefault };
});

import axios from 'axios';
import apiClient, {
  studentsAPI,
  coursesAPI,
  checkAPIHealth,
  getHealthStatus,
  adminOpsAPI,
  importAPI,
  gradesAPI,
  analyticsAPI,
  formatDateForAPI,
  attendanceAPI,
} from '../api';
import { formatLocalDate } from '@/utils/date';

describe('API client - interceptors and utilities', () => {
  beforeEach(() => {
    // reset mocks between tests
    (axios as any).__instance.get.mockReset();
    (axios as any).__instance.post.mockReset();
    (axios as any).__instance.put.mockReset();
    (axios as any).__instance.delete.mockReset();
    (axios as any).get.mockReset?.();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as any).mockRestore?.();
  });

  it('response interceptor logs and rejects 404/500 and network errors', async () => {
    const { __handlers } = axios as any;
    expect(__handlers.resRejected).toBeTypeOf('function');

    // 404
    const err404 = { response: { status: 404, data: { detail: 'not found' } } };
    await expect(__handlers.resRejected(err404)).rejects.toBe(err404);

    // 500
    const err500 = { response: { status: 500, data: { detail: 'server down' } } };
    await expect(__handlers.resRejected(err500)).rejects.toBe(err500);

    // request present but no response
    const errNetwork = { request: {} };
    await expect(__handlers.resRejected(errNetwork)).rejects.toBe(errNetwork);

    // generic
    const errGeneric = { message: 'boom' };
    await expect(__handlers.resRejected(errGeneric)).rejects.toBe(errGeneric);

    expect(console.error).toHaveBeenCalled();
  });

  it('studentsAPI.getAll normalizes items/results/array', async () => {
    // items
    (axios as any).__instance.get.mockResolvedValueOnce({ data: { items: [ { id: 1 }, { id: 2 } ] } });
    expect(await studentsAPI.getAll()).toEqual([{ id: 1 }, { id: 2 }]);

    // plain array
    (axios as any).__instance.get.mockResolvedValueOnce({ data: [ { id: 3 } ] });
    expect(await studentsAPI.getAll()).toEqual([{ id: 3 }]);

    // results
    (axios as any).__instance.get.mockResolvedValueOnce({ data: { results: [ { id: 4 } ] } });
    expect(await studentsAPI.getAll()).toEqual([{ id: 4 }]);

    // fallback to []
    (axios as any).__instance.get.mockResolvedValueOnce({ data: { foo: 'bar' } });
    expect(await studentsAPI.getAll()).toEqual([]);
  });

  it('checkAPIHealth returns ok or error', async () => {
    (axios as any).__instance.get.mockResolvedValueOnce({ data: { ping: 'pong' } });
    await expect(checkAPIHealth()).resolves.toEqual({ status: 'ok', data: { ping: 'pong' } });

    const err = new Error('nope');
    (axios as any).__instance.get.mockRejectedValueOnce(err);
    const res = await checkAPIHealth();
    expect(res.status).toBe('error');
    expect(res.error).toContain('nope');
  });

  it('getHealthStatus queries /health at root of baseURL', async () => {
    (axios as any).get.mockResolvedValueOnce({ data: { status: 'ok' } });
    const data = await getHealthStatus();
    expect(data).toEqual({ status: 'ok' });
    // API_BASE_URL defaults to '/api/v1' in tests → base URL stripped → ends with '/health'
    const [url, opts] = (axios as any).get.mock.calls[0];
    expect(url).toMatch(/\/health$/);
    expect(opts).toMatchObject({ timeout: 10000 });
  });

  it('adminOps.restoreBackup posts multipart form-data', async () => {
    const file = new Blob(['hello'], { type: 'text/plain' }) as any;
    (axios as any).__instance.post.mockResolvedValueOnce({ data: { ok: true } });
    const resp = await adminOpsAPI.restoreBackup(file);
    expect(resp).toEqual({ ok: true });
    const [, form, config] = (axios as any).__instance.post.mock.calls[0];
    expect(config.headers['Content-Type']).toContain('multipart/form-data');
    // basic sanity: ensure FormData was passed
    expect(form instanceof FormData).toBe(true);
  });

  it('importAPI.uploadFile posts multipart form-data with type', async () => {
    const file = new Blob(['hello'], { type: 'text/plain' }) as any;
    (axios as any).__instance.post.mockResolvedValueOnce({ data: { imported: 1 } });
    const resp = await importAPI.uploadFile(file, 'students');
    expect(resp).toEqual({ imported: 1 });
    const [path, , config] = (axios as any).__instance.post.mock.calls[0];
    expect(path).toBe('/imports/upload');
    expect(config.headers['Content-Type']).toContain('multipart/form-data');
  });

  it('gradesAPI.calculateAverage computes weighted average', async () => {
    const spy = vi.spyOn(gradesAPI, 'getByStudent').mockResolvedValue([
      { course_id: 10, grade: 18, max_grade: 20, weight: 40 }, // 90% * 40
      { course_id: 10, grade: 14, max_grade: 20, weight: 60 }, // 70% * 60
      { course_id: 11, grade: 20, max_grade: 20, weight: 100 },
    ] as any);
    const avg = await gradesAPI.calculateAverage(1, 10);
    // weighted: (90*40 + 70*60) / (40+60) = (3600+4200)/100 = 78
    expect(avg).toBeCloseTo(78, 5);
    spy.mockRestore();
  });

  it('analyticsAPI.getDashboardStats aggregates counts', async () => {
    const sSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValue([
      { id: 1, is_active: true },
      { id: 2, is_active: false },
      { id: 3, is_active: true },
    ] as any);
    const cSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValue([
      { id: 10 }, { id: 11 }
    ] as any);
    const stats = await analyticsAPI.getDashboardStats();
    expect(stats).toEqual({ totalStudents: 3, activeStudents: 2, totalCourses: 2, inactiveStudents: 1 });
    sSpy.mockRestore();
    cSpy.mockRestore();
  });

  it('analyticsAPI.getAttendanceStats computes totals and rate (all students)', async () => {
    const sSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValue([
      { id: 1 }, { id: 2 }
    ] as any);
    const aSpy = vi.spyOn(attendanceAPI, 'getByStudent')
      .mockResolvedValueOnce([
        { status: 'Present' }, { status: 'Absent' }, { status: 'Excused' }
      ] as any)
      .mockResolvedValueOnce([
        { status: 'Present' }, { status: 'Present' }, { status: 'Late' }
      ] as any);

    const res = await analyticsAPI.getAttendanceStats();
    expect(res.total).toBe(6);
    expect(res.present).toBe(3);
    expect(res.absent).toBe(1);
    expect(res.excused).toBe(1);
    expect(res.late).toBe(1);
    expect(res.attendanceRate).toBe('66.67'); // (present+excused)=4 / 6
    sSpy.mockRestore();
    aSpy.mockRestore();
  });

  it('analyticsAPI.getGradeStats returns zeros when empty', async () => {
    const sSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValue([] as any);
    const res = await analyticsAPI.getGradeStats();
    expect(res).toEqual({ count: 0, average: 0, highest: 0, lowest: 0 });
    sSpy.mockRestore();
  });

  it('analyticsAPI.getGradeStats computes averages for student+course', async () => {
    const gSpy = vi.spyOn(gradesAPI, 'getByStudent').mockResolvedValue([
      { grade: 18, max_grade: 20, course_id: 10 }, // 90
      { grade: 12, max_grade: 20, course_id: 10 }, // 60
      { grade: 16, max_grade: 20, course_id: 11 }, // 80
    ] as any);
    const res = await analyticsAPI.getGradeStats(1, 10);
    expect(res.count).toBe(2);
    expect(res.average).toBe('75.00');
    expect(res.highest).toBe('90.00');
    expect(res.lowest).toBe('60.00');
    gSpy.mockRestore();
  });

  it('formatDateForAPI proxies formatLocalDate', () => {
    const d = new Date('2024-03-01T12:34:56Z');
    expect(formatDateForAPI(d)).toBe(formatLocalDate(d));
  });
});
