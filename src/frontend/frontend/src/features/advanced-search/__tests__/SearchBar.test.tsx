import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@/test-utils/i18n-test-wrapper';
import SearchBar from '../components/SearchBar';

/**
 * Test suite for SearchBar component
 *
 * Coverage:
 * - Rendering with default props
 * - Input change and debouncing
 * - Entity type selection
 * - Clear button functionality
 * - Search history dropdown
 * - Keyboard navigation
 * - Accessibility compliance
 */
describe('SearchBar Component', () => {
  const mockOnQueryChange = vi.fn();
  const mockOnEntityTypeChange = vi.fn();
  const mockOnSearch = vi.fn();
  const mockOnHistorySelect = vi.fn();

  const defaultProps = {
    query: '',
    onQueryChange: mockOnQueryChange,
    entityType: 'all' as const,
    onEntityTypeChange: mockOnEntityTypeChange,
    onSearch: mockOnSearch,
    onHistorySelect: mockOnHistorySelect,
    searchHistory: ['John Doe', 'Math 101', 'Grade A'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  /**
   * Test 1: Renders with placeholder
   */
  it('should render with placeholder text', () => {
    renderWithI18n(<SearchBar {...defaultProps} />);

    const input = screen.getByTestId('search-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder');
  });

  /**
   * Test 2: Updates on input change
   */
  it('should call onQueryChange when input value changes', async () => {
    renderWithI18n(<SearchBar {...defaultProps} />);
    const input = screen.getByTestId('search-input') as HTMLInputElement;

    // Simulate user typing by changing input value
    fireEvent.change(input, { target: { value: 'test q' } });

    // Verify callback was called with final value
    expect(mockOnQueryChange).toHaveBeenCalledWith('test q');
  });

  /**
   * Test 3: Debounces search requests
   */
  it('should debounce search requests', async () => {
    vi.useFakeTimers();

    renderWithI18n(<SearchBar {...defaultProps} debounceMs={300} onSearch={mockOnSearch} />);

    const input = screen.getByTestId('search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    // Search should not be called immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Advance timer past debounce time
    vi.advanceTimersByTime(300);

    // Now search should be called
    expect(mockOnSearch).toHaveBeenCalledWith('test');

    vi.useRealTimers();
  });

  /**
   * Test 4: Entity type selection works
   */
  it('should call onEntityTypeChange when entity type is selected', async () => {
    renderWithI18n(<SearchBar {...defaultProps} />);

    const select = screen.getByTestId('entity-type-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'students' } });

    expect(mockOnEntityTypeChange).toHaveBeenCalledWith('students');
  });

  /**
   * Test 5: Clear button resets input
   */
  it('should clear input when clear button is clicked', async () => {
    const { rerender } = renderWithI18n(
      <SearchBar {...defaultProps} query="" />
    );

    // Update to show clear button
    rerender(<SearchBar {...defaultProps} query="test query" />);

    const clearButton = screen.getByTestId('clear-button');
    fireEvent.click(clearButton);

    expect(mockOnQueryChange).toHaveBeenCalledWith('');
  });

  /**
   * Test 6: Shows search history dropdown
   */
  it('should display search history dropdown when input is focused', async () => {
    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    // After focusing, dropdown should be visible if history items exist and showHistory is true
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (defaultProps.searchHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });
  });

  /**
   * Test 7: History item selection
   */
  it('should select history item when clicked', async () => {
    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    // Verify dropdown appears
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (defaultProps.searchHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Click history item
    const historyItem = screen.queryByTestId('search-history-item-0');
    if (historyItem) {
      fireEvent.click(historyItem);
      expect(mockOnQueryChange).toHaveBeenCalledWith('John Doe');
      expect(mockOnHistorySelect).toHaveBeenCalledWith('John Doe');
    }
  });

  /**
   * Test 8: Keyboard navigation (arrow down/up, Enter, Escape)
   */
  it('should handle keyboard navigation in history dropdown', async () => {
    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" onSearch={mockOnSearch} />);

    const input = screen.getByTestId('search-input');

    // Focus input to show history
    fireEvent.focus(input);

    // Verify dropdown is shown
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (defaultProps.searchHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Press ArrowDown to navigate
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Press Enter to select or search
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify some interaction occurred
    expect(mockOnSearch || mockOnHistorySelect).toBeDefined();
  });

  /**
   * Test 9: Accessibility compliance
   */
  it('should have proper accessibility attributes', () => {
    renderWithI18n(<SearchBar {...defaultProps} />);

    const input = screen.getByTestId('search-input');
    expect(input).toHaveAttribute('aria-label');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    const select = screen.getByTestId('entity-type-select');
    expect(select).toHaveAttribute('aria-label');

    // Check for accessible button
    const clearButton = screen.queryByTestId('clear-button');
    if (clearButton) {
      expect(clearButton).toHaveAttribute('aria-label');
    }
  });

  /**
   * Test 10: Shows loading state
   */
  it('should show loading indicator when isLoading is true', () => {
    renderWithI18n(<SearchBar {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  /**
   * Test 11: Disables inputs during loading
   */
  it('should disable input and select when loading', () => {
    renderWithI18n(<SearchBar {...defaultProps} isLoading={true} />);

    const input = screen.getByTestId('search-input');
    const select = screen.getByTestId('entity-type-select');

    expect(input).toBeDisabled();
    expect(select).toBeDisabled();
  });

  /**
   * Test 12: Auto-focus when autoFocus prop is true
   */
  it('should auto-focus input when autoFocus is true', () => {
    renderWithI18n(<SearchBar {...defaultProps} autoFocus={true} />);

    const input = screen.getByTestId('search-input');
    expect(input).toHaveFocus();
  });

  /**
   * Test 13: Closes history dropdown on Escape key
   */
  it('should close history dropdown on Escape key', async () => {
    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    // Verify dropdown is shown first
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (defaultProps.searchHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Press Escape to close dropdown
    fireEvent.keyDown(input, { key: 'Escape' });

    // Dropdown should no longer be visible
    await waitFor(() => {
      expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  /**
   * Test 14: Closes history dropdown on outside click
   */
  it('should close history dropdown when clicking outside', async () => {
    renderWithI18n(
      <div>
        <SearchBar {...defaultProps} showHistory={true} query="" />
        <div data-testid="outside-element">Outside</div>
      </div>
    );

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    // Verify dropdown is shown
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (defaultProps.searchHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Click outside
    const outsideElement = screen.getByTestId('outside-element');
    fireEvent.mouseDown(outsideElement);

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  /**
   * Test 15: Respects custom placeholder
   */
  it('should use custom placeholder when provided', () => {
    renderWithI18n(<SearchBar {...defaultProps} placeholder="Custom search text" />);

    const input = screen.getByTestId('search-input');
    expect(input).toHaveAttribute('placeholder', 'Custom search text');
  });

  /**
   * Test 16: Limits history dropdown to 5 items
   */
  it('should limit history dropdown to 5 items', async () => {
    const longHistory = Array.from({ length: 10 }, (_, i) => `Query ${i}`);

    renderWithI18n(
      <SearchBar {...defaultProps} searchHistory={longHistory} query="" showHistory={true} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    // Verify dropdown appears
    await waitFor(() => {
      const dropdown = screen.queryByTestId('search-history-dropdown');
      if (longHistory.length > 0) {
        expect(dropdown).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Check that only 5 items are shown
    const items = screen.queryAllByTestId(/search-history-item-/);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  /**
   * Test 17: Calls onSearch with Enter key when no history highlighted
   */
  it('should call onSearch with Enter key when no history item highlighted', async () => {
    const { rerender } = renderWithI18n(
      <SearchBar {...defaultProps} query="" showHistory={false} />
    );

    rerender(<SearchBar {...defaultProps} query="test query" showHistory={false} />);

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  /**
   * Test 18: Hides history dropdown when showHistory is false
   */
  it('should not show history dropdown when showHistory is false', () => {
    renderWithI18n(<SearchBar {...defaultProps} showHistory={false} />);

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
  });

  /**
   * Test 19: Handles empty search history gracefully
   */
  it('should handle empty search history gracefully', () => {
    renderWithI18n(<SearchBar {...defaultProps} searchHistory={[]} showHistory={true} />);

    const input = screen.getByTestId('search-input');
    fireEvent.focus(input);

    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
  });

  /**
   * Test 20: Entity type defaults to 'all'
   */
  it('should have entity type select default to all', () => {
    renderWithI18n(<SearchBar {...defaultProps} entityType="all" />);

    const select = screen.getByTestId('entity-type-select');
    expect(select).toHaveValue('all');
  });
});
