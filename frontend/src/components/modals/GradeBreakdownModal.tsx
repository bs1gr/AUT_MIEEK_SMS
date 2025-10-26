import React, { useEffect, useState } from 'react';
import { XCircle, PieChart, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Props {
  studentId: number;
  courseId: number;
  courseName?: string;
  onClose: () => void;
}

const GradeBreakdownModal: React.FC<Props> = ({ studentId, courseId, courseName, onClose }) => {
  const { t } = (useLanguage() as any) || { t: (k: string) => k };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/student/${studentId}/course/${courseId}/final-grade`);
        if (!res.ok) throw new Error('Failed to load breakdown');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load breakdown');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId, courseId]);

  const totalDeduction = () => {
    if (!data) return 0;
    const penalty = Number(data.absence_penalty || 0);
    const absences = Number(data.unexcused_absences || 0);
    return penalty * absences;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <PieChart size={20} className="text-indigo-600" />
            {t('gradeBreakdown') || 'Grade Breakdown'}{courseName ? ` — ${courseName}` : ''}
          </h4>
          <button onClick={onClose} aria-label={t('close') || 'Close'} title={t('close') || 'Close'} className="p-2 hover:bg-gray-100 rounded"><XCircle size={20} /></button>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-600">{t('loading') || 'Loading...'}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {data && !error && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded p-4 border border-indigo-200">
                <div className="text-sm text-gray-600">{t('finalGrade') || 'Final Grade'}</div>
                <div className="text-3xl font-bold text-indigo-700">{data.final_grade?.toFixed ? data.final_grade.toFixed(2) : data.final_grade}%</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded p-4 border border-green-200">
                <div className="text-sm text-gray-600">{t('gpa') || 'GPA'}</div>
                <div className="text-3xl font-bold text-green-700">{data.gpa}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded p-4 border border-blue-200">
                <div className="text-sm text-gray-600">{t('greekScale') || 'Greek Scale'}</div>
                <div className="text-3xl font-bold text-blue-700">{data.greek_grade ? data.greek_grade.toFixed(2) : '0.00'} {t('outOf20') || '/ 20'}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded p-4 border border-yellow-200">
                <div className="text-sm text-gray-600">{t('letterGrade') || 'Letter Grade'}</div>
                <div className="text-3xl font-bold text-yellow-700">{data.letter_grade}</div>
              </div>
            </div>

            {/* Absence penalty */}
            {(Number(data.unexcused_absences || 0) > 0 && Number(data.absence_penalty || 0) > 0) && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="text-sm text-gray-800 font-semibold mb-1">{t('absencePenaltyApplied') || 'Absence penalty applied'}</div>
                <div className="text-sm text-red-700">
                  {t('unexcusedAbsences') || 'Unexcused absences'}: <strong>{data.unexcused_absences}</strong> × {t('penaltyPerAbsence') || 'Penalty/absence'}: <strong>{data.absence_penalty}%</strong> = {t('totalDeduction') || 'Total deduction'}: <strong>{data.absence_deduction ? data.absence_deduction.toFixed(2) : totalDeduction().toFixed(2)}%</strong>
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="bg-white rounded border p-4">
              <div className="font-semibold text-gray-800 mb-3">{t('categoryBreakdown') || 'Category Breakdown'}</div>
              <div className="space-y-2">
                {Object.entries<any>(data.category_breakdown || {}).map(([cat, detail]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-800">{cat}</div>
                      <div className="text-xs text-gray-500">{t('average') || 'Average'}: {Number(detail.average || 0).toFixed(2)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-700">{t('weight') || 'Weight'}: {Number(detail.weight || 0)}%</div>
                      <div className="text-sm font-semibold text-indigo-700">{t('contribution') || 'Contribution'}: {Number(detail.contribution || 0).toFixed(2)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={onClose} className="flex-1 border px-3 py-2 rounded">{t('close') || 'Close'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeBreakdownModal;
