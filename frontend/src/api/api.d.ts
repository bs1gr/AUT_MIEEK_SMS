// Minimal TypeScript declaration for the legacy JS API client
// This file declares the runtime JS API client surface with concrete types
// so other parts of the app can import the JS module and still get accurate
// type information. Keep in sync with `src/api/api.ts`.

declare module '@/api/api' {
  import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
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

  export const CONTROL_API_BASE: string;
  export const apiClient: AxiosInstance;

  export function attachAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;

  export const studentsAPI: {
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<Student>>;
    getById(id: number): Promise<Student>;
    create(data: StudentFormData): Promise<Student>;
    update(id: number, data: Partial<StudentFormData>): Promise<Student>;
    delete(id: number): Promise<{ message: string }>;
    search(query: string): Promise<Student[]>;
  };

  export const coursesAPI: {
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<Course>>;
    getById(id: number): Promise<Course>;
    create(data: CourseFormData): Promise<Course>;
    update(id: number, data: Partial<CourseFormData>): Promise<Course>;
    delete(id: number): Promise<{ message: string }>;
  };

  export const attendanceAPI: {
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<Attendance>>;
    getById(id: number): Promise<Attendance>;
    create(data: AttendanceFormData): Promise<Attendance>;
    update(id: number, data: Partial<AttendanceFormData>): Promise<Attendance>;
    delete(id: number): Promise<{ message: string }>;
    getByStudentAndCourse(studentId: number, courseId: number): Promise<Attendance[]>;
    getByStudent(studentId: number): Promise<Attendance[]>;
    getByCourse(courseId: number): Promise<Attendance[]>;
    bulkCreate(records: AttendanceFormData[]): Promise<Attendance[]>;
  };

  export const gradesAPI: {
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<Grade>>;
    getById(id: number): Promise<Grade>;
    create(data: GradeFormData): Promise<Grade>;
    update(id: number, data: Partial<GradeFormData>): Promise<Grade>;
    delete(id: number): Promise<{ message: string }>;
    getByStudentAndCourse(studentId: number, courseId: number): Promise<Grade[]>;
    getByStudent(studentId: number): Promise<Grade[]>;
    getByCourse(courseId: number): Promise<Grade[]>;
    calculateAverage(studentId: number, courseId: number): Promise<number>;
  };

  export const highlightsAPI: {
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<Highlight>>;
    getById(id: number): Promise<Highlight>;
    create(data: Omit<Highlight, 'id'>): Promise<Highlight>;
    update(id: number, data: Partial<Highlight>): Promise<Highlight>;
    delete(id: number): Promise<{ message: string }>;
    getByStudent(studentId: number): Promise<Highlight[]>;
    getBySemester(studentId: number, semester: string): Promise<Highlight[]>;
  };

  export const analyticsAPI: {
    getFinalGrade(studentId: number, courseId: number): Promise<FinalGrade>;
    getAllCoursesSummary(studentId: number): Promise<unknown>;
    getStudentSummary(studentId: number): Promise<unknown>;
    getDashboardStats(): Promise<{ totalStudents: number; activeStudents: number; totalCourses: number; inactiveStudents: number }>;
    getAttendanceStats(studentId?: number | null): Promise<{
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      attendanceRate: number | string;
    }>;
    getGradeStats(studentId?: number | null, courseId?: number | null): Promise<{ count: number; average: number | string; highest: number | string; lowest: number | string } | { count: number; average: number; highest: number; lowest: number }>;
  };

  export const enrollmentsAPI: {
    enrollStudents(courseId: number, studentIds: number[]): Promise<EnrollmentResponse>;
    getAll(skip?: number, limit?: number): Promise<PaginatedResponse<CourseEnrollment>>;
    getByCourse(courseId: number): Promise<CourseEnrollment[]>;
    getByStudent(studentId: number): Promise<CourseEnrollment[]>;
    getEnrolledStudents(courseId: number): Promise<Student[]>;
    unenrollStudent(courseId: number, studentId: number): Promise<void>;
  };

  export const importAPI: {
    uploadFile(file: File, type: 'courses' | 'students'): Promise<ImportResponse>;
    preview(params: ImportPreviewParams): Promise<ImportPreviewResponse>;
    execute(params: ImportPreviewParams): Promise<ImportJobResponse>;
  };

  export const jobsAPI: {
    get(jobId: string): Promise<JobDetail>;
    list(): Promise<JobDetail[] | PaginatedResponse<JobDetail>>;
  };

  export const sessionAPI: {
    listSemesters(): Promise<string[]>;
    exportSession(semester: string): Promise<Blob>;
    importSession(file: File, mergeStrategy?: 'update' | 'skip', dryRun?: boolean): Promise<ImportResponse>;
    listBackups(): Promise<unknown[]>;
    rollbackImport(backupFilename: string): Promise<unknown>;
  };

  export const adminOpsAPI: {
    createBackup(): Promise<{ message: string; backup_path?: string; backup_size?: number }>;
    restoreBackup(file: File): Promise<{ message: string; restored_from?: string }>;
    clearDatabase(scope?: 'all' | 'data_only'): Promise<{ message: string }>;
    generateSampleData(): Promise<{ message: string }>;
  };

  export const adminUsersAPI: {
    list(): Promise<UserAccount[]>;
    create(payload: CreateUserPayload): Promise<UserAccount>;
    update(userId: number, payload: UpdateUserPayload): Promise<UserAccount>;
    delete(userId: number): Promise<void>;
    resetPassword(userId: number, newPassword: string): Promise<void>;
    changeOwnPassword(currentPassword: string, newPassword: string): Promise<{ status: string; access_token?: string; token_type?: string }>;
    getCurrentUser(): Promise<UserAccount>;
  };

  export const checkAPIHealth: () => Promise<{ status: 'ok' | 'error'; data?: unknown; error?: string }>;

  export interface HealthStatus { [key: string]: unknown }

  export const getHealthStatus: () => Promise<HealthStatus>;

  export const formatDateForAPI: (date: Date | string) => string;

  const _default: AxiosInstance;
  export default _default;
}

// Also allow direct relative import paths (js files) that reference the file
declare module '../api.js' {
  export const CONTROL_API_BASE: string;
  export const apiClient: unknown;
  export function attachAuthHeader(config: unknown): unknown;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: unknown;
  export const coursesAPI: unknown;
  export const attendanceAPI: unknown;
   export const gradesAPI: unknown;
   export const sessionAPI: unknown;
   export const analyticsAPI: unknown;
   export const authAPI: unknown;
  export const dashboardAPI: unknown;
  export const filesAPI: unknown;
  export const coursesEnrollmentAPI: unknown;
  const _default: unknown;
  export default _default;
}

// Allow both absolute and relative imports to match the same API surface
declare module '*api/api' {
  export const CONTROL_API_BASE: string;
   export const apiClient: unknown;
   export function attachAuthHeader(config: unknown): unknown;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: unknown;
  export const coursesAPI: unknown;
  export const attendanceAPI: unknown;
   export const gradesAPI: unknown;
   export const sessionAPI: unknown;
   export const analyticsAPI: unknown;
   export const authAPI: unknown;
  export const dashboardAPI: unknown;
  export const filesAPI: unknown;
  export const coursesEnrollmentAPI: unknown;
  const _default: unknown;
  export default _default;
}

declare module '*api.js' {
  export const CONTROL_API_BASE: string;
   export const apiClient: unknown;
   export function attachAuthHeader(config: unknown): unknown;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: unknown;
  export const coursesAPI: unknown;
  export const attendanceAPI: unknown;
  export const gradesAPI: unknown;
  export const sessionAPI: unknown;
  export const analyticsAPI: unknown;
  export const authAPI: unknown;
  export const dashboardAPI: unknown;
  export const filesAPI: unknown;
  export const coursesEnrollmentAPI: unknown;
  const _default: unknown;
  export default _default;
}
// NOTE: This file purposefully uses permissive typings to unblock
// TypeScript checks during the validation workflow. Follow-up work should
// replace these with precise interfaces and types.
