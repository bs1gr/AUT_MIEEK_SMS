import { render, screen, fireEvent } from '@testing-library/react';
import { SearchHistorySidebar } from '../components/SearchHistorySidebar';

// Stub localStorage for deterministic tests
beforeEach(() => {
  const store: Record<string, string> = {};
  vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key: string) => store[key]);
  vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation((key: string, value: string) => {
    store[key] = value;
  });
});

describe('SearchHistorySidebar', () => {
  test('renders empty state', () => {
    render(<SearchHistorySidebar onSelect={vi.fn()} />);
    expect(screen.getByText(/Search History/i)).toBeInTheDocument();
    expect(screen.getByText(/No recent searches/i)).toBeInTheDocument();
  });

  test('adds entries and selects', () => {
    const onSelect = vi.fn();
    render(<SearchHistorySidebar onSelect={onSelect} />);

    // Simulate persisted entries
    const entries = [
      { id: '1', query: 'john', entity_type: 'students', timestamp: Date.now() },
    ];
    window.localStorage.setItem('sms.search.history', JSON.stringify(entries));

    // Re-render to pick up entries
    render(<SearchHistorySidebar onSelect={onSelect} />);

    const item = screen.getByText('john');
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith('john');
  });
});
