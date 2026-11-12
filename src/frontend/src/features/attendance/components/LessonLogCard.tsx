/**
 * Lesson log of the selected course and date: what was taught (material covered, "διδακτέα ύλη")
 * and the teacher's own notes, one pair per teaching period, saved automatically. Sits under the
 * student list on the Attendance page and hides itself until a course and a date are chosen, and
 * for roles the server does not let see lesson logs.
 */
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { LessonLog } from '@/types';
import { useLessonLogQueueFlush } from '../hooks/useLessonLogQueueFlush';
import LessonLogFields from './LessonLogFields';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface LessonLogCardProps {
  t: Translate;
  courseId: number | '';
  /** YYYY-MM-DD, or '' when no date is selected. */
  dateStr: string;
  /** The teaching periods of that day, 1-based (a day without a schedule has just period 1). */
  periods: number[];
  onSaved?: (log: LessonLog) => void;
}

const LessonLogCard = ({ t, courseId, dateStr, periods, onSaved }: LessonLogCardProps) => {
  // Text typed while the server was unreachable is sent from here, even before a course is chosen.
  useLessonLogQueueFlush();

  const [picked, setPicked] = useState<{ scope: string; period: number }>({ scope: '', period: 1 });
  const [forbidden, setForbidden] = useState(false);

  if (!courseId || !dateStr || forbidden) return null;

  // A pick belongs to one course and date; a different course or date starts at period 1 again.
  const scope = `${courseId}|${dateStr}`;
  const period = picked.scope === scope && periods.includes(picked.period) ? picked.period : 1;
  const periodLabel = (number: number) => t('periodLabel', { number }) || `Period ${number}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="lesson-log-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-600" />
          {t('lessonLogTitle') || 'Lesson log'}
        </h3>
        {periods.length > 1 && (
          <div
            role="group"
            aria-label={t('lessonLogPeriodGroup') || 'Teaching period'}
            className="flex flex-wrap gap-1"
            data-testid="lesson-log-periods"
          >
            {periods.map((number) => (
              <button
                key={number}
                type="button"
                aria-pressed={number === period}
                onClick={() => setPicked({ scope, period: number })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                  number === period
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {periodLabel(number)}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-4">
        {t('lessonLogHelp') ||
          'Write what was taught in this period and, separately, your own notes. Both save automatically.'}
      </p>

      <LessonLogFields
        key={`${scope}|${period}`}
        t={t}
        courseId={courseId}
        date={dateStr}
        periodNumber={period}
        idPrefix="lesson-log"
        onSaved={onSaved}
        onForbidden={() => setForbidden(true)}
      />
    </div>
  );
};

export default LessonLogCard;
