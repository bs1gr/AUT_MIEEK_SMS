import type { Attendance, Grade } from '@/types';

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
  attendanceList?: Attendance[];
  courseSummary?: Array<{
    course_code: string;
    course_name: string;
    credits: number;
    final_grade: number;
    gpa: number;
    letter_grade: string;
    /** Absent from older servers. */
    course_id?: number;
    /** Plan todo 83: the final grade is the course's figure (else the average so far); absent from older servers. */
    final_grade_ready?: boolean;
  }>;
  error?: boolean;
}
