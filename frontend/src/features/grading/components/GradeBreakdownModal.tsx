import React, { useEffect, useState } from 'react';
import { XCircle, PieChart, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';

const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || '/api/v1';

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

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Class Participation': t('classParticipation'),
      'Continuous Assessment': t('continuousAssessment'),
      'Midterm Exam': t('midtermExam'),
      'Midterm': t('midtermExam'),
      'Final Exam': t('finalExam'),
      'Final': t('finalExam'),
      'Homework': t('homework'),
      'Quiz': t('quiz'),
      'Project': t('project'),
      'Lab Work': t('labWork'),
      // Greek category names (in case backend returns Greek)
      'Συμμετοχή στο Μάθημα': t('classParticipation'),
      'Συνεχής Αξιολόγηση': t('continuousAssessment'),
      'Ενδιάμεση Εξέταση': t('midtermExam'),
      'Ενδιάμεση': t('midtermExam'),
      'Τελική Εξέταση': t('finalExam'),
      'Τελική': t('finalExam'),
      'Εργασία': t('homework'),
      'Κουίζ': t('quiz'),
      'Πρότζεκτ': t('project'),
      'Εργαστήριο': t('labWork'),
    };
    return categoryMap[category] || category;
  };

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
          <div className="space-y-6">
            {/* Final Grade Summary Table */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-6">
              <h5 className="text-lg font-bold text-gray-800 mb-4">{t('finalGradeSummary') || 'Final Grade Summary'}</h5>
              <div className="grid grid-cols-3 gap-4">
                {/* Percentage */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">{t('percentage') || 'Percentage'}</div>
                  <div className="text-3xl font-bold text-indigo-700">
                    {data.final_grade?.toFixed ? data.final_grade.toFixed(2) : data.final_grade}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('outOf100') || '0-100'}</div>
                </div>
                
                {/* Greek Scale */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">{t('greekScale') || 'Greek Scale'}</div>
                  <div className="text-3xl font-bold text-blue-700">
                    {data.greek_grade ? data.greek_grade.toFixed(1) : '0.0'}/20
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{data.greek_description || t('fail') || 'Status'}</div>
                </div>
                
                {/* Letter Grade */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">{t('letterGrade') || 'Letter Grade'}</div>
                  <div className="text-3xl font-bold text-yellow-700">{data.letter_grade}</div>
                  <div className="text-xs text-gray-500 mt-1">GPA: {data.gpa}</div>
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h5 className="font-semibold text-gray-800">{t('categoryBreakdown') || 'Category Breakdown'}</h5>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('category') || 'Category'}</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{t('averageScore') || t('average') || 'Average'}</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{t('weight') || 'Weight'}</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{t('contribution') || 'Contribution'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries<any>(data.category_breakdown || {}).map(([cat, detail]) => (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{translateCategory(cat)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{Number(detail.average || 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{Number(detail.weight || 0)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-700">{Number(detail.contribution || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50 font-bold">
                      <td className="px-4 py-3 text-sm text-gray-800">{t('totalBeforePenalty') || 'Total (before penalty)'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-800">-</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-800">
                        {Object.values<any>(data.category_breakdown || {}).reduce((sum, d) => sum + Number(d.weight || 0), 0)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-indigo-700">
                        {Object.values<any>(data.category_breakdown || {}).reduce((sum, d) => sum + Number(d.contribution || 0), 0).toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Absence penalty */}
            {(Number(data.unexcused_absences || 0) > 0 && Number(data.absence_penalty || 0) > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-gray-800 font-semibold mb-1">{t('absencePenaltyApplied') || 'Absence penalty applied'}</div>
                <div className="text-sm text-red-700">
                  {t('unexcusedAbsences') || 'Unexcused absences'}: <strong>{data.unexcused_absences}</strong> × {t('penaltyPerAbsence') || 'Penalty/absence'}: <strong>{data.absence_penalty}%</strong> = {t('totalDeduction') || 'Total deduction'}: <strong>{data.absence_deduction ? data.absence_deduction.toFixed(2) : totalDeduction().toFixed(2)}%</strong>
                </div>
              </div>
            )}

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
