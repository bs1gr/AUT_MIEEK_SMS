/**
 * Grade sheets of a course (backend/routers/routers_grade_sheets.py, plan todo 75): one
 * assessment, every assessment, or by category, as JSON for the page and as PDF or Excel.
 *
 * Only the default `apiClient` is imported from './api', as in lessonLogsAPI: a test that mocks
 * '@/api/api' with just a default export keeps working.
 */
import apiClient from './api';

export type GradeSheetKind = 'assessment' | 'matrix' | 'categories';
export type GradeSheetFormat = 'pdf' | 'excel';
/** A student's course result: over the absence limit the course is failed whatever the grade. */
export type CourseResult = 'passed' | 'failed' | 'failed_absences' | null;

export interface GradeSheetCourse {
  id: number;
  course_code: string;
  course_name: string;
  semester: string | null;
}

export interface GradeSheetStudent {
  id: number;
  /** The registration number. */
  student_id: string;
  last_name: string;
  first_name: string;
}

export interface GradeSheetAssessment {
  key: string;
  name: string;
  category: string | null;
  /** The standard category it folds to, for comparing across courses (null: none). */
  category_key: string | null;
  /** Set only when the category IS a standard name: then it is shown translated. */
  label_key: string | null;
  max_grade: number | null;
  first_date: string | null;
  last_date: string | null;
  graded: number;
  enrolled: number;
  /** Another assessment of the course has the same name (under another category). */
  shared_name: boolean;
}

export interface AssessmentList {
  course: GradeSheetCourse;
  enrolled: number;
  assessments: GradeSheetAssessment[];
}

interface RowBase {
  number: number;
  student: GradeSheetStudent;
}

export interface AssessmentRow extends RowBase {
  score: number | null;
  max_grade: number | null;
  percentage: number | null;
  date: string | null;
  /** How many grades the student has for the assessment; the latest one is shown. */
  entries: number;
  passed: boolean | null;
}

export interface FinalFields {
  final_grade: number | null;
  /** "rules": the course's evaluation rules; "average": the mean of the grades. */
  grade_basis: 'rules' | 'average' | null;
  result: CourseResult;
  absence_status: string | null;
  participation_forfeited: boolean;
  participation_deduction: number | null;
  absence_deduction: number | null;
  /** Periods the student came late (plan todo 77): attended, not absences; absent from older servers. */
  late?: number;
}

export interface MatrixRow extends RowBase, FinalFields {
  cells: (number | null)[];
}

export interface CategoriesRow extends MatrixRow {
  /** Per cell: the final grade zeroed this category because of absences. */
  forfeited: boolean[];
}

export interface CategoryColumn {
  key: string;
  category: string | null;
  category_key: string | null;
  label_key: string | null;
  /** The weight the final grade gives the rule (null: a course without rules). */
  weight: number | null;
}

export interface AssessmentSummary {
  enrolled: number;
  graded: number;
  missing: number;
  average: number | null;
  median: number | null;
  highest: number | null;
  lowest: number | null;
  passed: number;
  failed: number;
}

export interface FinalSummary {
  enrolled: number;
  final_average: number | null;
  passed: number;
  failed: number;
  failed_absences: number;
  no_grade: number;
}

export interface AssessmentSheet {
  kind: 'assessment';
  course: GradeSheetCourse;
  assessment: GradeSheetAssessment;
  rows: AssessmentRow[];
  summary: AssessmentSummary;
}

export interface MatrixSheet {
  kind: 'matrix';
  course: GradeSheetCourse;
  columns: GradeSheetAssessment[];
  column_averages: (number | null)[];
  rows: MatrixRow[];
  summary: FinalSummary;
}

export interface CategoriesSheet {
  kind: 'categories';
  course: GradeSheetCourse;
  basis: 'rules' | 'grades';
  columns: CategoryColumn[];
  column_averages: (number | null)[];
  rows: CategoriesRow[];
  summary: FinalSummary;
}

export type GradeSheet = AssessmentSheet | MatrixSheet | CategoriesSheet;

export interface GradeSheetExportParams {
  kind: GradeSheetKind;
  assessment?: string;
  /** 'en' or 'el': the language of the file. */
  lang?: string;
}

export interface GradeSheetFile {
  blob: Blob;
  filename: string;
}

/** The body itself, or its `data` when the server wrapped it in the {success, data} envelope. */
const unwrap = <T>(body: unknown): T => {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

export const gradeSheetsAPI = {
  /** Every assessment of the course, oldest first, with how many students have a grade. */
  assessments: async (courseId: number): Promise<AssessmentList> => {
    const response = await apiClient.get(`/grade-sheets/course/${courseId}/assessments`);
    return unwrap<AssessmentList>(response.data);
  },

  /** One sheet of the course: kind "assessment" needs the assessment's key. */
  sheet: async (courseId: number, kind: GradeSheetKind, assessment?: string): Promise<GradeSheet> => {
    const params = { kind, ...(kind === 'assessment' && assessment ? { assessment } : {}) };
    const response = await apiClient.get(`/grade-sheets/course/${courseId}`, { params });
    return unwrap<GradeSheet>(response.data);
  },

  /** The sheet as a PDF to print or an Excel file, with the signed-in teacher's name on it. */
  exportFile: async (
    courseId: number,
    format: GradeSheetFormat,
    { kind, assessment, lang }: GradeSheetExportParams
  ): Promise<GradeSheetFile> => {
    const params = {
      kind,
      ...(kind === 'assessment' && assessment ? { assessment } : {}),
      ...(lang ? { lang } : {}),
    };
    const response = await apiClient.get<Blob>(`/grade-sheets/course/${courseId}/export/${format}`, {
      params,
      responseType: 'blob',
    });
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    // The header is not always readable (cross-origin on the phone), so there is a fallback name.
    const disposition = String((response.headers as Record<string, unknown> | undefined)?.['content-disposition'] ?? '');
    const named = /filename="?([A-Za-z0-9._-]+)"?/.exec(disposition)?.[1];
    return { blob: response.data, filename: named || `grade_sheet_${courseId}_${kind}.${extension}` };
  },
};

export default gradeSheetsAPI;
