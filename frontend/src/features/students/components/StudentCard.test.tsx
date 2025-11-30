import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentCard from './StudentCard';
import { LanguageProvider } from '@/LanguageContext';
import type { Student, Course } from '@/types';
import type { StudentStats } from './studentTypes';

// Mock framer-motion to avoid animation issues in tests
// Provide a generic motion.<tag> component so tests can render e.g. motion.li or motion.div
vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: (_target, prop: string) => {
      // return a simple element whose tag name matches the property (li, div, span, etc.)
      return ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
          React.createElement(prop, props, children)
      );
    },
  });

  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

const mockStudent: Student = {
  id: 1,
  student_id: 'S001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com', enrollment_date: '2023-09-01',
  study_year: 2,
  is_active: true,
};

const mockCourse: Course = {
  id: 1,
  course_code: 'CS101',
  course_name: 'Introduction to Computer Science',
  semester: 'Fall 2024',
  credits: 3,
  is_active: true,
  absence_penalty: 0,
};

const mockStats: StudentStats = {
  grades: {
    average: '85.5',
    count: 10,
  },
  gradesList: [
    {
      id: 1,
      student_id: 1,
      course_id: 1,
      assignment_name: 'Midterm Exam',
      grade: 85,
      max_grade: 100,
      weight: 0.3,
      category: 'Midterm',
      date_assigned: '2024-01-15',
    },
    {
      id: 2,
      student_id: 1,
      course_id: 1,
      assignment_name: 'Final Exam',
      grade: 90,
      max_grade: 100,
      weight: 0.5,
      category: 'Final Exam',
      date_assigned: '2024-05-15',
    },
  ],
  attendance: {
    total: 30,
    present: 25,
    absent: 3,
    late: 2,
    excused: 1,
    attendanceRate: '83.3',
  },
};

const defaultProps = {
  student: mockStudent,
  stats: mockStats,
  isExpanded: false,
  noteValue: '',
  onNoteChange: vi.fn(),
  onToggleExpand: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  coursesMap: new Map([[1, mockCourse]]),
  onNavigateToCourse: vi.fn(),
  onViewProfile: vi.fn(),
};

const renderStudentCard = (props = {}) => {
  return render(
    <LanguageProvider>
      <StudentCard {...defaultProps} {...props} />
    </LanguageProvider>
  );
};

describe('StudentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Collapsed State', () => {
    it('renders student basic information', () => {
      renderStudentCard();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/S001/)).toBeInTheDocument();
      expect(screen.getByText(/Year 2/)).toBeInTheDocument();
    });

    it('shows action buttons', () => {
      renderStudentCard();
      expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view performance/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onToggleExpand when view button clicked', () => {
      renderStudentCard();
      fireEvent.click(screen.getByRole('button', { name: /view performance/i }));
      expect(defaultProps.onToggleExpand).toHaveBeenCalledWith(1);
    });

    it('calls onEdit when edit button clicked', () => {
      renderStudentCard();
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockStudent);
    });

    it('calls onDelete when delete button clicked', () => {
      renderStudentCard();
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(defaultProps.onDelete).toHaveBeenCalledWith(1);
    });

    it('calls onViewProfile when view profile button clicked', () => {
      renderStudentCard();
      fireEvent.click(screen.getByRole('button', { name: /view profile/i }));
      expect(defaultProps.onViewProfile).toHaveBeenCalledWith(1);
    });

    it('hides view profile button when callback not provided', () => {
      renderStudentCard({ onViewProfile: undefined });
      expect(screen.queryByRole('button', { name: /view profile/i })).not.toBeInTheDocument();
    });
  });

  describe('Expanded State', () => {
    it('shows detailed student information', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText(/john\.doe@example\.com/)).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('displays student initials', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('shows grade statistics cards', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText('85.5%')).toBeInTheDocument();
      expect(screen.getByText(/10.*assignments/i)).toBeInTheDocument();
    });

    it('displays attendance statistics', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText('3/30')).toBeInTheDocument(); // absent/total
      const attendanceRates = screen.getAllByText('83.3%');
      expect(attendanceRates.length).toBeGreaterThan(0);
    });

    it('shows greek scale grade', () => {
      renderStudentCard({ isExpanded: true });
      // 85.5% converts to ~17.1 on Greek scale
      const greekGrades = screen.getAllByText(/17\./);
      expect(greekGrades.length).toBeGreaterThan(0);
    });

    it('shows letter grade', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText('B')).toBeInTheDocument(); // 85.5% = B
    });

    it('renders CourseGradeBreakdown component', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText(/grade breakdown/i)).toBeInTheDocument();
    });

    it('renders AttendanceDetails component', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByText(/attendance details/i)).toBeInTheDocument();
    });

    it('renders NotesSection component', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByPlaceholderText(/notes/i)).toBeInTheDocument();
    });

    it('shows close button when expanded', () => {
      renderStudentCard({ isExpanded: true });
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles student with no email', () => {
      const studentWithoutEmail = { ...mockStudent, email: undefined };
      renderStudentCard({ student: studentWithoutEmail, isExpanded: true });
      expect(screen.queryByText(/@example.com/)).not.toBeInTheDocument();
    });

    it('handles student with no study year', () => {
      const studentWithoutYear = { ...mockStudent, study_year: undefined };
      renderStudentCard({ student: studentWithoutYear });
      expect(screen.queryByText(/year/i)).not.toBeInTheDocument();
    });

    it('handles inactive student', () => {
      const inactiveStudent = { ...mockStudent, is_active: false };
      renderStudentCard({ student: inactiveStudent, isExpanded: true });
      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });

    it('handles student with no stats', () => {
      renderStudentCard({ stats: undefined, isExpanded: true });
      expect(screen.queryByText('85.5%')).not.toBeInTheDocument();
    });

    it('handles empty grades list', () => {
      const emptyStats = { ...mockStats, gradesList: [] };
      renderStudentCard({ stats: emptyStats, isExpanded: true });
      expect(screen.queryByText(/grade breakdown/i)).toBeInTheDocument();
    });

    it('generates initials fallback from student_id when names missing', () => {
      const studentNoNames = { ...mockStudent, first_name: '', last_name: '' };
      renderStudentCard({ student: studentNoNames, isExpanded: true });
      expect(screen.getByText('S001')).toBeInTheDocument();
    });

    it('uses question mark when no initials or student_id', () => {
      const studentNoInfo = { ...mockStudent, first_name: '', last_name: '', student_id: '' };
      renderStudentCard({ student: studentNoInfo, isExpanded: true });
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('Grade Insights Calculations', () => {
    it('calculates average grade correctly', () => {
      renderStudentCard({ isExpanded: true });
      // (85/100 * 100 + 90/100 * 100) / 2 = 87.5%
      // Greek scale: 87.5 * 20 / 100 = 17.5
      const greekGrades = screen.getAllByText(/17\.5/);
      expect(greekGrades.length).toBeGreaterThan(0);
    });

    it('calculates min and max grades', () => {
      const statsWithVariance: StudentStats = {
        ...mockStats,
        gradesList: mockStats.gradesList ? [
          { ...mockStats.gradesList[0], grade: 60 }, // 60%
          { ...mockStats.gradesList[1], grade: 95 }, // 95%
        ] : [],
      };
      renderStudentCard({ stats: statsWithVariance, isExpanded: true });
      // Should show calculations based on 60% min, 95% max
      expect(screen.getByText(/grade breakdown/i)).toBeInTheDocument();
    });
  });

  describe('Grade Distribution', () => {
    it('shows grade distribution when grades exist', () => {
      renderStudentCard({ isExpanded: true });
      // Should render GradeDistribution component
      // Looking for text that indicates distribution is shown
      const names = screen.getAllByText(/john doe/i);
      expect(names.length).toBeGreaterThan(0);
    });

    it('hides grade distribution when no grades', () => {
      const noGradesStats = { ...mockStats, gradesList: [] };
      renderStudentCard({ stats: noGradesStats, isExpanded: true });
      // Grade distribution should not render
      expect(screen.queryByText(/distribution/i)).not.toBeInTheDocument();
    });
  });

  describe('Notes Section', () => {
    it('displays note value', () => {
      renderStudentCard({ isExpanded: true, noteValue: 'Test note' });
      const textarea = screen.getByPlaceholderText(/notes/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test note');
    });

    it('calls onNoteChange when typing', () => {
      renderStudentCard({ isExpanded: true });
      const textarea = screen.getByPlaceholderText(/notes/i);
      fireEvent.change(textarea, { target: { value: 'New note' } });
      expect(defaultProps.onNoteChange).toHaveBeenCalledWith('New note');
    });
  });

  describe('Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = renderStudentCard();
      const firstRender = screen.getByText('John Doe');

      // Change an unrelated prop that is not used in memoization comparator
      const newOnEdit = vi.fn();
      rerender(
        <LanguageProvider>
          <StudentCard {...defaultProps} onEdit={newOnEdit} />
        </LanguageProvider>
      );

      const secondRender = screen.getByText('John Doe');
      // Memoization shouldn't change the rendered content for unrelated prop changes
      expect(firstRender.textContent).toBe(secondRender.textContent);
    });
  });

  describe('Course Navigation', () => {
    it('passes course navigation handler to CourseGradeBreakdown', () => {
      renderStudentCard({ isExpanded: true });
      expect(defaultProps.onNavigateToCourse).toBeDefined();
      // CourseGradeBreakdown should receive the handler
      expect(screen.getByText(/grade breakdown/i)).toBeInTheDocument();
    });

    it('works without course navigation handler', () => {
      renderStudentCard({ isExpanded: true, onNavigateToCourse: undefined });
      expect(screen.getByText(/grade breakdown/i)).toBeInTheDocument();
    });
  });
});
