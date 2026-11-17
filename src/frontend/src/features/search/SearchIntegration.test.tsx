import { render, screen, waitFor, within, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import testI18n from '@/test-utils/i18n-test-wrapper';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SearchView from './SearchView';
import apiClient from '@/api/api';

/**
 * The Search page with everything of its own real: the view, the two hooks, the filter panel,
 * the sort controls and the pager. Only the HTTP client is replaced, by a small server that
 * answers as the real one does: it reads `page`, `page_size`, `sort` and `filters` from the
 * body of `POST /search/advanced`, and sends the filter groups as a list.
 *
 * Until November 2026 this file replaced the hook itself with a fake and looked for buttons
 * "if they exist"; it passed while sorting, paging and filtering did nothing in the
 * application. Every test here fails on the page as it was.
 */
vi.mock('@/api/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/api')>();
  const client = { get: vi.fn(), post: vi.fn() };
  return { ...original, default: client, apiClient: client };
});

type Person = { id: number; first_name: string; last_name: string; email: string; active: boolean };
type SearchBody = {
  entity: string;
  query?: string;
  filters?: Record<string, unknown>;
  page?: number;
  page_size?: number;
  sort?: { field: string; direction: string };
};

const SEED: Person[] = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', active: true },
  { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', active: true },
  { id: 3, first_name: 'Alice', last_name: 'Johnson', email: 'alice.johnson@example.com', active: false },
  { id: 4, first_name: 'Bob', last_name: 'Williams', email: 'bob.williams@example.com', active: true },
];
const FAMILY: Person[] = Array.from({ length: 12 }, (_, index) => ({
  id: 100 + index,
  first_name: `Pager${String(index + 1).padStart(2, '0')}`,
  last_name: 'Zzfamily',
  email: `pager${index + 1}@zz.test`,
  active: true,
}));
const PEOPLE = [...SEED, ...FAMILY];

const matching = (query = ''): Person[] => {
  const text = query.toLowerCase();
  return PEOPLE.filter((person) =>
    [person.first_name, person.last_name, person.email].some((field) => field.toLowerCase().includes(text))
  );
};

const answer = (data: unknown) => ({ data: { success: true, data, error: null } });

const searchAnswer = (body: SearchBody) => {
  if (body.entity === 'courses') {
    const results = [{ id: 2, course_name: 'Calculus II', course_code: 'MATH201', type: 'course' }];
    return answer({ results, total: 1, has_more: false, limit: 20, offset: 0 });
  }
  if (body.entity === 'grades') {
    const results = [
      {
        id: 7,
        student_id: 1,
        student_name: 'John Doe',
        course_name: 'Calculus II',
        assignment_name: 'Midterm',
        grade: 17,
        max_grade: 20,
        date: '2026-03-05',
        type: 'grade',
      },
    ];
    return answer({ results, total: 1, has_more: false, limit: 20, offset: 0 });
  }

  let rows = matching(body.query);
  const status = body.filters?.status;
  if (status !== undefined) {
    const wanted = (Array.isArray(status) ? status : [status]).map(String);
    rows = rows.filter((person) => wanted.includes(person.active ? 'active' : 'inactive'));
  }
  if (body.sort?.field === 'name') {
    rows = [...rows].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    if (body.sort.direction === 'desc') rows.reverse();
  }
  const size = body.page_size ?? 20;
  const offset = (body.page ?? 0) * size;
  return answer({
    results: rows.slice(offset, offset + size).map((person) => ({ ...person, type: 'student' })),
    total: rows.length,
    has_more: offset + size < rows.length,
    limit: size,
    offset,
  });
};

const facetAnswer = (url: string, query = '') => {
  if (url.includes('/courses/')) {
    return answer({
      facets: [
        { name: 'semester', label: 'Semester', values: [{ value: 'Fall 2024', count: 1, is_selected: false }], is_expanded: false },
        { name: 'credits', label: 'Course Credits', values: [{ value: '3', count: 1, is_selected: false }], is_expanded: false },
      ],
      total_results: 1,
      query,
    });
  }
  const rows = matching(query);
  const active = rows.filter((person) => person.active).length;
  const values = [
    ...(active ? [{ value: 'active', count: active, is_selected: false }] : []),
    ...(rows.length - active ? [{ value: 'inactive', count: rows.length - active, is_selected: false }] : []),
  ];
  return answer({
    facets: values.length ? [{ name: 'status', label: 'Student Status', values, is_expanded: false }] : [],
    total_results: rows.length,
    query,
  });
};

const post = vi.mocked(apiClient.post);
const get = vi.mocked(apiClient.get);

const searchBodies = (): SearchBody[] =>
  post.mock.calls.filter(([url]) => url === '/search/advanced').map(([, body]) => body as SearchBody);
const lastSearch = (): SearchBody => searchBodies().at(-1) as SearchBody;
const facetCalls = () => get.mock.calls.filter(([url]) => String(url).includes('/facets'));

const results = () => within(screen.getByTestId('search-results')).queryAllByRole('listitem');
const names = () => results().map((item) => item.querySelector('p')?.textContent);

describe('Search page: what it sends, and what it does with the answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockImplementation(async (_url: string, body?: unknown) => searchAnswer(body as SearchBody));
    get.mockImplementation(async (url: string, config?: { params?: { q?: string } }) =>
      facetAnswer(url, config?.params?.q)
    );
  });

  afterEach(async () => {
    await act(async () => {
      await testI18n.changeLanguage('en');
    });
  });

  const renderPage = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <QueryClientProvider client={queryClient}>
            <SearchView />
          </QueryClientProvider>
        </I18nextProvider>
      </MemoryRouter>
    );
    return userEvent.setup();
  };

  it('goes through the pages of a result with the size that was chosen', async () => {
    const user = renderPage();

    await user.selectOptions(screen.getByLabelText('Results per page'), '10');
    await user.type(screen.getByLabelText('Query'), 'Zzfamily');

    await waitFor(() => expect(results()).toHaveLength(10));
    expect(screen.getByText('12 total results')).toBeInTheDocument();
    expect(lastSearch()).toMatchObject({ query: 'Zzfamily', page: 0, page_size: 10 });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(results()).toHaveLength(2));
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(screen.getByText('11-12 of 12 results')).toBeInTheDocument();
    expect(lastSearch()).toMatchObject({ page: 1, page_size: 10 });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(results()).toHaveLength(10));
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('orders the list as the two sort controls say', async () => {
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'o');
    await waitFor(() => expect(results()).toHaveLength(4));

    await user.selectOptions(screen.getByLabelText('Sort by'), 'name');
    await waitFor(() => expect(names()[0]).toBe('John Doe'));
    expect(lastSearch().sort).toEqual({ field: 'name', direction: 'desc' });

    await user.selectOptions(screen.getByLabelText('Sort direction'), 'asc');
    await waitFor(() => expect(names()[0]).toBe('Alice Johnson'));
    expect(lastSearch().sort).toEqual({ field: 'name', direction: 'asc' });

    // Back to an order that was already asked for: answered from the page's memory.
    await user.selectOptions(screen.getByLabelText('Sort direction'), 'desc');
    await waitFor(() => expect(names()[0]).toBe('John Doe'));
    expect(searchBodies().map((body) => `${body.sort?.field} ${body.sort?.direction}`)).toEqual([
      'relevance desc',
      'name desc',
      'name asc',
    ]);
  });

  it('shows the filters the server sends, and filters by what is ticked', async () => {
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'o');
    await waitFor(() => expect(results()).toHaveLength(4));

    // The group and its values, in the words of the page.
    const active = await screen.findByRole('checkbox', { name: 'Active (3)' });
    const inactive = screen.getByRole('checkbox', { name: 'Inactive (1)' });
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
    expect(screen.queryByText('No filters available')).not.toBeInTheDocument();
    expect(lastSearch().filters).toBeUndefined();

    await user.click(inactive);
    await waitFor(() => expect(names()).toEqual(['Alice Johnson']));
    expect(lastSearch().filters).toEqual({ status: 'inactive' });
    expect(screen.getByText('1 total results')).toBeInTheDocument();

    // A second tick in the same group: either of the two.
    await user.click(active);
    await waitFor(() => expect(results()).toHaveLength(4));
    expect(lastSearch().filters).toEqual({ status: ['inactive', 'active'] });
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();

    // A box that is cleared stops filtering (it kept filtering).
    await user.click(inactive);
    await waitFor(() => expect(results()).toHaveLength(3));
    expect(lastSearch().filters).toEqual({ status: 'active' });
    expect(inactive).not.toBeChecked();
    expect(active).toBeChecked();

    // "Clear all" clears (it cleared nothing).
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(results()).toHaveLength(4));
    expect(screen.getByText('4 total results')).toBeInTheDocument();
    expect(active).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('goes back to the first page when a filter is ticked', async () => {
    const user = renderPage();
    await user.selectOptions(screen.getByLabelText('Results per page'), '10');
    await user.type(screen.getByLabelText('Query'), 'Zzfamily');
    await waitFor(() => expect(results()).toHaveLength(10));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(results()).toHaveLength(2));

    await user.click(screen.getByRole('checkbox', { name: 'Active (12)' }));

    await waitFor(() => expect(lastSearch()).toMatchObject({ page: 0, filters: { status: 'active' } }));
    await waitFor(() => expect(results()).toHaveLength(10));
  });

  it('asks for the filters once per search, not once per letter, and never for saved searches', async () => {
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'John');
    await waitFor(() => expect(results()).toHaveLength(2));
    await screen.findByRole('checkbox', { name: 'Active (1)' });

    expect(facetCalls()).toHaveLength(1);
    expect(facetCalls()[0]).toEqual(['/search/students/facets', { params: { q: 'John' } }]);
    expect(searchBodies().map((body) => body.query)).toEqual(['John']);
    expect(get.mock.calls.filter(([url]) => String(url).includes('/search/saved'))).toHaveLength(0);
  });

  it('keeps a ticked filter on the screen when the text is cleared', async () => {
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'o');
    await user.click(await screen.findByRole('checkbox', { name: 'Inactive (1)' }));
    await waitFor(() => expect(names()).toEqual(['Alice Johnson']));

    await user.clear(screen.getByLabelText('Query'));

    // The search is now for every inactive student, and the box that says so is still there.
    await waitFor(() => expect(lastSearch().query).toBeUndefined());
    expect(lastSearch().filters).toEqual({ status: 'inactive' });
    expect(await screen.findByRole('checkbox', { name: 'Inactive (1)' })).toBeChecked();
  });

  it('says in its own words that a search failed, in the language of the page', async () => {
    post.mockRejectedValue(new Error('Network Error'));
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'John');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The search could not be done. Try again.');
    expect(alert).not.toHaveTextContent('Network Error');
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();

    await act(async () => {
      await testI18n.changeLanguage('el');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Η αναζήτηση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.');
    await act(async () => {
      await testI18n.changeLanguage('en');
    });

    // The button in the message sends the search again.
    post.mockImplementation(async (_url: string, body?: unknown) => searchAnswer(body as SearchBody));
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(results()).toHaveLength(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not call a search the server could not do an empty one', async () => {
    // What the endpoint sends when it fails: HTTP 200 with `success: false`.
    post.mockResolvedValue({
      data: { success: false, data: null, error: { code: 'SEARCH_ERROR', message: 'Failed to perform advanced search' } },
    });
    const user = renderPage();
    await user.type(screen.getByLabelText('Query'), 'John');

    expect(await screen.findByRole('alert')).toHaveTextContent('The search could not be done.');
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('offers for each kind of record the orders and the filters that kind has', async () => {
    const user = renderPage();
    const sortOptions = () =>
      Array.from((screen.getByLabelText('Sort by') as HTMLSelectElement).options).map((option) => option.value);

    await user.type(screen.getByLabelText('Query'), 'o');
    await user.click(await screen.findByRole('checkbox', { name: 'Inactive (1)' }));
    await user.selectOptions(screen.getByLabelText('Sort by'), 'email');
    await waitFor(() => expect(lastSearch()).toMatchObject({ sort: { field: 'email' }, filters: { status: 'inactive' } }));
    expect(sortOptions()).toEqual(['relevance', 'name', 'email']);

    // Courses: no order by e-mail, the filters of courses, and the student filter gone.
    await user.selectOptions(screen.getByLabelText('Type'), 'courses');
    await waitFor(() => expect(lastSearch()).toMatchObject({ entity: 'courses' }));
    expect(lastSearch().filters).toBeUndefined();
    expect(lastSearch().sort).toEqual({ field: 'relevance', direction: 'desc' });
    expect(sortOptions()).toEqual(['relevance', 'name']);
    expect(await screen.findByRole('group', { name: 'Semester' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Fall 2024 (1)' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Credits' })).toBeInTheDocument();
    expect(facetCalls().at(-1)).toEqual(['/search/courses/facets', { params: { q: 'o' } }]);

    // Grades: ordered by date as well, narrowed by the two dates, no filter panel.
    const facetRequests = facetCalls().length;
    await user.selectOptions(screen.getByLabelText('Type'), 'grades');
    await waitFor(() => expect(lastSearch()).toMatchObject({ entity: 'grades' }));
    expect(sortOptions()).toEqual(['relevance', 'name', 'date']);
    expect(screen.getByLabelText('Date from')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(facetCalls()).toHaveLength(facetRequests);
  });

  it('says of a grade whose it is, in which course, the mark and the day', async () => {
    const user = renderPage();
    await user.selectOptions(screen.getByLabelText('Type'), 'grades');
    await user.type(screen.getByLabelText('Query'), 'Mid');

    await waitFor(() => expect(results()).toHaveLength(1));
    expect(results()[0]).toHaveTextContent('Midterm');
    expect(results()[0]).toHaveTextContent('John Doe · Calculus II · 17 / 20 · 2026-03-05');
  });
});
