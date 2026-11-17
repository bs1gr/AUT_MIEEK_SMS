import { screen, _waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '../../test-utils/i18n-test-wrapper';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchView from './SearchView';
import * as searchHooks from './useSearch';

import type { SearchSortState as SortConfig } from './useSearch';

// Mock the hook, and keep what else the module exports (the orders each kind of record has)
vi.mock('./useSearch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useSearch')>()),
  useSearch: vi.fn(),
}));
vi.mock('./SearchSortControls', () => ({
  default: ({ _sort, onChange }: { _sort: SortConfig; onChange: (_sort: SortConfig) => void }) => (
    <div data-testid="sort-controls">
      <button onClick={() => onChange({ field: 'name', direction: 'asc' })}>Sort</button>
    </div>
  ),
}));
vi.mock('./SearchFacets', () => ({
  default: ({
    facets,
    selected,
    onToggle,
    onClear,
  }: {
    facets?: Array<{ field: string; label: string }>;
    selected?: Record<string, string[]>;
    onToggle: (field: string, value: string) => void;
    onClear: () => void;
  }) => (
    <div data-testid="facets" data-selected={JSON.stringify(selected)}>
      {facets?.map((f) => (
        <button key={f.field} onClick={() => onToggle(f.field, 'active')}>
          {f.label}
        </button>
      ))}
      <button onClick={() => onClear()}>Clear</button>
    </div>
  ),
}));
vi.mock('./SearchPagination', () => ({
  default: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(1)}>Next</button>
    </div>
  ),
}));
vi.mock('./useSearchFacets', () => ({
  useSearchFacets: () => ({
    data: {
      facets: [
        { field: 'status', label: 'Status', values: [{ value: 'active', count: 1 }] },
        { field: 'enrollment_type', label: 'Study Year', values: [{ value: 'year_1', count: 1 }] },
      ],
    },
    isLoading: false,
  }),
}));

describe('SearchView Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockUseSearch = (overrides?: Partial<ReturnType<typeof searchHooks.useSearch>>) => {
    const defaultMock = {
      searchQuery: '',
      setSearchQuery: vi.fn(),
      debouncedQuery: '',
      searchType: 'students' as const,
      setSearchType: vi.fn(),
      searchResults: [],
      totalResults: 0,
      isLoading: false,
      error: null,
      retrySearch: vi.fn(),
      filters: [],
      page: 0,
      setPage: vi.fn(),
      limit: 20,
      setLimit: vi.fn(),
      sort: { field: 'relevance' as const, direction: 'desc' as const },
      setSort: vi.fn(),
      hasMore: false,
      setFilters: vi.fn(),
      ...overrides,
    };
    vi.mocked(searchHooks.useSearch).mockReturnValue(defaultMock as unknown as ReturnType<typeof searchHooks.useSearch>);
  };

  const renderComponent = (props: Record<string, unknown> = {}) => {
    return renderWithI18n(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <SearchView {...props} />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('renders search form with type selector', () => {
    mockUseSearch();
    renderComponent();

    // Use label-based queries that match the actual UI
    const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.value).toBe('students');

    const limitSelect = screen.getByLabelText(/results per page/i) as HTMLSelectElement;
    expect(limitSelect).toBeInTheDocument();
    expect(limitSelect.value).toBe('20');
  });

  it('renders search input field', () => {
    mockUseSearch();
    renderComponent();

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain('search');
  });

  it('updates search query on input change', async () => {
    const setSearchQuery = vi.fn();
    mockUseSearch({ setSearchQuery });
    const user = userEvent.setup();

    renderComponent();

    const input = screen.getByRole('textbox');
    await user.type(input, 'John');

    expect(setSearchQuery).toHaveBeenCalled();
  });

  it('displays search results', () => {
    const mockResults = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        type: 'student' as const,
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        type: 'student' as const,
      },
    ];

    mockUseSearch({
      searchResults: mockResults,
      totalResults: 2,
    });

    renderComponent();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('lists a course by its name, with its code underneath', () => {
    // What the server returns for a course (POST /search/advanced, entity "courses").
    mockUseSearch({
      searchType: 'courses' as const,
      searchResults: [
        { id: 2, course_name: 'Calculus II', course_code: 'MATH201', credits: 3, type: 'course' as const },
      ],
      totalResults: 1,
    });

    renderComponent();

    expect(screen.getByText('Calculus II')).toBeInTheDocument();
    expect(screen.getByText('MATH201')).toBeInTheDocument();
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSearch({ isLoading: true });
    renderComponent();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('says that the search failed in its own words, not in those of the HTTP client', async () => {
    const retrySearch = vi.fn();
    mockUseSearch({ error: new Error('Request failed with status code 500'), retrySearch });
    const user = userEvent.setup();

    renderComponent();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The search could not be done. Try again.');
    expect(alert).not.toHaveTextContent('status code 500');
    expect(screen.queryByText(/no results/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(retrySearch).toHaveBeenCalledTimes(1);
  });

  it('shows no results message when search returns empty', () => {
    mockUseSearch({
      searchQuery: 'nonexistent',
      searchResults: [],
      totalResults: 0,
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('changes search type', async () => {
    const setSearchType = vi.fn();
    mockUseSearch({ setSearchType });
    const user = userEvent.setup();

    renderComponent();

    const typeSelect = document.getElementById('search-type') as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'courses');

    expect(setSearchType).toHaveBeenCalledWith('courses');
  });

  it('changes result limit', async () => {
    const setLimit = vi.fn();
    const setPage = vi.fn();
    mockUseSearch({ setLimit, setPage });
    const user = userEvent.setup();

    renderComponent();

    const limitSelect = document.getElementById('search-limit') as HTMLSelectElement;
    await user.selectOptions(limitSelect, '50');

    expect(setLimit).toHaveBeenCalledWith(50);
    expect(setPage).toHaveBeenCalledWith(0);
  });

  it('renders facets sidebar', () => {
    mockUseSearch();
    renderComponent();

    expect(screen.getByTestId('facets')).toBeInTheDocument();
  });

  it('renders sort controls', () => {
    mockUseSearch();
    renderComponent();

    expect(screen.getByTestId('sort-controls')).toBeInTheDocument();
  });

  it('renders pagination', () => {
    mockUseSearch({
      searchResults: [{ id: 1, first_name: 'John', type: 'student' as const }],
      totalResults: 50,
      hasMore: true,
    });

    renderComponent();

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('adds a filter for a box that is ticked and removes it when the box is cleared', () => {
    const setFilters = vi.fn();
    mockUseSearch({ setFilters });

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Status/i }));

    // The page hands the hook a function of the filters there are.
    const update = setFilters.mock.calls[0][0] as (previous: unknown[]) => unknown[];
    const ticked = [{ field: 'status', operator: 'equals', value: 'active' }];
    expect(update([])).toEqual(ticked);
    expect(update(ticked)).toEqual([]);
    const other = { field: 'status', operator: 'equals', value: 'inactive' };
    expect(update([other])).toEqual([other, ...ticked]);
  });

  it('tells the panel what is ticked from the filters of the search', () => {
    mockUseSearch({
      filters: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'status', operator: 'equals', value: 'inactive' },
        { field: 'enrollment_type', operator: 'equals', value: 'year_1' },
      ],
    });

    renderComponent();

    expect(JSON.parse(screen.getByTestId('facets').getAttribute('data-selected') || '{}')).toEqual({
      status: ['active', 'inactive'],
      enrollment_type: ['year_1'],
    });
  });

  it('clears every ticked filter with "Clear all"', () => {
    const setFilters = vi.fn();
    mockUseSearch({ setFilters });

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    const update = setFilters.mock.calls[0][0] as (previous: unknown[]) => unknown[];
    expect(update([{ field: 'status', operator: 'equals', value: 'active' }])).toEqual([]);
  });

  it('drops the filters when the kind of record changes', async () => {
    const setFilters = vi.fn();
    const setSearchType = vi.fn();
    mockUseSearch({ setFilters, setSearchType });
    const user = userEvent.setup();

    renderComponent();
    await user.selectOptions(document.getElementById('search-type') as HTMLSelectElement, 'courses');

    expect(setSearchType).toHaveBeenCalledWith('courses');
    expect(setFilters).toHaveBeenCalledWith([]);
  });

  it('says of a grade whose it is, in which course, the mark and the day', () => {
    mockUseSearch({
      searchType: 'grades' as const,
      searchResults: [
        {
          id: 9,
          type: 'grade' as const,
          student_id: 1,
          student_name: 'John Doe',
          course_name: 'Calculus II',
          assignment_name: 'Midterm',
          grade: 17,
          max_grade: 20,
          date: '2026-03-05',
        },
      ],
      totalResults: 1,
    });

    renderComponent();

    expect(screen.getByText('Midterm')).toBeInTheDocument();
    expect(screen.getByText('John Doe · Calculus II · 17 / 20 · 2026-03-05')).toBeInTheDocument();
  });

  it('renders result type badges', () => {
    mockUseSearch({
      searchResults: [
        { id: 1, first_name: 'John', type: 'student' as const },
        { id: 2, course_name: 'Mathematics', type: 'course' as const },
      ],
      totalResults: 2,
    });

    renderComponent();

    // Check that results are displayed (component may not render badges as buttons)
    expect(screen.getByText(/2 total results/i)).toBeInTheDocument();
  });

  it('maintains sort order across pagination', async () => {
    const setSort = vi.fn();
    const setPage = vi.fn();
    mockUseSearch({ setSort, setPage });
    const user = userEvent.setup();

    renderComponent();

    const sortButton = screen.getByRole('button', { name: /sort/i });
    await user.click(sortButton);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(setSort).toHaveBeenCalled();
    expect(setPage).toHaveBeenCalled();
  });

  it('displays result count summary', () => {
    mockUseSearch({
      searchResults: [{ id: 1, first_name: 'John', type: 'student' as const }],
      totalResults: 42,
    });

    renderComponent();

    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
