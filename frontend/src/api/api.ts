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
console.log('[API Client] VITE_API_URL env var:', import.meta.env.VITE_API_URL);
console.log('[API Client] Using API_BASE_URL:', API_BASE_URL);
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
  try {
    // Skip auth header for login/refresh endpoints (they don't need it)
    const url = config.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      console.log('[API] Skipping auth header for:', url);
      return config;
    }
    
    const token = authService.getAccessToken();
    if (token) {
      console.log('[API] Attaching auth header for:', url);
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
      console.log('[API] No token available for:', url);
    }
  } catch (e) {
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

      // Log other response errors
      console.error('API Error:', error.response.data);
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

  getAllCoursesSummary: async (studentId: number): Promise<any> => {
    const response = await apiClient.get(
      `/analytics/student/${studentId}/all-courses-summary`
    );
    return response.data;
  },

  getStudentSummary: async (studentId: number): Promise<any> => {
    const response = await apiClient.get(`/analytics/student/${studentId}/summary`);
    return response.data;
  },
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

  getStudentsInCourse: async (courseId: number): Promise<Student[]> => {
    const response = await apiClient.get<Student[]>(`/enrollments/course/${courseId}/students`);
    return response.data;
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
  changeOwnPassword: async (currentPassword: string, newPassword: string): Promise<{ status: string }> => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data as { status: string };
  },
};

// ==================== HEALTH CHECK ====================

export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
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

  const response = await axios.get<HealthStatus>(healthUrl, {
    timeout: 5000,
  });
  return response.data;
};

// ==================== UTILITY FUNCTIONS ====================

export const formatDateForAPI = (date: Date | string): string => formatLocalDate(date);

export default apiClient;
