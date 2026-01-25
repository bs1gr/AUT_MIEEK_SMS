import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test-utils/i18n-test-wrapper';
import SearchBar from '../SearchBar';

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
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} />);
    expect(mockOnQueryChange).toHaveBeenCalledWith('tes');
    expect(mockOnQueryChange).toHaveBeenCalledWith('test');
    expect(mockOnQueryChange).toHaveBeenCalledWith('test ');
    expect(mockOnQueryChange).toHaveBeenCalledWith('test q');
  });

  /**
   * Test 3: Debounces search requests
   */
  it('should debounce search requests', async () => {
    const user = userEvent.setup({ delay: null });
    vi.useFakeTimers();

    renderWithI18n(<SearchBar {...defaultProps} debounceMs={300} />);

    const input = screen.getByTestId('search-input');
    await user.type(input, 'test');

    // Search should not be called until debounce time
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Advance timer past debounce time
    vi.advanceTimersByTime(300);

    // Now search should be called (for the final state)
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  /**
   * Test 4: Entity type selection works
   */
  it('should call onEntityTypeChange when entity type is selected', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} />);

    const select = screen.getByTestId('entity-type-select');
    await user.selectOptions(select, 'students');

    expect(mockOnEntityTypeChange).toHaveBeenCalledWith('students');
  });

  /**
   * Test 5: Clear button resets input
   */
  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    const { rerender } = renderWithI18n(
      <SearchBar {...defaultProps} query="" />
    );

    // Update to show clear button
    rerender(<SearchBar {...defaultProps} query="test query" />);

    const clearButton = screen.getByTestId('clear-button');
    await user.click(clearButton);

    expect(mockOnQueryChange).toHaveBeenCalledWith('');
  });

  /**
   * Test 6: Shows search history dropdown
   */
  it('should display search history dropdown when input is focused', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();
  });

  /**
   * Test 7: History item selection
   */
  it('should select history item when clicked', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

    const historyItem = screen.getByTestId('search-history-item-0');
    await user.click(historyItem);

    expect(mockOnQueryChange).toHaveBeenCalledWith('John Doe');
    expect(mockOnHistorySelect).toHaveBeenCalledWith('John Doe');
  });

  /**
   * Test 8: Keyboard navigation (arrow down/up, Enter, Escape)
   */
  it('should handle keyboard navigation in history dropdown', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');

    // Focus input to show history
    await user.click(input);

    // Press ArrowDown to highlight first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Should highlight first item (visual indication in test)
    await waitFor(() => {
      const dropdown = screen.getByTestId('search-history-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    // Press Enter to select highlighted item
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      // History item should be selected
      expect(mockOnQueryChange).toHaveBeenCalled();
    });
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
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} showHistory={true} query="" />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 14: Closes history dropdown on outside click
   */
  it('should close history dropdown when clicking outside', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(
      <div>
        <SearchBar {...defaultProps} showHistory={true} query="" />
        <div data-testid="outside-element">Outside</div>
      </div>
    );

    const input = screen.getByTestId('search-input');
    await user.click(input);

    expect(screen.getByTestId('search-history-dropdown')).toBeInTheDocument();

    const outsideElement = screen.getByTestId('outside-element');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
    });
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
    const user = userEvent.setup({ delay: null });
    const longHistory = Array.from({ length: 10 }, (_, i) => `Query ${i}`);

    renderWithI18n(<SearchBar {...defaultProps} searchHistory={longHistory} query="" />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

    const items = screen.getAllByTestId(/search-history-item-/);
    expect(items).toHaveLength(5);
  });

  /**
   * Test 17: Calls onSearch with Enter key when no history highlighted
   */
  it('should call onSearch with Enter key when no history item highlighted', async () => {
    const user = userEvent.setup({ delay: null });

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
  it('should not show history dropdown when showHistory is false', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} showHistory={false} query="" />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

    expect(screen.queryByTestId('search-history-dropdown')).not.toBeInTheDocument();
  });

  /**
   * Test 19: Handles empty search history gracefully
   */
  it('should handle empty search history gracefully', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithI18n(<SearchBar {...defaultProps} searchHistory={[]} query="" />);

    const input = screen.getByTestId('search-input');
    await user.click(input);

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
