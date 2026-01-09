/**
 * Fetch current user with retry logic (for AuthContext auto-login)
 */
export async function fetchMeWithRetry(retries = 2, delayMs = 500): Promise<UserAccount> {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await adminUsersAPI.getCurrentUser();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
  throw lastErr;
}
/**
 * API Integration Client for Student Management System
 * Connects React Frontend to FastAPI Backend
 * TypeScript version with full type safety
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import authService from '@/services/authService';
import { formatLocalDate } from '@/utils/date';
import { normalizeResponseToArray } from '@/utils/normalize';
import type {
  Student,
  Course,
  CourseEnrollment,
  Grade,
  Attendance,
  Highlight,
  PaginatedResponse,
  ImportResponse,
  EnrollmentResponse,
  FinalGrade,
  StudentFormData,
  CourseFormData,
  GradeFormData,
  AttendanceFormData,
  UserAccount,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ImportPreviewItem {
  row_number: number;
  action: string;
  data: Record<string, unknown>;
  validation_status: string;
  issues?: string[];
}

export interface ImportPreviewResponse {
  total_rows: number;
  valid_rows: number;
  rows_with_warnings: number;
  rows_with_errors: number;
  items: ImportPreviewItem[];
  can_proceed: boolean;
  estimated_duration_seconds?: number;
  summary?: Record<string, number>;
  [key: string]: unknown;
}

export interface ImportPreviewParams {
  type: 'students' | 'courses';
  files?: File | File[] | null;
  jsonText?: string;
  allowUpdates?: boolean;
  skipDuplicates?: boolean;
}

export interface ImportJobResponse {
  job_id?: string;
  status?: JobStatus;
  message?: string;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface JobDetail {
  id: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  result?: unknown;
  error?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Base API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
console.warn('[API Client] VITE_API_URL env var:', import.meta.env.VITE_API_URL);
console.warn('[API Client] Using API_BASE_URL:', API_BASE_URL);
if (!import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not defined. Using default relative URL: /api/v1');
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => attachAuthHeader(config),
  (error) => {
    return Promise.reject(error);
  }
);

// Exported helper so this behavior can be unit-tested without relying on axios internals
export function attachAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!config) return config;

  try {
    // Skip auth header for login/refresh endpoints (they don't need it)
    const url = config.url || '';
    if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh')) {
      console.warn('[API] Skipping auth header for:', url);
      return config;
    }

    const token = authService.getAccessToken();
    if (token) {
      console.warn('[API] Attaching auth header for:', url);
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else if (config.headers) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      } else {
        const headers = new AxiosHeaders();
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      }
    } else {
      console.warn('[API] No token available for:', url);
    }
  } catch {
    // ignore
  }
  return config;
}

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Try to refresh access token once on 401, then retry original request
    const originalRequest = (error.config || {}) as AxiosRequestConfig & { _retry?: boolean };
    if (error.response) {
      // If unauthorized and we haven't retried yet, attempt refresh
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        return authService.refreshAccessToken().then((newToken) => {
          if (newToken) {
            if (originalRequest.headers) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return axios(originalRequest);
          }
          return Promise.reject(error);
        }).catch(() => Promise.reject(error));
      }

      // Log other response errors with safe property access
      try {
        const errorData = error.response?.data || {};
        console.error('API Error:', errorData);
      } catch {
        console.error('API Error: Failed to extract error data');
      }
      if (error.response.status === 404) console.error('Resource not found');
      if (error.response.status === 500) console.error('Server error');
    } else if (error.request) {
      console.error('Network Error: No response from server');
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/* eslint-disable testing-library/no-await-sync-queries */
// --- Preflight & dynamic base fallback ----------------------------------------------------
let ORIGINAL_API_BASE_URL: string | undefined = API_BASE_URL;
// previously used for fallback retries; not needed in TypeScript client right now

export async function preflightAPI(): Promise<string> {
  const currentBase = apiClient.defaults?.baseURL || API_BASE_URL;
  const rootBase = (currentBase || '').replace(/\/api\/v1\/?$/i, '');
  const healthUrl = rootBase ? `${rootBase}/health` : '/health';
  try {
    await axios.get(healthUrl, { timeout: 4000 });
    return apiClient.defaults?.baseURL || currentBase;
  } catch {
    if (/^https?:\/\//i.test(ORIGINAL_API_BASE_URL || '')) {
      // Ensure defaults is correctly typed for axios. Use a safe unknown-cast
      // and operate with narrow property checks to avoid 'any'.
      if (!apiClient.defaults) (apiClient as unknown as { defaults?: Record<string, unknown> }).defaults = { baseURL: '/api/v1' } as unknown as Record<string, unknown>;
      (apiClient.defaults as unknown as { baseURL?: string }).baseURL = '/api/v1';
    }
    return apiClient.defaults?.baseURL || '/api/v1';
  }
}

// Test helper to force original base in tests (only active under NODE_ENV === 'test')
export function __test_forceOriginalBase(url: string) {
  if (process.env.NODE_ENV !== 'test') return;
  ORIGINAL_API_BASE_URL = url;
  if (!apiClient.defaults) (apiClient as unknown as { defaults?: Record<string, unknown> }).defaults = { baseURL: url } as unknown as Record<string, unknown>;
  (apiClient.defaults as unknown as { baseURL?: string }).baseURL = url;
}

// ==================== STUDENTS API ====================

export const studentsAPI = {
  // Historically getAll normalized results to return an array of Student.
  // Keep that behaviour for backward compatibility with tests and callers.
  getAll: async (skip = 0, limit = 100): Promise<Student[]> => {
    const response = await apiClient.get('/students/', { params: { skip, limit } });
    const data = response.data as unknown;
    return normalizeResponseToArray<Student>(data);
  },

  getById: async (id: number): Promise<Student> => {
    const response = await apiClient.get<Student>(`/students/${id}`);
    return response.data;
  },

  create: async (data: StudentFormData): Promise<Student> => {
    const response = await apiClient.post<Student>('/students/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<StudentFormData>): Promise<Student> => {
    const response = await apiClient.put<Student>(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/students/${id}`);
    return response.data;
  },

  search: async (query: string): Promise<Student[]> => {
    const response = await apiClient.get<Student[]>('/students/search/', {
      params: { q: query }
    });
    return response.data;
  },
};

// Canonical Control API base (backend mounts control router without /api/v1 prefix)
export const CONTROL_API_BASE = (() => {
  try {
    const root = (API_BASE_URL || '').replace(/\/?api\/?v1\/?$/i, '').replace(/\/$/, '');
    if (!root || root.startsWith('/')) {
      const prefix = root.replace(/\/$/, '');
      const base = `${prefix || ''}/control/api`;
      return base.replace(/\/\/+/g, '/');
    }
    return `${root}/control/api`;
  } catch {
    return '/control/api';
  }
})();

// ==================== COURSES API ====================

export const coursesAPI = {
  // Return array (normalized) to stay compatible with the legacy JS client behaviour
  getAll: async (skip = 0, limit = 100): Promise<Course[]> => {
    const response = await apiClient.get('/courses/', { params: { skip, limit } });
    const data = response.data as unknown;
    return normalizeResponseToArray<Course>(data);
  },

  getById: async (id: number): Promise<Course> => {
    const response = await apiClient.get<Course>(`/courses/${id}`);
    return response.data;
  },

  create: async (data: CourseFormData): Promise<Course> => {
    const response = await apiClient.post<Course>('/courses/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CourseFormData>): Promise<Course> => {
    const response = await apiClient.put<Course>(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/courses/${id}`);
    return response.data;
  },
};

// ==================== ATTENDANCE API ====================

export const attendanceAPI = {
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<Attendance>> => {
    const response = await apiClient.get<PaginatedResponse<Attendance>>('/attendance/', {
      params: { skip, limit }
    });
    return response.data;
  },

  getById: async (id: number): Promise<Attendance> => {
    const response = await apiClient.get<Attendance>(`/attendance/${id}`);
    return response.data;
  },

  create: async (data: AttendanceFormData): Promise<Attendance> => {
    const response = await apiClient.post<Attendance>('/attendance/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<AttendanceFormData>): Promise<Attendance> => {
    const response = await apiClient.put<Attendance>(`/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/attendance/${id}`);
    return response.data;
  },

  getByStudentAndCourse: async (studentId: number, courseId: number): Promise<Attendance[]> => {
    const response = await apiClient.get<Attendance[]>(`/attendance/`, {
      params: { student_id: studentId, course_id: courseId }
    });
    return response.data;
  },

  getByStudent: async (studentId: number): Promise<Attendance[]> => {
    const response = await apiClient.get<Attendance[]>(`/attendance/student/${studentId}`);
    return response.data;
  },

  getByCourse: async (courseId: number): Promise<Attendance[]> => {
    const response = await apiClient.get<Attendance[]>(`/attendance/course/${courseId}`);
    return response.data;
  },

  bulkCreate: async (attendanceRecords: AttendanceFormData[]): Promise<Attendance[]> => {
    const promises = attendanceRecords.map(record =>
      apiClient.post<Attendance>('/attendance/', record)
    );
    const responses = await Promise.all(promises);
    return responses.map(r => r.data);
  },
};

// ==================== GRADES API ====================

export const gradesAPI = {
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<Grade>> => {
    const response = await apiClient.get<PaginatedResponse<Grade>>('/grades/', {
      params: { skip, limit }
    });
    return response.data;
  },

  getById: async (id: number): Promise<Grade> => {
    const response = await apiClient.get<Grade>(`/grades/${id}`);
    return response.data;
  },

  create: async (data: GradeFormData): Promise<Grade> => {
    const response = await apiClient.post<Grade>('/grades/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<GradeFormData>): Promise<Grade> => {
    const response = await apiClient.put<Grade>(`/grades/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/grades/${id}`);
    return response.data;
  },

  getByStudentAndCourse: async (studentId: number, courseId: number): Promise<Grade[]> => {
    const response = await apiClient.get<Grade[]>(`/grades/`, {
      params: { student_id: studentId, course_id: courseId }
    });
    return response.data;
  },

  getByStudent: async (studentId: number): Promise<Grade[]> => {
    const response = await apiClient.get<Grade[]>(`/grades/student/${studentId}`);
    return response.data;
  },

  getByCourse: async (courseId: number): Promise<Grade[]> => {
    const response = await apiClient.get<Grade[]>(`/grades/course/${courseId}`);
    return response.data;
  },

  // Calculate weighted average for a student in a specific course
  calculateAverage: async (studentId: number, courseId: number): Promise<number> => {
    const grades = await gradesAPI.getByStudent(studentId);
    const courseGrades = grades.filter(g => g.course_id === courseId);
    if (courseGrades.length === 0) return 0;
    const totalWeight = courseGrades.reduce((sum, g) => sum + (g.weight || 0), 0);
    const weightedSum = courseGrades.reduce((sum, g) => {
      const percentage = (g.grade / g.max_grade) * 100;
      return sum + (percentage * (g.weight || 0));
    }, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  },
};

// ==================== HIGHLIGHTS API ====================

export const highlightsAPI = {
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<Highlight>> => {
    const response = await apiClient.get<PaginatedResponse<Highlight>>('/highlights/', {
      params: { skip, limit }
    });
    return response.data;
  },

  getById: async (id: number): Promise<Highlight> => {
    const response = await apiClient.get<Highlight>(`/highlights/${id}`);
    return response.data;
  },

  create: async (data: Omit<Highlight, 'id'>): Promise<Highlight> => {
    const response = await apiClient.post<Highlight>('/highlights/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Highlight>): Promise<Highlight> => {
    const response = await apiClient.put<Highlight>(`/highlights/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/highlights/${id}`);
    return response.data;
  },

  getByStudent: async (studentId: number): Promise<Highlight[]> => {
    const response = await apiClient.get<Highlight[]>(`/highlights/student/${studentId}`);
    return response.data;
  },

  getBySemester: async (studentId: number, semester: string): Promise<Highlight[]> => {
    const highlights = await highlightsAPI.getByStudent(studentId);
    return highlights.filter(h => h.semester === semester);
  },
};

// ==================== ANALYTICS API ====================

export const analyticsAPI = {
  getFinalGrade: async (studentId: number, courseId: number): Promise<FinalGrade> => {
    const response = await apiClient.get<FinalGrade>(
      `/analytics/student/${studentId}/course/${courseId}/final-grade`
    );
    return response.data;
  },

  getAllCoursesSummary: async (studentId: number): Promise<unknown> => {
    const response = await apiClient.get<unknown>(
      `/analytics/student/${studentId}/all-courses-summary`
    );
    return response.data;
  },

  getStudentSummary: async (studentId: number): Promise<unknown> => {
    const response = await apiClient.get<unknown>(`/analytics/student/${studentId}/summary`);
    return response.data;
  },

  // Convenience helpers used by frontend analytics tests
  getDashboardStats: async () => {
    const [students, courses] = await Promise.all([
      studentsAPI.getAll(),
      coursesAPI.getAll(0, 1000)
    ]);

    // Normalise students/courses which may be paginated responses or arrays
    const studentsList: Student[] = normalizeResponseToArray<Student>(students);

    const totalStudents = studentsList.length;
    const activeStudents = studentsList.filter((s: Student) => Boolean(s.is_active)).length;
    const totalCourses = normalizeResponseToArray<Course>(courses).length;
    return {
      totalStudents,
      activeStudents,
      totalCourses,
      inactiveStudents: totalStudents - activeStudents
    };
  },

  getAttendanceStats: async (studentId: number | null = null) => {
    let attendanceRecords: Attendance[] = [];
    if (studentId) {
      attendanceRecords = await attendanceAPI.getByStudent(studentId);
    } else {
      const studentsAll = await studentsAPI.getAll();
      const studentsNormalized: Student[] = normalizeResponseToArray<Student>(studentsAll);
      const promises = (studentsNormalized || []).map((s: Student) => attendanceAPI.getByStudent(s.id));
      const results = await Promise.all(promises);
      attendanceRecords = results.flat();
    }
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === 'Present').length;
    const absent = attendanceRecords.filter(a => a.status === 'Absent').length;
    const late = attendanceRecords.filter(a => a.status === 'Late').length;
    const excused = attendanceRecords.filter(a => a.status === 'Excused').length;
    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total > 0 ? ((present + excused) / total * 100).toFixed(2) : 0
    };
  },

  getGradeStats: async (studentId: number | null = null, courseId: number | null = null) => {
    let grades: Grade[] = [];
    if (studentId) {
      grades = await gradesAPI.getByStudent(studentId);
      if (courseId) grades = grades.filter(g => g.course_id === courseId);
    } else if (courseId) {
      grades = await gradesAPI.getByCourse(courseId);
    } else {
      const studentsAll = await studentsAPI.getAll();
      const studentsNormalized: Student[] = normalizeResponseToArray<Student>(studentsAll);
      const promises = (studentsNormalized || []).map((s: Student) => gradesAPI.getByStudent(s.id));
      const results = await Promise.all(promises);
      grades = results.flat();
    }
    if (!grades || grades.length === 0) return { count: 0, average: 0, highest: 0, lowest: 0 };
    const percentages = grades.map(g => (g.grade / g.max_grade) * 100);
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    return {
      count: grades.length,
      average: average.toFixed(2),
      highest: highest.toFixed(2),
      lowest: lowest.toFixed(2)
    };
  }
};

// ==================== ENROLLMENTS API ====================

export const enrollmentsAPI = {
  enrollStudents: async (courseId: number, studentIds: number[]): Promise<EnrollmentResponse> => {
    const response = await apiClient.post<EnrollmentResponse>(
      `/enrollments/course/${courseId}`,
      { student_ids: studentIds }
    );
    return response.data;
  },
  // Mirror the runtime JS API surface - provide several convenience helpers used across the UI
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<CourseEnrollment>> => {
    const response = await apiClient.get<PaginatedResponse<CourseEnrollment>>('/enrollments/', { params: { skip, limit } });
    return response.data;
  },

  getByCourse: async (courseId: number): Promise<CourseEnrollment[]> => {
    const response = await apiClient.get<CourseEnrollment[]>(`/enrollments/course/${courseId}`);
    return response.data;
  },

  getByStudent: async (studentId: number): Promise<CourseEnrollment[]> => {
    const response = await apiClient.get<CourseEnrollment[]>(`/enrollments/student/${studentId}`);
    return response.data;
  },

  getEnrolledStudents: async (courseId: number): Promise<Student[]> => {
    const response = await apiClient.get<Student[]>(`/enrollments/course/${courseId}/students`);
    return response.data;
  },

  // Unenroll a student from a course
  unenrollStudent: async (courseId: number, studentId: number): Promise<void> => {
    await apiClient.delete(`/enrollments/course/${courseId}/student/${studentId}`);
  },
};

// ==================== IMPORTS API ====================

export const importAPI = {
  importStudents: async (file: File): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportResponse>('/imports/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  importCourses: async (file: File): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportResponse>('/imports/courses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  uploadFile: async (file: File | File[], type: 'courses' | 'students'): Promise<ImportResponse> => {
    const formData = new FormData();
    const files = Array.isArray(file) ? file : [file];
    files.forEach((item) => {
      if (item) formData.append('files', item);
    });
    formData.append('import_type', type);
    const response = await apiClient.post<ImportResponse>('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  preview: async ({
    type,
    files,
    jsonText,
    allowUpdates = false,
    skipDuplicates = true,
  }: ImportPreviewParams): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('import_type', type);
    formData.append('allow_updates', allowUpdates ? 'true' : 'false');
    formData.append('skip_duplicates', skipDuplicates ? 'true' : 'false');

    if (files) {
      const list = Array.isArray(files) ? files : [files];
      list.forEach((item) => {
        if (item) formData.append('files', item);
      });
    }

    if (jsonText) {
      formData.append('json_text', jsonText);
    }

    const response = await apiClient.post<ImportPreviewResponse>('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  execute: async ({
    type,
    files,
    jsonText,
    allowUpdates = false,
    skipDuplicates = true,
  }: ImportPreviewParams): Promise<ImportJobResponse> => {
    const formData = new FormData();
    formData.append('import_type', type);
    formData.append('allow_updates', allowUpdates ? 'true' : 'false');
    formData.append('skip_duplicates', skipDuplicates ? 'true' : 'false');

    if (files) {
      const list = Array.isArray(files) ? files : [files];
      list.forEach((item) => {
        if (item) formData.append('files', item);
      });
    }

    if (jsonText) {
      formData.append('json_text', jsonText);
    }

    const response = await apiClient.post<ImportJobResponse>('/imports/execute', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ==================== JOBS API ====================

export const jobsAPI = {
  get: async (jobId: string): Promise<JobDetail> => {
    const response = await apiClient.get<JobDetail>(`/jobs/${jobId}`);
    return response.data;
  },

  list: async (): Promise<JobDetail[] | PaginatedResponse<JobDetail>> => {
    const response = await apiClient.get<JobDetail[] | PaginatedResponse<JobDetail>>('/jobs');
    return response.data;
  },
};

// ==================== SESSION EXPORT/IMPORT API ====================

export const sessionAPI = {
  listSemesters: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/sessions/semesters');
    return response.data;
  },

  exportSession: async (semester: string): Promise<Blob> => {
    const response = await apiClient.post('/sessions/export', null, {
      params: { semester },
      responseType: 'blob'
    });
    return response.data;
  },

  importSession: async (file: File, mergeStrategy: 'update' | 'skip' = 'update', dryRun = false): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/sessions/import', formData, {
      params: { merge_strategy: mergeStrategy, dry_run: dryRun },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  listBackups: async (): Promise<unknown[]> => {
    const response = await apiClient.get('/sessions/backups');
    return response.data;
  },

  rollbackImport: async (backupFilename: string): Promise<unknown> => {
    const response = await apiClient.post('/sessions/rollback', null, { params: { backup_filename: backupFilename } });
    return response.data;
  },
};

// ==================== ADMIN OPS API ====================

export const adminOpsAPI = {
  createBackup: async (): Promise<{ message: string; backup_path?: string; backup_size?: number }> => {
    const response = await apiClient.post<{ message: string; backup_path?: string; backup_size?: number }>('/adminops/backup');
    return response.data;
  },

  restoreBackup: async (file: File): Promise<{ message: string; restored_from?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ message: string; restored_from?: string }>('/adminops/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  clearDatabase: async (scope: 'all' | 'data_only' = 'all'): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/adminops/clear', {
      confirm: true,
      scope,
    });
    return response.data;
  },

  generateSampleData: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/adminops/generate-sample-data');
    return response.data;
  },
};

// ==================== ADMIN USERS API ====================

export const adminUsersAPI = {
  list: async (): Promise<UserAccount[]> => {
    const response = await apiClient.get<UserAccount[]>('/admin/users');
    return response.data;
  },

  create: async (payload: CreateUserPayload): Promise<UserAccount> => {
    const response = await apiClient.post<UserAccount>('/admin/users', payload);
    return response.data;
  },

  update: async (userId: number, payload: UpdateUserPayload): Promise<UserAccount> => {
    const response = await apiClient.patch<UserAccount>(`/admin/users/${userId}`, payload);
    return response.data;
  },

  delete: async (userId: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  resetPassword: async (userId: number, newPassword: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
  },

  changeOwnPassword: async (currentPassword: string, newPassword: string): Promise<{ status: string; access_token?: string; token_type?: string }> => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data as { status: string; access_token?: string; token_type?: string };
  },

  getCurrentUser: async (): Promise<UserAccount> => {
    const response = await apiClient.get<UserAccount>('/auth/me');
    return response.data;
  },
};

// ==================== HEALTH CHECK ====================

export const checkAPIHealth = async (): Promise<{ status: 'ok' | 'error'; data?: unknown; error?: string }> => {
  try {
    const response = await apiClient.get('/');
    return { status: 'ok', data: response.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', error: message };
  }
};

export interface HealthStatus {
  status?: string;
  timestamp?: string;
  uptime_seconds?: number;
  uptime?: number;
  environment?: string;
  version?: string;
  checks?: Record<string, unknown>;
  docker?: string;
  database?: string;
  db?: string;
  network?: {
    ips?: string[];
  };
  statistics?: {
    students?: number;
    courses?: number;
    grades?: number;
    enrollments?: number;
  };
  students_count?: number;
  courses_count?: number;
  [key: string]: unknown;
}

export const getHealthStatus = async (): Promise<HealthStatus> => {
  // Health endpoint is at root, not under /api/v1
  // When using Vite proxy (API_BASE_URL is relative), use /health directly
  // The proxy will forward it to the backend
  const healthUrl = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/health'
    : '/health'; // Use relative URL for Vite proxy

  try {
    const response = await axios.get<HealthStatus>(healthUrl, {
      timeout: 10000,
    });
    return response?.data || { status: 'unknown' };
  } catch (err) {
    console.error('Failed to fetch health status:', err);
    return { status: 'unhealthy' };
  }
};

/**
 * Safely normalise a response that might be an array or a paginated object
 * into an array of T. This avoids repeated `as T[]` coercions across callers
 * and provides a single, well-typed narrowing location.
 */
// normalizeResponseToArray is provided from '@/utils/normalize'

// ==================== UTILITY FUNCTIONS ====================

export const formatDateForAPI = (date: Date | string): string => formatLocalDate(date);

/**
 * Extract and normalize API error responses
 * Handles both old format (detail string) and new format (error object).
 *
 * @param {Object} errorResponse - Error response data
 * @returns {Object} - Normalized error object { message, code, details, request_id }
 */
export function extractAPIError(errorResponse: unknown): {
  message: string;
  code: string;
  details?: unknown;
  path?: string | null;
  request_id?: string | null;
  status?: number;
} {
  const errorObject =
    typeof errorResponse === 'object' && errorResponse !== null
      ? (errorResponse as { data?: unknown; status?: number })
      : { data: undefined, status: undefined };

  const data = errorObject.data;

  // New format: { success: false, error: { code, message, details, path }, meta }
  if (
    data &&
    typeof data === 'object' &&
    (data as { success?: unknown }).success === false &&
    (data as { error?: unknown }).error
  ) {
    const { error, meta } = data as {
      error?: { code?: string; message?: string; details?: unknown; path?: string | null };
      meta?: { request_id?: string | null };
    };
    return {
      message: error?.message || 'An error occurred',
      code: error?.code || 'UNKNOWN_ERROR',
      details: error?.details,
      path: error?.path ?? null,
      request_id: meta?.request_id ?? null,
      status: errorObject.status,
    };
  }

  // Old format: { detail: "error message" }
  if (data && typeof data === 'object' && 'detail' in data && typeof (data as {detail?: unknown}).detail === 'string') {
    return {
      message: (data as {detail: string}).detail,
      code: 'HTTP_ERROR',
      details: null,
      path: null,
      request_id: null,
      status: errorObject.status,
    };
  }

  // Fallback
  return {
    message: (typeof data === 'object' && data && 'message' in data && typeof (data as {message?: unknown}).message === 'string' ? (data as {message: string}).message : null) || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    details: null,
    path: null,
    request_id: null,
    status: errorObject.status,
  };
}

/**
 * Extract API response data with type safety
 * @param response - The response object to extract data from
 * @param defaultValue - Default value if data is not available
 * @returns The extracted data or default value
 */
export function extractAPIResponseData<T = unknown>(response: unknown, defaultValue?: T): T {
  // New format: { success: true, data: T, ... }
  if (
    response &&
    typeof response === 'object' &&
    (response as { success?: unknown }).success === true &&
    (response as { data?: unknown }).data !== undefined
  ) {
    return (response as { data: T }).data;
  }

  // Old format: direct data (backward compatibility)
  return defaultValue ?? (response as T);
}

export default apiClient;
