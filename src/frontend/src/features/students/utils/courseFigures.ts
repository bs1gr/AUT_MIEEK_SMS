/**
 * A course's figure where the pages show an average (plan todo 83, the owner, 2026-11-24): "should
 * show averages if not exams grades published yet. otherwise, the real grades should populate", the
 * Final Exam's grade deciding. Once the server says the final grade is ready (`final_grade_ready`:
 * the Final Exam graded, or a course whose rules name no Final Exam) the course's figure is its final
 * grade, the one figure of every page (todo 77); until then the plain average of its grades so far.
 * Until November 2026 these figures were the plain mean of every grade, whatever the exams.
 */

interface GradeLike {
  course_id: number;
  grade: number;
  max_grade: number;
}

/** One course of GET /analytics/student/{id}/all-courses-summary. */
export interface CourseSummaryEntry {
  course_id?: number;
  course_code: string;
  final_grade: number;
  final_grade_ready?: boolean;
}

export interface CourseFigure {
  courseId: number;
  percentage: number;
  /** "final": the course's final grade; "average": the plain average of its grades so far. */
  basis: 'final' | 'average';
}

export function courseFigures(
  grades: ReadonlyArray<GradeLike>,
  summary?: ReadonlyArray<CourseSummaryEntry> | null,
): Map<number, CourseFigure> {
  const figures = new Map<number, CourseFigure>();
  const byCourse = new Map<number, number[]>();
  grades.forEach((g) => {
    if (!g.max_grade) return;
    const list = byCourse.get(g.course_id) ?? [];
    list.push((g.grade / g.max_grade) * 100);
    byCourse.set(g.course_id, list);
  });
  byCourse.forEach((percentages, courseId) => {
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    figures.set(courseId, { courseId, percentage: average, basis: 'average' });
  });
  (summary ?? []).forEach((course) => {
    if (course.final_grade_ready && typeof course.course_id === 'number' && Number.isFinite(course.final_grade)) {
      figures.set(course.course_id, { courseId: course.course_id, percentage: course.final_grade, basis: 'final' });
    }
  });
  return figures;
}

/** Over every course, each counted once: the mean of their figures; null without any. */
export function overallFigure(figures: Map<number, CourseFigure>): number | null {
  if (!figures.size) return null;
  let sum = 0;
  figures.forEach((f) => { sum += f.percentage; });
  return sum / figures.size;
}
