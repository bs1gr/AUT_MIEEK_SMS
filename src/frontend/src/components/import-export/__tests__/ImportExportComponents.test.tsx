/**
 * Control Panel > Maintenance > Import/Export: the dialog that exports, the wizard that imports
 * and the list of jobs (plan todo 62).
 *
 * As they were until November 2026: every request went out with `fetch`, without the sign-in
 * token, and was refused; the export dialog asked for "excel", which the server did not know,
 * and only ever for students; the import wizard stopped after the check and closed as if the
 * import were done; and the list asked for columns its source does not have. The file that
 * stood here held one test, which asserted that true is true.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { ExportDialog, HistoryTable, ImportWizard } from '..';

vi.mock('@/api/importExportApi', () => ({
  importExportApi: {
    uploadImportFile: vi.fn(),
    getImportJob: vi.fn(),
    commitImportJob: vi.fn(),
    listImportJobs: vi.fn(),
    createExport: vi.fn(),
    getExportJob: vi.fn(),
    listExportJobs: vi.fn(),
    downloadExport: vi.fn(),
  },
  // One question, no waiting: a test says with its mocks what the job has become.
  pollJob: async (ask: () => Promise<unknown>, done: (job: unknown) => boolean) => {
    const job = await ask();
    return done(job) ? job : null;
  },
}));
vi.mock('@/utils/downloadFile', () => ({ downloadBlob: vi.fn() }));

import { importExportApi } from '@/api/importExportApi';
import { downloadBlob } from '@/utils/downloadFile';

type Mock = ReturnType<typeof vi.fn>;
const api = importExportApi as unknown as Record<keyof typeof importExportApi, Mock>;
const saved = downloadBlob as unknown as Mock;

const show = async (ui: React.ReactElement, language: 'en' | 'el' = 'en') => {
  localStorage.setItem('i18nextLng', language);
  await i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

const importJob = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  file_name: 'students.csv',
  file_type: 'csv',
  import_type: 'students',
  status: 'ready',
  total_rows: 3,
  successful_rows: 3,
  failed_rows: 0,
  validation_errors: null,
  created_at: '2026-11-19T08:00:00Z',
  completed_at: null,
  ...overrides,
});

const exportJob = (overrides: Record<string, unknown> = {}) => ({
  id: 4,
  export_type: 'grades',
  file_format: 'pdf',
  status: 'completed',
  total_records: 12,
  file_path: '/data/exports/export_4.pdf',
  created_at: '2026-11-19T09:00:00Z',
  ...overrides,
});

const chooseFile = (name = 'students.csv') => {
  const file = new File(['student_id,first_name\n'], name, { type: '' });
  fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [file] } });
  return file;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExportDialog', () => {
  it('asks for the kind and the format that were chosen, waits for the job and saves its file', async () => {
    const blob = new Blob(['%PDF-1.4']);
    api.createExport.mockResolvedValue(exportJob({ status: 'pending' }));
    api.getExportJob.mockResolvedValue(exportJob());
    api.downloadExport.mockResolvedValue(blob);
    const onClose = vi.fn();
    await show(<ExportDialog isOpen onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('What to export'), { target: { value: 'grades' } });
    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(saved).toHaveBeenCalledWith(blob, 'grades-export.pdf'));
    // It used to send "excel" for an Excel file and "students" whatever was wanted.
    expect(api.createExport).toHaveBeenCalledWith('grades', 'pdf');
    expect(api.getExportJob).toHaveBeenCalledWith(4);
    expect(api.downloadExport).toHaveBeenCalledWith(4);
    expect(onClose).toHaveBeenCalled();
  });

  it('offers the four kinds and the three formats the server writes, an Excel file first', async () => {
    await show(<ExportDialog isOpen onClose={vi.fn()} />);

    const kinds = within(screen.getByLabelText('What to export')).getAllByRole('option') as HTMLOptionElement[];
    const formats = within(screen.getByLabelText('Format')).getAllByRole('option') as HTMLOptionElement[];

    expect(kinds.map((option) => option.value)).toEqual(['students', 'courses', 'grades', 'attendance']);
    expect(formats.map((option) => option.value)).toEqual(['xlsx', 'csv', 'pdf']);
    // Two controls that the server never looked at are gone.
    expect(screen.queryByText('Include headers')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Date Range')).not.toBeInTheDocument();
  });

  it('says so when the server could not make the file, and saves nothing', async () => {
    api.createExport.mockResolvedValue(exportJob({ status: 'pending' }));
    api.getExportJob.mockResolvedValue(exportJob({ status: 'failed' }));
    const onClose = vi.fn();
    await show(<ExportDialog isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not make the file.');
    expect(saved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('speaks Greek to a Greek reader', async () => {
    await show(<ExportDialog isOpen onClose={vi.fn()} />, 'el');

    expect(screen.getByLabelText('Τι θα εξαχθεί')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Τι θα εξαχθεί')).getByRole('option', { name: 'Παρουσίες' })).toBeInTheDocument();
  });
});

describe('ImportWizard', () => {
  it('checks the file, and stores it only when asked to: then it says how many rows', async () => {
    api.uploadImportFile.mockResolvedValue(importJob({ status: 'pending' }));
    api.getImportJob.mockResolvedValueOnce(importJob());
    api.commitImportJob.mockResolvedValue(importJob({ status: 'importing' }));
    const onComplete = vi.fn();
    await show(<ImportWizard type="students" onCancel={vi.fn()} onComplete={onComplete} />);

    const file = chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText('The file was checked: 3 row(s), no faults. Nothing is stored yet.')).toBeInTheDocument();
    expect(api.uploadImportFile).toHaveBeenCalledWith('students', file);
    // It used to close here, as if the import were done. Nothing had been stored.
    expect(api.commitImportJob).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    api.getImportJob.mockResolvedValueOnce(importJob({ status: 'completed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Store the rows' }));

    expect(await screen.findByText('Stored: 3 row(s).')).toBeInTheDocument();
    expect(api.commitImportJob).toHaveBeenCalledWith(7);
    // Two buttons close the wizard now: the cross in its head, and this one at its foot.
    const closing = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closing[closing.length - 1]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows what is wrong with a file that has faults, and does not offer to store it', async () => {
    api.uploadImportFile.mockResolvedValue(importJob({ status: 'pending' }));
    api.getImportJob.mockResolvedValue(
      importJob({
        status: 'invalid',
        successful_rows: 1,
        failed_rows: 2,
        validation_errors: { '3': ['Missing email'], '4': ['Invalid email format', 'The same student_id as row 2'] },
      })
    );
    await show(<ImportWizard type="students" onCancel={vi.fn()} onComplete={vi.fn()} />);

    chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const faults = await screen.findByTestId('import-faults');
    expect(within(faults).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Row 3: Missing email',
      'Row 4: Invalid email format; The same student_id as row 2',
    ]);
    expect(screen.getByText(/The file has faults in 2 of 3 row\(s\)\. Nothing was stored\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Store the rows' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a different file' })).toBeInTheDocument();
    expect(api.commitImportJob).not.toHaveBeenCalled();
  });

  it('says which columns a file of grades needs, and takes a file by its name', async () => {
    await show(<ImportWizard type="grades" onCancel={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText(/Columns: student_id, course_code, grade\./)).toBeInTheDocument();
    chooseFile('grades.txt');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid file format. Please upload a CSV or Excel file.');
    // A CSV file comes with several types from a browser, or with none: the name decides.
    chooseFile('grades.CSV');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('grades.CSV')).toBeInTheDocument();
  });

  it('says what the server said when the file could not be stored', async () => {
    api.uploadImportFile.mockResolvedValue(importJob({ status: 'pending' }));
    api.getImportJob.mockResolvedValueOnce(importJob());
    api.commitImportJob.mockResolvedValue(importJob({ status: 'importing' }));
    await show(<ImportWizard type="students" onCancel={vi.fn()} onComplete={vi.fn()} />);
    chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await screen.findByRole('button', { name: 'Store the rows' });

    api.getImportJob.mockResolvedValueOnce(
      importJob({ status: 'failed', validation_errors: { commit_error: 'Row 3: Missing student_id or email' } })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Store the rows' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The file: Row 3: Missing student_id or email');
  });
});

describe('HistoryTable', () => {
  it('lists the import and the export jobs, the newest first, and saves the file of a finished export', async () => {
    const blob = new Blob(['x']);
    api.listImportJobs.mockResolvedValue([importJob({ status: 'invalid', created_at: '2026-11-19T08:00:00Z' })]);
    api.listExportJobs.mockResolvedValue([
      exportJob({ id: 4, created_at: '2026-11-19T09:00:00Z' }),
      exportJob({ id: 5, status: 'failed', export_type: 'attendance', file_format: 'csv', created_at: '2026-11-19T07:00:00Z' }),
    ]);
    api.downloadExport.mockResolvedValue(blob);
    await show(<HistoryTable />);

    const rows = (await screen.findAllByRole('row')).slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(rows.map((cells) => cells.slice(0, 5))).toEqual([
      ['Export', 'Grades', 'PDF', 'Done', '12'],
      ['Import', 'Students', 'students.csv', 'Has faults', '3'],
      ['Export', 'Attendance', 'CSV', 'Failed', '12'],
    ]);

    // One file to download: the export that is done.
    const buttons = screen.getAllByRole('button', { name: 'Download' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(saved).toHaveBeenCalledWith(blob, 'grades-export.pdf'));
    expect(api.downloadExport).toHaveBeenCalledWith(4);
  });

  it('says that the list could not be loaded', async () => {
    api.listImportJobs.mockRejectedValue({ response: { status: 401 } });
    api.listExportJobs.mockResolvedValue([]);
    await show(<HistoryTable />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The list could not be loaded.');
  });

  it('says so when there is nothing yet', async () => {
    api.listImportJobs.mockResolvedValue([]);
    api.listExportJobs.mockResolvedValue([]);
    await show(<HistoryTable />);

    expect(await screen.findByText('No data available')).toBeInTheDocument();
  });
});
