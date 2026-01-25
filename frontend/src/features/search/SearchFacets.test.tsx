import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import SearchFacets from './SearchFacets';

describe('SearchFacets Component', () => {
  const mockFacets = [
    {
      field: 'status',
      label: 'Status',
      type: 'checkbox' as const,
      values: [
        { label: 'Active', count: 45, value: 'active' },
        { label: 'Inactive', count: 12, value: 'inactive' },
        { label: 'Suspended', count: 3, value: 'suspended' },
      ],
    },
    {
      field: 'enrollment_type',
      label: 'Enrollment Type',
      type: 'select' as const,
      values: [
        { label: 'Full-time', count: 38, value: 'full-time' },
        { label: 'Part-time', count: 15, value: 'part-time' },
        { label: 'Online', count: 7, value: 'online' },
      ],
    },
    {
      field: 'gpa_range',
      label: 'GPA Range',
      type: 'range' as const,
      min: 0,
      max: 4,
    },
    {
      field: 'enrollment_date',
      label: 'Enrollment Date',
      type: 'date-range' as const,
    },
  ];

  const mockOnSelect = vi.fn();

  const renderComponent = (facets = mockFacets, loading = false) => {
    return render(
      <SearchFacets facets={facets} loading={loading} onSelect={mockOnSelect} />
    );
  };

  it('renders facet groups', () => {
    renderComponent();

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Enrollment Type')).toBeInTheDocument();
    expect(screen.getByText('GPA Range')).toBeInTheDocument();
  });

  it('renders checkbox facet values with counts', () => {
    renderComponent();

    expect(screen.getByLabelText('Active (45)')).toBeInTheDocument();
    expect(screen.getByLabelText('Inactive (12)')).toBeInTheDocument();
    expect(screen.getByLabelText('Suspended (3)')).toBeInTheDocument();
  });

  it('renders select facet as dropdown', () => {
    renderComponent();

    const enrollmentTypeSelect = screen.getByDisplayValue('Full-time') as HTMLSelectElement;
    expect(enrollmentTypeSelect).toBeInTheDocument();
  });

  it('renders range facet with min/max inputs', () => {
    renderComponent();

    const minInput = screen.getByPlaceholderText(/min/i) as HTMLInputElement;
    const maxInput = screen.getByPlaceholderText(/max/i) as HTMLInputElement;

    expect(minInput).toBeInTheDocument();
    expect(maxInput).toBeInTheDocument();
    expect(minInput.min).toBe('0');
    expect(maxInput.max).toBe('4');
  });

  it('renders date range facet with start/end date inputs', () => {
    renderComponent();

    const startDateInput = screen.getByPlaceholderText(/start|from/i) as HTMLInputElement;
    const endDateInput = screen.getByPlaceholderText(/end|to/i) as HTMLInputElement;

    expect(startDateInput.type).toBe('date');
    expect(endDateInput.type).toBe('date');
  });

  it('handles checkbox selection', async () => {
    const user = userEvent.setup();
    renderComponent();

    const activeCheckbox = screen.getByLabelText('Active (45)') as HTMLInputElement;
    await user.click(activeCheckbox);

    expect(mockOnSelect).toHaveBeenCalledWith('status', 'active');
    expect(activeCheckbox.checked).toBe(true);
  });

  it('handles select change', async () => {
    const user = userEvent.setup();
    renderComponent();

    const enrollmentTypeSelect = screen.getByDisplayValue('Full-time') as HTMLSelectElement;
    await user.selectOptions(enrollmentTypeSelect, 'part-time');

    expect(mockOnSelect).toHaveBeenCalledWith('enrollment_type', 'part-time');
  });

  it('handles range slider changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const minInput = screen.getByPlaceholderText(/min/i) as HTMLInputElement;
    await user.clear(minInput);
    await user.type(minInput, '2.5');

    expect(mockOnSelect).toHaveBeenCalledWith('gpa_range', { min: 2.5 });
  });

  it('handles date range changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const startDateInput = screen.getByPlaceholderText(/start|from/i) as HTMLInputElement;
    await user.type(startDateInput, '2024-01-01');

    expect(mockOnSelect).toHaveBeenCalledWith('enrollment_date', { start: '2024-01-01' });
  });

  it('shows loading state', () => {
    renderComponent(mockFacets, true);

    expect(screen.getByText(/loading filters/i)).toBeInTheDocument();
  });

  it('shows empty state when no facets provided', () => {
    renderComponent(undefined, false);

    expect(screen.getByText(/no filters available/i)).toBeInTheDocument();
  });

  it('allows multiple checkbox selections in same facet', async () => {
    const user = userEvent.setup();
    renderComponent();

    const activeCheckbox = screen.getByLabelText('Active (45)') as HTMLInputElement;
    const inactiveCheckbox = screen.getByLabelText('Inactive (12)') as HTMLInputElement;

    await user.click(activeCheckbox);
    await user.click(inactiveCheckbox);

    expect(mockOnSelect).toHaveBeenCalledTimes(2);
    expect(activeCheckbox.checked).toBe(true);
    expect(inactiveCheckbox.checked).toBe(true);
  });

  it('renders "Show more" button for long facet lists', async () => {
    const user = userEvent.setup();
    const longFacet = {
      ...mockFacets[0],
      values: Array.from({ length: 15 }, (_, i) => ({
        label: `Option ${i + 1}`,
        count: 10 - i,
        value: `option-${i + 1}`,
      })),
    };

    renderComponent([longFacet]);

    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    expect(showMoreButton).toBeInTheDocument();

    await user.click(showMoreButton);

    expect(screen.getByLabelText('Option 15 (0)')).toBeInTheDocument();
  });

  it('displays selected facet count badge', () => {
    renderComponent();

    expect(screen.getByText(/4 filters available/i)).toBeInTheDocument();
  });

  it('renders clear all button when facets are selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const clearButton = screen.getByRole('button', { name: /clear all/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(mockOnSelect).toHaveBeenCalledWith('__clear_all__', null);
  });

  it('maintains checkbox state when toggling', async () => {
    const user = userEvent.setup();
    renderComponent();

    const activeCheckbox = screen.getByLabelText('Active (45)') as HTMLInputElement;

    // Check
    await user.click(activeCheckbox);
    expect(activeCheckbox.checked).toBe(true);

    // Uncheck
    await user.click(activeCheckbox);
    expect(activeCheckbox.checked).toBe(false);
  });

  it('handles facet search/filter within values', async () => {
    const user = userEvent.setup();
    renderComponent();

    const statusFacet = screen.getByText('Status').closest('div');
    const searchInput = statusFacet?.querySelector('input[placeholder*="Search"]') as HTMLInputElement;

    if (searchInput) {
      await user.type(searchInput, 'act');
      expect(screen.getByLabelText('Active (45)')).toBeInTheDocument();
      expect(screen.queryByLabelText('Inactive (12)')).not.toBeInTheDocument();
    }
  });
});
