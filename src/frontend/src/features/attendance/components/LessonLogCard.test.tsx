import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LessonLogCard from './LessonLogCard';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import type { LessonLog } from '@/types';
import { clearLessonLogQueue } from '../utils/lessonLogQueue';
import { LESSON_LOG_AUTOSAVE_MS } from '../hooks/useLessonLogEditor';

vi.mock('@/api/lessonLogsAPI', () => ({
  lessonLogsAPI: { list: vi.fn(), save: vi.fn() },
}));

const api = lessonLogsAPI as unknown as { list: Mock; save: Mock };

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);

const page = (items: LessonLog[] = []) => ({ items, total: items.length, skip: 0, limit: 1, pages: 1, current_page: 1 });

const log = (overrides: Partial<LessonLog> = {}): LessonLog => ({
  id: 1,
  course_id: 7,
  date: '2026-11-12',
  period_number: 1,
  material_covered: null,
  teacher_notes: null,
  created_at: '2026-11-12T08:00:00Z',
  updated_at: '2026-11-12T08:00:00Z',
  ...overrides,
});

const baseProps = { t, courseId: 7 as const, dateStr: '2026-11-12', periods: [1] };

describe('LessonLogCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLessonLogQueue();
    api.list.mockResolvedValue(page());
    api.save.mockImplementation(async (payload) => log({ material_covered: payload.material_covered ?? null }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing until a course and a date are chosen', () => {
    const noCourse = render(<LessonLogCard {...baseProps} courseId="" />);
    expect(noCourse.container).toBeEmptyDOMElement();
    noCourse.unmount();

    const noDate = render(<LessonLogCard {...baseProps} dateStr="" />);
    expect(noDate.container).toBeEmptyDOMElement();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('shows the stored material and notes of the day', async () => {
    api.list.mockResolvedValue(page([log({ material_covered: 'Chapter 1: vectors', teacher_notes: 'Quiz next week' })]));

    render(<LessonLogCard {...baseProps} />);

    expect(await screen.findByDisplayValue('Chapter 1: vectors')).toBeInTheDocument();
    expect(screen.getByLabelText('lessonLogNotesLabel')).toHaveValue('Quiz next week');
    expect(screen.getByText('lessonLogNotesHint')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ course_id: 7, date: '2026-11-12', period_number: 1, limit: 1 });
  });

  it('keeps the fields disabled until the stored text has arrived, so typing cannot overwrite it', async () => {
    let arrive: (value: unknown) => void = () => undefined;
    api.list.mockImplementation(() => new Promise((resolve) => (arrive = resolve)));

    render(<LessonLogCard {...baseProps} />);

    expect(screen.getByLabelText('lessonLogMaterialLabel')).toBeDisabled();
    expect(screen.getByLabelText('lessonLogNotesLabel')).toBeDisabled();

    await act(async () => arrive(page([log({ material_covered: 'already written' })])));
    await waitFor(() => expect(screen.getByLabelText('lessonLogMaterialLabel')).toBeEnabled());
    expect(screen.getByLabelText('lessonLogMaterialLabel')).toHaveValue('already written');
  });

  it('saves what was typed after the quiet period and reports it', async () => {
    const onSaved = vi.fn();
    render(<LessonLogCard {...baseProps} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByLabelText('lessonLogMaterialLabel')).toBeEnabled());
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText('lessonLogMaterialLabel'), { target: { value: 'Chapter 2' } });
    expect(screen.getByText('lessonLogStatusPending')).toBeInTheDocument();
    expect(api.save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LESSON_LOG_AUTOSAVE_MS);
    });

    expect(api.save).toHaveBeenCalledWith({
      course_id: 7,
      date: '2026-11-12',
      period_number: 1,
      material_covered: 'Chapter 2',
    });
    expect(screen.getByText('lessonLogStatusSaved')).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('saves immediately when the field loses focus', async () => {
    render(<LessonLogCard {...baseProps} />);
    await waitFor(() => expect(screen.getByLabelText('lessonLogNotesLabel')).toBeEnabled());

    fireEvent.change(screen.getByLabelText('lessonLogNotesLabel'), { target: { value: 'Ran out of time' } });
    fireEvent.blur(screen.getByLabelText('lessonLogNotesLabel'));

    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        course_id: 7,
        date: '2026-11-12',
        period_number: 1,
        teacher_notes: 'Ran out of time',
      })
    );
  });

  it('offers a period switcher only on days with several periods', async () => {
    const single = render(<LessonLogCard {...baseProps} periods={[1]} />);
    await waitFor(() => expect(screen.getByLabelText('lessonLogMaterialLabel')).toBeEnabled());
    expect(screen.queryByTestId('lesson-log-periods')).toBeNull();
    single.unmount();

    render(<LessonLogCard {...baseProps} periods={[1, 2, 3]} />);
    const group = await screen.findByTestId('lesson-log-periods');
    expect(group.querySelectorAll('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'periodLabel {"number":1}' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches period, loads that period and saves the one being left', async () => {
    api.list.mockImplementation(async (query) =>
      page([log({ period_number: query.period_number, material_covered: `text of period ${query.period_number}` })])
    );
    render(<LessonLogCard {...baseProps} periods={[1, 2]} />);
    expect(await screen.findByDisplayValue('text of period 1')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('lessonLogMaterialLabel'), { target: { value: 'edited period 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'periodLabel {"number":2}' }));

    expect(await screen.findByDisplayValue('text of period 2')).toBeInTheDocument();
    expect(api.list).toHaveBeenLastCalledWith({ course_id: 7, date: '2026-11-12', period_number: 2, limit: 1 });
    expect(api.save).toHaveBeenCalledWith({
      course_id: 7,
      date: '2026-11-12',
      period_number: 1,
      material_covered: 'edited period 1',
    });
    expect(screen.getByRole('button', { name: 'periodLabel {"number":2}' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('goes back to period 1 for another date', async () => {
    const { rerender } = render(<LessonLogCard {...baseProps} periods={[1, 2]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'periodLabel {"number":2}' }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ period_number: 2 })));

    rerender(<LessonLogCard {...baseProps} dateStr="2026-11-13" periods={[1, 2]} />);

    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ course_id: 7, date: '2026-11-13', period_number: 1, limit: 1 })
    );
    expect(screen.getByRole('button', { name: 'periodLabel {"number":1}' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sends pending text when the teacher picks another date', async () => {
    const { rerender } = render(<LessonLogCard {...baseProps} />);
    await waitFor(() => expect(screen.getByLabelText('lessonLogMaterialLabel')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('lessonLogMaterialLabel'), { target: { value: 'typed, then changed day' } });

    rerender(<LessonLogCard {...baseProps} dateStr="2026-11-13" />);

    expect(api.save).toHaveBeenCalledWith({
      course_id: 7,
      date: '2026-11-12',
      period_number: 1,
      material_covered: 'typed, then changed day',
    });
  });

  it('hides itself for roles the server refuses', async () => {
    api.list.mockRejectedValue({ response: { status: 403 } });

    const { container } = render(<LessonLogCard {...baseProps} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('says so when the stored text cannot be loaded, and can try again', async () => {
    api.list.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(page([log({ material_covered: 'back' })]));
    render(<LessonLogCard {...baseProps} />);

    expect(await screen.findByText('lessonLogLoadFailed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'lessonLogRetry' }));

    expect(await screen.findByDisplayValue('back')).toBeInTheDocument();
  });
});
