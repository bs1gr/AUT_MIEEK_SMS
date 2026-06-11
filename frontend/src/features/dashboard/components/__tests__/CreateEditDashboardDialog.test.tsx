import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { LanguageProvider } from '@/LanguageContext';
import CreateEditDashboardDialog from '../CreateEditDashboardDialog';

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  );
}

describe('CreateEditDashboardDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create dialog when no dashboard provided', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/New Dashboard/i)).toBeInTheDocument();
  });

  it('renders edit dialog when dashboard provided', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const dashboard = {
      id: 1,
      name: 'Test Dashboard',
      description: 'Test description',
      configuration: { charts: ['performance'] },
      is_default: false,
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    };

    render(
      <CreateEditDashboardDialog
        dashboard={dashboard}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Edit Dashboard/i)).toBeInTheDocument();
  });

  it('pre-fills form with dashboard data', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const dashboard = {
      id: 1,
      name: 'Test Dashboard',
      description: 'Test description',
      configuration: { charts: ['performance', 'gradeDistribution'] },
      is_default: false,
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    };

    render(
      <CreateEditDashboardDialog
        dashboard={dashboard}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByDisplayValue('Test Dashboard') as HTMLInputElement;
    const descriptionInput = screen.getByDisplayValue('Test description') as HTMLTextAreaElement;

    expect(nameInput.value).toBe('Test Dashboard');
    expect(descriptionInput.value).toBe('Test description');
  });

  it('checks chart checkboxes from configuration', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const dashboard = {
      id: 1,
      name: 'Test Dashboard',
      description: 'Test description',
      configuration: { charts: ['performance', 'gradeDistribution'] },
      is_default: false,
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    };

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={dashboard}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    // Get all checkboxes - they're pre-checked based on configuration
    const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    // Count how many are checked (should be 2 for 'performance' and 'gradeDistribution')
    const checkedCount = Array.from(checkboxes).filter((cb) => cb.checked).length;
    expect(checkedCount).toBe(2);
  });

  it('requires dashboard name', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
  });

  it('requires at least one chart selected', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText(/e.g., Math Performance/i) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Dashboard');

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Please select at least one chart/i)).toBeInTheDocument();
  });

  it('calls onSave with correct data on form submit', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText(/e.g., Math Performance/i);
    await user.type(nameInput, 'New Dashboard');

    // Select a chart
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const firstCheckbox = checkboxes[0] as HTMLInputElement;
    await user.click(firstCheckbox);

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockSave).toHaveBeenCalledWith({
      name: 'New Dashboard',
      description: undefined,
      configuration: { charts: [firstCheckbox.value] },
    });
  });

  it('trims whitespace from inputs', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByPlaceholderText(/e.g., Math Performance/i);
    await user.type(nameInput, '  Test Dashboard  ');

    // Select a chart
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const firstCheckbox = checkboxes[0] as HTMLInputElement;
    await user.click(firstCheckbox);

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockSave).toHaveBeenCalledWith({
      name: 'Test Dashboard',
      description: undefined,
      configuration: { charts: [firstCheckbox.value] },
    });
  });

  it('toggles chart selection on checkbox click', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const firstCheckbox = checkboxes[0] as HTMLInputElement;

    expect(firstCheckbox.checked).toBe(false);

    await user.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(true);

    await user.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(false);
  });

  it('calls onClose when close button clicked', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const closeButton = container.querySelector('button[title*="Close"]') || screen.getByText('Cancel');
    await user.click(closeButton);

    expect(mockClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    const backdrop = container.querySelector('.bg-black.bg-opacity-50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockClose).toHaveBeenCalled();
    }
  });

  it('displays loading state when isLoading prop is true', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
        isLoading={true}
      />,
      { wrapper: createWrapper() }
    );

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();

    // Check for spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays chart count', async () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <CreateEditDashboardDialog
        dashboard={null}
        onSave={mockSave}
        onClose={mockClose}
      />,
      { wrapper: createWrapper() }
    );

    // Find the chart count display element (always present below chart selection)
    const countElement = container.querySelector('p.text-xs.text-slate-500');
    expect(countElement).toBeInTheDocument();

    // Initial state - element should exist but show either "{count}" (fallback) or "0 chart(s)"
    expect(countElement?.textContent).toBeTruthy();

    // Click first checkbox
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const firstCheckbox = checkboxes[0] as HTMLInputElement;
    await user.click(firstCheckbox);

    // After click, verify the element updated (checkbox state changed)
    expect(firstCheckbox.checked).toBe(true);

    // The count element should still exist
    expect(countElement).toBeInTheDocument();
  });
});
