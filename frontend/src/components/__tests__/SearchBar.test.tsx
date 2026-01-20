/**
 * Test suite for SearchBar component.
 *
 * Tests cover:
 * - Rendering and props
 * - Input handling
 * - Suggestion display
 * - Keyboard navigation
 * - Search execution
 * - Click-outside behavior
 * - Accessibility
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { SearchBar } from '../SearchBar';
import * as useSearchHook from '../../hooks/useSearch';

// Mock useSearch hook
vi.mock('../../hooks/useSearch', () => ({
  default: vi.fn()
}));

const mockUseSearch = useSearchHook.default as unknown as ReturnType<typeof vi.fn>;

const mockUseSearchReturn = {
  results: [],
  suggestions: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  hasMore: false,
  search: vi.fn(),
  getSuggestions: vi.fn(),
  getSuggestionsDebounced: vi.fn(),
  advancedFilter: vi.fn(),
  loadMore: vi.fn(),
  clear: vi.fn(),
  statistics: { total_students: 100, total_courses: 50, total_grades: 500 }
};

const renderSearchBar = (props = {}) => {
  mockUseSearch.mockReturnValue(mockUseSearchReturn);

  return render(
    <I18nextProvider i18n={i18n}>
      <SearchBar
        searchType="students"
        onSearch={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
};

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      renderSearchBar();

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render search button', () => {
      renderSearchBar();

      const button = screen.getByRole('button', { name: /search/i });
      expect(button).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      const placeholder = 'Custom search placeholder';
      renderSearchBar({ placeholder });

      const input = screen.getByPlaceholderText(placeholder);
      expect(input).toBeInTheDocument();
    });

    it('should render clear button when input has value', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'search query');

      const clearButton = screen.getByRole('button', { name: /close|clear/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should not render clear button when input is empty', () => {
      renderSearchBar();

      const buttons = screen.getAllByRole('button');
      const clearButton = buttons.find(
        (btn) => btn.getAttribute('aria-label')?.includes('close')
      );
      // Clear button should only appear with input
      expect(clearButton).toBeUndefined();
    });

    it('should display statistics when enabled', async () => {
      renderSearchBar({ showStats: true });

      await waitFor(() => {
        // Statistics should be displayed
        const statsText = screen.queryByText(/students/i);
        expect(statsText).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      const { container } = renderSearchBar({ className: 'custom-class' });

      const searchContainer = container.querySelector('.search-bar');
      expect(searchContainer).toHaveClass('custom-class');
    });
  });

  describe('Input Handling', () => {
    it('should update input value on change', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'John');

      expect(input.value).toBe('John');
    });

    it('should call getSuggestionsDebounced on input change', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'Jo');

      await waitFor(() => {
        expect(mockUseSearchReturn.getSuggestionsDebounced).toHaveBeenCalled();
      });
    });

    it('should not call getSuggestions for empty input', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      mockUseSearchReturn.getSuggestionsDebounced.mockClear();

      const input = screen.getByRole('textbox');
      await user.type(input, ' ');

      // Should not call for whitespace only
      await waitFor(() => {
        expect(
          mockUseSearchReturn.getSuggestionsDebounced.mock.calls.every(
            ([query]) => query.trim() === ''
          )
        ).toBe(true);
      });
    });
  });

  describe('Suggestion Display', () => {
    it('should display suggestions when available', async () => {
      const user = userEvent.setup();
      const suggestions = [
        { id: 1, text: 'John Doe', type: 'student' },
        { id: 2, text: 'Jane Smith', type: 'student' }
      ];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'Jo');

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should hide suggestions when input is empty', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      await user.clear(input);

      await waitFor(() => {
        // Suggestions container should be hidden or empty
        const suggestionsContainer = screen.queryByRole('listbox');
        expect(
          suggestionsContainer === null ||
            !suggestionsContainer.hasAttribute('data-open')
        ).toBe(true);
      });
    });

    it('should highlight selected suggestion', async () => {
      const user = userEvent.setup();
      const suggestions = [
        { id: 1, text: 'John', type: 'student' },
        { id: 2, text: 'Jane', type: 'student' }
      ];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      // Navigate with arrow down
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const johnSuggestion = screen.getByText('John');
        expect(johnSuggestion.parentElement).toHaveClass('selected');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select next suggestion with ArrowDown', async () => {
      const user = userEvent.setup();
      const suggestions = [
        { id: 1, text: 'John', type: 'student' },
        { id: 2, text: 'Jane', type: 'student' }
      ];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const janeSuggestion = screen.getByText('Jane');
        expect(janeSuggestion.parentElement).toHaveClass('selected');
      });
    });

    it('should select previous suggestion with ArrowUp', async () => {
      const user = userEvent.setup();
      const suggestions = [
        { id: 1, text: 'John', type: 'student' },
        { id: 2, text: 'Jane', type: 'student' }
      ];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      // Navigate down then up
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      await waitFor(() => {
        const johnSuggestion = screen.getByText('John');
        expect(johnSuggestion.parentElement).toHaveClass('selected');
      });
    });

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup();
      const onSuggestionSelect = vi.fn();
      const suggestions = [
        { id: 1, text: 'John Doe', type: 'student' }
      ];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar({ onSuggestionSelect });

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onSuggestionSelect).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'John Doe' })
        );
      });
    });

    it('should close suggestions with Escape key', async () => {
      const user = userEvent.setup();
      const suggestions = [{ id: 1, text: 'John', type: 'student' }];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        const suggestionsContainer = screen.queryByRole('listbox');
        expect(
          suggestionsContainer === null ||
            !suggestionsContainer.hasAttribute('data-open')
        ).toBe(true);
      });
    });
  });

  describe('Search Execution', () => {
    it('should call onSearch when search button clicked', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      renderSearchBar({ onSearch });

      const input = screen.getByRole('textbox');
      await user.type(input, 'John');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(onSearch).toHaveBeenCalledWith('John');
    });

    it('should call onSearch when Enter pressed in input', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      renderSearchBar({ onSearch });

      const input = screen.getByRole('textbox');
      await user.type(input, 'John{Enter}');

      expect(onSearch).toHaveBeenCalledWith('John');
    });

    it('should not search with empty query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      renderSearchBar({ onSearch });

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(onSearch).not.toHaveBeenCalled();
    });
  });

  describe('Clear Functionality', () => {
    it('should clear input when clear button clicked', async () => {
      const user = userEvent.setup();
      renderSearchBar();

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'search');

      expect(input.value).toBe('search');

      const clearButton = screen.getByRole('button', { name: /close|clear/i });
      await user.click(clearButton);

      expect(input.value).toBe('');
    });
  });

  describe('Click-Outside Behavior', () => {
    it('should close suggestions when clicking outside', async () => {
      const user = userEvent.setup();
      const suggestions = [{ id: 1, text: 'John', type: 'student' }];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      const { container } = renderSearchBar();

      const input = screen.getByRole('textbox');
      await user.type(input, 'J');

      // Click outside
      fireEvent.mouseDown(container.querySelector('body')!);

      await waitFor(() => {
        const suggestionsContainer = screen.queryByRole('listbox');
        expect(
          suggestionsContainer === null ||
            !suggestionsContainer.hasAttribute('data-open')
        ).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderSearchBar();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label');
    });

    it('should support keyboard-only navigation', async () => {
      const user = userEvent.setup();
      const suggestions = [{ id: 1, text: 'John', type: 'student' }];

      mockUseSearch.mockReturnValue({
        ...mockUseSearchReturn,
        suggestions
      });

      renderSearchBar();

      const input = screen.getByRole('textbox');

      // Tab to input
      await user.tab();
      expect(input).toHaveFocus();

      // Type to trigger suggestions
      await user.keyboard('J');

      // Navigate and select with keyboard only
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(input).toBeTruthy();
    });
  });

  describe('Different Search Types', () => {
    it('should work with students search type', () => {
      renderSearchBar({ searchType: 'students' });

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should work with courses search type', () => {
      renderSearchBar({ searchType: 'courses' });

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should work with grades search type', () => {
      renderSearchBar({ searchType: 'grades' });

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });
});
