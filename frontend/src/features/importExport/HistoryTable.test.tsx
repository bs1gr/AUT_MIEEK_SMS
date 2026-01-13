import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoryTable from './HistoryTable';

describe('HistoryTable', () => {
  it('renders without crashing and shows placeholder', () => {
    render(<HistoryTable />);
    expect(screen.getByTestId('history-table-root')).toBeInTheDocument();
    expect(screen.getByText(/history table coming soon/i)).toBeInTheDocument();
  });
});
