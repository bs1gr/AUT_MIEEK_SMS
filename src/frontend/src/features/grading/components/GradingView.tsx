import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { gpaToPercentage, gpaToGreekScale, getGreekGradeDescription, getGreekGradeColor, getLetterGrade } from '@/utils/gradeUtils';
import apiClient, { enrollmentsAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { Student, Course, Grade } from '@/types';
import { formatLocalDate } from '@/utils/date';
import { useDateTimeFormatter } from '@/contexts/DateTimeSettingsContext';
import { useGradeEntrySync } from '@/features/grading/hooks/useGradeEntrySync';

// Evaluation rules are attached to courses; define a lightweight type here (kept internal
// to avoid premature global expansion until other views standardize it).
interface EvaluationRule {
  id?: number;
  category: string;
  weight?: number; // percentage weight (0-100) - optional while editing
  description?: string;
}

type CourseWithEvaluationRules = Course & { evaluation_rules?: EvaluationRule[] };

interface CategoryOption { value: string; label: string }

const SPECIAL_PARTICIPATION_CATEGORIES = [
  'No participation',
  'Minor participation',
  'Minor participation (mobile usage)',
] as const;

const normalizeCategoryName = (value?: string) => (value || '').trim().toLowerCase();

const isSpecialParticipationCategory = (value?: string): boolean =>
  SPECIAL_PARTICIPATION_CATEGORIES.some((category) => normalizeCategoryName(category) === normalizeCategoryName(value));

const isBaseParticipationCategory = (value?: string): boolean => {
  const normalized = normalizeCategoryName(value);
  return normalized === 'class participation'
    || normalized === 'participation'
    || normalized === 'συμμετοχή'
    || normalized === 'συμμετοχη';
};

interface GradingViewProps {
  students: Student[];
  courses: CourseWithEvaluationRules[];
}

const GradingView: React.FC<GradingViewProps> = ({ students, courses }) => {
  const { t, language: _language } = useLanguage();
  const { formatDate } = useDateTimeFormatter();

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Class Participation': t('classParticipation'),
      'Homework/Assignments': t('homework'),
      'Homework': t('homework'),
      'Lab Work': t('labWork'),
      'Continuous Assessment': t('continuousAssessment'),
      'Quizzes': t('quizzes'),
      'Project': t('project'),
      'Presentation': t('presentation'),
      'Midterm': t('midterm'),
      'Midterm Exam': t('midtermExam'),
      'Final Exam': t('finalExam'),
      'Final': t('final'),
      'No participation': t('noParticipationOption') || 'No participation',
      'Minor participation': t('minorParticipationOption') || 'Minor participation',
      'Minor participation (mobile usage)': t('minorParticipationMobileOption') || 'Minor participation (mobile usage)',
    };
    return categoryMap[category] || category;
  };

  const translateAssignmentName = (name?: string): string => {
    if (!name) return t('assignment');

    if (name === 'Sample Exam Assignment') {
      return t('sampleExamAssignment');
    }

    const midtermMatch = name.match(/^Midterm Exam\s*(.*)$/i);
    if (midtermMatch) {
      const suffix = midtermMatch[1]?.trim();
      return `${t('midtermExam')}${suffix ? ` ${suffix}` : ''}`;
    }

    const finalMatch = name.match(/^Final Exam\s*(.*)$/i);
    if (finalMatch) {
      const suffix = finalMatch[1]?.trim();
      return `${t('finalExam')}${suffix ? ` ${suffix}` : ''}`;
    }

    const assignmentMatch = name.match(/^Assignment\s*(.*)$/i);
    if (assignmentMatch) {
      const suffix = assignmentMatch[1]?.trim();
      return `${t('assignment')}${suffix ? ` ${suffix}` : ''}`;
    }

    return name;
  };

  const [studentId, setStudentId] = useState<number | ''>('');
  const [courseId, setCourseId] = useState<number | ''>('');

  // On mount, check sessionStorage for grading_filter_student and grading_filter_course
  useEffect(() => {
    const storedStudent = sessionStorage.getItem('grading_filter_student');
    const storedCourse = sessionStorage.getItem('grading_filter_course');
    if (storedStudent) setStudentId(prev => prev || Number(storedStudent));
    if (storedCourse) setCourseId(prev => prev || Number(storedCourse));
    // Optionally clear after use
    sessionStorage.removeItem('grading_filter_student');
    sessionStorage.removeItem('grading_filter_course');
  }, []);

  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students || []);
  const [filteredCourses, setFilteredCourses] = useState<CourseWithEvaluationRules[]>(courses || []);
  const [rulesByCourseOverride, setRulesByCourseOverride] = useState<Record<number, EvaluationRule[]>>({});
  const [specialWeights, setSpecialWeights] = useState<Record<string, string>>({});
  const [savingSpecialWeights, setSavingSpecialWeights] = useState(false);
  const [specialWeightsMessage, setSpecialWeightsMessage] = useState<string | null>(null);
  const todayStr = formatLocalDate(new Date());

  // Grade-entry form state, grade list, final-grade summary, and offline
  // sync are all owned by this hook - see
  // features/grading/hooks/useGradeEntrySync.ts for why they're grouped
  // together (mirrors useAttendanceSaveSync's save/offline-sync extraction).
  const gradeEntry = useGradeEntrySync({ studentId, courseId, setStudentId, setCourseId, todayStr, t });

  const isHistoricalMode = Boolean(gradeEntry.historyDate && gradeEntry.historyDate !== todayStr);
  // ΜΙΕΕΚ: over the absence limit -> no final exam. Warn only; grade entry stays open.
  const insufficientAttendance = gradeEntry.finalSummary?.attendance_insufficient ? gradeEntry.finalSummary.absence_limit : undefined;
  const summaryReportLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set('templateName', 'Student Performance Breakdown - Grades');
    if (studentId) {
      params.set('studentId', String(studentId));
    }
    if (courseId) {
      params.set('courseId', String(courseId));
    }
    return `/operations/reports/builder?${params.toString()}`;
  }, [studentId, courseId]);

  const activeStudents = useMemo(
    () => (students || []).filter((student) => student.is_active !== false),
    [students]
  );
  const activeCourses = useMemo(
    () => (courses || []).filter((course) => course.is_active !== false),
    [courses]
  );

  // Keep filters in sync (active only)
  useEffect(() => {
    setFilteredStudents(activeStudents);
    if (studentId && !activeStudents.some((student) => student.id === studentId)) {
      setStudentId('');
    }
  }, [activeStudents, studentId]);

  useEffect(() => {
    setFilteredCourses(activeCourses);
    if (courseId && !activeCourses.some((course) => course.id === courseId)) {
      setCourseId('');
    }
  }, [activeCourses, courseId]);

  // When course is chosen, restrict students to those enrolled in course
  const studentsString = useMemo(() => activeStudents.map(s => s.id).join(',') || '', [activeStudents]);

  useEffect(() => {
    const run = async () => {
      if (!courseId) { setFilteredStudents(activeStudents); return; }
      try {
        const arr: Student[] = await enrollmentsAPI.getEnrolledStudents(courseId as number);
        const ids = new Set(arr.map(s => s.id));
        const list = activeStudents.filter(s => ids.has(s.id));
        setFilteredStudents(list);
        if (studentId && !ids.has(studentId as number)) {
          setStudentId('');
        }
        return;
      } catch {}
      // Fallback: leave students unfiltered
      setFilteredStudents(activeStudents);
    };
    run();
  }, [courseId, studentsString, studentId, activeStudents]); // Use studentsString to avoid infinite loop and include studentId

  // When student is chosen, restrict courses to those the student is enrolled in
  const coursesString = useMemo(() => activeCourses.map(c => c.id).join(',') || '', [activeCourses]);

  useEffect(() => {
    const run = async () => {
      if (!studentId) { setFilteredCourses(activeCourses); return; }
      // One request for the student's enrolments, not one per course. Only active ones count,
      // matching what the per-course enrolled-students endpoint returns.
      try {
        const enrollments = await enrollmentsAPI.getByStudent(studentId as number);
        const allowed = new Set(
          enrollments.filter(e => !e.status || e.status === 'active').map(e => e.course_id)
        );
        const list = activeCourses.filter(c => allowed.has(c.id));
        setFilteredCourses(list);
        if (courseId && !allowed.has(courseId as number)) {
          setCourseId('');
        }
      } catch {
        setFilteredCourses(activeCourses);
      }
    };
    run();
  }, [studentId, coursesString, courseId, activeCourses]); // Use coursesString to avoid infinite loop and include courseId

  const selectedCourse = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const evaluationRules: EvaluationRule[] = useMemo(() => {
    if (!courseId) return [];
    if (rulesByCourseOverride[courseId]) return rulesByCourseOverride[courseId];
    return Array.isArray(selectedCourse?.evaluation_rules) ? (selectedCourse.evaluation_rules as EvaluationRule[]) : [];
  }, [courseId, rulesByCourseOverride, selectedCourse]);

  useEffect(() => {
    const next: Record<string, string> = {};
    SPECIAL_PARTICIPATION_CATEGORIES.forEach((categoryName) => {
      const existing = evaluationRules.find((rule) => normalizeCategoryName(rule.category) === normalizeCategoryName(categoryName));
      const value = Number(existing?.weight ?? 0);
      next[categoryName] = Number.isFinite(value) ? String(value) : '0';
    });
    setSpecialWeights(next);
    setSpecialWeightsMessage(null);
  }, [evaluationRules, courseId]);

  const setSpecialWeightValue = useCallback((categoryName: string, value: string) => {
    setSpecialWeights((prev) => ({ ...prev, [categoryName]: value }));
  }, []);

  const saveSpecialParticipationWeights = useCallback(async () => {
    if (!courseId) {
      setSpecialWeightsMessage('Select a course first.');
      return;
    }

    const parsedSpecialWeights = SPECIAL_PARTICIPATION_CATEGORIES.map((categoryName) => {
      const parsed = Number(String(specialWeights[categoryName] ?? '0').replace(',', '.'));
      return {
        category: categoryName,
        weight: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      };
    });

    const baseRules = evaluationRules.filter((rule) => !isSpecialParticipationCategory(rule.category));
    const participationRule = baseRules.find((rule) => isBaseParticipationCategory(rule.category));
    const otherRules = baseRules.filter((rule) => !isBaseParticipationCategory(rule.category));

    const otherTotal = otherRules.reduce((sum, rule) => sum + Number(rule.weight || 0), 0);
    const specialTotal = parsedSpecialWeights.reduce((sum, rule) => sum + Number(rule.weight || 0), 0);
    const remainingParticipationWeight = Number((100 - otherTotal - specialTotal).toFixed(2));

    if (remainingParticipationWeight < -0.01) {
      setSpecialWeightsMessage('Special participation weights are too high for this course structure.');
      return;
    }

    const normalizedParticipationWeight = Math.max(0, remainingParticipationWeight);
    const mergedRules: EvaluationRule[] = [
      ...otherRules,
      {
        category: participationRule?.category || 'Class Participation',
        weight: normalizedParticipationWeight,
        description: participationRule?.description,
      },
      ...parsedSpecialWeights,
    ];

    try {
      setSavingSpecialWeights(true);
      setSpecialWeightsMessage(null);
      await apiClient.put(`/courses/${courseId}`, { evaluation_rules: mergedRules });
      setRulesByCourseOverride((prev) => ({ ...prev, [courseId]: mergedRules }));
      setSpecialWeightsMessage('Special participation weights saved.');
      await gradeEntry.loadFinal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save special participation weights.';
      setSpecialWeightsMessage(message);
    } finally {
      setSavingSpecialWeights(false);
    }
  }, [courseId, evaluationRules, gradeEntry, specialWeights]);

  // Category options with display names
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const base: CategoryOption[] = [
      { value: 'Midterm Exam', label: t('midtermExam') },
      { value: 'Final Exam', label: t('finalExam') },
      { value: 'Quizzes', label: t('quizzes') },
      { value: 'Lab Work', label: t('labWork') },
      { value: 'Homework', label: t('homework') },
      { value: 'Project', label: t('project') },
      { value: 'Class Participation', label: t('classParticipation') },
      { value: 'Continuous Assessment', label: t('continuousAssessment') }
    ];
    const rules = evaluationRules.map(r => r.category).filter(Boolean);
    const customRules = rules.filter(r => !base.some(b => b.value === r)).map(r => ({ value: r, label: r }));
    return [...base, ...customRules];
  }, [evaluationRules, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('addGrade') || 'Add Grade'}</h2>
        <div className="flex items-center gap-2">
          {gradeEntry.pendingSyncCount > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded" data-testid="grading-offline-queue-indicator">
              {t('queuedSyncCount', { count: gradeEntry.pendingSyncCount }) || `${gradeEntry.pendingSyncCount} queued for sync`}
            </span>
          )}
          <button
            type="button"
            data-testid="add-grade-button"
            className="border px-3 py-2 rounded text-sm hover:bg-gray-50"
            onClick={() => {
              const el = document.querySelector('[data-testid="grade-form"] input[name="assignmentName"]') as HTMLInputElement | null;
              el?.focus();
            }}
          >
            {t('addGrade') || 'Add Grade'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select name="studentId" className="border rounded px-3 py-2" value={studentId === '' ? '' : String(studentId)} onChange={e=>setStudentId(e.target.value? Number(e.target.value): '')} aria-label={t('selectStudent')}>
          <option value="">{t('selectStudent')}</option>
          {filteredStudents.map(s => (<option key={s.id} value={s.id}>{s.student_id} - {s.first_name} {s.last_name}</option>))}
        </select>
        <select name="courseId" className="border rounded px-3 py-2" value={courseId === '' ? '' : String(courseId)} onChange={e=>setCourseId(e.target.value? Number(e.target.value): '')} aria-label={t('selectCourse')}>
          <option value="">{t('selectCourse')}</option>
          {filteredCourses.map(c => (<option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>))}
        </select>
        <button className="border rounded px-3 py-2" onClick={gradeEntry.loadFinal}>{t('refreshFinal')}</button>
      </div>

      {gradeEntry.editingGradeId && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="grading-history-date">
              {t('historyDate') || 'Date'}
            </label>
            <input
              id="grading-history-date"
              type="date"
              className="border rounded px-3 py-1.5 text-sm"
              value={gradeEntry.historyDate}
              onChange={(e) => gradeEntry.setHistoryDate(e.target.value)}
            />
          </div>
          {isHistoricalMode && (
            <div className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
              {t('historicalModeBanner') || 'Editing past date'} — {formatDate(gradeEntry.historyDate)}
            </div>
          )}
        </div>
      )}

      {insufficientAttendance && (
        <div
          role="alert"
          className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-300 rounded-xl px-4 py-3"
          data-testid="attendance-insufficient-warning"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <span>
            {t('attendanceInsufficientWarning', {
              absences: insufficientAttendance.absences,
              limit: insufficientAttendance.limit_percent,
              allowed: insufficientAttendance.allowed_absences ?? 0,
            })}
          </span>
        </div>
      )}

      <form onSubmit={gradeEntry.submitGrade} className="bg-white border rounded-xl p-4 space-y-3" data-testid="grade-form">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
            {t('gradeEntry') || 'Grade Entry'}
          </p>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">
              {gradeEntry.editingGradeId ? t('editGrade') || 'Edit Grade' : t('addGrade')}
            </h3>
            {gradeEntry.editingGradeId && (
              <button
                type="button"
                onClick={gradeEntry.handleCancelEdit}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                {t('cancel') || 'Cancel'}
              </button>
            )}
          </div>
        </div>
        {gradeEntry.error && <p className="text-sm text-red-600">{gradeEntry.error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            name="assignmentName"
            className="border rounded px-3 py-2"
            placeholder={t('assignmentNamePlaceholder')}
            value={gradeEntry.assignmentName}
            onChange={e=>gradeEntry.setAssignmentName(e.target.value)}
          />
          <select
            name="category"
            className="border rounded px-3 py-2"
            value={gradeEntry.category}
            onChange={e=>gradeEntry.setCategory(e.target.value)}
            aria-label={t('categoryLabel') || 'Category'}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            name="weight"
            type="text"
            inputMode="decimal"
            className="border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
            placeholder={t('weightPlaceholder')}
            value={gradeEntry.weight}
            onChange={e => gradeEntry.setWeight(e.target.value)}
            disabled={gradeEntry.category==='Midterm' || gradeEntry.category==='Final Exam'}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            name="grade"
            type="text"
            inputMode="decimal"
            className="border rounded px-3 py-2"
            placeholder={t('gradePlaceholder')}
            value={gradeEntry.gradeValue}
            onChange={e => gradeEntry.setGradeValue(e.target.value)}
          />
          <input
            name="max_grade"
            type="text"
            inputMode="decimal"
            className="border rounded px-3 py-2"
            placeholder={t('maxGradePlaceholder')}
            value={gradeEntry.maxGrade}
            onChange={e => gradeEntry.setMaxGrade(e.target.value)}
          />
          <button disabled={gradeEntry.submitting} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50" type="submit">{gradeEntry.submitting? t('saving') : t('saveGrade')}</button>
        </div>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
            {t('summary') || 'Summary'}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{t('finalGradeSummary')}</h3>
            <Link
              to={summaryReportLink}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('printSummaryReport')}
            </Link>
          </div>
        </div>
        {!studentId || !courseId ? (
          <p className="text-sm text-gray-500">{t('selectStudentAndCourse')}</p>
        ) : gradeEntry.finalSummary ? (
          <div className="text-sm">
            {gradeEntry.finalSummary.attendance_insufficient && (
              <span className="inline-block mb-2 text-xs font-semibold px-2 py-1 rounded border bg-red-100 text-red-800 border-red-300">
                {t('attendanceInsufficientBadge')}
              </span>
            )}
            <p><span className="font-semibold">{t('final')}:</span> {gradeEntry.finalSummary.final_grade ?? '-'}%</p>
            <p><span className="font-semibold">{t('gpa')}:</span> {gradeEntry.finalSummary.gpa ?? '-'}</p>
            <p><span className="font-semibold">{t('letterGrade')}:</span> {gradeEntry.finalSummary.letter_grade ?? '-'}</p>
            {typeof gradeEntry.finalSummary.gpa === 'number' && (
              <>
                <p className={`mt-1 ${getGreekGradeColor(gpaToGreekScale(gradeEntry.finalSummary.gpa))}`}>
                  <span className="font-semibold">{t('greek')}:</span> {gpaToGreekScale(gradeEntry.finalSummary.gpa).toFixed(1)}{t('outOf20')} {t('bullet')} {getGreekGradeDescription(gpaToGreekScale(gradeEntry.finalSummary.gpa))}
                </p>
                <p className="text-gray-600">{gpaToPercentage(gradeEntry.finalSummary.gpa).toFixed(1)}%</p>
              </>
            )}
            {gradeEntry.finalSummary.category_breakdown && (
              <div className="mt-2">
                <p className="font-semibold">{t('categoryBreakdown')}</p>
                <ul className="list-disc ml-5">
                  {Object.keys(gradeEntry.finalSummary.category_breakdown).map(k=> (
                    <li key={k}>{t('categoryBreakdownItem', { category: translateCategory(k), average: gradeEntry.finalSummary!.category_breakdown[k].average.toFixed(1), weight: gradeEntry.finalSummary!.category_breakdown[k].weight })}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('noData')}</p>
        )}
      </div>

      {/* Evaluation Rules Overview */}
      {selectedCourse && evaluationRules.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
              {t('structure') || 'Structure'}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{t('evaluationStructure')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evaluationRules.map((r, i: number) => (
              <div key={i} className="border rounded p-3">
                <div className="font-semibold text-gray-800">{translateCategory(r.category)}</div>
                <div className="text-sm text-gray-600">{r.weight}%</div>
                {r.description && <div className="text-xs text-gray-500 mt-1">{r.description}</div>}
              </div>
            ))}
          </div>
          <div className="mt-5 border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              {t('specialParticipationWeightsTitle') || 'Special Participation Weights'}
            </h4>
            <p className="text-xs text-slate-500">
              {t('specialParticipationWeightsDescription') || 'Configure weights for attendance incident options. Remaining weight is assigned to Class Participation automatically.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SPECIAL_PARTICIPATION_CATEGORIES.map((categoryName) => (
                <div key={categoryName} className="border rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {translateCategory(categoryName)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={specialWeights[categoryName] ?? '0'}
                    onChange={(e) => setSpecialWeightValue(categoryName, e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {specialWeightsMessage && (
                <p className="text-xs text-slate-600">{specialWeightsMessage}</p>
              )}
              <button
                type="button"
                onClick={saveSpecialParticipationWeights}
                disabled={savingSpecialWeights || !courseId}
                className="sm:ml-auto bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingSpecialWeights ? (t('saving') || 'Saving...') : (t('saveSpecialWeights') || 'Save Special Weights')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade History */}
      {studentId && courseId && (
        <div className="bg-white border rounded-xl p-4">
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
              {t('records') || 'Records'}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{t('gradeHistory')}</h3>
          </div>
          {gradeEntry.grades.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noGradesRecorded')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('assignment')}</th>
                    {evaluationRules.length > 0 && (<th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('category')}</th>)}
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('score')}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">%</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('weight')}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('letterGrade')}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{t('date')}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gradeEntry.grades.map((g: Grade) => {
                    const pct = (Number(g.grade) / Number(g.max_grade || 100)) * 100;
                    const letter = getLetterGrade(pct);
                    const color = pct >= 90 ? 'text-green-600' : pct >= 80 ? 'text-blue-600' : pct >= 70 ? 'text-yellow-600' : pct >= 60 ? 'text-orange-600' : 'text-red-600';
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-800">{translateAssignmentName(g.assignment_name)}</div>
                          {g.notes && (<div className="text-xs text-gray-500">{g.notes}</div>)}
                        </td>
                        {evaluationRules.length > 0 && (
                          <td className="px-4 py-2"><span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{translateCategory(g.category ?? '') || '—'}</span></td>
                        )}
                        <td className="px-4 py-2 text-center">{g.grade} / {g.max_grade || 100}</td>
                        <td className="px-4 py-2 text-center"><span className={`font-semibold ${color}`}>{pct.toFixed(1)}%</span></td>
                        <td className="px-4 py-2 text-center">×{g.weight || 1}</td>
                        <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{letter}</span></td>
                        <td className="px-4 py-2 text-gray-600">
                          {g.date_submitted ? formatDate(g.date_submitted) : (g.date_assigned ? formatDate(g.date_assigned) : 'N/A')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => gradeEntry.handleEditGrade(g)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              title={t('edit') || 'Edit'}
                            >
                              {t('edit') || 'Edit'}
                            </button>
                            <button
                              onClick={() => gradeEntry.handleDeleteGrade(g.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                              title={t('delete') || 'Delete'}
                            >
                              {t('delete') || 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradingView;
