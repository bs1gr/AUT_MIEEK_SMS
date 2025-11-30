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
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
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
      // Ensure defaults is correctly typed for axios
      if (!apiClient.defaults) apiClient.defaults = ({ baseURL: '/api/v1' } as AxiosRequestConfig);
      apiClient.defaults.baseURL = '/api/v1';
    }
    return apiClient.defaults?.baseURL || '/api/v1';
  }
}

// Test helper to force original base in tests (only active under NODE_ENV === 'test')
export function __test_forceOriginalBase(url: string) {
  if (process.env.NODE_ENV !== 'test') return;
  ORIGINAL_API_BASE_URL = url;
  if (!apiClient.defaults) apiClient.defaults = ({ baseURL: url } as AxiosRequestConfig);
  apiClient.defaults.baseURL = url;
}

// ==================== STUDENTS API ====================

export const studentsAPI = {
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<Student>> => {
    const response = await apiClient.get<PaginatedResponse<Student>>('/students/', {
      params: { skip, limit }
    });
    return response.data;
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
  getAll: async (skip = 0, limit = 100): Promise<PaginatedResponse<Course>> => {
    const response = await apiClient.get<PaginatedResponse<Course>>('/courses/', {
      params: { skip, limit }
    });
    return response.data;
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
    const studentsList: Student[] = Array.isArray(students) ? students : (students?.items || []);

    const totalStudents = studentsList.length;
    const activeStudents = studentsList.filter((s: Student) => Boolean(s.is_active)).length;
    const totalCourses = Array.isArray(courses) ? courses.length : (courses?.items?.length ?? 0);
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
      const studentsNormalized: Student[] = Array.isArray(studentsAll) ? studentsAll : (studentsAll?.items || []);
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
      const studentsNormalized: Student[] = Array.isArray(studentsAll) ? studentsAll : (studentsAll?.items || []);
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

  uploadFile: async (file: File, type: 'courses' | 'students'): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('import_type', type);
    const response = await apiClient.post<ImportResponse>('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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

// ==================== UTILITY FUNCTIONS ====================

export const formatDateForAPI = (date: Date | string): string => formatLocalDate(date);

export default apiClient;
