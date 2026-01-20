import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImportExportPage from '../ImportExportPage';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ImportExportPage', () => {
  it('renders page title and main controls', () => {
    render(<ImportExportPage />);

    // Check title
    expect(screen.getByText('import_export.title')).toBeInTheDocument();

    // Check section headers (actual translation keys used by component)
    expect(screen.getByText('import_export.import.title')).toBeInTheDocument();
    expect(screen.getByText('import_export.export.title')).toBeInTheDocument();

    // Check that file upload input exists
    const fileInput = screen.getByLabelText('import_export.import.choose_file');
    expect(fileInput).toBeInTheDocument();
  });
});
