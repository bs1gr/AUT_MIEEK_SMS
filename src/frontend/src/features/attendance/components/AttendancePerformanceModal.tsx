import { Fragment } from 'react';
import { XCircle } from 'lucide-react';
import type { Student } from '@/types';
import type { AttendanceAggregatedStatus, AttendanceEvaluationRule } from './AttendanceStudentList';

export interface AttendancePerformanceModalProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  formatDate: (value: Date | string) => string;
  formatWeekday: (value: Date, locale?: string) => string;
  localeOverride: string;
  selectedDate: Date | null;
  selectedStudentForPerformance: Student;
  evaluationCategories: AttendanceEvaluationRule[];
  dailyPerformance: Record<string, number>;
  getAggregatedStatus: (studentId: number) => AttendanceAggregatedStatus;
  translateCategory: (category: string) => string;
  getSpecialParticipationScore: (category: string) => number | null;
  setPerformanceScore: (studentId: number, category: string, score: number | string) => void;
  clearPerformanceScore: (studentId: number, category: string) => void;
  setSpecialParticipationOption: (studentId: number, category: string, checked: boolean) => void;
  setShowPerformanceModal: (show: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const AttendancePerformanceModal = ({
  t,
  formatDate,
  formatWeekday,
  localeOverride,
  selectedDate,
  selectedStudentForPerformance,
  evaluationCategories,
  dailyPerformance,
  getAggregatedStatus,
  translateCategory,
  getSpecialParticipationScore,
  setPerformanceScore,
  clearPerformanceScore,
  setSpecialParticipationOption,
  setShowPerformanceModal,
  showToast,
}: AttendancePerformanceModalProps) => {
  const modalStatus = getAggregatedStatus(selectedStudentForPerformance.id).status;
  const isAbsent = modalStatus === 'Absent';
  const specialParticipationRules = evaluationCategories.filter(
    (rule) => getSpecialParticipationScore(rule.category) !== null,
  );
  const standardRules = evaluationCategories.filter(
    (rule) => getSpecialParticipationScore(rule.category) === null,
  );
  const isParticipationRule = (category: string) => /participation|συμμετοχ/i.test(category);
  const hasStandardParticipationRule = standardRules.some((rule) => isParticipationRule(rule.category));

  const renderSpecialParticipationOptions = () => specialParticipationRules.length > 0 && (
    <section
      data-testid="special-participation-options"
      className={`rounded p-4 border ${isAbsent ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-linear-to-r/srgb from-indigo-50 to-purple-50 border-indigo-200'}`}
    >
      <h5 className="font-semibold text-gray-800">{t('participationObservations') || 'Participation observations'}</h5>
      <p className="mt-1 text-xs text-gray-600">
        {t('participationObservationsHelp') || 'Select only the observations that apply. Unselected observations are not recorded and do not affect the aggregate participation score.'}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {specialParticipationRules.map((rule) => {
          const key = `${selectedStudentForPerformance.id}-${rule.category}`;
          const existingScore = dailyPerformance[key];
          const scoreWhenChecked = getSpecialParticipationScore(rule.category);
          const isChecked = typeof existingScore === 'number';
          const isCustomScore = typeof existingScore === 'number'
            && scoreWhenChecked !== null
            && Math.abs(existingScore - scoreWhenChecked) > 0.01;

          return (
            <label key={rule.category} className="flex min-w-0 items-start gap-2 rounded border border-indigo-100 bg-white p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setSpecialParticipationOption(selectedStudentForPerformance.id, rule.category, e.target.checked)}
                disabled={isAbsent}
                aria-label={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 ${isAbsent ? 'cursor-not-allowed' : ''}`}
              />
              <span className="min-w-0">
                <span className="block font-medium">{translateCategory(rule.category)}</span>
                <span className="block text-xs text-indigo-700">
                  {isChecked
                    ? (isCustomScore
                      ? `${t('applied') || 'Applied'} (${existingScore}/10, custom)`
                      : `${t('applied') || 'Applied'} (${scoreWhenChecked}/10)`)
                    : (t('notScored') || 'Not assessed — no score is recorded')}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center gap-2 justify-between mb-4">
          <h4 className="text-base sm:text-xl font-bold min-w-0 flex-1 truncate">{t('dailyPerformance') || 'Daily Performance'} — {selectedStudentForPerformance.first_name} {selectedStudentForPerformance.last_name}</h4>
          <button onClick={() => setShowPerformanceModal(false)} aria-label={t('close') || 'Close'} title={t('close') || 'Close'} className="shrink-0 p-2 hover:bg-gray-100 rounded"><XCircle size={20} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{t('rateStudentPerformanceFor') || 'Rate for'} {selectedDate ? `${formatWeekday(selectedDate, localeOverride)} ${formatDate(selectedDate)}` : ''}</p>

        {isAbsent && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">{t('studentMarkedAbsent') || 'Student is marked as Absent. Performance rating is disabled.'}</p>
          </div>
        )}
        <div className="space-y-4">
          {standardRules.map((rule, idx) => {
            const key = `${selectedStudentForPerformance.id}-${rule.category}`;
            const existingScore = dailyPerformance[key];
            const curr = typeof existingScore === 'number' ? existingScore : 0;
            const isScored = typeof existingScore === 'number';
            return (
              <Fragment key={rule.category || idx}>
                <div className={`rounded p-4 border ${isAbsent ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-linear-to-r/srgb from-indigo-50 to-purple-50 border-indigo-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-800">{translateCategory(rule.category)}</div>
                    <div className="text-xs text-gray-500">{t('weightInFinalGrade') || 'Weight in final grade'}: {rule.weight}%</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isAbsent ? 'text-gray-400' : 'text-indigo-600'}`}>{isScored ? curr : '—'}</div>
                    <div className="text-[11px] text-indigo-700">{isScored ? (t('outOf10') || 'out of 10') : (t('notScored') || 'Not assessed')}</div>
                  </div>
                </div>
                <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isScored}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPerformanceScore(selectedStudentForPerformance.id, rule.category, curr);
                      } else {
                        clearPerformanceScore(selectedStudentForPerformance.id, rule.category);
                      }
                    }}
                    disabled={isAbsent}
                    className={`h-4 w-4 rounded border-gray-300 text-indigo-600 ${isAbsent ? 'cursor-not-allowed' : ''}`}
                  />
                  <span>{t('includeInDailyAssessment') || 'Include in today\'s assessment'}</span>
                </label>
                {isScored && (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={curr}
                      onChange={(e) => setPerformanceScore(selectedStudentForPerformance.id, rule.category, e.target.value)}
                      disabled={isAbsent}
                      aria-label={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                      title={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                      className={`w-full ${isAbsent ? 'cursor-not-allowed' : ''}`}
                    />
                    <div className="flex justify-between text-[11px] text-indigo-700"><span>{t('poor') || 'Poor'} (0)</span><span>{t('averageRating') || t('average') || 'Average'} (5)</span><span>{t('excellent') || 'Excellent'} (10)</span></div>
                  </>
                )}
                </div>
                {isParticipationRule(rule.category) && renderSpecialParticipationOptions()}
              </Fragment>
            );
          })}
          {!hasStandardParticipationRule && renderSpecialParticipationOptions()}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowPerformanceModal(false)} className="flex-1 border px-3 py-2 rounded">{t('close') || 'Close'}</button>
          <button onClick={() => { setShowPerformanceModal(false); showToast(t('performanceScoresRecorded') || 'Scores recorded', 'success'); }} className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded">{t('done') || 'Done'}</button>
        </div>
      </div>
    </div>
  );
};

export default AttendancePerformanceModal;
