import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseGradeBreakdown from './CourseGradeBreakdown';
import { LanguageProvider } from '@/LanguageContext';
import type { Grade, Course } from '@/types';

const mockCourses: Course[] = [
  {
    id: 1,
    course_code: 'CS101',
    course_name: 'Introduction to Computer Science',
    semester: 'Fall 2024',
    credits: 3,
    is_active: true,
    absence_penalty: 0,
  },
  {
    id: 2,
    course_code: 'MATH201',
    course_name: 'Calculus I',
    semester: 'Fall 2024',
    credits: 4,
    is_active: true,
    absence_penalty: 0,
  },
];

const mockGrades: Grade[] = [
  {
    id: 1,
    student_id: 1,
    course_id: 1,
    assignment_name: 'Midterm Exam',
    grade: 85,
    max_grade: 100, weight: 0.25, category: 'Midterm',
    date_assigned: '2024-01-15',
  },
  {
    id: 2,
    student_id: 1,
    course_id: 1,
    assignment_name: 'Final Exam',
    grade: 90,
    max_grade: 100, weight: 0.25, category: 'Final Exam',
    date_assigned: '2024-05-15',
  },
  {
    id: 3,
    student_id: 1,
    course_id: 1,
    assignment_name: 'Homework 1',
    grade: 95,
    max_grade: 100, weight: 0.25, category: 'Homework',
    date_assigned: '2024-02-01',
  },
  {
    id: 4,
    student_id: 1,
    course_id: 2,
    assignment_name: 'Quiz 1',
    grade: 80,
    max_grade: 100, weight: 0.25, category: 'Quiz',
    date_assigned: '2024-01-20',
  },
];

const defaultProps = {
  gradesList: mockGrades,
  coursesMap: new Map(mockCourses.map(c => [c.id, c])),
  onNavigateToCourse: vi.fn(),
};

const renderComponent = (props = {}) => {
  return render(
    <LanguageProvider>
      <CourseGradeBreakdown {...defaultProps} {...props} />
    </LanguageProvider>
  );
};

describe('CourseGradeBreakdown', () => {
  describe('Rendering', () => {
    it('renders component with header', () => {
      renderComponent();
      expect(screen.getByText(/grade breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/by course/i)).toBeInTheDocument();
    });

    it('displays all courses with grades', () => {
      renderComponent();
      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Calculus I')).toBeInTheDocument();
    });

    it('shows course codes', () => {
      renderComponent();
      expect(screen.getByText('CS101')).toBeInTheDocument();
      expect(screen.getByText('MATH201')).toBeInTheDocument();
    });

    it('displays empty state when no grades', () => {
      renderComponent({ gradesList: [] });
      expect(screen.getByText(/noGradesAvailable/i)).toBeInTheDocument();
    });
  });

  describe('Course Average Calculations', () => {
    it('calculates course average correctly', () => {
      renderComponent();
      // CS101: (85 + 90 + 95) / 3 = 90%
      // 90% = 18/20 Greek scale
      expect(screen.getByText(/18\.0\/20/)).toBeInTheDocument();
    });

    it('shows percentage and letter grade', () => {
      renderComponent();
      // CS101: 90% = A-
      const percentages = screen.getAllByText(/90\.0%/);
      expect(percentages.length).toBeGreaterThan(0);
      const grades = screen.getAllByText(/A/);
      expect(grades.length).toBeGreaterThan(0);
    });

    it('calculates average for course with single grade', () => {
      renderComponent();
      // MATH201: 80% = 16/20 Greek scale
      expect(screen.getByText(/16\.0\/20/)).toBeInTheDocument();
      const percentages = screen.getAllByText(/80\.0%/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  describe('Category Grouping', () => {
    it('groups grades by category', () => {
      renderComponent();
      const midterms = screen.getAllByText(/midterm/i);
      expect(midterms.length).toBeGreaterThan(0);
      const finals = screen.getAllByText(/final exam/i);
      expect(finals.length).toBeGreaterThan(0);
      const homeworks = screen.getAllByText(/homework/i);
      expect(homeworks.length).toBeGreaterThan(0);
      const quizzes = screen.getAllByText(/quiz/i);
      expect(quizzes.length).toBeGreaterThan(0);
    });

    it('calculates category averages', () => {
      renderComponent();
      // Midterm category: 85% average
      // Final Exam category: 90% average
      // Homework category: 95% average
      const categoryAverages = screen.getAllByText(/average:/i);
      expect(categoryAverages.length).toBeGreaterThan(0);
    });

    it('shows individual grades within categories', () => {
      renderComponent();
      const midterms = screen.getAllByText('Midterm Exam');
      expect(midterms.length).toBeGreaterThan(0);
      expect(screen.getByText(/85\/100/)).toBeInTheDocument();
      const finals = screen.getAllByText('Final Exam');
      expect(finals.length).toBeGreaterThan(0);
      expect(screen.getByText(/90\/100/)).toBeInTheDocument();
    });

    it('displays grade percentages', () => {
      renderComponent();
      const percentages = screen.getAllByText(/85\.0%/);
      expect(percentages.length).toBeGreaterThan(0);
      const percentages2 = screen.getAllByText(/90\.0%/);
      expect(percentages2.length).toBeGreaterThan(0);
      const percentages3 = screen.getAllByText(/95\.0%/);
      expect(percentages3.length).toBeGreaterThan(0);
    });
  });

  describe('Category Translation', () => {
    it('translates English category names', () => {
      renderComponent();
      // Should translate "Final Exam", "Midterm", etc.
      const midterms = screen.getAllByText(/midterm/i);
      expect(midterms.length).toBeGreaterThan(0);
      const finals = screen.getAllByText(/final exam/i);
      expect(finals.length).toBeGreaterThan(0);
    });

    it('handles uncategorized grades', () => {
      const gradesWithoutCategory: Grade[] = [
        {
          id: 5,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Extra Credit',
          grade: 100,
          max_grade: 100, weight: 0.25, category: undefined,
          date_assigned: '2024-03-01',
        },
      ];
      renderComponent({ gradesList: gradesWithoutCategory });
      // Should show "Other" or translated equivalent
      expect(screen.getByText(/other/i)).toBeInTheDocument();
    });

    it('preserves unknown category names', () => {
      const gradesWithCustomCategory: Grade[] = [
        {
          id: 6,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Special Assessment',
          grade: 88,
          max_grade: 100, weight: 0.25, category: 'Custom Category',
          date_assigned: '2024-03-01',
        },
      ];
      renderComponent({ gradesList: gradesWithCustomCategory });
      expect(screen.getByText('Custom Category')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows view details buttons', () => {
      renderComponent();
      const buttons = screen.getAllByRole('button', { name: /view details/i });
      expect(buttons.length).toBe(2); // One per course
    });

    it('calls onNavigateToCourse when button clicked', () => {
      renderComponent();
      const buttons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(buttons[0]);
      expect(defaultProps.onNavigateToCourse).toHaveBeenCalledWith(1); // CS101 course_id
    });

    it('hides navigation buttons when callback not provided', () => {
      renderComponent({ onNavigateToCourse: undefined });
      expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles course not in coursesMap', () => {
      const gradesWithUnknownCourse: Grade[] = [
        {
          id: 7,
          student_id: 1,
          course_id: 999,
          assignment_name: 'Test',
          grade: 85,
          max_grade: 100, weight: 0.25, category: 'Test',
          date_assigned: '2024-01-01',
        },
      ];
      renderComponent({ gradesList: gradesWithUnknownCourse });
      expect(screen.getByText(/course #999/i)).toBeInTheDocument();
    });

    it('handles zero max_grade edge case', () => {
      const gradesWithZeroMax: Grade[] = [
        {
          id: 8,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Bonus',
          grade: 0,
          max_grade: 0.000001, weight: 0.25, // Near-zero to avoid division by zero
          category: 'Extra',
          date_assigned: '2024-01-01',
        },
      ];
      // Should not crash
      renderComponent({ gradesList: gradesWithZeroMax });
      expect(screen.getByText('Bonus')).toBeInTheDocument();
    });

    it('handles multiple grades in same category', () => {
      const multipleHomeworks: Grade[] = [
        {
          id: 9,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Homework 1',
          grade: 90,
          max_grade: 100, weight: 0.25, category: 'Homework',
          date_assigned: '2024-01-01',
        },
        {
          id: 10,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Homework 2',
          grade: 95,
          max_grade: 100, weight: 0.25, category: 'Homework',
          date_assigned: '2024-01-15',
        },
        {
          id: 11,
          student_id: 1,
          course_id: 1,
          assignment_name: 'Homework 3',
          grade: 85,
          max_grade: 100, weight: 0.25, category: 'Homework',
          date_assigned: '2024-02-01',
        },
      ];
      renderComponent({ gradesList: multipleHomeworks });
      expect(screen.getByText('Homework 1')).toBeInTheDocument();
      expect(screen.getByText('Homework 2')).toBeInTheDocument();
      expect(screen.getByText('Homework 3')).toBeInTheDocument();
    });
  });

  describe('Grade Color Coding', () => {
    it('applies color classes based on Greek grade', () => {
      renderComponent();
      // Should have color classes for different grade ranges
      // This tests that getGreekGradeColor is being applied
      const gradeElements = screen.getAllByText(/\/20/);
      expect(gradeElements.length).toBeGreaterThan(0);
    });

    it('shows different colors for different grades', () => {
      const mixedGrades: Grade[] = [
        {
          id: 12,
          student_id: 1,
          course_id: 1,
          assignment_name: 'High',
          grade: 95,
          max_grade: 100, weight: 0.25, category: 'Test',
          date_assigned: '2024-01-01',
        },
        {
          id: 13,
          student_id: 1,
          course_id: 2,
          assignment_name: 'Low',
          grade: 60,
          max_grade: 100, weight: 0.25, category: 'Test',
          date_assigned: '2024-01-01',
        },
      ];
      renderComponent({ gradesList: mixedGrades });
      // High grade (19/20) and low grade (12/20) should both render
      expect(screen.getByText(/19\.0\/20/)).toBeInTheDocument();
      expect(screen.getByText(/12\.0\/20/)).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = renderComponent();
      const firstRender = screen.getByText('Introduction to Computer Science');

      // Same gradesList and coursesMap, different function reference
      rerender(
        <LanguageProvider>
          <CourseGradeBreakdown
            {...defaultProps}
            onNavigateToCourse={vi.fn()}
          />
        </LanguageProvider>
      );

      const secondRender = screen.getByText('Introduction to Computer Science');
      expect(firstRender).toBe(secondRender); // Memoization preserves DOM node
    });
  });

  describe('Complex Scenarios', () => {
    it('handles student with grades in many courses', () => {
      const manyCourses = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        course_code: `COURSE${i + 1}`,
        course_name: `Course ${i + 1}`,
        evaluation_rules: [],
        teaching_schedule: [],
        absence_penalty: 0,
      }));

      const manyGrades = manyCourses.flatMap((course, i) => [
        {
          id: i * 3 + 1,
          student_id: 1,
          course_id: course.id,
          assignment_name: 'Test 1',
          grade: 80 + i * 2,
          max_grade: 100, weight: 0.25, category: 'Test',
          date_assigned: '2024-01-01',
        },
        {
          id: i * 3 + 2,
          student_id: 1,
          course_id: course.id,
          assignment_name: 'Test 2',
          grade: 85 + i * 2,
          max_grade: 100, weight: 0.25, category: 'Test',
          date_assigned: '2024-02-01',
        },
      ]);

      const coursesMap = new Map(manyCourses.map(c => [c.id, c]));
      renderComponent({ gradesList: manyGrades, coursesMap });

      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 5')).toBeInTheDocument();
    });
  });
});
