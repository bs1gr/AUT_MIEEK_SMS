import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradeBreakdownModal from './GradeBreakdownModal';
import apiClient from '@/api/api';
import type { FinalGrade } from '@/types';

vi.mock('@/api/api');

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockedApiClient = apiClient as unknown as { get: ReturnType<typeof vi.fn> };

const FINAL_GRADE: FinalGrade = {
  student_id: 42,
  course_id: 7,
  course_name: 'Intro to Programming',
  final_grade: 87.5,
  percentage: 87.5,
  gpa: 3.5,
  greek_grade: 17.5,
  letter_grade: 'B',
  total_weight_used: 100,
  category_breakdown: {
    'Midterm Exam': { average: 90, weight: 40, contribution: 36, total_items: 1 },
    'Final Exam': { average: 85, weight: 60, contribution: 51, total_items: 1 },
  },
  absence_penalty: 0,
  unexcused_absences: 0,
  absence_deduction: 0,
};

describe('GradeBreakdownModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the breakdown is being fetched', () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => {}));

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('fetches from the final-grade endpoint for the given student and course', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(mockedApiClient.get).toHaveBeenCalledWith('/analytics/student/42/course/7/final-grade')
    );
  });

  it('renders the percentage, Greek scale, and letter grade once loaded', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    render(<GradeBreakdownModal studentId={42} courseId={7} courseName="Intro to Programming" onClose={vi.fn()} />);

    expect(await screen.findByText('87.50%')).toBeInTheDocument();
    expect(screen.getByText('17.5/20')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText(/Intro to Programming/)).toBeInTheDocument();
  });

  it('renders a row per category with its weight and contribution', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');

    expect(screen.getByText('midtermExam')).toBeInTheDocument();
    expect(screen.getByText('finalExam')).toBeInTheDocument();
    expect(screen.getByText('90.00%')).toBeInTheDocument();
    expect(screen.getByText('85.00%')).toBeInTheDocument();
  });

  it('shows the absence penalty section only when there are unexcused absences', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: { ...FINAL_GRADE, unexcused_absences: 2, absence_penalty: 5, absence_deduction: 10 },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByText('absencePenaltyApplied')).toBeInTheDocument();
  });

  it('does not render the absence penalty section when there are no unexcused absences', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');

    expect(screen.queryByText('absencePenaltyApplied')).not.toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedApiClient.get.mockRejectedValue(new Error('network down'));

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByText('network down')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={onClose} />);

    await screen.findByText('87.50%');
    await user.click(screen.getAllByRole('button', { name: 'close' })[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when studentId or courseId changes', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    const { rerender } = render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);
    await waitFor(() => expect(mockedApiClient.get).toHaveBeenCalledTimes(1));

    rerender(<GradeBreakdownModal studentId={42} courseId={8} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(mockedApiClient.get).toHaveBeenLastCalledWith('/analytics/student/42/course/8/final-grade')
    );
  });
});
