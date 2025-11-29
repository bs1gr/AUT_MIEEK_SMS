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
}

export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  semester: string;
  description?: string;
  credits: number;
  hours_per_week?: number;
  // Optional canonical year and instructor fields used in some views and tests
  year?: number;
  instructor?: string;
  // Optional structured teaching schedule - backend may provide either an array of schedule
  // entries or a record keyed by day name. Keep permissive union to match both shapes used
  // across the UI_helpers and calendar utilities.
  teaching_schedule?: Array<{ day: string; start_time: string; end_time?: string; periods?: number; duration?: number; location?: string; }> | Record<string, { periods?: number; start_time?: string; duration?: number }>;
  // Optional evaluation rules attached to the course used by grading and analytics views
  evaluation_rules?: Array<{ id?: number; category: string; weight?: number; description?: string }>;
  academic_year?: string;
  absence_penalty?: number;
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
  date_submitted?: string;
  notes?: string;
}

export interface Attendance {
  id: number;
  student_id: number;
  course_id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  notes?: string;
}

export interface CourseEnrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrolled_at?: string;
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

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserAccount {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
  password_change_required?: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name?: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  full_name?: string | null;
  role?: UserRole;
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
}

export interface CourseFormData {
  course_code: string;
  course_name: string;
  semester: string;
  description?: string;
  credits: number;
  hours_per_week?: number;
  academic_year?: string;
  absence_penalty?: number;
  is_active?: boolean;
}

export interface GradeFormData extends Omit<Grade, 'id'> {}
export interface AttendanceFormData extends Omit<Attendance, 'id'> {}

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
  category_breakdown: Record<string, {
    average: number;
    weight: number;
    contribution: number;
    total_items: number;
  }>;
  absence_penalty: number;
  unexcused_absences: number;
  absence_deduction: number;
  // Optional human-readable Greek description present in some analytics responses
  greek_description?: string;
}

// Utility types
export type ViewMode = 'students' | 'courses' | 'grades' | 'attendance' | 'performance' | 'analytics' | 'imports' | 'operations';
