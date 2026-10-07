import { useQuery } from '@tanstack/react-query';
import { apiClient, extractAPIResponseData } from '@/api/api';

/**
 * Analytics page overview (GET /analytics/overview and /analytics/student/{id}/overview).
 * Grades are course final grades in percent (null = nothing graded yet); attendance counts
 * Present and Late as attended, as the ΜΙΕΕΚ absence limit does.
 */
export type AbsenceStatus = 'ok' | 'warning' | 'insufficient' | 'unknown';

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  recorded: number;
  rate: number | null;
}

export interface ClassOverview {
  scope: { academic_year: string | null; class_division: string | null; course_id: number | null };
  filters: { academic_years: string[]; class_divisions: string[] };
  summary: {
    students: number;
    courses: number;
    enrollments: number;
    graded_enrollments: number;
    average_final_grade: number | null;
    pass_rate: number | null;
    attendance_rate: number | null;
    at_risk_students: number;
  };
  distribution: { band: string; count: number }[];
  courses: {
    id: number;
    course_code: string;
    course_name: string;
    students: number;
    graded: number;
    average_final_grade: number | null;
    passing: number;
    failing: number;
    attendance_rate: number | null;
    attendance: AttendanceCounts;
    absence_warning: number;
    absence_insufficient: number;
  }[];
  students: {
    id: number;
    student_id: string;
    name: string;
    academic_year: string | null;
    class_division: string | null;
    courses: number;
    average_final_grade: number | null;
    failing_courses: string[];
    attendance_rate: number | null;
    absence_status: AbsenceStatus | null;
    at_risk: boolean;
  }[];
}

export interface StudentOverviewCourse {
  id: number;
  course_code: string;
  course_name: string;
  final_grade: number | null;
  grade_basis: 'rules' | 'average' | null;
  grade_count: number;
  passing: boolean | null;
  class_average: number | null;
  rank: number | null;
  ranked_of: number;
  attendance: AttendanceCounts;
  absence: {
    status: AbsenceStatus | null;
    absences: number | null;
    allowed_absences: number | null;
    remaining_absences: number | null;
    absence_percent: number | null;
    limit_percent: number | null;
  };
  grades: { date: string | null; category: string | null; assignment: string | null; percentage: number }[];
}

export interface StudentOverview {
  student: {
    id: number;
    student_id: string;
    name: string;
    academic_year: string | null;
    class_division: string | null;
    is_active: boolean;
  };
  summary: {
    courses: number;
    graded_courses: number;
    average_final_grade: number | null;
    passing: number;
    failing: number;
    attendance: AttendanceCounts;
    absence_status: AbsenceStatus | null;
    at_risk: boolean;
  };
  courses: StudentOverviewCourse[];
}

export interface ClassOverviewParams {
  academicYear?: string;
  classDivision?: string;
  courseId?: number | null;
}

export function useClassOverview({ academicYear, classDivision, courseId }: ClassOverviewParams) {
  return useQuery({
    queryKey: ['analytics', 'overview', academicYear ?? '', classDivision ?? '', courseId ?? null],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (academicYear) params.academic_year = academicYear;
      if (classDivision) params.class_division = classDivision;
      if (courseId) params.course_id = courseId;
      const response = await apiClient.get('/analytics/overview', { params });
      return extractAPIResponseData<ClassOverview>(response.data ?? response);
    },
    staleTime: 60 * 1000,
  });
}

export function useStudentOverview(studentId: number | null) {
  return useQuery({
    queryKey: ['analytics', 'student-overview', studentId],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/student/${studentId}/overview`);
      return extractAPIResponseData<StudentOverview>(response.data ?? response);
    },
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });
}
