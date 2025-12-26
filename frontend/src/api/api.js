/**
 * API Integration Client for Student Management System
 * Connects React Frontend to FastAPI Backend
 *
 * Installation required:
 * Create a .env file in the frontend root directory and add VITE_API_URL.
 * Example: VITE_API_URL=http://localhost:8000
 * npm install axios
 */


import axios from 'axios';
import * as authService from '../services/authService';
import { formatLocalDate } from '@/utils/date';
import { API_BASE_URL } from '@/config/api';


// Use API_BASE_URL from config
let ORIGINAL_API_BASE_URL = API_BASE_URL;
if (!API_BASE_URL) {
  console.warn('[api] API_BASE_URL not defined. Using relative fallback /api/v1');
  ORIGINAL_API_BASE_URL = '/api/v1';
}
// If explicit absolute URL provided but ends with a trailing slash, normalize (keep /api/v1 suffix semantics)
ORIGINAL_API_BASE_URL = ORIGINAL_API_BASE_URL.replace(/\/$/, '');

// Canonical Control API base (backend mounts control router without /api/v1 prefix)
// Derive robustly from API_BASE_URL by removing a trailing /api/v1, preserving any custom path prefix
// Examples:
//  - 'http://localhost:8000/api/v1'  => 'http://localhost:8000/control/api'
//  - '/api/v1'                       => '/control/api'
//  - 'https://host/app/api/v1'       => 'https://host/app/control/api'
//  - 'https://host'                  => 'https://host/control/api'
export const CONTROL_API_BASE = (() => {
  try {
    const root = (ORIGINAL_API_BASE_URL || '').replace(/\/?api\/?v1\/?$/i, '').replace(/\/$/, '');
    if (!root || root.startsWith('/')) {
      const prefix = root.replace(/\/$/, '');
      // ensure single leading slash
      const base = `${prefix || ''}/control/api`;
      return base.replace(/\/\/+/, '/');
    }
    return `${root}/control/api`;
  } catch {
    return '/control/api';
  }
})();

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: ORIGINAL_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Normalize defaults structure for environments where axios instance may lack .defaults
if (!apiClient.defaults) {
  apiClient.defaults = { baseURL: ORIGINAL_API_BASE_URL };
} else if (!apiClient.defaults.baseURL) {
  apiClient.defaults.baseURL = ORIGINAL_API_BASE_URL;
}
// Convenience duplicate baseURL directly on instance for legacy test expectations
// (Non-standard but harmless)
// @ts-ignore
if (!('baseURL' in apiClient)) {
  // @ts-ignore
  apiClient.baseURL = ORIGINAL_API_BASE_URL;
}

// Request interceptor (for adding auth tokens in future)
apiClient.interceptors.request.use(
  (config) => attachAuthHeader(config),
  (error) => {
    return Promise.reject(error);
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Exported helper so this behavior can be unit-tested without relying on axios internals
export function attachAuthHeader(config) {
  if (!config) return config;

  try {
    const token = authService.getAccessToken && authService.getAccessToken();
    if (token && config && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
}

// Response interceptor (for error handling)
let hasRetriedRelative = false;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Standard logging & classification
    if (error.response) {
      console.error('API Error:', error.response.data);
      if (error.response.status === 404) {
        console.error('Resource not found');
      } else if (error.response.status === 500) {
        console.error('Server error');
      }
    } else if (error.request) {
      console.error('Network Error: No response from server');
    } else {
      console.error('Error:', error.message);
    }

    // Retry logic: retry up to 3 times on 5xx or network errors with exponential backoff
    const config = error.config || {};
    config._retryCount = config._retryCount || 0;
    const shouldRetry =
      config._retryCount < 3 &&
      ((error.response && error.response.status >= 500) || !error.response);
    // Only retry if apiClient is a function (real axios instance), not in test mocks
    if (shouldRetry && typeof apiClient === 'function') {
      config._retryCount++;
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, config._retryCount) * 1000));
      return apiClient(config);
    }

    // Dynamic fallback: if we are using an absolute base URL and connectivity failed (no response)
    // attempt a one-time automatic switch to relative /api/v1, then retry original request.
    const isNetworkNoResponse = !!error.request && !error.response;
    const isAbsolute = /^https?:\/\//i.test(apiClient.defaults.baseURL || '');
    const disableFallback = process.env.NODE_ENV === 'test' || import.meta?.env?.VITE_DISABLE_API_FALLBACK === '1';
    if (isNetworkNoResponse && isAbsolute && !hasRetriedRelative && !disableFallback) {
      hasRetriedRelative = true;
      console.warn(`[api] Connectivity failure to ${apiClient.defaults.baseURL}. Switching to relative '/api/v1' and retrying once.`);
      apiClient.defaults.baseURL = '/api/v1';
      // Adjust original request config baseURL explicitly for retry
      const retryConfig = { ...error.config, baseURL: apiClient.defaults.baseURL };
      try {
        return await apiClient.request(retryConfig);
      } catch (retryErr) {
        console.error('[api] Retry with relative base also failed:', retryErr?.message);
        return Promise.reject(retryErr);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Preflight health check & dynamic base adjustment.
 * Attempts health endpoint using current base. If unreachable and original
 * base was absolute, switches to relative '/api/v1'. Returns final base used.
 */
export async function preflightAPI() {
  const currentBase = apiClient.defaults?.baseURL || '';
  const rootBase = currentBase.replace(/\/api\/v1\/?$/i, '');
  const healthUrl = rootBase ? `${rootBase}/health` : '/health';
  try {
    await axios.get(healthUrl, { timeout: 4000 });
    return apiClient.defaults?.baseURL || currentBase;
  } catch (e) {
    if (/^https?:\/\//i.test(ORIGINAL_API_BASE_URL)) {
      console.warn(`[api] Preflight failed for ${healthUrl}. Falling back to relative '/api/v1'.`);
      if (!apiClient.defaults) apiClient.defaults = {};
      apiClient.defaults.baseURL = '/api/v1';
    }
    return apiClient.defaults?.baseURL || '/api/v1';
  }
}

// Test-only helper to force original base for fallback simulation
// Exposed when NODE_ENV === 'test'
export function __test_forceOriginalBase(url) { // eslint-disable-line camelcase
  if (process.env.NODE_ENV !== 'test') return;
  ORIGINAL_API_BASE_URL = url;
  if (!apiClient.defaults) apiClient.defaults = {};
  apiClient.defaults.baseURL = url;
}

// ==================== STUDENTS API ====================

export const studentsAPI = {
  /**
   * Get all students
   * @param {number} skip - Number of records to skip (pagination)
   * @param {number} limit - Maximum number of records to return
   */
  /**
   * Get all students
   * @param {number} skip - Number of records to skip (pagination)
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Student[]>}
   */
  /**
   * Get all students
   * @param {number} skip - Number of records to skip (pagination)
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Student[]>}
   */
  getAll: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/students/', {
        params: { skip, limit }
      });
      const data = response.data;
      // Always return an array of students
      if (data && Array.isArray(data.items)) return data.items;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a single student by ID
   * @param {number} studentId - Student ID
   */
  getById: async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new student
   * @param {Object} studentData - Student data
   */
  create: async (studentData) => {
    try {
      const response = await apiClient.post('/students/', studentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an existing student
   * @param {number} studentId - Student ID
   * @param {Object} studentData - Updated student data
   */
  update: async (studentId, studentData) => {
    try {
      const response = await apiClient.put(`/students/${studentId}`, studentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a student
   * @param {number} studentId - Student ID
   */
  delete: async (studentId) => {
    try {
      const response = await apiClient.delete(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get student summary with analytics
   * @param {number} studentId - Student ID
   */
  getSummary: async (studentId) => {
    try {
      const response = await apiClient.get(`/analytics/student/${studentId}/summary`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== COURSES API ====================

export const coursesAPI = {
  /**
   * Get all courses
   * @param {number} skip - Number of records to skip (default: 0)
   * @param {number} limit - Maximum records to return (default: 100, max: 1000)
   */
  getAll: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/courses/', {
        params: { skip, limit }
      });
      const data = response.data;
      // Normalize PaginatedResponse to array for UI callers
      if (data && Array.isArray(data.items)) return data.items;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new course
   * @param {Object} courseData - Course data
   */
  create: async (courseData) => {
    try {
      const response = await apiClient.post('/courses/', courseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an existing course by ID
   * @param {number} courseId - Course ID
   * @param {Object} courseData - Updated fields
   */
  update: async (courseId, courseData) => {
    try {
      const response = await apiClient.put(`/courses/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a course by ID
   * @param {number} courseId - Course ID
   */
  delete: async (courseId) => {
    try {
      const response = await apiClient.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== ATTENDANCE API ====================

export const attendanceAPI = {
  /**
   * Create attendance record
   * @param {Object} attendanceData - Attendance data
   */
  create: async (attendanceData) => {
    try {
      const response = await apiClient.post('/attendance/', attendanceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get attendance records for a student
   * @param {number} studentId - Student ID
   */
  getByStudent: async (studentId) => {
    try {
      const response = await apiClient.get(`/attendance/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get attendance records for a course
   * @param {number} courseId - Course ID
   */
  getByCourse: async (courseId) => {
    try {
      const response = await apiClient.get(`/attendance/course/${courseId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Bulk create attendance records
   * @param {Array} attendanceRecords - Array of attendance records
   */
  bulkCreate: async (attendanceRecords) => {
    try {
      const promises = attendanceRecords.map(record =>
        apiClient.post('/attendance/', record)
      );
      const responses = await Promise.all(promises);
      return responses.map(r => r.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an attendance record
   * @param {number} attendanceId - Attendance record ID
   * @param {Object} attendanceData - Updated attendance data
   */
  update: async (attendanceId, attendanceData) => {
    try {
      const response = await apiClient.put(`/attendance/${attendanceId}`, attendanceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete an attendance record
   * @param {number} attendanceId - Attendance record ID
   */
  delete: async (attendanceId) => {
    try {
      const response = await apiClient.delete(`/attendance/${attendanceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== GRADES API ====================

export const gradesAPI = {
  /**
   * Create a grade record
   * @param {Object} gradeData - Grade data
   */
  create: async (gradeData) => {
    try {
      const response = await apiClient.post('/grades/', gradeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get grades for a student
   * @param {number} studentId - Student ID
   */
  getByStudent: async (studentId) => {
    try {
      const response = await apiClient.get(`/grades/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get grades for a course
   * @param {number} courseId - Course ID
   */
  getByCourse: async (courseId) => {
    try {
      const response = await apiClient.get(`/grades/course/${courseId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calculate weighted average for a student in a course
   * @param {number} studentId - Student ID
   * @param {number} courseId - Course ID
   */
  calculateAverage: async (studentId, courseId) => {
    try {
      const grades = await gradesAPI.getByStudent(studentId);
      const courseGrades = grades.filter(g => g.course_id === courseId);

      if (courseGrades.length === 0) return 0;

      // Note: This calculation is happening on the frontend.
      // For consistency and performance, consider creating a backend endpoint for this.
      const totalWeight = courseGrades.reduce((sum, g) => sum + g.weight, 0);
      const weightedSum = courseGrades.reduce((sum, g) => {
        const percentage = (g.grade / g.max_grade) * 100;
        return sum + (percentage * g.weight);
      }, 0);

      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a grade record
   * @param {number} gradeId - Grade ID
   * @param {Object} gradeData - Updated grade data
   */
  update: async (gradeId, gradeData) => {
    try {
      const response = await apiClient.put(`/grades/${gradeId}`, gradeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a grade record
   * @param {number} gradeId - Grade ID
   */
  delete: async (gradeId) => {
    try {
      const response = await apiClient.delete(`/grades/${gradeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== HIGHLIGHTS API ====================

export const highlightsAPI = {
  /**
   * Create a highlight
   * @param {Object} highlightData - Highlight data
   */
  create: async (highlightData) => {
    try {
      const response = await apiClient.post('/highlights/', highlightData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get highlights for a student
   * @param {number} studentId - Student ID
   */
  getByStudent: async (studentId) => {
    try {
      const response = await apiClient.get(`/highlights/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get highlights by semester
   * @param {number} studentId - Student ID
   * @param {string} semester - Semester name
   */
  getBySemester: async (studentId, semester) => {
    try {
      const highlights = await highlightsAPI.getByStudent(studentId);
      return highlights.filter(h => h.semester === semester);
    } catch (error) {
      throw error;
    }
  }
};

// ==================== ENROLLMENTS API ====================

export const enrollmentsAPI = {
  /**
   * Get all enrollments with pagination
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum number of records to return
   */
  getAll: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/enrollments/', {
        params: { skip, limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get enrollments for a specific course
   * @param {number} courseId - Course ID
   */
  getByCourse: async (courseId) => {
    try {
      const response = await apiClient.get(`/enrollments/course/${courseId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get enrollments for a specific student
   * @param {number} studentId - Student ID
   */
  getByStudent: async (studentId) => {
    try {
      const response = await apiClient.get(`/enrollments/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get list of students enrolled in a course
   * @param {number} courseId - Course ID
   */
  getEnrolledStudents: async (courseId) => {
    try {
      const response = await apiClient.get(`/enrollments/course/${courseId}/students`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Enroll students in a course
   * @param {number} courseId - Course ID
   * @param {Array<number>} studentIds - Array of student IDs to enroll
   * @param {string} enrolledAt - Optional enrollment date (ISO format)
   */
  enrollStudents: async (courseId, studentIds, enrolledAt = null) => {
    try {
      const payload = { student_ids: studentIds };
      if (enrolledAt) {
        payload.enrolled_at = enrolledAt;
      }
      const response = await apiClient.post(`/enrollments/course/${courseId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unenroll a student from a course
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   */
  unenrollStudent: async (courseId, studentId) => {
    try {
      const response = await apiClient.delete(`/enrollments/course/${courseId}/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== ANALYTICS API ====================

export const analyticsAPI = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      const [students, courses] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll(0, 1000)  // Request up to 1000 courses for complete stats
      ]);

      // Calculate overall statistics
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.is_active).length;
      const totalCourses = courses.length;

      return {
        totalStudents,
        activeStudents,
        totalCourses,
        inactiveStudents: totalStudents - activeStudents
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get attendance statistics
   * @param {number} studentId - Optional student ID for individual stats
   */
  getAttendanceStats: async (studentId = null) => {
    try {
      let attendanceRecords;

      if (studentId) {
        attendanceRecords = await attendanceAPI.getByStudent(studentId);
      } else {
        // Get all students and their attendance
        const students = await studentsAPI.getAll();
        const promises = students.map(s => attendanceAPI.getByStudent(s.id));
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
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get grade statistics
   * @param {number} studentId - Optional student ID
   * @param {number} courseId - Optional course ID
   */
  getGradeStats: async (studentId = null, courseId = null) => {
    try {
      let grades;

      if (studentId) {
        grades = await gradesAPI.getByStudent(studentId);
        if (courseId) {
          grades = grades.filter(g => g.course_id === courseId);
        }
      } else if (courseId) {
        grades = await gradesAPI.getByCourse(courseId);
      } else {
        // Get all grades for all students
        const students = await studentsAPI.getAll();
        const promises = students.map(s => gradesAPI.getByStudent(s.id));
        const results = await Promise.all(promises);
        grades = results.flat();
      }

      if (grades.length === 0) {
        return {
          count: 0,
          average: 0,
          highest: 0,
          lowest: 0
        };
      }

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
    } catch (error) {
      throw error;
    }
  }
};

// ==================== REPORTS API ====================

/**
 * Reports API for generating student performance reports
 */
export const reportsAPI = {
  /**
   * Generate student performance report
   * @param {object} reportRequest - Report configuration
   * @returns {Promise} - Student performance report
   */
  generateStudentReport: async (reportRequest) => {
    try {
      const response = await api.post('/reports/student-performance', reportRequest);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get available report formats
   * @returns {Promise<string[]>} - List of available formats
   */
  getAvailableFormats: async () => {
    try {
      const response = await api.get('/reports/formats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get available report periods
   * @returns {Promise<string[]>} - List of available periods
   */
  getAvailablePeriods: async () => {
    try {
      const response = await api.get('/reports/periods');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Download student performance report in PDF or CSV format
   * @param {object} reportRequest - Report configuration with format
   * @returns {Promise} - Blob response for download
   */
  downloadStudentReport: async (reportRequest) => {
    try {
      const response = await api.post('/reports/student-performance/download', reportRequest, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if API is reachable
 */
export const checkAPIHealth = async () => {
  try {
    const response = await apiClient.get('/');
    return { status: 'ok', data: response.data };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

/**
 * Get backend health status
 */
export const getHealthStatus = async () => {
  try {
    // Health endpoint is at root, not /api/v1/health
    const baseURL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const response = await axios.get(`${baseURL}/health`, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Format date for API
 * @param {Date|string} date - Date to format
 */
export const formatDateForAPI = (date) => formatLocalDate(date);

// ==================== ADMIN OPERATIONS API ====================

export const adminOpsAPI = {
  /**
   * Create backup of database
   */
  async createBackup() {
    try {
      const response = await apiClient.post('/adminops/backup');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Restore database from backup file
   * @param {File} file - Backup file
   */
  async restoreBackup(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/adminops/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Clear database
   * @param {string} scope - 'all' or 'data_only'
   */
  async clearDatabase(scope = 'all') {
    try {
      const response = await apiClient.post('/adminops/clear', {
        confirm: true,
        scope: scope
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== ADMIN USERS API ====================

export const adminUsersAPI = {
  async list() {
    try {
      const response = await apiClient.get('/admin/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async create(payload) {
    try {
      const response = await apiClient.post('/admin/users', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async update(userId, payload) {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async delete(userId) {
    try {
      await apiClient.delete(`/admin/users/${userId}`);
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(userId, newPassword) {
    try {
      await apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
    } catch (error) {
      throw error;
    }
  },

  // Change own password (self-service) – mirrors TypeScript implementation
  async changeOwnPassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch current authenticated user profile
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== IMPORT API ====================

export const importAPI = {
  /**
   * Upload import file (JSON or Excel)
   * @param {File} file - Import file
   * @param {string} type - 'courses' or 'students'
   */
  async uploadFile(file, type) {
    try {
      const formData = new FormData();
      // Backend expects 'files' for list uploads; also include import_type for clarity
      formData.append('files', file);
      formData.append('import_type', type);
      const response = await apiClient.post('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Preview/validate an import without committing
   * @param {Object} params
   * @param {'students'|'courses'} params.type
   * @param {File[]|File|undefined} params.files
   * @param {string|undefined} params.jsonText
   * @param {boolean} params.allowUpdates
   * @param {boolean} params.skipDuplicates
   */
  async preview({ type, files, jsonText, allowUpdates = false, skipDuplicates = true }) {
    try {
      const formData = new FormData();
      formData.append('import_type', type);
      formData.append('allow_updates', allowUpdates ? 'true' : 'false');
      formData.append('skip_duplicates', skipDuplicates ? 'true' : 'false');

      if (files) {
        const list = Array.isArray(files) ? files : [files];
        list.forEach((file) => {
          if (file) formData.append('files', file);
        });
      }
      if (jsonText) {
        formData.append('json_text', jsonText);
      }

      const response = await apiClient.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Execute an import by creating a background job
   * @param {Object} params
   * @param {'students'|'courses'} params.type
   * @param {File[]|File|undefined} params.files
   * @param {string|undefined} params.jsonText
   * @param {boolean} params.allowUpdates
   * @param {boolean} params.skipDuplicates
   */
  async execute({ type, files, jsonText, allowUpdates = false, skipDuplicates = true }) {
    try {
      const formData = new FormData();
      formData.append('import_type', type);
      formData.append('allow_updates', allowUpdates ? 'true' : 'false');
      formData.append('skip_duplicates', skipDuplicates ? 'true' : 'false');

      if (files) {
        const list = Array.isArray(files) ? files : [files];
        list.forEach((file) => {
          if (file) formData.append('files', file);
        });
      }
      if (jsonText) {
        formData.append('json_text', jsonText);
      }

      const response = await apiClient.post('/imports/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ==================== JOBS API ====================

export const jobsAPI = {
  async get(jobId) {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },
  async list() {
    const response = await apiClient.get('/jobs');
    return response.data;
  }
};

// ==================== SESSION EXPORT/IMPORT API ====================

export const sessionAPI = {
  /**
   * List all available semesters
   */
  async listSemesters() {
    try {
      const response = await apiClient.get('/sessions/semesters');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Export complete session data for a semester
   * @param {string} semester - Semester identifier (e.g., "2024-2025 Fall")
   */
  async exportSession(semester) {
    try {
      const response = await apiClient.post('/sessions/export', null, {
        params: { semester },
        responseType: 'blob' // Important for file download
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Import session data from JSON file
   * @param {File} file - Session export JSON file
   * @param {string} mergeStrategy - 'update' (default) or 'skip'
   * @param {boolean} dryRun - If true, only validates without importing
   */
  async importSession(file, mergeStrategy = 'update', dryRun = false) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/sessions/import', formData, {
        params: {
          merge_strategy: mergeStrategy,
          dry_run: dryRun
        },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * List available backup files for rollback
   */
  async listBackups() {
    try {
      const response = await apiClient.get('/sessions/backups');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Rollback database to a previous backup
   * @param {string} backupFilename - Name of backup file to restore
   */
  async rollbackImport(backupFilename) {
    try {
      const response = await apiClient.post('/sessions/rollback', null, {
        params: { backup_filename: backupFilename }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Export the axios instance for custom requests
export default apiClient;
