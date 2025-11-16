import type { Grade } from '@/types';

export interface StudentStats {
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: string;
  };
  grades: {
    count: number;
    average: string;
  };
  finalGrade?: {
    overallGPA: number;
    greekGrade: number;
    percentage: number;
    letterGrade: string;
    totalCourses: number;
  };
  gradesList?: Grade[];
  courseSummary?: Array<{
    course_code: string;
    course_name: string;
    credits: number;
    final_grade: number;
    gpa: number;
    letter_grade: string;
  }>;
  error?: boolean;
}
