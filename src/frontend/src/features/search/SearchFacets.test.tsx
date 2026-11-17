import { useState } from 'react';
import { act, screen, within } from '@testing-library/react';
import testI18n, { renderWithI18n } from '../../test-utils/i18n-test-wrapper';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SearchFacets, { type FacetSelections } from './SearchFacets';
import type { FacetDefinition } from './useSearchFacets';

// The groups as the hook hands them over: the server's field names and its English labels.
const facets: FacetDefinition[] = [
  {
    field: 'status',
    label: 'Student Status',
    values: [
      { value: 'active', count: 45 },
      { value: 'inactive', count: 12 },
    ],
  },
  { field: 'enrollment_type', label: 'Study Year', values: [{ value: 'year_1', count: 30 }, { value: 'year_2', count: 27 }] },
  { field: 'enrollment_year', label: 'Enrollment Year', values: [{ value: '2026', count: 57 }] },
];

describe('SearchFacets', () => {
  const onToggle = vi.fn();
  const onClear = vi.fn();

  beforeEach(() => {
    onToggle.mockClear();
    onClear.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      await testI18n.changeLanguage('en');
    });
  });

  const renderPanel = (selected: FacetSelections = {}, groups: FacetDefinition[] = facets, loading = false) =>
    renderWithI18n(
      <SearchFacets facets={groups} selected={selected} loading={loading} onToggle={onToggle} onClear={onClear} />
    );

  it('shows each group under the page\'s own name for it, with the count of every value', () => {
    renderPanel();

    const status = screen.getByRole('group', { name: 'Status' });
    expect(within(status).getByRole('checkbox', { name: 'Active (45)' })).toBeInTheDocument();
    expect(within(status).getByRole('checkbox', { name: 'Inactive (12)' })).toBeInTheDocument();

    const year = screen.getByRole('group', { name: 'Study year' });
    expect(within(year).getByRole('checkbox', { name: 'Year 1 (30)' })).toBeInTheDocument();
    expect(within(year).getByRole('checkbox', { name: 'Year 2 (27)' })).toBeInTheDocument();

    expect(within(screen.getByRole('group', { name: 'Enrollment year' })).getByRole('checkbox', { name: '2026 (57)' })).toBeInTheDocument();
  });

  it('is in Greek on a Greek page', async () => {
    await act(async () => {
      await testI18n.changeLanguage('el');
    });
    renderPanel({ status: ['active'] });

    expect(screen.getByRole('group', { name: 'Κατάσταση' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ενεργός (45)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Έτος 2 (27)' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Έτος εγγραφής' })).toBeInTheDocument();
    expect(screen.getByText('Επιλεγμένα: 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Καθαρισμός όλων' })).toBeInTheDocument();
  });

  it('uses the server\'s label for a group it has no name for', () => {
    renderPanel({}, [{ field: 'campus', label: 'Campus', values: [{ value: 'Larnaca', count: 2 }] }]);

    expect(within(screen.getByRole('group', { name: 'Campus' })).getByRole('checkbox', { name: 'Larnaca (2)' })).toBeInTheDocument();
  });

  it('ticks what the page says is selected, and nothing else', () => {
    renderPanel({ status: ['inactive'], enrollment_type: ['year_1', 'year_2'] });

    expect(screen.getByRole('checkbox', { name: 'Active (45)' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Inactive (12)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Year 1 (30)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Year 2 (27)' })).toBeChecked();
    expect(screen.getByText('Selected: 3')).toBeInTheDocument();
  });

  it('reports the box that was clicked and leaves the ticking to the page', async () => {
    const user = userEvent.setup();
    renderPanel({ status: ['active'] });

    await user.click(screen.getByRole('checkbox', { name: 'Inactive (12)' }));
    await user.click(screen.getByRole('checkbox', { name: 'Active (45)' }));

    expect(onToggle.mock.calls).toEqual([
      ['status', 'inactive'],
      ['status', 'active'],
    ]);
    // Nothing changed on the screen: the page did not change what is selected.
    expect(screen.getByRole('checkbox', { name: 'Active (45)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Inactive (12)' })).not.toBeChecked();
  });

  it('follows the page through a tick, a second tick, a cleared box and "Clear all"', async () => {
    const user = userEvent.setup();
    const Page = () => {
      const [selected, setSelected] = useState<FacetSelections>({});
      return (
        <SearchFacets
          facets={facets}
          selected={selected}
          onToggle={(field, value) =>
            setSelected((previous) => {
              const values = previous[field] || [];
              const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
              return { ...previous, [field]: next };
            })
          }
          onClear={() => setSelected({})}
        />
      );
    };
    renderWithI18n(<Page />);
    const active = screen.getByRole('checkbox', { name: 'Active (45)' });
    const inactive = screen.getByRole('checkbox', { name: 'Inactive (12)' });

    await user.click(active);
    await user.click(inactive);
    expect(active).toBeChecked();
    expect(inactive).toBeChecked();
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();

    await user.click(active);
    expect(active).not.toBeChecked();
    expect(inactive).toBeChecked();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(inactive).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('offers "Clear all" only when something is ticked, and reports the click', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPanel();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
    unmount();

    renderPanel({ status: ['active'] });
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('says that it is loading only while it has nothing to show', () => {
    const { unmount } = renderPanel({}, [], true);
    expect(screen.getByText('Loading filters...')).toBeInTheDocument();
    unmount();

    // New counts on their way for the next text: the groups stay.
    renderPanel({}, facets, true);
    expect(screen.queryByText('Loading filters...')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
  });

  it('says so when a search has no filters', () => {
    renderPanel({}, []);

    expect(screen.getByText('No filters available')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows ten values of a long group, the rest on request, and finds a value by typing', async () => {
    const user = userEvent.setup();
    const long: FacetDefinition = {
      field: 'semester',
      label: 'Semester',
      values: Array.from({ length: 15 }, (_, index) => ({ value: `Term ${index + 1}`, count: 15 - index })),
    };
    renderPanel({}, [long]);

    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.queryByRole('checkbox', { name: 'Term 15 (1)' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(15);
    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);

    await user.type(screen.getByRole('textbox', { name: /Semester/ }), 'term 15');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'Term 15 (1)' })).toBeInTheDocument();
  });

  it('has no box to type in for a group of a few values', () => {
    renderPanel();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
