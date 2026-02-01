import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { AdvancedFilters } from './AdvancedFilters';
import * as useSearchModule from './useSearch';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the useSearch hook
vi.mock('./useSearch', () => ({
  useSearch: vi.fn(() => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    searchType: 'students',
    setSearchType: vi.fn(),
    filters: [],
    addFilter: vi.fn(),
    removeFilter: vi.fn(),
    updateFilter: vi.fn(),
    clearSearch: vi.fn(),
  })),
}));

describe('AdvancedFilters Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should render filter button', () => {
    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    expect(button).toBeInTheDocument();
  });

  it('should expand filter panel when button is clicked', () => {
    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    expect(screen.getByText(/search.noFiltersApplied/i)).toBeInTheDocument();
  });

  it('should display filter count badge when filters exist', () => {
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'first_name', operator: 'contains', value: 'john' },
        { field: 'email', operator: 'equals', value: 'john@example.com' },
      ],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display all filters when expanded', () => {
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'first_name', operator: 'contains', value: 'john' },
      ],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const fieldSelect = screen.getAllByRole('combobox')[0];
    expect(fieldSelect).toBeInTheDocument();
    expect((fieldSelect as HTMLSelectElement).value).toBe('first_name');
  });

  it('should call addFilter when add button is clicked', () => {
    const mockAddFilter = vi.fn();
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [],
      addFilter: mockAddFilter,
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const addButton = screen.getByRole('button', { name: /search.addFilter/i });
    fireEvent.click(addButton);

    expect(mockAddFilter).toHaveBeenCalled();
  });

  it('should call removeFilter when delete button is clicked', () => {
    const mockRemoveFilter = vi.fn();
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'first_name', operator: 'contains', value: 'john' },
      ],
      addFilter: vi.fn(),
      removeFilter: mockRemoveFilter,
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const deleteButtons = screen.getAllByRole('button');
    const trashButton = deleteButtons[deleteButtons.length - 3]; // Third button from end (after Reset and Apply)
    fireEvent.click(trashButton);

    expect(mockRemoveFilter).toHaveBeenCalledWith(0);
  });

  it('should call updateFilter when field is changed', () => {
    const mockUpdateFilter = vi.fn();
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'first_name', operator: 'contains', value: 'john' },
      ],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: mockUpdateFilter,
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'email' } });

    expect(mockUpdateFilter).toHaveBeenCalledWith(0, { field: 'email' });
  });

  it('should call onApply callback when apply button is clicked', () => {
    const mockOnApply = vi.fn();
    const mockFilters = [
      { field: 'first_name', operator: 'contains', value: 'john' },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: mockFilters as any,
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters onApply={mockOnApply} />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const applyButton = screen.getByRole('button', { name: /search.applyFilters/i });
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith(mockFilters);
  });

  it('should call clearSearch and onReset when reset button is clicked', () => {
    const mockOnReset = vi.fn();
    const mockClearSearch = vi.fn();

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'first_name', operator: 'contains', value: 'john' },
      ],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: mockClearSearch,
    } as any);

    render(<AdvancedFilters onReset={mockOnReset} />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const resetButton = screen.getByRole('button', { name: /search.resetFilters/i });
    fireEvent.click(resetButton);

    expect(mockClearSearch).toHaveBeenCalled();
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('should display different fields for different search types', () => {
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'courses',
      setSearchType: vi.fn(),
      filters: [],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: vi.fn(),
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters searchType="courses" />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const addButton = screen.getByRole('button', { name: /search.addFilter/i });
    fireEvent.click(addButton);

    // After adding filter, check that course-specific fields are available
    expect(screen.getByDisplayValue(/courses.courseName|courses.courseCode|courses.credits/i)).toBeDefined();
  });

  it('should handle between operator with two inputs', () => {
    const mockUpdateFilter = vi.fn();
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students',
      setSearchType: vi.fn(),
      filters: [
        { field: 'created_at', operator: 'between', value: ['2026-01-01', '2026-01-31'] },
      ],
      addFilter: vi.fn(),
      removeFilter: vi.fn(),
      updateFilter: mockUpdateFilter,
      clearSearch: vi.fn(),
    } as any);

    render(<AdvancedFilters />, { wrapper });

    const button = screen.getByRole('button', { name: /advancedFilters/i });
    fireEvent.click(button);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });
});
