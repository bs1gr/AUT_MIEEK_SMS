/**
 * PyWebView API Bridge - Direct Python↔JavaScript communication
 * Replaces HTTP calls with synchronous Python method calls.
 */

declare const window: any;

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}

// Helper to call Python methods via PyWebView bridge
function callBridge(method: string, ...args: any[]): any {
  if (!window.pywebview || !window.pywebview.api) {
    throw new Error('PyWebView API not available');
  }
  return window.pywebview.api[method](...args);
}

// ========== STUDENTS API ==========

export const liteBridgeStudentsAPI = {
  getAll: (skip = 0, limit = 100): PaginatedResponse<any> =>
    callBridge('get_students', skip, limit),

  getById: (id: number): any => callBridge('get_student', id),

  create: (data: any): any => callBridge('create_student', data),

  update: (id: number, data: any): any =>
    callBridge('update_student', id, data),

  delete: (id: number): any => callBridge('delete_student', id),

  search: (q: string): PaginatedResponse<any> =>
    callBridge('search_students', q, 0, 100),
};

// ========== GRADES API ==========

export const liteBridgeGradesAPI = {
  getAll: (
    skip = 0,
    limit = 100,
    studentId?: number,
    courseId?: number,
  ): PaginatedResponse<any> =>
    callBridge('get_grades', skip, limit, studentId, courseId),

  getById: (id: number): any => callBridge('get_grade', id),

  create: (data: any): any => callBridge('create_grade', data),

  update: (id: number, data: any): any =>
    callBridge('update_grade', id, data),

  delete: (id: number): any => callBridge('delete_grade', id),

  getByStudent: (studentId: number): any[] =>
    callBridge('get_grades_by_student', studentId),

  getByCourse: (courseId: number): any[] =>
    callBridge('get_grades_by_course', courseId),
};

// ========== COURSES API ==========

export const liteBridgeCoursesAPI = {
  getAll: (skip = 0, limit = 100): PaginatedResponse<any> =>
    callBridge('get_courses', skip, limit),

  getById: (id: number): any => callBridge('get_course', id),

  create: (data: any): any => callBridge('create_course', data),

  update: (id: number, data: any): any =>
    callBridge('update_course', id, data),

  delete: (id: number): any => callBridge('delete_course', id),
};

// ========== SYSTEM API ==========

export const liteBridgeSystemAPI = {
  getVersion: (): any => callBridge('get_version'),

  getHealth: (): any => callBridge('get_health'),
};
