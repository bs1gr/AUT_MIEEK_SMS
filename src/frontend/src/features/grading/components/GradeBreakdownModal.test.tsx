import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradeBreakdownModal from './GradeBreakdownModal';
import apiClient from '@/api/api';
import type { FinalGrade } from '@/types';

vi.mock('@/api/api');

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  }),
}));

// The app's date format, as the page would print a day: a stand-in that shows what it was given.
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({ formatDate: (value: string) => `day(${value})` }),
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

  it('describes the Greek grade from the grade itself, not always as a fail', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE }); // 17.5/20

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByText('Λίαν Καλώς')).toBeInTheDocument();
    expect(screen.queryByText('fail')).not.toBeInTheDocument();
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

  it('flags insufficient attendance (ΜΙΕΕΚ absence limit) without changing the grade', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        ...FINAL_GRADE,
        attendance_insufficient: true,
        absence_limit: { absences: 5, limit_percent: 10, allowed_absences: 4 },
      },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByTestId('breakdown-attendance-insufficient')).toHaveTextContent('attendanceInsufficientBadge');
    expect(screen.getByText('87.50%')).toBeInTheDocument();
  });

  it('does not flag attendance when within the limit', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { ...FINAL_GRADE, attendance_insufficient: false } });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');
    expect(screen.queryByTestId('breakdown-attendance-insufficient')).not.toBeInTheDocument();
  });

  it('fails the course on a retake of the final exam under 50, with its grade and day, the grade unchanged', async () => {
    // Plan todo 80: as the absence limit, a flag; the final grade is still worked out and shown.
    mockedApiClient.get.mockResolvedValue({
      data: { ...FINAL_GRADE, final_exam_retake: { date: '2026-02-10', percentage: 45, failed: true } },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    const alert = await screen.findByTestId('breakdown-final-exam-retake');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('grades.finalExamRetakeFailedBadge');
    // The day at noon, so that no time zone moves it to the day before.
    expect(alert).toHaveTextContent('grades.finalExamRetakeFailedDetail {"date":"day(2026-02-10T12:00:00)","percentage":45}');
    expect(screen.getByText('87.50%')).toBeInTheDocument();
  });

  it('flags no retake of 50 or more, and none an older server does not send', async () => {
    for (const retake of [{ date: '2026-02-10', percentage: 50, failed: false }, null, undefined]) {
      mockedApiClient.get.mockResolvedValue({ data: { ...FINAL_GRADE, final_exam_retake: retake } });
      const { unmount } = render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);
      await screen.findByText('87.50%');
      expect(screen.queryByTestId('breakdown-final-exam-retake')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('counts the periods by status, a Late among the attended and named for the evaluation', async () => {
    // Plan todo 77: a Late is not an absence, but the teacher weighs it at the end.
    mockedApiClient.get.mockResolvedValue({
      data: { ...FINAL_GRADE, attendance: { present: 10, late: 3, absent: 1, excused: 2, recorded: 16 } },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    const block = await screen.findByTestId('breakdown-attendance');
    expect(block).toHaveTextContent('grades.breakdownAttendance {"present":10,"late":3,"absent":1,"excused":2}');
    expect(block).toHaveTextContent('grades.breakdownLateNote');
  });

  it('says nothing of attendance without any period recorded', async () => {
    // What this server sends for a student with nothing recorded: the counts, all 0.
    mockedApiClient.get.mockResolvedValue({
      data: { ...FINAL_GRADE, attendance: { present: 0, late: 0, absent: 0, excused: 0, recorded: 0 } },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');
    expect(screen.queryByTestId('breakdown-attendance')).not.toBeInTheDocument();
  });

  it('says nothing of attendance from an older server, which sends no counts', async () => {
    mockedApiClient.get.mockResolvedValue({ data: FINAL_GRADE });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');
    expect(screen.queryByTestId('breakdown-attendance')).not.toBeInTheDocument();
  });

  it('names an Attendance rule in the page language (todo 77 point 2)', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        ...FINAL_GRADE,
        category_breakdown: { Attendance: { average: 75, weight: 20, contribution: 15, total_items: 1 } },
      },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByText('attendanceCategory')).toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
  });

  it('names any other standard category in the page language too', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        ...FINAL_GRADE,
        category_breakdown: {
          Presentation: { average: 80, weight: 50, contribution: 40, total_items: 1 },
          Quizzes: { average: 70, weight: 50, contribution: 35, total_items: 1 },
        },
      },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByText('presentation')).toBeInTheDocument();
    expect(screen.getByText('quizzes')).toBeInTheDocument();
  });

  it('says the final grade is the mean of the grades where no rule takes them', async () => {
    // Plan todo 77 point 3: no category to list (no empty table), and the absence penalty applies.
    mockedApiClient.get.mockResolvedValue({
      data: {
        ...FINAL_GRADE,
        final_grade: 70,
        total_weight_used: 0,
        grade_basis: 'average',
        category_breakdown: {},
        unexcused_absences: 2,
        absence_penalty: 5,
        absence_deduction: 10,
      },
    });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    expect(await screen.findByTestId('breakdown-final-from-mean')).toHaveTextContent('grades.finalGradeFromMeanNote');
    expect(screen.getByText('70.00%')).toBeInTheDocument();
    expect(screen.queryByText('totalBeforePenalty')).not.toBeInTheDocument();
    expect(screen.getByText('absencePenaltyApplied')).toBeInTheDocument();
  });

  it('lists the categories, without that note, when the rules make the grade', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { ...FINAL_GRADE, grade_basis: 'rules' } });

    render(<GradeBreakdownModal studentId={42} courseId={7} onClose={vi.fn()} />);

    await screen.findByText('87.50%');
    expect(screen.queryByTestId('breakdown-final-from-mean')).not.toBeInTheDocument();
    expect(screen.getByText('totalBeforePenalty')).toBeInTheDocument();
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
