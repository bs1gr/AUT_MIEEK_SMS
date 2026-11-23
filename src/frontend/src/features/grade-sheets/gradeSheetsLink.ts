/**
 * The address of the grade sheets page (plan todo 75), for the pages that link to it: Utils →
 * Reports, the Grading page, Analytics. Kept apart from the page itself, which is loaded only
 * when it is opened.
 */
import type { GradeSheetKind } from '@/api/gradeSheetsAPI';

export const GRADE_SHEETS_PATH = '/operations/reports/grade-sheets';

/** The grade sheets of a course, opened on a kind of sheet when one is given. */
export const gradeSheetsLink = (courseId?: number | string | null, kind?: GradeSheetKind): string => {
  const params = new URLSearchParams();
  if (courseId) params.set('courseId', String(courseId));
  if (kind) params.set('kind', kind);
  const query = params.toString();
  return query ? `${GRADE_SHEETS_PATH}?${query}` : GRADE_SHEETS_PATH;
};
