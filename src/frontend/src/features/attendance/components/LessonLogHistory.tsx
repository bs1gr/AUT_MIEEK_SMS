/**
 * Every lesson-log entry of the selected course, newest first: where saved entries are reviewed
 * and edited. Each row opens the same autosaving editor as the card on the day it belongs to, so
 * an entry can be corrected later without going back to that date in the calendar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, History } from 'lucide-react';
import { lessonLogsAPI, type LessonLogExportFormat } from '@/api/lessonLogsAPI';
import { downloadBlob } from '@/utils/downloadFile';
import type { LessonLog } from '@/types';
import LessonLogFields from './LessonLogFields';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LessonLogHistoryProps {
  t: Translate;
  courseId: number | '';
  formatDate: (value: Date | string) => string;
  /** 'en' or 'el': the language of the headings in the downloaded PDF / Excel. */
  language?: string;
  /** Any value that changes after a lesson log is saved elsewhere on the page; reloads the list. */
  refreshKey?: unknown;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'forbidden';

const PAGE_SIZE = 20;

// 'YYYY-MM-DD' as a local date: new Date('2026-11-12') is UTC midnight and can show the day before.
const parseDay = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

const LessonLogHistory = ({ t, courseId, formatDate, language, refreshKey }: LessonLogHistoryProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LessonLog[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [exporting, setExporting] = useState<LessonLogExportFormat | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  // Only the newest request may write the list, whatever order the responses arrive in.
  const latestRequest = useRef(0);

  const loadFirstPage = useCallback(async (id: number) => {
    const request = ++latestRequest.current;
    setState((current) => (current === 'ready' ? current : 'loading'));
    try {
      const page = await lessonLogsAPI.list({ course_id: id, skip: 0, limit: PAGE_SIZE });
      if (request !== latestRequest.current) return;
      setRows(page.items);
      setTotal(page.total);
      setState('ready');
    } catch (error) {
      if (request !== latestRequest.current) return;
      setState(httpStatus(error) === 403 ? 'forbidden' : 'failed');
    }
  }, []);

  useEffect(() => {
    if (!courseId) {
      latestRequest.current += 1;
      setRows([]);
      setTotal(0);
      setState('idle');
      setEditingId(null);
      return;
    }
    void loadFirstPage(courseId);
  }, [courseId, refreshKey, loadFirstPage]);

  const loadMore = async () => {
    if (!courseId || loadingMore) return;
    const request = latestRequest.current;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await lessonLogsAPI.list({ course_id: courseId, skip: rows.length, limit: PAGE_SIZE });
      if (request !== latestRequest.current) return;
      setRows((current) => [...current, ...page.items.filter((item) => !current.some((row) => row.id === item.id))]);
      setTotal(page.total);
    } catch {
      // Keep the rows that are already on screen; just say that the next page did not arrive.
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const exportLog = async (format: LessonLogExportFormat) => {
    if (!courseId || exporting) return;
    setExporting(format);
    setExportFailed(false);
    try {
      const file = await lessonLogsAPI.exportFile(format, {
        course_id: courseId,
        include_notes: includeNotes,
        ...(language ? { lang: language } : {}),
      });
      await downloadBlob(file.blob, file.filename);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  const handleRowSaved = useCallback((log: LessonLog) => {
    setRows((current) => current.map((row) => (row.id === log.id ? log : row)));
  }, []);

  if (!courseId || state === 'forbidden') return null;

  const periodLabel = (number: number) => t('periodLabel', { number }) || `Period ${number}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="lesson-log-history">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lesson-log-history-body"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
        data-testid="lesson-log-history-toggle"
      >
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <History size={20} className="text-indigo-600" />
          {t('lessonLogHistoryTitle') || 'Lesson log history'}
          {state === 'ready' ? ` (${total})` : ''}
        </h3>
        <span className="text-sm font-semibold text-indigo-700">
          {open ? t('lessonLogHistoryHide') || 'Hide' : t('lessonLogHistoryShow') || 'Show'}
        </span>
      </button>

      {open && (
        <div id="lesson-log-history-body" className="mt-4">
          {state === 'loading' || state === 'idle' ? (
            <p className="text-sm text-gray-600">{t('lessonLogStatusLoading') || 'Loading…'}</p>
          ) : state === 'failed' ? (
            <p className="text-sm text-red-600">
              {t('lessonLogHistoryLoadFailed') || 'The lesson log history could not be loaded.'}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-600">
              {t('lessonLogHistoryEmpty') || 'No lesson log entries for this course yet.'}
            </p>
          ) : (
            <>
              <div
                className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-3 py-2"
                data-testid="lesson-log-export"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Download size={16} className="text-indigo-600" />
                  {t('lessonLogExportTitle') || 'Download the material covered'}
                </span>
                {(['pdf', 'excel'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => void exportLog(format)}
                    disabled={exporting !== null}
                    className="rounded-md border border-indigo-200 bg-white px-3 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    data-testid={`lesson-log-export-${format}`}
                  >
                    {format === 'pdf' ? t('lessonLogExportPdf') || 'PDF' : t('lessonLogExportExcel') || 'Excel'}
                  </button>
                ))}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(event) => setIncludeNotes(event.target.checked)}
                    data-testid="lesson-log-export-notes"
                  />
                  {t('lessonLogExportIncludeNotes') || "Include the teacher's notes"}
                </label>
                <span className="text-sm" role="status">
                  {exporting ? (
                    <span className="text-gray-600">{t('lessonLogExportWorking') || 'Preparing the file…'}</span>
                  ) : exportFailed ? (
                    <span className="text-red-600">
                      {t('lessonLogExportFailed') || 'The file could not be created. Please try again.'}
                    </span>
                  ) : null}
                </span>
              </div>
              <ul className="divide-y">
                {rows.map((row) => {
                  const editing = editingId === row.id;
                  return (
                    <li key={row.id} className="py-3" data-testid={`lesson-log-row-${row.id}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatDate(parseDay(row.date))} · {periodLabel(row.period_number)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingId(editing ? null : row.id)}
                          className="text-sm font-semibold text-indigo-700 underline"
                          data-testid={`lesson-log-row-${row.id}-toggle`}
                        >
                          {editing ? t('lessonLogEntryDone') || 'Done' : t('lessonLogEntryEdit') || 'Edit'}
                        </button>
                      </div>

                      {editing ? (
                        <div className="mt-3">
                          <LessonLogFields
                            t={t}
                            courseId={row.course_id}
                            date={row.date}
                            periodNumber={row.period_number}
                            idPrefix={`lesson-log-row-${row.id}`}
                            rows={3}
                            onSaved={handleRowSaved}
                          />
                        </div>
                      ) : (
                        <>
                        <dl className="mt-2 grid gap-3 text-sm md:grid-cols-2">
                          <div>
                            <dt className="text-xs font-semibold text-gray-600">
                              {t('lessonLogMaterialLabel') || 'Material covered'}
                            </dt>
                            <dd className="whitespace-pre-wrap text-gray-800">
                              {row.material_covered || (
                                <span className="text-gray-500">{t('lessonLogNothingRecorded') || 'Nothing recorded'}</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-gray-600">
                              {t('lessonLogNotesLabel') || "Teacher's notes"}
                            </dt>
                            <dd className="whitespace-pre-wrap text-gray-800">
                              {row.teacher_notes || (
                                <span className="text-gray-500">{t('lessonLogNothingRecorded') || 'Nothing recorded'}</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                        {row.updated_by_name && (
                          <p className="mt-2 text-xs text-gray-600" data-testid={`lesson-log-row-${row.id}-editor`}>
                            {t('lessonLogLastEditedBy', { name: row.updated_by_name }) ||
                              `Last edited by ${row.updated_by_name}`}
                          </p>
                        )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              {rows.length < total && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="text-sm font-semibold text-indigo-700 underline disabled:opacity-50"
                    data-testid="lesson-log-history-more"
                  >
                    {t('lessonLogHistoryLoadMore') || 'Load more'}
                  </button>
                  {moreFailed && (
                    <span className="text-sm text-red-600">
                      {t('lessonLogHistoryLoadFailed') || 'The lesson log history could not be loaded.'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonLogHistory;
