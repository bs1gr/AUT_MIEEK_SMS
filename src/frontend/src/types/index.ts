// Core entity types for the Student Management System

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  enrollment_date: string;
  is_active: boolean;
  father_name?: string;
  mobile_phone?: string;
  phone?: string;
  health_issue?: string;
  note?: string;
  study_year?: number;
  academic_year?: string;
  class_division?: string;
}

export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  semester: string;
  description?: string;
  credits: number;
  hours_per_week?: number;
  periods_per_week?: number;
  /** The course's own total of periods in the semester (todo 71); empty: periods per week x weeks. */
  semester_periods?: number | null;
  // Optional canonical year and instructor fields used in some views and tests
  year?: number;
  instructor?: string;
  // Optional structured teaching schedule - backend may provide either an array of schedule
  // entries or a record keyed by day name. Keep permissive union to match both shapes used
  // across the UI_helpers and calendar utilities.
  teaching_schedule?: Array<{ day: string; start_time: string; end_time?: string; periods?: number; duration?: number; location?: string; }> | Record<string, { periods?: number; start_time?: string; duration?: number }>;
  // Optional evaluation rules attached to the course used by grading and analytics views
  // Participation observations are weight-0 rules; `deduction_percent` is the share of a day's
  // Class Participation a tick takes (see utils/participation).
  evaluation_rules?: Array<{ id?: number; category: string; weight?: number; description?: string; deduction_percent?: number }>;
  academic_year?: string;
  absence_penalty?: number;
  // ΜΙΕΕΚ absence rules (% of scheduled periods): over absence_limit_percent the course is
  // failed; over participation_limit_percent the Class Participation share counts as 0.
  absence_limit_percent?: number;
  participation_limit_percent?: number;
  is_active: boolean;
}

export interface Grade {
  id: number;
  student_id: number;
  course_id: number;
  assignment_name: string;
  category?: string;
  grade: number;
  max_grade: number;
  weight: number;
  date_assigned?: string;
  /** For an exam, the day it was taken (plan todo 80: the teacher picks it). */
  date_submitted?: string;
  notes?: string;
  /**
   * Plan todo 80: a Midterm or Final Exam grade the teacher marked as the retake. It replaces the
   * earlier sitting in the final grade; absent from older servers (no retake).
   */
  is_retake?: boolean;
}

export interface Attendance {
  id: number;
  student_id: number;
  course_id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  notes?: string;
}

/** Material covered and the teacher's notes for one teaching period (GET/PUT /lesson-logs/). */
export interface LessonLog {
  id: number;
  course_id: number;
  date: string;
  period_number: number;
  material_covered: string | null;
  teacher_notes: string | null;
  /** Who last changed the text; absent or null when it was never recorded. */
  updated_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Body of PUT /lesson-logs/: a text field that is left out keeps its stored value; '' clears it. */
export interface LessonLogSavePayload {
  course_id: number;
  date: string;
  period_number: number;
  material_covered?: string;
  teacher_notes?: string;
}

export interface CourseEnrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrolled_at?: string;
  status?: 'active' | 'completed' | 'dropped';
}

/** ΜΙΕΕΚ absence status of one student in one course (GET /attendance/absence-status/...). */
export interface AbsenceLimitStatus {
  student_id: number;
  course_id: number;
  course_code?: string | null;
  course_name?: string | null;
  semester_weeks: number;
  periods_per_week: number;
  scheduled_periods: number;
  absences: number;
  unexcused_absences: number;
  excused_absences: number;
  /** Periods the student came late: not absences, shown for the evaluation (todo 77; absent from older servers). */
  late?: number;
  absence_percent: number;
  /** Fail limit (%): over it attendance is insufficient and the course is failed. */
  limit_percent: number;
  allowed_absences: number | null;
  remaining_absences: number | null;
  /** Over this limit (%) the Class Participation share counts as 0. */
  participation_limit_percent: number;
  participation_allowed_absences: number | null;
  participation_forfeited: boolean;
  status: 'ok' | 'warning' | 'insufficient' | 'unknown';
  attendance_insufficient: boolean;
}

export interface StudentCoursePerformance {
  id: number;
  course_code: string;
  course_name: string;
  credits?: number;
  semester: string;
  final_grade: number;
  letter_grade: string;
  gpa?: number;
  passed: boolean;
  /** Plan todo 87: why a failed course failed (not_passed, failed_absence_limit, failed_final_retake). */
  fail_reason?: string | null;
  archived_at: string;
}

export interface DailyPerformance {
  id: number;
  student_id: number;
  course_id: number;
  date: string;
  participation_score?: number;
  behavior_score?: number;
  notes?: string;
}

export interface Highlight {
  id: number;
  student_id: number;
  highlight_type: 'achievement' | 'concern' | 'note';
  title: string;
  // Legacy description field retained for compatibility with some views
  description: string;
  // Newer richer fields used by UI: whether the highlight is positive/negative, an optional
  // rating (1-5), a textual highlight_text that complements description and a category label.
  is_positive?: boolean;
  rating?: number;
  category?: string;
  highlight_text?: string;
  date: string;
  is_resolved: boolean;
  semester?: string;
}

export interface HighlightCreatePayload {
  student_id: number;
  semester: string;
  rating?: number | null;
  category?: string | null;
  highlight_text: string;
  is_positive?: boolean;
}

/** The two roles of the application: what an account can be created with. */
export type UserRole = 'admin' | 'teacher';

/**
 * What the Role column of an account can say: one of the two roles, or 'none' for an account
 * that holds no role (its roles were all revoked, or it was a Student, Viewer or Guest
 * account before those went). PATCH /admin/users accepts all three.
 */
export type AccountRole = UserRole | 'none';

export interface UserAccount {
  id: number;
  email: string;
  full_name?: string | null;
  role: AccountRole;
  is_active: boolean;
  password_change_required?: boolean;
  /** A self-registration awaiting approval (an admin-deactivated account is inactive but not pending) */
  registration_pending?: boolean;
  /** Set by PATCH /admin/users/{id} when the update activated the account. */
  activation_email?: 'sent' | 'failed' | 'not_configured' | null;
  // Allow extra unknown properties (auth/profile endpoints may include additional fields)
  [k: string]: unknown;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name?: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  full_name?: string | null;
  role?: AccountRole;
  is_active?: boolean;
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  pages: number;
  current_page: number;
}

export interface ImportResponse {
  created: number;
  updated: number;
  errors: string[];
  // Import responses may include additional metadata (validation_passed, total_errors, summary, etc.)
  [k: string]: unknown;
}

// Teaching schedule entry used across calendar and attendance components
export interface TeachingScheduleEntry {
  day: string;
  periods?: number;
  period_count?: number;
  count?: number;
  start_time?: string;
  duration?: number;
  location?: string;
}

export interface EnrollmentResponse {
  created: number;
  reactivated: number;
}

// Form types (for creating entities - is_active defaults handled by backend)
export interface StudentFormData {
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  enrollment_date: string;
  is_active?: boolean;
  father_name?: string;
  mobile_phone?: string;
  phone?: string;
  health_issue?: string;
  note?: string;
  study_year?: number;
  academic_year?: string;
  class_division?: string;
}

export interface CourseFormData {
  course_code: string;
  course_name: string;
  semester: string;
  description?: string;
  credits: number;
  hours_per_week?: number;
  periods_per_week?: number;
  academic_year?: string;
  absence_penalty?: number;
  is_active?: boolean;
}

export type GradeFormData = Omit<Grade, 'id'>;
export type AttendanceFormData = Omit<Attendance, 'id'>;

// Analytics types
export interface FinalGrade {
  student_id: number;
  course_id: number;
  course_name: string;
  final_grade: number;
  percentage: number;
  gpa: number;
  greek_grade: number;
  letter_grade: string;
  total_weight_used: number;
  /**
   * "rules": from the evaluation rules' categories; "average": no rule takes the grades, so the
   * final grade is their mean by Weight, an exam by its retake, else its latest grade (plan todo 77
   * point 3, todo 80).
   * Absent from older servers.
   */
  grade_basis?: 'rules' | 'average';
  category_breakdown: Record<string, {
    average: number;
    weight: number;
    contribution: number;
    total_items: number;
    /** True when over the Class Participation absence limit: the category counts as 0. */
    forfeited?: boolean;
  }>;
  absence_penalty: number;
  unexcused_absences: number;
  absence_deduction: number;
  // ΜΙΕΕΚ: over the fail limit is a flag only (the grade is never blocked); over the Class
  // Participation limit the Class Participation share already counts as 0 in final_grade.
  attendance_insufficient?: boolean;
  participation_forfeited?: boolean;
  // Points the ticked participation observations took off final_grade (already applied).
  participation_deduction?: number;
  absence_limit?: AbsenceLimitStatus;
  /** The periods recorded, by status (plan todo 77: a Late is attended; absent from older servers). */
  attendance?: { present: number; late: number; absent: number; excused: number; recorded: number };
  /** The retake of the final exam (plan todo 80), or null; absent from older servers. */
  final_exam_retake?: FinalExamRetake | null;
}

/**
 * A retake of the final exam (plan todo 80): the Final Exam grade the teacher marked as the retake,
 * which replaced the earlier sitting. Under 50 (`failed`) the course is failed whatever the final grade.
 */
export interface FinalExamRetake {
  /** The day it was taken, 'YYYY-MM-DD'; null for an undated grade. */
  date: string | null;
  percentage: number;
  failed: boolean;
}

// Utility types
export type ViewMode = 'students' | 'courses' | 'grades' | 'attendance' | 'performance' | 'analytics' | 'imports' | 'operations';
