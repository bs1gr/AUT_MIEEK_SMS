import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportWizard from './ImportWizard';

describe('ImportWizard (smoke)', () => {
  it('renders and navigates steps', async () => {
    render(<ImportWizard />);
    // Stepper and initial step
    expect(screen.getByText(/Import Wizard/i)).toBeInTheDocument();
    expect(screen.getByText('Select File')).toBeInTheDocument();
    // Click to Preview Data step
    fireEvent.click(screen.getByTestId('step-1'));
    expect(screen.getByText('Preview Data')).toBeInTheDocument();
    // Click to Validate step
    fireEvent.click(screen.getByTestId('step-2'));
    expect(screen.getByText('Validate Data')).toBeInTheDocument();
    // Click to Commit step
    fireEvent.click(screen.getByTestId('step-3'));
    expect(screen.getByText('Commit Import')).toBeInTheDocument();
  });

  it('shows file input and allows file selection', async () => {
    render(<ImportWizard />);
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText(/Selected file/i)).toBeInTheDocument();
  });

  it('shows validate and commit buttons on correct steps', async () => {
    render(<ImportWizard />);
    fireEvent.click(screen.getByTestId('step-2'));
    expect(screen.getByTestId('validate-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('step-3'));
    expect(screen.getByTestId('commit-btn')).toBeInTheDocument();
  });
});
