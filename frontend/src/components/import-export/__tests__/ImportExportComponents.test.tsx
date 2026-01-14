import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImportWizard, ExportDialog, HistoryTable } from '../index';
import { importExportApi } from '../../../api/importExportApi';

// Mock the API module
vi.mock('../../../api/importExportApi', () => ({
  importExportApi: {
    uploadImportFile: vi.fn(),
    commitImportJob: vi.fn(),
    createExport: vi.fn(),
    getHistory: vi.fn(),
  },
}));

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ImportExport Components', () => {
  describe('ImportWizard', () => {
    it('renders upload step initially', () => {
      render(<ImportWizard type="students" />);
      expect(screen.getByText('import.title_students')).toBeInTheDocument();
      expect(screen.getByText('import.select_file')).toBeInTheDocument();
    });
  });

  describe('ExportDialog', () => {
    it('renders when open', () => {
      render(<ExportDialog isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('export.title')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ExportDialog isOpen={false} onClose={() => {}} />);
      expect(screen.queryByText('export.title')).not.toBeInTheDocument();
    });
  });

  describe('HistoryTable', () => {
    it('renders history table with data', async () => {
        const mockHistory = {
            success: true,
            data: {
                history: [
                    {
                        id: 1,
                        operation_type: 'import',
                        resource_type: 'students',
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                        details: { count: 10 }
                    }
                ],
                total: 1
            }
        };

        vi.mocked(importExportApi.getHistory).mockResolvedValue(mockHistory as any);

        render(<HistoryTable />);

        await waitFor(() => {
            expect(screen.getByText('history.ops.import')).toBeInTheDocument();
        });
    });
  });
});
