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
  setSpecialParticipationOption,
  setShowPerformanceModal,
  showToast,
}: AttendancePerformanceModalProps) => {
  const modalStatus = getAggregatedStatus(selectedStudentForPerformance.id).status;
  const isAbsent = modalStatus === 'Absent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center gap-2 justify-between mb-4">
          <h4 className="text-base sm:text-xl font-bold min-w-0 flex-1 truncate">{t('dailyPerformance') || 'Daily Performance'} — {selectedStudentForPerformance.first_name} {selectedStudentForPerformance.last_name}</h4>
          <button onClick={() => setShowPerformanceModal(false)} aria-label={t('close') || 'Close'} title={t('close') || 'Close'} className="flex-shrink-0 p-2 hover:bg-gray-100 rounded"><XCircle size={20} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{t('rateStudentPerformanceFor') || 'Rate for'} {selectedDate ? `${formatWeekday(selectedDate, localeOverride)} ${formatDate(selectedDate)}` : ''}</p>

        {isAbsent && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">{t('studentMarkedAbsent') || 'Student is marked as Absent. Performance rating is disabled.'}</p>
          </div>
        )}
        <div className="space-y-4">
          {evaluationCategories.map((rule, idx) => {
            const key = `${selectedStudentForPerformance.id}-${rule.category}`;
            const existingScore = dailyPerformance[key];
            const curr = typeof existingScore === 'number' ? existingScore : 0;
            const specialScoreWhenChecked = getSpecialParticipationScore(rule.category);
            const isSpecialOption = specialScoreWhenChecked !== null;
            const isChecked = typeof existingScore === 'number' ? existingScore < 10 : false;
            const displayScore = isSpecialOption
              ? (typeof existingScore === 'number' ? existingScore : 10)
              : curr;
            const isCustomSpecialScore = isSpecialOption
              && typeof existingScore === 'number'
              && existingScore < 10
              && Math.abs(existingScore - specialScoreWhenChecked) > 0.01;
            return (
              <div key={idx} className={`rounded p-4 border ${isAbsent ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-800">{translateCategory(rule.category)}</div>
                    <div className="text-xs text-gray-500">{t('weightInFinalGrade') || 'Weight in final grade'}: {rule.weight}%</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isAbsent ? 'text-gray-400' : 'text-indigo-600'}`}>{displayScore}</div>
                    <div className="text-[11px] text-indigo-700">{t('outOf10') || 'out of 10'}</div>
                  </div>
                </div>
                {isSpecialOption ? (
                  <label className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setSpecialParticipationOption(selectedStudentForPerformance.id, rule.category, e.target.checked)}
                      disabled={isAbsent}
                      aria-label={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                      title={`${t('dailyPerformance') || 'Daily Performance'}: ${translateCategory(rule.category)}`}
                      className={`w-4 h-4 text-indigo-600 border-gray-300 rounded ${isAbsent ? 'cursor-not-allowed' : ''}`}
                    />
                    <span>
                      {isChecked
                        ? (isCustomSpecialScore
                          ? `${t('applied') || 'Applied'} (${displayScore}/10, custom)`
                          : `${t('applied') || 'Applied'} (${specialScoreWhenChecked}/10)`)
                        : `${t('notApplied') || 'Not applied'} (10/10)`}
                    </span>
                  </label>
                ) : (
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
            );
          })}
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
