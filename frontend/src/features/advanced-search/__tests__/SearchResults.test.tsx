/**
 * SearchResults Component Tests
 * Issue #147 - STEP 6: SearchResults Component
 *
 * Test coverage:
 * - SearchResults container rendering states
 * - StudentResultCard rendering and interactions
 * - CourseResultCard rendering and interactions
 * - GradeResultCard rendering and interactions
 * - Sort dropdown functionality
 * - Click handlers and keyboard navigation
 *
 * Author: AI Agent
 * Date: January 26, 2026
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithI18n } from '@/test-utils/i18n-test-wrapper';
import { screen, fireEvent } from '@testing-library/react';
import { SearchResults } from '../components/SearchResults';
import { StudentResultCard } from '../components/StudentResultCard';
import { CourseResultCard } from '../components/CourseResultCard';
import { GradeResultCard } from '../components/GradeResultCard';
import {
  mockStudentResults,
  mockCourseResults,
  mockGradeResults,
} from './fixtures';

describe('SearchResults', () => {
  const mockOnSortChange = vi.fn();
  const _mockOnResultClick = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={true}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      // Check for multiple skeleton cards
      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays loading aria-label', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={true}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no results', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays empty state hint', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByText(/try adjusting/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state when error exists', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={false}
          error="Network error occurred"
          sortBy="relevance"
          onSortChange={mockOnSortChange}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText(/error loading results/i)).toBeInTheDocument();
      expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays retry button when onRetry provided', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={false}
          error="Error"
          sortBy="relevance"
          onSortChange={mockOnSortChange}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('does not display retry button when onRetry not provided', () => {
      renderWithI18n(
        <SearchResults
          results={[]}
          total={0}
          isLoading={false}
          error="Error"
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('renders results count correctly (singular)', () => {
      renderWithI18n(
        <SearchResults
          results={[mockStudentResults[0]]}
          total={1}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      const countElement = screen.getByText('1', { selector: '.font-medium' });
      expect(countElement).toBeInTheDocument();
      expect(screen.getByText(/result$/i)).toBeInTheDocument();
    });

    it('renders results count correctly (plural)', () => {
      renderWithI18n(
        <SearchResults
          results={mockStudentResults}
          total={mockStudentResults.length}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      const countElement = screen.getByText(mockStudentResults.length.toString(), { selector: '.font-medium' });
      expect(countElement).toBeInTheDocument();
      expect(screen.getByText(/results$/i)).toBeInTheDocument();
    });

    it('renders sort dropdown', () => {
      renderWithI18n(
        <SearchResults
          results={mockStudentResults}
          total={mockStudentResults.length}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      expect(sortSelect).toBeInTheDocument();
      expect(sortSelect).toHaveValue('relevance');
    });

    it('calls onSortChange when sort changes', () => {
      renderWithI18n(
        <SearchResults
          results={mockStudentResults}
          total={mockStudentResults.length}
          isLoading={false}
          error={null}
          sortBy="relevance"
          onSortChange={mockOnSortChange}
        />
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      expect(mockOnSortChange).toHaveBeenCalledWith('name');
    });
  });
});

describe('StudentResultCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student name', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders student ID', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('STU001')).toBeInTheDocument();
  });

  it('renders email', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('renders enrollment type', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText(/full_time/i)).toBeInTheDocument();
  });

  it('renders courses list', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText(/CS101, CS102/)).toBeInTheDocument();
  });

  it('truncates courses list when more than 3', () => {
    const studentWithManyCourses = {
      ...mockStudentResults[0],
      courses: ['CS101', 'CS102', 'CS103', 'CS104', 'CS105'],
    };

    renderWithI18n(
      <StudentResultCard student={studentWithManyCourses} onClick={mockOnClick} />
    );

    expect(screen.getByText(/\+2/)).toBeInTheDocument();
  });

  it('calls onClick when card clicked', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button', { name: /student: john doe/i });
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter key', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button', { name: /student: john doe/i });
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Space key', () => {
    renderWithI18n(
      <StudentResultCard student={mockStudentResults[0]} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button', { name: /student: john doe/i });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

describe('CourseResultCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course code', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('CS101')).toBeInTheDocument();
  });

  it('renders course name', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText(/Learn the basics/)).toBeInTheDocument();
  });

  it('renders instructor', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('Prof. Smith')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('truncates long description', () => {
    const courseWithLongDescription = {
      ...mockCourseResults[0],
      description: 'A'.repeat(200),
    };

    renderWithI18n(
      <CourseResultCard course={courseWithLongDescription} onClick={mockOnClick} />
    );

    const text = screen.getByText(/\.\.\.$/);
    expect(text).toBeInTheDocument();
  });

  it('calls onClick when card clicked', () => {
    renderWithI18n(
      <CourseResultCard course={mockCourseResults[0]} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button', { name: /course: cs101 - introduction to computer science/i });
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

describe('GradeResultCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders grade letter', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders points', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('renders student name', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders course code', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    expect(screen.getByText('CS101')).toBeInTheDocument();
  });

  it('applies correct color for A grade', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    const gradeBadge = screen.getByText('A');
    expect(gradeBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies correct color for B grade', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[1]} onClick={mockOnClick} />
    );

    const gradeBadge = screen.getByText('B+');
    expect(gradeBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('calls onClick when card clicked', () => {
    renderWithI18n(
      <GradeResultCard grade={mockGradeResults[0]} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button', { name: /grade: john doe - cs101 - a/i });
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
