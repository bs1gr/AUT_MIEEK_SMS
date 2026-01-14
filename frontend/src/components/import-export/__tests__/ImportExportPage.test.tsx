import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImportExportPage from '../ImportExportPage';

// Mock components to verify correct import path resolution without rendering full children
vi.mock('../../components/import-export', () => ({
  ImportWizard: () => <div data-testid="import-wizard">ImportWizard</div>,
  ExportDialog: () => <div data-testid="export-dialog">ExportDialog</div>,
  HistoryTable: () => <div data-testid="history-table">HistoryTable</div>,
}));

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ImportExportPage', () => {
  it('renders page title and main controls', () => {
    render(<ImportExportPage />);

    // Check title and buttons
    expect(screen.getByText('import_export.title')).toBeInTheDocument();
    expect(screen.getByText('import_export.export')).toBeInTheDocument();
    expect(screen.getByText('import_export.import')).toBeInTheDocument();

    // Check that HistoryTable is rendered (verifies import from barrel file)
    expect(screen.getByTestId('history-table')).toBeInTheDocument();
  });
});
