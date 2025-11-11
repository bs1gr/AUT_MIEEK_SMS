/**
 * API Integration Client for Student Management System
 * Connects React Frontend to FastAPI Backend
 * TypeScript version with full type safety
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import authService from '@/services/authService';
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
export function attachAuthHeader(config: AxiosRequestConfig) {
  try {
    const token = authService.getAccessToken();
    if (token && config && config.headers) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - axios headers typing
      config.headers.Authorization = `Bearer ${token}`;
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
};

// ==================== ADMIN OPS API ====================

export const adminOpsAPI = {
  clearDatabase: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/adminops/clear-database');
    return response.data;
  },

  generateSampleData: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/adminops/generate-sample-data');
    return response.data;
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
  status: string;
  timestamp: string;
  uptime_seconds: number;
  environment: string;
  version: string;
  checks: Record<string, any>;
  statistics: {
    students: number;
    courses: number;
    grades: number;
    enrollments: number;
  };
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

export const formatDateForAPI = (date: Date | string): string => {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

export default apiClient;
