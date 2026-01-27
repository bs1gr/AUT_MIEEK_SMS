import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedQueryBuilder } from '../components/AdvancedQueryBuilder';

describe('AdvancedQueryBuilder', () => {
  test('renders and switches group operator', () => {
    const onFiltersChange = vi.fn();
    render(
      <AdvancedQueryBuilder
        filters={[]}
        onFiltersChange={onFiltersChange}
        entityType="students"
      />
    );
    expect(screen.getByText(/Advanced Query Builder/i)).toBeInTheDocument();
    const select = screen.getByLabelText('group-operator');
    fireEvent.change(select, { target: { value: 'OR' } });
    expect((select as HTMLSelectElement).value).toBe('OR');
  });
});
