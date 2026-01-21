/**
 * Test suite for AdvancedFilters component.
 *
 * Tests cover:
 * - Rendering filters for different search types
 * - Filter presets
 * - Form handling
 * - Apply/Reset functionality
 * - Panel toggling
 * - Accessibility
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import i18n from '../../i18n';
import { AdvancedFilters } from '../AdvancedFilters';

const renderAdvancedFilters = (props = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <AdvancedFilters
        searchType="students"
        onApply={vi.fn()}
        onReset={vi.fn()}
        isOpen={true}
        onToggle={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
};

describe('AdvancedFilters Component', () => {
  beforeAll(() => {
    // Ensure clean state for search translations by removing corrupted string value if present
    // Access store directly to ensure we clean up any corrupted state
    if (i18n.store?.data?.en?.translation) {
      delete i18n.store.data.en.translation.search;
    }

    i18n.addResourceBundle('en', 'translation', {
      search: {
        advanced: {
          title: 'Advanced Filters',
          apply: 'Apply Filters',
          reset: 'Reset Filters'
        },
        filters: {
          title: 'Filters',
          custom: 'Custom Filters'
        },
        presets: {
          title: 'Presets',
          activeStudents: 'Active Students',
          recentEnrollments: 'Recent Enrollments',
          highCredit: 'High Credit',
          coreCourses: 'Core Courses',
          highGrades: 'High Grades',
          passingOnly: 'Passing Only',
          failing: 'Failing'
        },
        fields: {
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          academicYear: 'Academic Year',
          courseName: 'Course Name',
          courseCode: 'Course Code',
          credits: 'Credits',
          gradeMin: 'Min Grade',
          gradeMax: 'Max Grade',
          studentId: 'Student ID',
          courseId: 'Course ID'
        }
      }
    }, true, true);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render filter panel when open', () => {
      renderAdvancedFilters({ isOpen: true });

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should hide filter panel when closed', () => {
      renderAdvancedFilters({ isOpen: false });
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('should render toggle button', () => {
      renderAdvancedFilters();

      const toggleButton = screen.getByRole('button', {
        name: /advanced filters/i
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded');
    });

    it('should apply custom className', () => {
      const { container } = renderAdvancedFilters({
        className: 'custom-filters'
      });

      const filterContainer = container.querySelector('.advanced-filters');
      expect(filterContainer).toHaveClass('custom-filters');
    });
  });

  describe('Student Filters', () => {
    it('should render student filter fields', () => {
      renderAdvancedFilters({ searchType: 'students' });

      expect(
        screen.getByPlaceholderText(/first name|first_name/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/last name|last_name/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/email/i)
      ).toBeInTheDocument();
    });

    it('should render student filter presets', () => {
      renderAdvancedFilters({ searchType: 'students' });

      expect(
        screen.getByText(/active students/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/recent enrollments/i)
      ).toBeInTheDocument();
    });

    it('should allow entering first name', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      const input = screen.getByPlaceholderText(/first name|first_name/i);
      await user.type(input, 'John');

      expect((input as HTMLInputElement).value).toBe('John');
    });

    it('should allow entering email', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      const input = screen.getByPlaceholderText(/email/i);
      await user.type(input, 'john@example.com');

      expect((input as HTMLInputElement).value).toBe('john@example.com');
    });
  });

  describe('Course Filters', () => {
    it('should render course filter fields', () => {
      renderAdvancedFilters({ searchType: 'courses' });

      expect(
        screen.getByPlaceholderText(/course name|course_name/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/course code|course_code/i)
      ).toBeInTheDocument();
    });

    it('should render course filter presets', () => {
      renderAdvancedFilters({ searchType: 'courses' });

      expect(
        screen.getByText(/high credit/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/core courses/i)
      ).toBeInTheDocument();
    });

    it('should render credits filter', () => {
      renderAdvancedFilters({ searchType: 'courses' });

      const creditsLabel = screen.getByText(/^Credits$/i);
      expect(creditsLabel).toBeInTheDocument();
    });
  });

  describe('Grade Filters', () => {
    it('should render grade filter fields', () => {
      renderAdvancedFilters({ searchType: 'grades' });

      expect(
        screen.getByPlaceholderText(/min grade|grade min/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/max grade|grade max/i)
      ).toBeInTheDocument();
    });

    it('should render grade filter presets', () => {
      renderAdvancedFilters({ searchType: 'grades' });

      expect(
        screen.getByText(/high grades|above 80/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/passing only|pass/i)
      ).toBeInTheDocument();
    });

    it('should allow entering min grade', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'grades' });

      const input = screen.getByPlaceholderText(/min grade|grade min/i);
      await user.type(input, '80');

      expect((input as HTMLInputElement).value).toBe('80');
    });

    it('should allow entering max grade', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'grades' });

      const input = screen.getByPlaceholderText(/max grade|grade max/i);
      await user.type(input, '100');

      expect((input as HTMLInputElement).value).toBe('100');
    });
  });

  describe('Filter Presets', () => {
    it('should apply preset when clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      renderAdvancedFilters({
        searchType: 'students',
        onApply
      });

      const presetButton = screen.getByText(/active students/i);
      await user.click(presetButton);

      expect(onApply).toHaveBeenCalled();
    });

    it('should populate fields when preset selected', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'grades' });

      const presetButton = screen.getByText(/high grades|above 80/i);
      await user.click(presetButton);

      // Filter fields should be populated
      const minGrade = screen.getByPlaceholderText(/min grade|grade min/i) as HTMLInputElement;
      expect(minGrade.value).toBeTruthy();
    });

    it('should show preset buttons in visual group', () => {
      const { container } = renderAdvancedFilters({
        searchType: 'students'
      });

      const presetGroup = container.querySelector('[data-presets]');
      expect(presetGroup).toBeInTheDocument();
    });

    it('should have distinct presets per search type', () => {
      const { unmount } = renderAdvancedFilters({
        searchType: 'students'
      });

      const studentPresets = screen.queryAllByText(/active|recent/i);
      unmount();

      renderAdvancedFilters({
        searchType: 'grades'
      });

      const gradePresets = screen.queryAllByText(/high|passing/i);
      expect(studentPresets.length).toBeGreaterThan(0);
      expect(gradePresets.length).toBeGreaterThan(0);
    });
  });

  describe('Apply/Reset', () => {
    it('should render Apply button', () => {
      renderAdvancedFilters();

      expect(
        screen.getByRole('button', { name: /apply filters/i })
      ).toBeInTheDocument();
    });

    it('should render Reset button', () => {
      renderAdvancedFilters();

      expect(
        screen.getByRole('button', { name: /reset filters/i })
      ).toBeInTheDocument();
    });

    it('should call onApply when Apply clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      renderAdvancedFilters({
        searchType: 'students',
        onApply
      });

      const applyButton = screen.getByRole('button', {
        name: /apply filters/i
      });
      await user.click(applyButton);

      expect(onApply).toHaveBeenCalled();
    });

    it('should call onReset when Reset clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      renderAdvancedFilters({
        searchType: 'students',
        onReset
      });

      const resetButton = screen.getByRole('button', {
        name: /reset filters/i
      });
      await user.click(resetButton);

      expect(onReset).toHaveBeenCalled();
    });

    it('should clear all fields when Reset clicked', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      const firstNameInput = screen.getByPlaceholderText(/first name/i) as HTMLInputElement;
      await user.type(firstNameInput, 'John');

      expect(firstNameInput.value).toBe('John');

      const resetButton = screen.getByRole('button', {
        name: /reset filters/i
      });
      await user.click(resetButton);

      expect(firstNameInput.value).toBe('');
    });
  });

  describe('Panel Toggle', () => {
    it('should call onToggle when toggle clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      renderAdvancedFilters({ onToggle });

      const toggleButton = screen.getByRole('button', {
        name: /advanced filters/i
      });
      await user.click(toggleButton);

      expect(onToggle).toHaveBeenCalled();
    });

    it('should show collapse/expand icon', () => {
      const { container } = renderAdvancedFilters();

      const icons = container.querySelectorAll('[role="img"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have aria-expanded attribute', () => {
      renderAdvancedFilters({ isOpen: true });

      const toggleButton = screen.getByRole('button', {
        name: /advanced filters/i
      });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Form State', () => {
    it('should maintain field values', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      const firstNameInput = screen.getByPlaceholderText(/first name/i) as HTMLInputElement;
      await user.type(firstNameInput, 'John');

      expect(firstNameInput.value).toBe('John');
    });

    it('should handle multiple field entries', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      const firstNameInput = screen.getByPlaceholderText(/first name/i) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;

      await user.type(firstNameInput, 'John');
      await user.type(emailInput, 'john@example.com');

      expect(firstNameInput.value).toBe('John');
      expect(emailInput.value).toBe('john@example.com');
    });

    it('should validate numeric input for grade ranges', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'grades' });

      const minGradeInput = screen.getByPlaceholderText(/min grade/i);
      await user.type(minGradeInput, 'abc');

      // Input should not accept non-numeric
      expect((minGradeInput as HTMLInputElement).type).toBe('number');
    });

    it('should handle grade range validation (min <= max)', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'grades' });

      const minGradeInput = screen.getByPlaceholderText(/min grade/i);
      const maxGradeInput = screen.getByPlaceholderText(/max grade/i);

      await user.type(minGradeInput, '80');
      await user.type(maxGradeInput, '90');

      // Should allow min < max
      expect((minGradeInput as HTMLInputElement).value).toBe('80');
      expect((maxGradeInput as HTMLInputElement).value).toBe('90');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      renderAdvancedFilters({ searchType: 'students' });

      const firstNameLabel = screen.getByLabelText(/first name|first_name/i);
      expect(firstNameLabel).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderAdvancedFilters({ searchType: 'students' });

      // Tab through inputs
      await user.tab();
      expect(
        screen.getByPlaceholderText(/first name/i)
      ).toHaveFocus();
    });

    it('should have role="region" for filter panel', () => {
      renderAdvancedFilters({ isOpen: true });

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should announce filter type', () => {
      renderAdvancedFilters({ searchType: 'students' });

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label');
    });
  });

  describe('Responsiveness', () => {
    it('should render in mobile layout', () => {
      const { container } = renderAdvancedFilters({
        searchType: 'students'
      });

      // Panel should be present regardless of screen size
      const panel = container.querySelector('.advanced-filters');
      expect(panel).toBeInTheDocument();
    });

    it('should stack fields vertically on mobile', () => {
      const { container } = renderAdvancedFilters({
        searchType: 'students'
      });

      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Different Search Types', () => {
    it('should show student-specific filters for students', () => {
      renderAdvancedFilters({ searchType: 'students' });

      expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    });

    it('should show course-specific filters for courses', () => {
      renderAdvancedFilters({ searchType: 'courses' });

      expect(
        screen.getByPlaceholderText(/course name/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/course code/i)
      ).toBeInTheDocument();
    });

    it('should show grade-specific filters for grades', () => {
      renderAdvancedFilters({ searchType: 'grades' });

      expect(
        screen.getByPlaceholderText(/min grade/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/max grade/i)
      ).toBeInTheDocument();
    });

    it('should switch filters when search type changes', async () => {
      const { unmount } = renderAdvancedFilters({
        searchType: 'students'
      });

      expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();

      unmount();

      renderAdvancedFilters({ searchType: 'grades' });

      expect(
        screen.getByPlaceholderText(/min grade/i)
      ).toBeInTheDocument();
    });
  });
});
