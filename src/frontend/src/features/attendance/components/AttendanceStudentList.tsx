import { CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { Student } from '@/types';

export interface AttendanceAggregatedStatus {
  status?: string;
  isMixed: boolean;
  hasAny: boolean;
}

export interface AttendanceEvaluationRule {
  category: string;
  weight?: number;
}

export interface AttendanceStudentListProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  formatDate: (value: Date | string) => string;
  selectedDate: Date | null;
  selectedCourse: number | '';
  enrolledStudents: Student[];
  evaluationCategories: AttendanceEvaluationRule[];
  hasMultiplePeriods: boolean;
  activePeriods: number[];
  getStudentPeriodStatuses: (studentId: number) => Record<number, string>;
  getAggregatedStatus: (studentId: number) => AttendanceAggregatedStatus;
  isStudentExpanded: (studentId: number) => boolean;
  toggleStudentPeriods: (studentId: number) => void;
  setAttendance: (studentId: number, status: string, periodNumber?: number) => void;
  clearPeriodAttendance: (studentId: number, periodNumber: number) => void;
  clearStudentAttendance: (studentId: number) => void;
  setSelectedStudentForPerformance: (student: Student) => void;
  setShowPerformanceModal: (show: boolean) => void;
}

const AttendanceStudentList = ({
  t,
  formatDate,
  selectedDate,
  selectedCourse,
  enrolledStudents,
  evaluationCategories,
  hasMultiplePeriods,
  activePeriods,
  getStudentPeriodStatuses,
  getAggregatedStatus,
  isStudentExpanded,
  toggleStudentPeriods,
  setAttendance,
  clearPeriodAttendance,
  clearStudentAttendance,
  setSelectedStudentForPerformance,
  setShowPerformanceModal,
}: AttendanceStudentListProps) => {
  const renderPerPeriodButtons = (studentId: number, period: number, periodStatus?: string) => (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 w-full sm:w-auto">
      <button
        onClick={() => setAttendance(studentId, 'Present', period)}
        className={`px-2 py-1 rounded text-xs ${periodStatus === 'Present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'}`}
        aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('present') || 'Present'}`}
      >
        <CheckCircle size={12} />
      </button>
      <button
        onClick={() => setAttendance(studentId, 'Absent', period)}
        className={`px-2 py-1 rounded text-xs ${periodStatus === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}
        aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('absent') || 'Absent'}`}
      >
        <XCircle size={12} />
      </button>
      <button
        onClick={() => setAttendance(studentId, 'Late', period)}
        className={`px-2 py-1 rounded text-xs ${periodStatus === 'Late' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}
        aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('late') || 'Late'}`}
      >
        <Clock size={12} />
      </button>
      <button
        onClick={() => setAttendance(studentId, 'Excused', period)}
        className={`px-2 py-1 rounded text-xs ${periodStatus === 'Excused' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}
        aria-label={`${t('periodLabel', { number: period }) || `Period ${period}`} • ${t('excused') || 'Excused'}`}
      >
        <AlertCircle size={12} />
      </button>
      {periodStatus && periodStatus !== 'Present' && (
        <button
          onClick={() => clearPeriodAttendance(studentId, period)}
          className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700"
        >
          {t('clear') || 'Clear'}
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{t('markAttendanceFor') || 'Mark attendance for'} — {selectedDate ? formatDate(selectedDate) : t('noDateSelected') || 'No date selected'}</h3>
      </div>

      <div className="space-y-3">
        {(enrolledStudents && enrolledStudents.length > 0 && selectedDate ? enrolledStudents : []).map((s) => {
          const periodStatuses = getStudentPeriodStatuses(s.id);
          const aggregatedStatus = getAggregatedStatus(s.id);
          const uniformStatus = aggregatedStatus.status;
          const isAbsentAllDay = uniformStatus === 'Absent';

          return (
            <div key={s.id} className="bg-gray-50 rounded border p-3 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full text-white flex items-center justify-center font-bold">{String(s.first_name || '').charAt(0)}{String(s.last_name || '').charAt(0)}</div>
                  <div>
                    <div className="font-semibold text-gray-800">{s.first_name} {s.last_name}</div>
                    <div className="text-xs text-gray-500">{s.student_id}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <button onClick={() => setAttendance(s.id, 'Present')} aria-label={`${t('present') || 'Present'} - ${s.first_name} ${s.last_name}`} title={t('present') || 'Present'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'}`}><CheckCircle size={14} /></button>
                  <button onClick={() => setAttendance(s.id, 'Absent')} aria-label={`${t('absent') || 'Absent'} - ${s.first_name} ${s.last_name}`} title={t('absent') || 'Absent'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}><XCircle size={14} /></button>
                  <button onClick={() => setAttendance(s.id, 'Late')} aria-label={`${t('late') || 'Late'} - ${s.first_name} ${s.last_name}`} title={t('late') || 'Late'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Late' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'}`}><Clock size={14} /></button>
                  <button onClick={() => setAttendance(s.id, 'Excused')} aria-label={`${t('excused') || 'Excused'} - ${s.first_name} ${s.last_name}`} title={t('excused') || 'Excused'} className={`px-3 py-1 rounded text-sm ${uniformStatus === 'Excused' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'}`}><AlertCircle size={14} /></button>
                  {aggregatedStatus.isMixed && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {t('mixedStatus') || 'Mixed periods'}
                    </span>
                  )}
                  {evaluationCategories.length > 0 && (
                    <button
                      onClick={() => { setSelectedStudentForPerformance(s); setShowPerformanceModal(true); }}
                      disabled={isAbsentAllDay}
                      className={`ml-2 px-3 py-1 rounded text-sm flex items-center gap-1 ${isAbsentAllDay ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      <TrendingUp size={14} /> {t('rate') || 'Rate'}
                    </button>
                  )}
                </div>
              </div>

              {hasMultiplePeriods && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleStudentPeriods(s.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-white border rounded-lg px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={12} className="text-indigo-500" />
                      {isStudentExpanded(s.id) ? (t('hidePerPeriod') || 'Hide per-period attendance') : (t('showPerPeriod') || 'Show per-period attendance')}
                    </span>
                    {isStudentExpanded(s.id) ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                  </button>
                  {isStudentExpanded(s.id) && (
                    <div className="space-y-2">
                      <div className="space-y-2">
                        {activePeriods.map((period) => (
                          <div key={period} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border rounded-lg p-2">
                            <span className="text-xs font-semibold text-gray-700">{t('periodLabel', { number: period }) || `Period ${period}`}</span>
                            {renderPerPeriodButtons(s.id, period, periodStatuses[period])}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-200">
                        <button
                          onClick={() => setAttendance(s.id, 'Absent')}
                          className="px-3 py-1 rounded text-xs bg-red-100 text-red-700 flex items-center gap-1"
                        >
                          <XCircle size={12} /> {t('markAllPeriodsAbsent') || 'Mark all periods absent'}
                        </button>
                        <button
                          onClick={() => clearStudentAttendance(s.id)}
                          className="px-3 py-1 rounded text-xs bg-gray-200 text-gray-700"
                        >
                          {t('clear') || 'Clear'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {selectedCourse && enrolledStudents.length === 0 && (
          <div className="text-sm text-gray-500">{t('noStudentsEnrolled') || 'No students enrolled for this course'}</div>
        )}
      </div>
    </div>
  );
};

export default AttendanceStudentList;
