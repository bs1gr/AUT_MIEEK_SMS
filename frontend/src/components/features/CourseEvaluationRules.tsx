// CourseEvaluationRules.tsx - FIXED VERSION
// Location: frontend/src/components/CourseEvaluationRules.tsx
// Fixed: Dropdown now shows bilingual categories (EN / EL) instead of separate options

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, AlertCircle, BookOpen, Calculator } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { getCanonicalCategory } from '../../utils/categoryLabels';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

const CourseEvaluationRules = () => {
  const { t } = (useLanguage() as any) || { t: (k: string) => k };
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [evaluationRules, setEvaluationRules] = useState<any[]>([]);
  const [absencePenalty, setAbsencePenalty] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Common grade categories using translations
  const commonCategories = [
    { en: 'Class Participation', translated: t('classParticipation') },
    { en: 'Homework/Assignments', translated: t('homework') },
    { en: 'Continuous Assessment', translated: t('continuousAssessment') },
    { en: 'Quizzes', translated: t('quizzes') },
    { en: 'Midterm Exam', translated: t('midtermExam') },
    { en: 'Final Exam', translated: t('finalExam') },
    { en: 'Lab Work', translated: t('labWork') },
    { en: 'Project', translated: t('project') },
    { en: 'Presentation', translated: t('presentation') }
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadEvaluationRules();
    }
  }, [selectedCourse]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/`);
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      showToast(t('failedToLoadData'), 'error');
    }
  };

  const loadEvaluationRules = () => {
    const course: any = courses.find((c: any) => c.id === selectedCourse);
    if (course) {
      if (course.evaluation_rules) {
        setEvaluationRules(course.evaluation_rules);
      } else {
        setEvaluationRules([]);
      }
      setAbsencePenalty(typeof course.absence_penalty === 'number' ? course.absence_penalty : 0);
    } else {
      setEvaluationRules([]);
      setAbsencePenalty(0);
    }
  };

  const addRule = () => {
    setEvaluationRules([
      ...evaluationRules,
      {
        category: '',
        weight: '',
        description: '',
        includeDailyPerformance: true,
        dailyPerformanceMultiplier: 1.0
      } as any
    ]);
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...evaluationRules];
    newRules[index][field] = value;
    setEvaluationRules(newRules);
  };

  const removeRule = (index: number) => {
    setEvaluationRules(evaluationRules.filter((_, i) => i !== index));
  };

  const validateRules = () => {
    if (evaluationRules.length === 0) {
      showToast(t('pleaseAddRule'), 'error');
      return false;
    }

    const totalWeight = evaluationRules.reduce((sum, rule) => {
      return sum + (parseFloat(rule.weight) || 0);
    }, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast(`${t('totalWeight')} ${totalWeight.toFixed(1)}%. ${t('totalMustEqual')}`, 'error');
      return false;
    }

    for (const rule of evaluationRules) {
      if (!rule.category || !rule.weight) {
        showToast(t('allRulesRequired'), 'error');
        return false;
      }
    }

    return true;
  };

  const saveRules = async () => {
    if (!validateRules()) return;

    setLoading(true);
    try {
      const normalized = (evaluationRules || []).map((r: any) => ({
        ...r,
        category: getCanonicalCategory(String(r.category || ''), t as any),
      }));
      const response = await fetch(`${API_BASE_URL}/courses/${selectedCourse}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_rules: normalized,
          absence_penalty: absencePenalty
        })
      });

      if (response.ok) {
        showToast(t('evaluationRulesSaved'), 'success');
        await loadCourses();
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save rules' }));
        showToast(errorData.detail || t('failedToSaveRules'), 'error');
      }
    } catch (error) {
      showToast(t('failedToSaveRules'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = evaluationRules.reduce((sum: number, rule: any) => {
    return sum + (parseFloat(rule.weight) || 0);
  }, 0);

  const isValidTotal = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
            <Settings className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{t('rulesTitle')}</h2>
            <p className="text-gray-600">{t('defineGradingCriteria')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('selectCourseForRules')}</label>
        <select
          aria-label={t('selectCourseForRules')}
          title={t('selectCourseForRules')}
          value={selectedCourse || ''}
          onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('chooseCourse')}</option>
          {courses.map((course: any) => (
            <option key={course.id} value={course.id}>
              {course.course_code} - {course.course_name}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">{t('gradingComponents')}</h3>
              <button
                onClick={addRule}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>{t('addRule')}</span>
              </button>
            </div>

            {/* Absence penalty setting */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('absencePenalty') || 'Absence penalty (points per absence)'}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={absencePenalty}
                  onChange={(e) => setAbsencePenalty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 text-sm"
                  placeholder="0.0"
                />
                <p className="text-xs text-gray-600 mt-1">{t('absencePenaltyHelp') || 'Deduct this many percentage points from the final grade for each unexcused absence.'}</p>
              </div>
            </div>

            {evaluationRules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                <p>{t('noRulesDefined')}</p>
                <p className="text-sm">{t('clickToStart')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluationRules.map((rule, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('categoryName')}
                        </label>
                        <input
                          type="text"
                          value={rule.category}
                          onChange={(e) => updateRule(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder={`${t('exampleLabel')}: ${t('midtermExam')}`}
                          list={`categories-${index}`}
                        />
                        {/* FIXED: Now shows bilingual options (EN / EL) instead of separate options */}
                        <datalist id={`categories-${index}`}>
                          {commonCategories.map((cat, i) => (
                            <option key={i} value={cat.translated} label={`${cat.en} / ${cat.translated}`} />
                          ))}
                        </datalist>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('weight')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={rule.weight}
                          onChange={(e) => updateRule(index, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="20"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t('description')} ({t('optional')})
                        </label>
                        <input
                          type="text"
                          value={rule.description || ''}
                          onChange={(e) => updateRule(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder={t('optional')}
                        />
                      </div>

                      <div className="md:col-span-1 flex items-end">
                        <button
                          onClick={() => removeRule(index)}
                          className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('remove')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Daily Performance Settings - Collapsible Section */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center space-x-2">
                          <Settings size={16} className="text-purple-600" />
                          <span>{t('dailyPerformanceSettings')}</span>
                        </h4>

                        <div className="space-y-3">
                          {/* Toggle for including daily performance */}
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={`include-daily-${index}`}
                              checked={rule.includeDailyPerformance !== false}
                              onChange={(e) => updateRule(index, 'includeDailyPerformance', e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor={`include-daily-${index}`} className="text-sm text-gray-700">
                              {t('includeDailyPerformance')}
                            </label>
                          </div>

                          {/* Multiplier input - only shown if daily performance is included */}
                          {rule.includeDailyPerformance !== false && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('dailyPerformanceMultiplier')}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  step="0.1"
                                  value={rule.dailyPerformanceMultiplier || 1.0}
                                  onChange={(e) => updateRule(index, 'dailyPerformanceMultiplier', parseFloat(e.target.value) || 1.0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                  placeholder="1.0"
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('multiplierHelp')}</p>
                              </div>

                              {/* Visual indicator of balance */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('balanceInfo')}
                                </label>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-gray-600">{t('regularGrades')}</span>
                                    <span className="font-bold text-indigo-600">
                                      {(100 / (1 + (rule.dailyPerformanceMultiplier || 1.0))).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">{t('dailyScores')}</span>
                                    <span className="font-bold text-purple-600">
                                      {(100 * (rule.dailyPerformanceMultiplier || 1.0) / (1 + (rule.dailyPerformanceMultiplier || 1.0))).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className={`mt-6 p-4 rounded-lg border-2 ${isValidTotal ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{t('totalWeight')}:</span>
                    <span className={`text-2xl font-bold ${isValidTotal ? 'text-green-600' : 'text-yellow-600'}`}>
                      {totalWeight.toFixed(1)}%
                    </span>
                  </div>
                  {!isValidTotal && (
                    <p className="text-sm text-yellow-700 mt-2 flex items-center">
                      <AlertCircle size={16} className="mr-1" />
                      {t('totalMustEqual')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={saveRules}
              disabled={loading || evaluationRules.length === 0}
              className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold"
            >
              <Save size={20} />
              <span>{loading ? t('saving') : t('saveRules')}</span>
            </button>
          </div>
        </>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
          <BookOpen size={20} className="text-indigo-600" />
          <span>{t('exampleCourse')}</span>
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('classParticipation')}</span>
            <span className="font-bold text-indigo-600">10%</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('continuousAssessment')}</span>
            <span className="font-bold text-indigo-600">20%</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('midtermExam')}</span>
            <span className="font-bold text-indigo-600">30%</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t('finalExam')}</span>
            <span className="font-bold text-indigo-600">40%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseEvaluationRules;
