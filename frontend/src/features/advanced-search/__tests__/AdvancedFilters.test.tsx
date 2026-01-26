import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithI18n } from '@/test-utils/i18n-test-wrapper';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import AdvancedFilters, { DEFAULT_FILTER_FIELDS } from '../components/AdvancedFilters';
import { FilterCondition } from '../types/search';

const renderWithState = (initialFilters: FilterCondition[] = []) => {
  const onChange = vi.fn();
  const Wrapper: React.FC = () => {
    const [filters, setFilters] = useState<FilterCondition[]>(initialFilters);
    return (
      <AdvancedFilters
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          onChange(next);
        }}
        availableFields={DEFAULT_FILTER_FIELDS}
      />
    );
  };

  const utils = renderWithI18n(<Wrapper />);
  return { ...utils, onChange };
};

const defaultFilter: FilterCondition = {
  field: 'status',
  operator: 'equals',
  value: 'active',
};

const pointsFilter: FilterCondition = {
  field: 'points',
  operator: 'greaterThan',
  value: 0,
};

describe('AdvancedFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed by default', () => {
    renderWithState();

    expect(screen.queryByTestId('filters-content')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', () => {
    renderWithState();

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));

    expect(screen.getByTestId('filters-content')).toBeInTheDocument();
  });

  it('adds a new filter condition', async () => {
    const { onChange } = renderWithState();

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.click(screen.getByTestId('add-filter-btn'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(1);
    });

    expect(screen.getByTestId('filter-condition-0')).toBeInTheDocument();
  });

  it('removes a filter condition', async () => {
    const { onChange } = renderWithState([defaultFilter]);

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.click(screen.getByTestId('remove-condition-0'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('clears all filters', async () => {
    const { onChange } = renderWithState([defaultFilter, pointsFilter]);

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.click(screen.getByTestId('clear-all-btn'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('shows badge with filter count when filters exist', () => {
    renderWithState([defaultFilter, pointsFilter]);

    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('2');
  });

  it('updates field selection', async () => {
    const { onChange } = renderWithState([defaultFilter]);

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.change(screen.getByTestId('field-select-0'), { target: { value: 'code' } });

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].field).toBe('code');
    });
  });

  it('updates operator and renders range inputs for between', async () => {
    const { onChange } = renderWithState([pointsFilter]);

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.change(screen.getByTestId('operator-select-0'), { target: { value: 'between' } });

    expect(screen.getByTestId('value-input-min-0')).toBeInTheDocument();
    expect(screen.getByTestId('value-input-max-0')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('value-input-min-0'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('value-input-max-0'), { target: { value: '10' } });

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].value).toEqual([5, 10]);
    });
  });

  it('updates single value input', async () => {
    const { onChange } = renderWithState([defaultFilter]);

    fireEvent.click(screen.getByTestId('toggle-filters-btn'));
    fireEvent.change(screen.getByTestId('value-input-0'), { target: { value: 'inactive' } });

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].value).toBe('inactive');
    });
  });
});
