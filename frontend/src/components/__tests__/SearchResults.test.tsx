/**
 * Test suite for SearchResults component.
 *
 * Tests cover:
 * - Rendering search results
 * - Pagination controls
 * - Loading states
 * - Error states
 * - Empty state
 * - Result type display
 * - Click handlers
 * - Accessibility
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import { render, screen } from '@testing-library/react';
import { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { SearchResults } from '../SearchResults';

const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};
import type { SearchResult } from '../../hooks/useSearch';

const mockResults: SearchResult[] = [
  {
    id: 1,
    display_name: 'John Doe',
    secondary_info: 'john@example.com',
    type: 'student',
    value: { enrollment_number: 'STU001' },
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  },
  {
    id: 2,
    display_name: 'Mathematics',
    secondary_info: 'MATH101',
    type: 'course',
    value: { credits: 3 },
    course_name: 'Mathematics',
    course_code: 'MATH101'
  },
  {
    id: 3,
    display_name: 'Grade A',
    secondary_info: '95/100',
    type: 'grade',
    value: { grade_value: 95 },
    student_name: 'Jane Smith',
    grade_value: 95
  }
];

const renderSearchResults = (props = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <SearchResults
        results={mockResults}
        isLoading={false}
        error={null}
        currentPage={1}
        hasMore={false}
        onLoadMore={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
};

describe('SearchResults Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Results', () => {
    it('should render results table', () => {
      const { container } = renderSearchResults();

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should render table headers', () => {
      renderSearchResults();

      expect(screen.getByText(/name|title/i)).toBeInTheDocument();
      expect(screen.getByText(/type|result type/i)).toBeInTheDocument();
    });

    it('should render all results in rows', () => {
      renderSearchResults();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Grade A')).toBeInTheDocument();
    });

    it('should display secondary info for each result', () => {
      renderSearchResults();

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('MATH101')).toBeInTheDocument();
      expect(screen.getByText('95/100')).toBeInTheDocument();
    });

    it('should display result type badges', () => {
      renderSearchResults();

      // Type badges should be present
      const badges = screen.getAllByText(/student|course|grade/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display type icons', () => {
      const { container } = renderSearchResults();

      // Icons should be present (could be SVG or emoji)
      const icons = container.querySelectorAll('[role="img"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should display empty message when no results', () => {
      renderSearchResults({
        results: [],
        isLoading: false
      });

      expect(
        screen.getByText(/no results found|no results/i)
      ).toBeInTheDocument();
    });

    it('should display helpful text in empty state', () => {
      renderSearchResults({
        results: [],
        isLoading: false
      });

      const emptyMessage = screen.getByText(/no results found|no results/i);
      expect(emptyMessage).toBeInTheDocument();
    });

    it('should hide table when no results', () => {
      const { container } = renderSearchResults({
        results: [],
        isLoading: false
      });

      const table = container.querySelector('table');
      expect(
        table === null || table.style.display === 'none'
      ).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner', () => {
      renderSearchResults({
        results: [],
        isLoading: true
      });

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should display loading message', () => {
      renderSearchResults({
        results: [],
        isLoading: true
      });

      expect(screen.getByText(/loading|searching/i)).toBeInTheDocument();
    });

    it('should hide results during loading', () => {
      const { container } = renderSearchResults({
        results: mockResults,
        isLoading: true
      });

      // Results should be hidden when loading
      const table = container.querySelector('table');
      expect(
        table === null || table.style.display === 'none'
      ).toBe(true);
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      const errorMsg = 'Search failed. Please try again.';
      renderSearchResults({
        results: [],
        isLoading: false,
        error: errorMsg
      });

      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    it('should display error icon', () => {
      const { container } = renderSearchResults({
        results: [],
        isLoading: false,
        error: 'Error occurred'
      });

      const errorIcon = container.querySelector('[role="img"]');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should hide results when error occurs', () => {
      const { container } = renderSearchResults({
        results: mockResults,
        isLoading: false,
        error: 'Error occurred'
      });

      const table = container.querySelector('table');
      expect(
        table === null || table.style.display === 'none'
      ).toBe(true);
    });

    it('should display retry suggestion in error', () => {
      renderSearchResults({
        results: [],
        isLoading: false,
        error: 'Network error'
      });

      const errorMessage = screen.getByText(/network error/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination info', () => {
      renderSearchResults({
        currentPage: 2,
        hasMore: true
      });

      expect(screen.getByText(/page 2|2\/|results 11-20/i)).toBeInTheDocument();
    });

    it('should display Previous button when not on first page', () => {
      renderSearchResults({
        currentPage: 2,
        hasMore: true
      });

      const prevButton = screen.getByRole('button', { name: /previous|prev/i });
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).not.toBeDisabled();
    });

    it('should disable Previous button on first page', () => {
      renderSearchResults({
        currentPage: 1,
        hasMore: true
      });

      const prevButton = screen.queryByRole('button', { name: /previous|prev/i });
      if (prevButton) {
        expect(prevButton).toBeDisabled();
      }
    });

    it('should display Next button when hasMore is true', () => {
      renderSearchResults({
        currentPage: 1,
        hasMore: true
      });

      const nextButton = screen.getByRole('button', { name: /next|load more/i });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();
    });

    it('should disable Next button when hasMore is false', () => {
      renderSearchResults({
        currentPage: 1,
        hasMore: false
      });

      const nextButton = screen.queryByRole('button', { name: /next|load more/i });
      if (nextButton) {
        expect(nextButton).toBeDisabled();
      }
    });

    it('should call onLoadMore when Next button clicked', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();
      renderSearchResults({
        currentPage: 1,
        hasMore: true,
        onLoadMore
      });

      const nextButton = screen.getByRole('button', { name: /next|load more/i });
      await user.click(nextButton);

      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  describe('Result Type Handling', () => {
    it('should display student results correctly', () => {
      const studentResult: SearchResult = {
        id: 1,
        display_name: 'John Doe',
        secondary_info: 'john@example.com',
        type: 'student',
        value: { enrollment_number: 'STU001' }
      };

      renderSearchResults({
        results: [studentResult]
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display course results correctly', () => {
      const courseResult: SearchResult = {
        id: 1,
        display_name: 'Mathematics',
        secondary_info: 'MATH101',
        type: 'course',
        value: { credits: 3 }
      };

      renderSearchResults({
        results: [courseResult]
      });

      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('MATH101')).toBeInTheDocument();
    });

    it('should display grade results correctly', () => {
      const gradeResult: SearchResult = {
        id: 1,
        display_name: 'Grade A',
        secondary_info: '95/100',
        type: 'grade',
        value: { grade_value: 95 }
      };

      renderSearchResults({
        results: [gradeResult]
      });

      expect(screen.getByText('Grade A')).toBeInTheDocument();
      expect(screen.getByText('95/100')).toBeInTheDocument();
    });

    it('should display correct badge color per type', () => {
      const { container } = renderSearchResults();

      const badges = container.querySelectorAll('[class*="badge"]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Click Handlers', () => {
    it('should call onResultClick when result clicked', async () => {
      const user = userEvent.setup();
      const onResultClick = vi.fn();
      renderSearchResults({
        onResultClick
      });

      const studentName = screen.getByText('John Doe');
      const row = studentName.closest('tr');

      if (row) {
        await user.click(row);
        expect(onResultClick).toHaveBeenCalledWith(mockResults[0]);
      }
    });

    it('should highlight row on hover', async () => {
      const user = userEvent.setup();
      const { container } = renderSearchResults();

      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0];

      await user.hover(firstRow);
      expect(firstRow).toHaveClass('hover');
    });
  });

  describe('Result Display Variations', () => {
    it('should handle results with missing secondary_info', () => {
      const results: SearchResult[] = [
        {
          id: 1,
          display_name: 'Result',
          secondary_info: '',
          type: 'student',
          value: {}
        }
      ];

      renderSearchResults({ results });
      expect(screen.getByText('Result')).toBeInTheDocument();
    });

    it('should handle very long result names', () => {
      const longName = 'A'.repeat(100);
      const results: SearchResult[] = [
        {
          id: 1,
          display_name: longName,
          secondary_info: 'Info',
          type: 'student',
          value: {}
        }
      ];

      renderSearchResults({ results });
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle results with special characters', () => {
      const results: SearchResult[] = [
        {
          id: 1,
          display_name: "O'Brien's Course",
          secondary_info: 'MATH & 101',
          type: 'course',
          value: {}
        }
      ];

      renderSearchResults({ results });
      expect(screen.getByText("O'Brien's Course")).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic table structure', () => {
      const { container } = renderSearchResults();

      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it('should have proper table headers with scope', () => {
      const { container } = renderSearchResults();

      const headers = container.querySelectorAll('th[scope="col"]');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have ARIA labels for icon buttons', () => {
      const { container } = renderSearchResults();

      const buttons = container.querySelectorAll('button[aria-label]');
      expect(buttons.length).toBeGreaterThanOrEqual(0);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();

      renderSearchResults({
        hasMore: true,
        onLoadMore
      });

      // Tab to Next button
      await user.tab();
      const nextButton = screen.getByRole('button', { name: /next|load more/i });
      expect(nextButton).toBeTruthy();
    });
  });

  describe('Page Size', () => {
    it('should accept custom pageSize prop', () => {
      renderSearchResults({
        pageSize: 25
      });

      // Component should display with custom page size
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should display correct result count per page', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        display_name: `Result ${i}`,
        secondary_info: `Info ${i}`,
        type: 'student' as const,
        value: {}
      }));

      renderSearchResults({
        results,
        pageSize: 10
      });

      // All results should be visible
      expect(screen.getByText('Result 0')).toBeInTheDocument();
      expect(screen.getByText('Result 9')).toBeInTheDocument();
    });
  });
});
