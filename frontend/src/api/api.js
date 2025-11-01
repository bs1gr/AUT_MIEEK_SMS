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

// Base API URL - change this based on your environment
// Note: VITE_API_URL should include /api/v1 if needed (e.g., http://localhost:8000/api/v1)
// For fullstack Docker deployment, use relative URL to work on any port
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
if (!import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not defined. Using default relative URL: /api/v1');
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor (for adding auth tokens in future)
apiClient.interceptors.request.use(
  (config) => {
    // You can add authentication token here
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
      
      // Handle specific status codes
      if (error.response.status === 404) {
        console.error('Resource not found');
      } else if (error.response.status === 500) {
        console.error('Server error');
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ==================== STUDENTS API ====================

export const studentsAPI = {
  /**
   * Get all students
   * @param {number} skip - Number of records to skip (pagination)
   * @param {number} limit - Maximum number of records to return
   */
  getAll: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/students/', {
        params: { skip, limit }
      });
      return response.data;
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
   */
  getAll: async () => {
    try {
      const response = await apiClient.get('/courses/');
      return response.data;
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

// ==================== ANALYTICS API ====================

export const analyticsAPI = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      const [students, courses] = await Promise.all([
        studentsAPI.getAll(),
        coursesAPI.getAll()
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
export const formatDateForAPI = (date) => {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

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
      const response = await apiClient.post('/adminops/clear', null, {
        params: { scope }
      });
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
  }
};

// Export the axios instance for custom requests
export default apiClient;