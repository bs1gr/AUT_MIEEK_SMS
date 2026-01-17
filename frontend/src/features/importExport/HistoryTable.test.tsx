import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoryTable from './HistoryTable';

describe('HistoryTable', () => {
  it('renders without crashing and shows placeholder', () => {
    render(<HistoryTable />);
    expect(screen.getByTestId('history-table-root')).toBeInTheDocument();
    // When there are no jobs, it should show the "No import or export jobs found" message
    expect(screen.getByText(/No import or export jobs found/i)).toBeInTheDocument();
  });
});
