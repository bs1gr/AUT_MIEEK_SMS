import { render, screen, fireEvent } from '@testing-library/react';
import { FacetedNavigation } from '../components/FacetedNavigation';
import type { FacetValue } from '../types/search';

function setup(facets: Record<string, FacetValue[]>, selected: Record<string, string[]> = {}) {
  const onToggle = vi.fn();
  const onClearFacet = vi.fn();
  render(
    <FacetedNavigation
      facets={facets}
      selected={selected}
      onToggle={onToggle}
      onClearFacet={onClearFacet}
    />
  );
  return { onToggle, onClearFacet };
}

describe('FacetedNavigation', () => {
  test('renders empty state', () => {
    setup({});
    expect(screen.getByRole('heading', { name: /facets/i })).toBeInTheDocument();
    expect(screen.getByText(/No facets available/i)).toBeInTheDocument();
  });

  test('renders facet values and toggles selection', () => {
    const facets = {
      status: [
        { value: 'active', count: 5 },
        { value: 'inactive', count: 2 },
      ],
    };
    const { onToggle } = setup(facets);
    const checkbox = screen.getByLabelText('status:active');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('status', 'active');
  });
});
