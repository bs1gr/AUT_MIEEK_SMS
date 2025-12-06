import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { gpaToPercentage, gpaToGreekScale, getGreekGradeDescription, getGreekGradeColor, getLetterGrade } from '@/utils/gradeUtils';
import apiClient, { gradesAPI, enrollmentsAPI } from '@/api/api';
import { useLanguage } from '@/LanguageContext';
import { Student, Course, Grade, FinalGrade } from '@/types';
import { eventBus, EVENTS } from '@/utils/events';

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

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1';

interface GradingViewProps {
  students: Student[];
  courses: CourseWithEvaluationRules[];
}

const GradingView: React.FC<GradingViewProps> = ({ students, courses }) => {
  const { t } = useLanguage();

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Class Participation': t('classParticipation') || 'Class Participation',
      'Homework/Assignments': t('homework') || 'Homework/Assignments',
      'Homework': t('homework') || 'Homework',
      'Lab Work': t('labWork') || 'Lab Work',
      'Continuous Assessment': t('continuousAssessment') || 'Continuous Assessment',
      'Quizzes': t('quizzes') || 'Quizzes',
      'Project': t('project') || 'Project',
      'Presentation': t('presentation') || 'Presentation',
      'Midterm': t('midterm') || 'Midterm',
      'Midterm Exam': t('midtermExam') || 'Midterm Exam',
      'Final Exam': t('finalExam') || 'Final Exam',
      'Final': t('finalExam') || 'Final',
    };
    return categoryMap[category] || category;
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
  const [category, setCategory] = useState('Midterm');
  const [gradeValue, setGradeValue] = useState<string>('');
  const [maxGrade, setMaxGrade] = useState<string>('100');
  const [weight, setWeight] = useState<string>('');
  const [assignmentName, setAssignmentName] = useState('');
  const [finalSummary, setFinalSummary] = useState<FinalGrade | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students || []);
  const [filteredCourses, setFilteredCourses] = useState<CourseWithEvaluationRules[]>(courses || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // loadFinal is declared below and memoized with useCallback. Do not define a separate
  // non-memoized loadFinal here — keep the single useCallback instance to satisfy
  // react-hooks/exhaustive-deps and avoid re-creating the function each render.

  // Keep filters in sync
  useEffect(() => { setFilteredStudents(students || []); }, [students]);
  useEffect(() => { setFilteredCourses(courses || []); }, [courses]);

  // When course is chosen, restrict students to those enrolled in course
  const studentsString = useMemo(() => students?.map(s => s.id).join(',') || '', [students]);

  useEffect(() => {
    const run = async () => {
      if (!courseId) { setFilteredStudents(students || []); return; }
      try {
        const arr: Student[] = await enrollmentsAPI.getEnrolledStudents(courseId as number);
        const ids = new Set(arr.map(s => s.id));
        const list = (students || []).filter(s => ids.has(s.id));
        setFilteredStudents(list);
        if (studentId && !ids.has(studentId as number)) {
          setStudentId('');
        }
        return;
      } catch {}
      // Fallback: leave students unfiltered
      setFilteredStudents(students || []);
    };
    run();
  }, [courseId, studentsString, studentId, students]); // Use studentsString to avoid infinite loop and include studentId

  // When student is chosen, restrict courses to those the student is enrolled in
  const coursesString = useMemo(() => courses?.map(c => c.id).join(',') || '', [courses?.length]); // Use length to prevent loops

  useEffect(() => {
    const run = async () => {
      if (!studentId) { setFilteredCourses(courses || []); return; }
      // Fallback (robust): check each course's enrolled students and see if student is present
      try {
        const results = await Promise.all((courses || []).map(async (c) => {
          try {
            const studs: Student[] = await enrollmentsAPI.getEnrolledStudents(c.id);
            const has = studs.some(s => s.id === studentId);
            return { id: c.id, has };
          } catch { return { id: c.id, has: false }; }
        }));
        const allowed = new Set(results.filter(x => x.has).map(x => x.id));
        const list = (courses || []).filter(c => allowed.has(c.id));
        setFilteredCourses(list);
        if (courseId && !allowed.has(courseId as number)) {
          setCourseId('');
        }
      } catch {
        setFilteredCourses(courses || []);
      }
    };
    run();
  }, [studentId, coursesString, courseId, courses]); // Use coursesString to avoid infinite loop and include courseId

  const loadFinal = useCallback(async () => {
    setFinalSummary(null);
    setError(null);
    if (!studentId || !courseId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/student/${studentId}/course/${courseId}/final-grade`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to load final grade');
      }
      const data: FinalGrade = await res.json();
      setFinalSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load final grade');
    }
  }, [studentId, courseId]);

  useEffect(() => { loadFinal(); }, [loadFinal]);

  useEffect(() => {
    const loadGrades = async () => {
      setGrades([]);
      if (!studentId) return;
      try {
        const res = await apiClient.get('/grades/', { params: { student_id: studentId, course_id: courseId || undefined } });
        // API returns paginated response with items array
        const gradesData = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setGrades(gradesData as Grade[]);
      } catch {
        // noop; errors surfaced during submission
      }
    };
    loadGrades();
  }, [studentId, courseId]);

  // Normalize category for comparison (EN/EL & common variants)
  const normalizeCategory = (name?: string): 'midterm' | 'final' | 'other' => {
    const n = (name || '').toString().trim().toLowerCase();
    const midtermNeedles = ['midterm', 'midterm exam', 'ενδιάμεση', 'ενδιάμεση εξέταση', 'ενδιαμεση', 'ενδιαμεση εξεταση'];
    const finalNeedles = ['final', 'final exam', 'τελική', 'τελική εξέταση', 'τελικη', 'τελικη εξεταση'];
    if (midtermNeedles.some(x => n.includes(x))) return 'midterm';
    if (finalNeedles.some(x => n.includes(x))) return 'final';
    return 'other';
  };

  // Auto-fill assignment name and default max grade when choosing Midterm/Final
  useEffect(() => {
    const catNorm = normalizeCategory(category);
    if (!studentId || !courseId) return;
    if (catNorm === 'midterm' || catNorm === 'final') {
      const attempts = grades.filter(g => normalizeCategory(g.category) === catNorm).length;
      const baseTitle = catNorm === 'midterm' ? 'Midterm Exam' : 'Final Exam';
      const suffix = attempts >= 1 ? 'B' : 'A';

      // Only override if empty or if previously auto-generated for the same family
      setAssignmentName(prev => {
        const current = (prev || '').trim().toLowerCase();
        const isAutoPattern = current.startsWith('midterm') || current.startsWith('final');
        if (!prev || isAutoPattern) return `${baseTitle} ${suffix}`;
        return prev;
      });

      setMaxGrade(prev => {
        const numeric = Number(prev || 0);
        if (prev === '' || numeric <= 0) return '100';
        return prev;
      });
    }
  }, [category, grades, studentId, courseId]);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const evaluationRules: EvaluationRule[] = useMemo(() => Array.isArray(selectedCourse?.evaluation_rules) ? (selectedCourse!.evaluation_rules as EvaluationRule[]) : [], [selectedCourse]);

  // Category options with display names
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const base: CategoryOption[] = [
      { value: 'Midterm', label: t('midterm') },
      { value: 'Final Exam', label: t('finalExam') },
      { value: 'Assignment', label: t('assignment') },
      { value: 'Quiz', label: t('quiz') },
      { value: 'Project', label: t('project') },
      { value: 'Lab', label: t('lab') }
    ];
    const rules = evaluationRules.map(r => r.category).filter(Boolean);
    const customRules = rules.filter(r => !base.some(b => b.value === r)).map(r => ({ value: r, label: r }));
    return [...base, ...customRules];
  }, [evaluationRules, t]);

  // Force Midterm/Final Exam to weight=1
  useEffect(() => {
    if (category === 'Midterm' || category === 'Final Exam') {
      setWeight('1');
    }
  }, [category]);

  const submitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !courseId) { setError(t('selectStudentAndCourseError')); return; }
    if (!assignmentName || String(assignmentName).trim().length === 0) { setError(t('assignmentNameRequired')); return; }
    if (gradeValue === '' || maxGrade === '') { setError(t('fillRequiredFields')); return; }
    const gv = Number(gradeValue.replace(',', '.')); const mg = Number(maxGrade.replace(',', '.') || 100);
    if (!Number.isFinite(gv) || !Number.isFinite(mg) || mg <= 0) { setError(t('invalidScoreMaxValues')); return; }
    if (gv < 0 || gv > mg) { setError(t('scoreMustBeBetween0AndMax')); return; }
    setSubmitting(true); setError(null);
    try {
      const payload: Omit<Grade, 'id'> = {
        student_id: Number(studentId),
        course_id: Number(courseId),
        assignment_name: assignmentName,
        category,
        grade: gv,
        max_grade: mg,
        weight: Number((category === 'Midterm' || category === 'Final Exam' ? '1' : (weight || '1')).replace(',', '.')),
        date_submitted: new Date().toISOString().split('T')[0],
        // optional fields not set: date_assigned, notes
      };
      await gradesAPI.create(payload);
      // Emit event to notify other components that grades changed
      eventBus.emit(EVENTS.GRADE_ADDED, { studentId: Number(studentId), courseId: Number(courseId) });
      await loadFinal();
      // refresh grade list
      try {
        const res2 = await apiClient.get('/grades/', { params: { student_id: studentId, course_id: courseId || undefined } });
        setGrades(Array.isArray(res2.data) ? res2.data as Grade[] : []);
      } catch {}
      setAssignmentName(''); setCategory('Midterm'); setGradeValue(''); setMaxGrade('100'); setWeight('');
    } catch (e: unknown) {
      // Attempt to extract common API error formats without using `any`
      let apiMsg: string | undefined;
      if (typeof e === 'object' && e !== null && 'response' in e) {
        try {
          // Narrow known shapes safely
          const ev = e as { response?: { data?: unknown }; message?: string };
          const data = ev.response?.data;
          if (typeof data === 'string') apiMsg = data;
          else if (typeof data === 'object' && data !== null) {
            const detail = (data as Record<string, unknown>)['detail'];
            apiMsg = typeof detail === 'string' ? detail : JSON.stringify(data);
          } else if (typeof ev.message === 'string') apiMsg = ev.message;
        } catch {
          // ignore
        }
      }
      if (!apiMsg) {
        if (e instanceof Error) apiMsg = e.message;
        else apiMsg = String(e);
      }
      setError(typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg));
    }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="border rounded px-3 py-2" value={studentId === '' ? '' : String(studentId)} onChange={e=>setStudentId(e.target.value? Number(e.target.value): '')} aria-label={t('selectStudent')}>
          <option value="">{t('selectStudent')}</option>
          {filteredStudents.map(s => (<option key={s.id} value={s.id}>{s.student_id} - {s.first_name} {s.last_name}</option>))}
        </select>
        <select className="border rounded px-3 py-2" value={courseId === '' ? '' : String(courseId)} onChange={e=>setCourseId(e.target.value? Number(e.target.value): '')} aria-label={t('selectCourse')}>
          <option value="">{t('selectCourse')}</option>
          {filteredCourses.map(c => (<option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>))}
        </select>
        <button className="border rounded px-3 py-2" onClick={loadFinal}>{t('refreshFinal')}</button>
      </div>

      <form onSubmit={submitGrade} className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-semibold">{t('addGrade')}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder={t('assignmentNamePlaceholder')} value={assignmentName} onChange={e=>setAssignmentName(e.target.value)} />
          <select className="border rounded px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)} aria-label={t('categoryLabel') || 'Category'}>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input type="text" inputMode="decimal" className="border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400" placeholder={t('weightPlaceholder')} value={weight} onChange={e => setWeight(e.target.value)} disabled={category==='Midterm' || category==='Final Exam'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" inputMode="decimal" className="border rounded px-3 py-2" placeholder={t('gradePlaceholder')} value={gradeValue} onChange={e => setGradeValue(e.target.value)} />
          <input type="text" inputMode="decimal" className="border rounded px-3 py-2" placeholder={t('maxGradePlaceholder')} value={maxGrade} onChange={e => setMaxGrade(e.target.value)} />
          <button disabled={submitting} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50" type="submit">{submitting? t('saving') : t('saveGrade')}</button>
        </div>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-2">{t('finalGradeSummary')}</h3>
        {!studentId || !courseId ? (
          <p className="text-sm text-gray-500">{t('selectStudentAndCourse')}</p>
        ) : finalSummary ? (
          <div className="text-sm">
            <p><span className="font-semibold">{t('final')}:</span> {finalSummary.final_grade ?? '-'}%</p>
            <p><span className="font-semibold">{t('gpa')}:</span> {finalSummary.gpa ?? '-'}</p>
            <p><span className="font-semibold">{t('letterGrade')}:</span> {finalSummary.letter_grade ?? '-'}</p>
            {typeof finalSummary.gpa === 'number' && (
              <>
                <p className={`mt-1 ${getGreekGradeColor(gpaToGreekScale(finalSummary.gpa))}`}>
                  <span className="font-semibold">{t('greek')}:</span> {gpaToGreekScale(finalSummary.gpa).toFixed(1)}{t('outOf20')} {t('bullet')} {getGreekGradeDescription(gpaToGreekScale(finalSummary.gpa))}
                </p>
                <p className="text-gray-600">{gpaToPercentage(finalSummary.gpa).toFixed(1)}%</p>
              </>
            )}
            {finalSummary.category_breakdown && (
              <div className="mt-2">
                <p className="font-semibold">{t('categoryBreakdown')}</p>
                <ul className="list-disc ml-5">
                  {Object.keys(finalSummary.category_breakdown).map(k=> (
                    <li key={k}>{t('categoryBreakdownItem', { category: translateCategory(k), average: finalSummary.category_breakdown[k].average.toFixed(1), weight: finalSummary.category_breakdown[k].weight })}</li>
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
          <h3 className="text-lg font-semibold mb-2">{t('evaluationStructure')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evaluationRules.map((r, i: number) => (
              <div key={i} className="border rounded p-3">
                <div className="font-semibold text-gray-800">{translateCategory(r.category)}</div>
                <div className="text-sm text-gray-600">{r.weight}%</div>
                {r.description && <div className="text-xs text-gray-500 mt-1">{r.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade History */}
      {studentId && courseId && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-2">{t('gradeHistory')}</h3>
          {grades.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.map((g) => {
                    const pct = (Number(g.grade) / Number(g.max_grade || 100)) * 100;
                    const letter = getLetterGrade(pct);
                    const color = pct >= 90 ? 'text-green-600' : pct >= 80 ? 'text-blue-600' : pct >= 70 ? 'text-yellow-600' : pct >= 60 ? 'text-orange-600' : 'text-red-600';
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-800">{g.assignment_name || '-'}</div>
                          {g.notes && (<div className="text-xs text-gray-500">{g.notes}</div>)}
                        </td>
                        {evaluationRules.length > 0 && (
                          <td className="px-4 py-2"><span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{translateCategory(g.category ?? '') || '—'}</span></td>
                        )}
                        <td className="px-4 py-2 text-center">{g.grade} / {g.max_grade || 100}</td>
                        <td className="px-4 py-2 text-center"><span className={`font-semibold ${color}`}>{pct.toFixed(1)}%</span></td>
                        <td className="px-4 py-2 text-center">×{g.weight || 1}</td>
                        <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{letter}</span></td>
                        <td className="px-4 py-2 text-gray-600">{g.date_submitted || 'N/A'}</td>
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
