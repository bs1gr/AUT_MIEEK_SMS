import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../test-utils/i18n-test-wrapper';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import SearchSortControls from './SearchSortControls';

describe('SearchSortControls Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const defaultSort = {
    field: 'relevance' as const,
    direction: 'desc' as const,
  };

  const renderComponent = (sort = defaultSort) => {
    return renderWithI18n(<SearchSortControls sort={sort} onChange={mockOnChange} />);
  };

  it('renders sort field selector', () => {
    renderComponent();

    const fieldSelect = screen.getByLabelText(/sort by/i);
    expect(fieldSelect).toHaveValue('relevance');
  });

  it('renders sort direction selector', () => {
    renderComponent();

    const directionSelect = screen.getByLabelText(/sort direction/i);
    expect(directionSelect).toHaveValue('desc');
  });

  it('displays all sort field options', () => {
    renderComponent();

    const fieldSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;
    const options = Array.from(fieldSelect.options).map((o) => o.value);

    expect(options).toContain('relevance');
    expect(options).toContain('name');
    expect(options).toContain('email');
    expect(options).toContain('created_at');
    expect(options).toContain('updated_at');
  });

  it('displays both sort directions', () => {
    renderComponent();

    const directionSelect = screen.getByLabelText(/sort direction/i) as HTMLSelectElement;
    const options = Array.from(directionSelect.options).map((o) => o.value);

    expect(options).toContain('asc');
    expect(options).toContain('desc');
  });

  it('calls onChange when sort field changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const fieldSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;
    await user.selectOptions(fieldSelect, 'name');

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'name',
      direction: 'desc',
    });
  });

  it('calls onChange when sort direction changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const directionSelect = screen.getByLabelText(/sort direction/i) as HTMLSelectElement;
    await user.selectOptions(directionSelect, 'asc');

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'relevance',
      direction: 'asc',
    });
  });

  it('updates field without affecting direction', async () => {
    const user = userEvent.setup();
    renderComponent({
      field: 'name',
      direction: 'asc',
    });

    const fieldSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;
    await user.selectOptions(fieldSelect, 'email');

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'email',
      direction: 'asc',
    });
  });

  it('updates direction without affecting field', async () => {
    const user = userEvent.setup();
    renderComponent({
      field: 'name',
      direction: 'asc',
    });

    const directionSelect = screen.getByLabelText(/sort direction/i) as HTMLSelectElement;
    await user.selectOptions(directionSelect, 'desc');

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'name',
      direction: 'desc',
    });
  });

  it('reflects current sort state in UI', () => {
    renderComponent({
      field: 'created_at',
      direction: 'asc',
    });

    const fieldSelect = screen.getByLabelText(/sort by/i);
    expect(fieldSelect).toHaveValue('created_at');
    const directionSelect = screen.getByLabelText(/sort direction/i);
    expect(directionSelect).toHaveValue('asc');
  });

  it('renders with appropriate labels', () => {
    renderComponent();

    expect(screen.getByText(/sort by/i)).toBeInTheDocument();
  });

  it('handles rapid sort changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const fieldSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;

    await user.selectOptions(fieldSelect, 'name');
    await user.selectOptions(fieldSelect, 'email');
    await user.selectOptions(fieldSelect, 'created_at');

    expect(mockOnChange).toHaveBeenCalledTimes(3);
    expect(mockOnChange).toHaveBeenLastCalledWith({
      field: 'created_at',
      direction: 'desc',
    });
  });
});
