import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// test helper types made global so assertions and beforeEach helpers can reference them
type MockFn = ReturnType<typeof vi.fn>;
type Handlers = {
  reqFulfilled?: (input: unknown) => unknown;
  reqRejected?: (err: unknown) => unknown;
  resFulfilled?: (input: unknown) => unknown;
  resRejected?: (err: unknown) => unknown;
};
type AxiosInstanceMock = {
  interceptors: {
    request: { use: (onFulfilled: (input: unknown) => unknown, onRejected?: (err: unknown) => unknown) => void };
    response: { use: (onFulfilled: (input: unknown) => unknown, onRejected?: (err: unknown) => unknown) => void };
  };
  get: MockFn;
  post: MockFn;
  put: MockFn;
  delete: MockFn;
};

// Mock axios BEFORE importing the module under test
vi.mock('axios', () => {
  type Handlers = {
    reqFulfilled?: (input: unknown) => unknown;
    reqRejected?: (err: unknown) => unknown;
    resFulfilled?: (input: unknown) => unknown;
    resRejected?: (err: unknown) => unknown;
  };
  const handlers: Handlers = {};
  type MockFn = ReturnType<typeof vi.fn>;
  const instance = {
    interceptors: {
      request: {
        use: (onFulfilled: (input: unknown) => unknown, onRejected?: (err: unknown) => unknown) => {
          handlers.reqFulfilled = onFulfilled;
          handlers.reqRejected = onRejected;
        },
      },
      response: {
        use: (onFulfilled: (input: unknown) => unknown, onRejected?: (err: unknown) => unknown) => {
          handlers.resFulfilled = onFulfilled;
          handlers.resRejected = onRejected;
        },
      },
    },
    get: vi.fn() as unknown as MockFn,
    post: vi.fn() as unknown as MockFn,
    put: vi.fn() as unknown as MockFn,
    delete: vi.fn() as unknown as MockFn,
  };
  const axiosDefault = {
    create: vi.fn(() => instance) as unknown as MockFn,
    get: vi.fn() as unknown as MockFn, // used by getHealthStatus
    __instance: instance,
    __handlers: handlers,
  };
  return { default: axiosDefault };
});

import axios from 'axios';
import {
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
import type { Grade, Student, Course, Attendance } from '@/types';
import { formatLocalDate } from '@/utils/date';

describe('API client - interceptors and utilities', () => {
  beforeEach(() => {
    // reset mocks between tests
    const mockAxios = axios as unknown as { __instance: AxiosInstanceMock; get?: MockFn };
    mockAxios.__instance.get.mockReset();
    mockAxios.__instance.post.mockReset();
    mockAxios.__instance.put.mockReset();
    mockAxios.__instance.delete.mockReset();
    mockAxios.get?.mockReset?.();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('response interceptor logs and rejects 404/500 and network errors', async () => {
    const { __handlers } = axios as unknown as { __handlers: Handlers };
    expect(__handlers.resRejected).toBeTypeOf('function');
    // Spy console.error so we can assert it's called by the interceptor
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // 404
    const err404 = { response: { status: 404, data: { detail: 'not found' } } };
    await expect(__handlers.resRejected!(err404)).rejects.toBe(err404);

    // 500
    const err500 = { response: { status: 500, data: { detail: 'server down' } } };
    await expect(__handlers.resRejected!(err500)).rejects.toBe(err500);

    // request present but no response
    const errNetwork = { request: {} };
    await expect(__handlers.resRejected!(errNetwork)).rejects.toBe(errNetwork);

    // generic
    const errGeneric = { message: 'boom' };
    await expect(__handlers.resRejected!(errGeneric)).rejects.toBe(errGeneric);

    expect(console.error).toHaveBeenCalled();
  });

  it('studentsAPI.getAll normalizes items/results/array', async () => {
    // items
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockResolvedValueOnce({ data: { items: [ { id: 1 }, { id: 2 } ] } } as unknown);
    expect(await studentsAPI.getAll()).toEqual([{ id: 1 }, { id: 2 }]);

    // plain array
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockResolvedValueOnce({ data: [ { id: 3 } ] } as unknown);
    expect(await studentsAPI.getAll()).toEqual([{ id: 3 }]);

    // results
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockResolvedValueOnce({ data: { results: [ { id: 4 } ] } } as unknown);
    expect(await studentsAPI.getAll()).toEqual([{ id: 4 }]);

    // fallback to []
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockResolvedValueOnce({ data: { foo: 'bar' } } as unknown);
    expect(await studentsAPI.getAll()).toEqual([]);
  });

  it('checkAPIHealth returns ok or error', async () => {
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockResolvedValueOnce({ data: { ping: 'pong' } } as unknown);
    await expect(checkAPIHealth()).resolves.toEqual({ status: 'ok', data: { ping: 'pong' } });

    const err = new Error('nope');
    (axios as unknown as { __instance: { get: MockFn } }).__instance.get.mockRejectedValueOnce(err);
    const res = await checkAPIHealth();
    expect(res.status).toBe('error');
    expect(res.error).toContain('nope');
  });

  it('getHealthStatus queries /health at root of baseURL', async () => {
    (axios as unknown as { get: MockFn }).get.mockResolvedValueOnce({ data: { status: 'ok' } } as unknown);
    const data = await getHealthStatus();
    expect(data).toEqual({ status: 'ok' });
    // API_BASE_URL defaults to '/api/v1' in tests → base URL stripped → ends with '/health'
    const [url, opts] = (axios as unknown as { get: MockFn }).get.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toMatch(/\/health$/);
    expect(opts).toMatchObject({ timeout: 10000 });
  });

  it('adminOps.restoreBackup posts multipart form-data', async () => {
    // use File (name + lastModified available) to match client expectations
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    (axios as unknown as { __instance: { post: MockFn } }).__instance.post.mockResolvedValueOnce({ data: { ok: true } } as unknown);
    const resp = await adminOpsAPI.restoreBackup(file);
    expect(resp).toEqual({ ok: true });
    const [, form, config] = (axios as unknown as { __instance: { post: MockFn } }).__instance.post.mock.calls[0] as [unknown, FormData, Record<string, unknown>];
    const headers = (config as Record<string, unknown>)['headers'] as Record<string, unknown> | undefined;
    expect(String(headers?.['Content-Type'])).toContain('multipart/form-data');
    // basic sanity: ensure FormData was passed
    expect(form instanceof FormData).toBe(true);
  });

  it('importAPI.uploadFile posts multipart form-data with type', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    (axios as unknown as { __instance: { post: MockFn } }).__instance.post.mockResolvedValueOnce({ data: { imported: 1 } } as unknown);
    const resp = await importAPI.uploadFile(file, 'students');
    expect(resp).toEqual({ imported: 1 });
    const [path, , config] = (axios as unknown as { __instance: { post: MockFn } }).__instance.post.mock.calls[0] as [string, unknown, Record<string, unknown>];
    expect(path).toBe('/imports/upload');
    const uploadHeaders = (config as Record<string, unknown>)['headers'] as Record<string, unknown> | undefined;
    expect(String(uploadHeaders?.['Content-Type'])).toContain('multipart/form-data');
  });

  it('gradesAPI.calculateAverage computes weighted average', async () => {
    const spy = vi.spyOn(gradesAPI, 'getByStudent').mockResolvedValue([
      { course_id: 10, grade: 18, max_grade: 20, weight: 40 }, // 90% * 40
      { course_id: 10, grade: 14, max_grade: 20, weight: 60 }, // 70% * 60
      { course_id: 11, grade: 20, max_grade: 20, weight: 100 },
    ] as unknown as Grade[]);
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
    ] as unknown as Student[]);
    const cSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValue([
      { id: 10 }, { id: 11 }
    ] as unknown as Course[]);
    const stats = await analyticsAPI.getDashboardStats();
    expect(stats).toEqual({ totalStudents: 3, activeStudents: 2, totalCourses: 2, inactiveStudents: 1 });
    sSpy.mockRestore();
    cSpy.mockRestore();
  });

  it('analyticsAPI.getAttendanceStats computes totals and rate (all students)', async () => {
    const sSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValue([
      { id: 1 }, { id: 2 }
    ] as unknown as Student[]);
    const aSpy = vi.spyOn(attendanceAPI, 'getByStudent')
      .mockResolvedValueOnce([
        { status: 'Present' }, { status: 'Absent' }, { status: 'Excused' }
      ] as unknown as Attendance[])
      .mockResolvedValueOnce([
        { status: 'Present' }, { status: 'Present' }, { status: 'Late' }
      ] as unknown as Attendance[]);

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
    const sSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValue([] as unknown as Student[]);
    const res = await analyticsAPI.getGradeStats();
    expect(res).toEqual({ count: 0, average: 0, highest: 0, lowest: 0 });
    sSpy.mockRestore();
  });

  it('analyticsAPI.getGradeStats computes averages for student+course', async () => {
    const gSpy = vi.spyOn(gradesAPI, 'getByStudent').mockResolvedValue([
      { grade: 18, max_grade: 20, course_id: 10 }, // 90
      { grade: 12, max_grade: 20, course_id: 10 }, // 60
      { grade: 16, max_grade: 20, course_id: 11 }, // 80
    ] as unknown as Grade[]);
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
