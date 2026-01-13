import { render, screen, fireEvent } from '@testing-library/react';
import ExportDialog from './ExportDialog';

describe('ExportDialog', () => {
  it('renders and toggles dialog', () => {
    render(<ExportDialog />);
    const openBtn = screen.getByTestId('open-export-dialog-btn');
    fireEvent.click(openBtn);
    expect(screen.getByText(/Export Data/i)).toBeInTheDocument();
    const closeBtn = screen.getByTestId('close-export-dialog-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Export Data/i)).not.toBeInTheDocument();
  });
});
