import { describe, expect, it } from 'vitest';
import { courseFigures, overallFigure } from '../courseFigures';

// Plan todo 83: a course's figure is its final grade once the Final Exam is graded (the server's
// final_grade_ready), else the plain average of its grades so far; the overall figure counts each
// course once. Until November 2026 the overall figure was the plain mean of every grade.
const grades = [
  { course_id: 1, grade: 90, max_grade: 100 },
  { course_id: 1, grade: 70, max_grade: 100 },
  { course_id: 1, grade: 80, max_grade: 100 },
  { course_id: 2, grade: 10, max_grade: 20 },
];

describe('the figure of each course', () => {
  it('is the average of its grades while its final grade is not ready', () => {
    const figures = courseFigures(grades, [{ course_id: 1, course_code: 'A', final_grade: 55, final_grade_ready: false }]);

    expect(figures.get(1)).toEqual({ courseId: 1, percentage: 80, basis: 'average' });
    expect(figures.get(2)).toEqual({ courseId: 2, percentage: 50, basis: 'average' });
  });

  it('is its final grade once ready, a course with no grades of its own too', () => {
    const figures = courseFigures(grades, [
      { course_id: 1, course_code: 'A', final_grade: 61.5, final_grade_ready: true },
      { course_id: 3, course_code: 'C', final_grade: 88, final_grade_ready: true },
    ]);

    expect(figures.get(1)).toEqual({ courseId: 1, percentage: 61.5, basis: 'final' });
    expect(figures.get(3)).toEqual({ courseId: 3, percentage: 88, basis: 'final' });
    expect(figures.get(2)?.basis).toBe('average');
  });

  it('counts each course once in the overall figure', () => {
    // (61.5 + 50) / 2, where the mean of every grade would have been (90 + 70 + 80 + 50) / 4 = 72.5.
    expect(overallFigure(courseFigures(grades, [{ course_id: 1, course_code: 'A', final_grade: 61.5, final_grade_ready: true }]))).toBe(55.75);
    expect(overallFigure(courseFigures([], null))).toBeNull();
  });
});
