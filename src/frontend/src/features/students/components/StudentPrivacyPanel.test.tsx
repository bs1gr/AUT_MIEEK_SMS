import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentPrivacyPanel from './StudentPrivacyPanel';
import { dataSubjectAPI } from '@/api/dataSubjectAPI';
import type { Student } from '@/types';

vi.mock('@/api/dataSubjectAPI', () => ({
  dataSubjectAPI: { getHealth: vi.fn(), saveHealth: vi.fn(), exportData: vi.fn(), erase: vi.fn() },
}));

const downloadBlob = vi.fn();
vi.mock('@/utils/downloadFile', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    language: 'en',
  }),
}));

const api = dataSubjectAPI as unknown as Record<'getHealth' | 'saveHealth' | 'exportData' | 'erase', ReturnType<typeof vi.fn>>;

const student = {
  id: 7,
  first_name: 'Maria',
  last_name: 'K',
  email: 'm@example.com',
  student_id: 'S-007',
} as Student;

describe('StudentPrivacyPanel', () => {
  const onErased = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getHealth.mockResolvedValue({ text: 'Asthma', enabled: true });
    api.saveHealth.mockImplementation(async (_id: number, text: string) => text);
    api.exportData.mockResolvedValue({ blob: new Blob(['{}']), filename: 'personal_data_S_007_20261113.json' });
    api.erase.mockResolvedValue(undefined);
    downloadBlob.mockResolvedValue(undefined);
  });

  it('shows the stored health information and saves a change', async () => {
    render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    const box = await screen.findByTestId('student-health-info');
    await waitFor(() => expect(box).toHaveValue('Asthma'));
    expect(screen.getByTestId('student-health-save')).toBeDisabled(); // nothing changed yet

    fireEvent.change(box, { target: { value: 'Asthma, inhaler in the office' } });
    fireEvent.click(screen.getByTestId('student-health-save'));

    await waitFor(() => expect(api.saveHealth).toHaveBeenCalledWith(7, 'Asthma, inhaler in the office'));
    expect(await screen.findByText('healthInfoSaved')).toBeInTheDocument();
  });

  it('renders nothing when the server refuses the health information', async () => {
    api.getHealth.mockRejectedValue({ response: { status: 403 } });

    const { container } = render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('leaves the health field out where the installation does not record it, and keeps the rest', async () => {
    api.getHealth.mockResolvedValue({ text: '', enabled: false });

    render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    expect(await screen.findByTestId('student-data-export')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('student-health-info')).toBeNull());
    expect(screen.getByTestId('student-erase-toggle')).toBeInTheDocument();
  });

  it('downloads the personal-data file', async () => {
    render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    fireEvent.click(await screen.findByTestId('student-data-export'));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    expect(api.exportData).toHaveBeenCalledWith(7);
    expect(downloadBlob.mock.calls[0][1]).toBe('personal_data_S_007_20261113.json');
  });

  it('erases only after the registry number was typed exactly', async () => {
    render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    fireEvent.click(await screen.findByTestId('student-erase-toggle'));
    const button = screen.getByTestId('student-erase-button');
    expect(button).toBeDisabled();
    expect(screen.getByText('eraseStudentConfirmLabel {"number":"S-007"}')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('student-erase-input'), { target: { value: 'S-00' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByTestId('student-erase-input'), { target: { value: 'S-007' } });
    fireEvent.click(button);

    await waitFor(() => expect(api.erase).toHaveBeenCalledWith(7, 'S-007'));
    await waitFor(() => expect(onErased).toHaveBeenCalledWith(7));
  });

  it('says so when the erasure fails and keeps the student', async () => {
    api.erase.mockRejectedValue(new Error('boom'));
    render(<StudentPrivacyPanel student={student} onErased={onErased} />);

    fireEvent.click(await screen.findByTestId('student-erase-toggle'));
    fireEvent.change(screen.getByTestId('student-erase-input'), { target: { value: 'S-007' } });
    fireEvent.click(screen.getByTestId('student-erase-button'));

    expect(await screen.findByText('eraseStudentFailed')).toBeInTheDocument();
    expect(onErased).not.toHaveBeenCalled();
  });
});
