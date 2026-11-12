import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LessonLogHistory from './LessonLogHistory';
import { lessonLogsAPI } from '@/api/lessonLogsAPI';
import type { LessonLog } from '@/types';
import { clearLessonLogQueue } from '../utils/lessonLogQueue';

vi.mock('@/api/lessonLogsAPI', () => ({
  lessonLogsAPI: { list: vi.fn(), save: vi.fn() },
}));

const api = lessonLogsAPI as unknown as {
  list: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);

// Local calendar date, so the test also proves that 'YYYY-MM-DD' is not shifted by the time zone.
const formatDate = (value: Date | string) =>
  typeof value === 'string'
    ? value
    : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

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

const pageOf = (items: LessonLog[], total = items.length) => ({
  items,
  total,
  skip: 0,
  limit: 20,
  pages: 1,
  current_page: 1,
});

const props = { t, courseId: 7 as const, formatDate };

const open = async () => {
  fireEvent.click(await screen.findByTestId('lesson-log-history-toggle'));
};

describe('LessonLogHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLessonLogQueue();
    api.list.mockResolvedValue(pageOf([]));
    api.save.mockImplementation(async (payload) => log({ material_covered: payload.material_covered ?? null }));
  });

  it('renders nothing without a course', () => {
    const { container } = render(<LessonLogHistory {...props} courseId="" />);
    expect(container).toBeEmptyDOMElement();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('loads the course eagerly, shows the count, and keeps the entries folded until opened', async () => {
    api.list.mockResolvedValue(
      pageOf([log({ id: 2, date: '2026-11-12', material_covered: 'Chapter 2' }), log({ id: 1, date: '2026-11-10', material_covered: 'Chapter 1' })])
    );

    render(<LessonLogHistory {...props} />);

    await waitFor(() => expect(screen.getByTestId('lesson-log-history-toggle')).toHaveTextContent('(2)'));
    expect(api.list).toHaveBeenCalledWith({ course_id: 7, skip: 0, limit: 20 });
    expect(screen.getByTestId('lesson-log-history-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('lesson-log-row-2')).toBeNull();

    await open();

    const first = screen.getByTestId('lesson-log-row-2');
    expect(within(first).getByText('2026-11-12 · periodLabel {"number":1}')).toBeInTheDocument();
    expect(within(first).getByText('Chapter 2')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-log-history-toggle')).toHaveAttribute('aria-expanded', 'true');
    // newest first, as the server returns them
    const rows = screen.getAllByTestId(/^lesson-log-row-\d+$/);
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual(['lesson-log-row-2', 'lesson-log-row-1']);
  });

  it('says when a field of an entry was left empty', async () => {
    api.list.mockResolvedValue(pageOf([log({ id: 3, material_covered: 'Only material', teacher_notes: null })]));
    render(<LessonLogHistory {...props} />);
    await open();

    const row = await screen.findByTestId('lesson-log-row-3');
    expect(within(row).getByText('Only material')).toBeInTheDocument();
    expect(within(row).getByText('lessonLogNothingRecorded')).toBeInTheDocument();
  });

  it('shows a message when the course has no entries yet', async () => {
    render(<LessonLogHistory {...props} />);
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await open();
    expect(await screen.findByText('lessonLogHistoryEmpty')).toBeInTheDocument();
  });

  it('loads further pages and stops offering more when everything is shown', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => log({ id: 100 - index, date: '2026-11-12', period_number: 1 }));
    const rest = Array.from({ length: 5 }, (_, index) => log({ id: 50 - index, date: '2026-10-01' }));
    api.list.mockResolvedValueOnce(pageOf(firstPage, 25)).mockResolvedValueOnce(pageOf(rest, 25));
    render(<LessonLogHistory {...props} />);
    await open();
    expect(await screen.findAllByTestId(/^lesson-log-row-\d+$/)).toHaveLength(20);

    fireEvent.click(screen.getByTestId('lesson-log-history-more'));

    await waitFor(() => expect(screen.getAllByTestId(/^lesson-log-row-\d+$/)).toHaveLength(25));
    expect(api.list).toHaveBeenLastCalledWith({ course_id: 7, skip: 20, limit: 20 });
    expect(screen.queryByTestId('lesson-log-history-more')).toBeNull();
  });

  it('keeps the entries on screen when a further page cannot be loaded', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => log({ id: 100 - index }));
    api.list.mockResolvedValueOnce(pageOf(firstPage, 25)).mockRejectedValueOnce(new Error('boom'));
    render(<LessonLogHistory {...props} />);
    await open();
    await screen.findAllByTestId(/^lesson-log-row-\d+$/);

    fireEvent.click(screen.getByTestId('lesson-log-history-more'));

    expect(await screen.findByText('lessonLogHistoryLoadFailed')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^lesson-log-row-\d+$/)).toHaveLength(20);
  });

  it('opens an entry for editing, saves it on blur, and shows the new text afterwards', async () => {
    // The list and the row's own editor (which looks the entry up by course, date and period) both see it.
    api.list.mockResolvedValue(pageOf([log({ id: 5, date: '2026-11-12', material_covered: 'Old text' })]));
    api.save.mockResolvedValue(log({ id: 5, date: '2026-11-12', material_covered: 'Corrected text' }));
    render(<LessonLogHistory {...props} />);
    await open();

    fireEvent.click(await screen.findByTestId('lesson-log-row-5-toggle'));
    const material = await screen.findByTestId('lesson-log-row-5-material');
    await waitFor(() => expect(material).toBeEnabled());
    expect(material).toHaveValue('Old text');

    fireEvent.change(material, { target: { value: 'Corrected text' } });
    fireEvent.blur(material);

    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        course_id: 7,
        date: '2026-11-12',
        period_number: 1,
        material_covered: 'Corrected text',
      })
    );

    fireEvent.click(screen.getByTestId('lesson-log-row-5-toggle')); // Done
    const row = await screen.findByTestId('lesson-log-row-5');
    await waitFor(() => expect(within(row).getByText('Corrected text')).toBeInTheDocument());
    expect(screen.queryByTestId('lesson-log-row-5-material')).toBeNull();
  });

  it('hides itself for roles the server refuses', async () => {
    api.list.mockRejectedValue({ response: { status: 403 } });
    const { container } = render(<LessonLogHistory {...props} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('reloads when something was saved elsewhere on the page', async () => {
    const { rerender } = render(<LessonLogHistory {...props} refreshKey={0} />);
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));

    rerender(<LessonLogHistory {...props} refreshKey={1} />);

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  });

  it('starts over for another course', async () => {
    api.list.mockResolvedValueOnce(pageOf([log({ id: 1 })])).mockResolvedValueOnce(pageOf([], 0));
    const { rerender } = render(<LessonLogHistory {...props} />);
    await waitFor(() => expect(screen.getByTestId('lesson-log-history-toggle')).toHaveTextContent('(1)'));

    rerender(<LessonLogHistory {...props} courseId={8} />);

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ course_id: 8, skip: 0, limit: 20 }));
    await waitFor(() => expect(screen.getByTestId('lesson-log-history-toggle')).toHaveTextContent('(0)'));
  });
});
